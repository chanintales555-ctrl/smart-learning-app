'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

interface ChemistryCourseCanvasProps {
  scrollProgress: number; // 0.0 to 1.0 across 13 chapters
}

// ============================================================================
// CUSTOM GLSL SHADERS FOR QUANTUM ORBITALS & LIQUID GLASS
// ============================================================================

const NUCLEUS_VERTEX_SHADER = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewPosition;
  uniform float uTime;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    float pulse = sin(position.x * 2.5 + uTime * 2.0) * cos(position.y * 2.5 - uTime * 1.6) * sin(position.z * 2.5 + uTime * 1.8);
    vec3 displaced = position + normal * (pulse * 0.06);
    vPosition = displaced;
    vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const NUCLEUS_FRAGMENT_SHADER = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewPosition;
  uniform float uTime;
  uniform vec3 uColorDeep;
  uniform vec3 uColorMid;
  uniform vec3 uColorGlow;

  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    vec3 shift = vec3(50.0);
    for (int i = 0; i < 4; ++i) {
      v += a * (sin(p.x) * cos(p.y) + sin(p.y) * cos(p.z) + sin(p.z) * cos(p.x)) * 0.3333;
      p = p * 2.04 + shift;
      a *= 0.5;
    }
    return v * 0.5 + 0.5;
  }

  void main() {
    vec3 viewDir = normalize(vViewPosition);
    vec3 normal = normalize(vNormal);

    vec3 p = vPosition * 1.4 + vec3(uTime * 0.3, -uTime * 0.25, uTime * 0.2);
    float n = fbm(p * 1.8);
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.4);

    vec3 col = mix(uColorDeep, uColorMid, smoothstep(0.25, 0.8, n));
    col += uColorGlow * (pow(n, 3.0) * 0.8 + fresnel * 1.4);

    gl_FragColor = vec4(col, 1.0);
  }
`;

const ORBITAL_CLOUD_VERTEX = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const ORBITAL_CLOUD_FRAGMENT = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  uniform vec3 uColor;
  uniform float uOpacity;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    float ndotv = max(dot(normal, viewDir), 0.0);
    float fresnel = pow(1.0 - ndotv, 2.0);
    float core = pow(ndotv, 1.5) * 0.35;

    vec3 lightDir = normalize(vec3(0.5, 0.8, 0.6));
    vec3 halfVec = normalize(lightDir + viewDir);
    float spec = pow(max(dot(normal, halfVec), 0.0), 80.0);

    vec3 finalCol = uColor * (fresnel * 1.3 + core) + vec3(1.0) * spec * 0.75;
    float alpha = clamp((fresnel + core) * uOpacity + spec * 0.5, 0.05, 0.88);
    gl_FragColor = vec4(finalCol, alpha);
  }
`;

function createBokehTexture(size: number = 128): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  gradient.addColorStop(0.18, 'rgba(220, 252, 238, 0.85)');
  gradient.addColorStop(0.5, 'rgba(52, 211, 153, 0.25)');
  gradient.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export default function ChemistryCourseCanvas({ scrollProgress }: ChemistryCourseCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<number>(scrollProgress);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const smoothMouse = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    scrollRef.current = scrollProgress;
  }, [scrollProgress]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ========== 1. SCENE & CAMERA ==========
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030306);
    scene.fog = new THREE.FogExp2(0x030306, 0.0065);

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 800);
    camera.position.set(0, 2, 40);

    const currentCamPos = new THREE.Vector3(0, 2, 40);
    const targetCamPos = new THREE.Vector3(0, 2, 40);
    const currentLookAt = new THREE.Vector3(0, 0, 0);
    const targetLookAt = new THREE.Vector3(0, 0, 0);

    // ========== 2. RENDERER & STUDIO ENVIRONMENT ==========
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envMap = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    scene.environment = envMap;
    roomEnv.dispose();

    // ========== 3. CINEMATIC POST-PROCESSING (UnrealBloomPass) ==========
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.48,
      0.62,
      0.68
    );
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());

    // ========== 4. STUDIO LIGHTING ==========
    const ambient = new THREE.AmbientLight(0x042f2e, 1.8);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xf8fafc, 2.8);
    keyLight.position.set(20, 30, 25);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x10b981, 1.6);
    fillLight.position.set(-20, 15, 20);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
    rimLight.position.set(0, -10, -30);
    scene.add(rimLight);

    // ========== 5. BOKEH STARFIELD ==========
    const bokehTex = createBokehTexture(128);
    const starCount = 1400;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);

    const starPalette = [
      new THREE.Color(0xffffff),
      new THREE.Color(0xa7f3d0),
      new THREE.Color(0x6ee7b7),
      new THREE.Color(0xdbeafe),
    ];

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 60 + Math.pow(Math.random(), 0.55) * 250;
      starPos[i3] = radius * Math.sin(phi) * Math.cos(theta);
      starPos[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPos[i3 + 2] = radius * Math.cos(phi);

      const c = starPalette[Math.floor(Math.random() * starPalette.length)];
      starCol[i3] = c.r;
      starCol[i3 + 1] = c.g;
      starCol[i3 + 2] = c.b;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));

    const starMat = new THREE.PointsMaterial({
      map: bokehTex,
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // =========================================================================
    // 6. SCULPTED 3D CHAPTER CONSTRUCTS
    // =========================================================================

    // --- CONSTRUCT 1: QUANTUM ATOM & 3D P-ORBITAL CLOUDS (Ch 1 - 2) ---
    // Position: (16, 2, 10)
    const bohrGroup = new THREE.Group();
    bohrGroup.position.set(16, 2, 10);
    scene.add(bohrGroup);

    // Living Quantum Nucleus Shader (128x128)
    const nucleusMat = new THREE.ShaderMaterial({
      vertexShader: NUCLEUS_VERTEX_SHADER,
      fragmentShader: NUCLEUS_FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uColorDeep: { value: new THREE.Color(0x022c22) },
        uColorMid: { value: new THREE.Color(0x10b981) },
        uColorGlow: { value: new THREE.Color(0x6ee7b7) },
      },
    });
    const bohrNucleus = new THREE.Mesh(new THREE.SphereGeometry(1.45, 128, 128), nucleusMat);
    bohrGroup.add(bohrNucleus);

    // 3D Sculpted p-Orbital Probability Lobes (px, py, pz Translucent Quantum Clouds)
    const orbitalLobeGeo = new THREE.SphereGeometry(1.0, 64, 64);
    orbitalLobeGeo.scale(0.62, 1.85, 0.62);

    const lobeMatEmerald = new THREE.ShaderMaterial({
      vertexShader: ORBITAL_CLOUD_VERTEX,
      fragmentShader: ORBITAL_CLOUD_FRAGMENT,
      uniforms: {
        uColor: { value: new THREE.Color(0x34d399) },
        uOpacity: { value: 0.55 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const lobeMatCyan = new THREE.ShaderMaterial({
      vertexShader: ORBITAL_CLOUD_VERTEX,
      fragmentShader: ORBITAL_CLOUD_FRAGMENT,
      uniforms: {
        uColor: { value: new THREE.Color(0x38bdf8) },
        uOpacity: { value: 0.5 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const createDumbbellAxis = (rotX: number, rotZ: number, matA: THREE.Material, matB: THREE.Material) => {
      const g = new THREE.Group();
      const top = new THREE.Mesh(orbitalLobeGeo, matA);
      top.position.y = 2.2;
      const bot = new THREE.Mesh(orbitalLobeGeo, matB);
      bot.position.y = -2.2;
      g.add(top, bot);
      g.rotation.set(rotX, 0, rotZ);
      return g;
    };

    bohrGroup.add(createDumbbellAxis(0, 0, lobeMatEmerald, lobeMatCyan));
    bohrGroup.add(createDumbbellAxis(0, Math.PI / 2, lobeMatCyan, lobeMatEmerald));
    bohrGroup.add(createDumbbellAxis(Math.PI / 2, 0, lobeMatEmerald, lobeMatCyan));

    // Machined 256-Segment Platinum Shell Tracks
    const createSmoothShell = (radius: number, emissiveHex: number) => {
      const geo = new THREE.TorusGeometry(radius, 0.065, 48, 256);
      const mat = new THREE.MeshPhysicalMaterial({
        color: 0xf8fafc,
        emissive: emissiveHex,
        emissiveIntensity: 0.4,
        metalness: 0.96,
        roughness: 0.06,
        clearcoat: 1.0,
      });
      return new THREE.Mesh(geo, mat);
    };

    const shell1 = createSmoothShell(4.5, 0x10b981);
    shell1.rotation.x = Math.PI / 3;
    const shell2 = createSmoothShell(6.2, 0x38bdf8);
    shell2.rotation.x = -Math.PI / 3.5;
    shell2.rotation.y = Math.PI / 5;
    const shell3 = createSmoothShell(7.8, 0x34d399);
    shell3.rotation.x = Math.PI / 2.2;

    bohrGroup.add(shell1, shell2, shell3);

    const electronCount = 8;
    const bohrElectrons: THREE.Mesh[] = [];
    const electronGeo = new THREE.SphereGeometry(0.26, 48, 48);
    const electronMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      emissive: 0x6ee7b7,
      emissiveIntensity: 1.8,
      metalness: 0.95,
      roughness: 0.02,
      clearcoat: 1.0,
    });
    for (let i = 0; i < electronCount; i++) {
      const e = new THREE.Mesh(electronGeo, electronMat);
      bohrGroup.add(e);
      bohrElectrons.push(e);
    }

    // --- CONSTRUCT 2: TETRAHEDRAL SP3 DIAMOND & FULLERENE BONDING (Ch 3 - 5) ---
    // Position: (-18, 0, -14)
    const latticeGroup = new THREE.Group();
    latticeGroup.position.set(-18, 0, -14);
    scene.add(latticeGroup);

    const matEmeraldChrome = new THREE.MeshPhysicalMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.45,
      metalness: 0.85,
      roughness: 0.06,
      clearcoat: 1.0,
      iridescence: 0.8,
      iridescenceIOR: 1.35,
    });

    const matPlatinumPearl = new THREE.MeshPhysicalMaterial({
      color: 0xf8fafc,
      emissive: 0x0284c7,
      emissiveIntensity: 0.3,
      metalness: 0.95,
      roughness: 0.05,
      clearcoat: 1.0,
      iridescence: 1.0,
      iridescenceIOR: 1.4,
    });

    const matBondTube = new THREE.MeshPhysicalMaterial({
      color: 0xe2e8f0,
      metalness: 0.96,
      roughness: 0.08,
      clearcoat: 1.0,
    });

    // Generate a 20-vertex Dodecahedral Fullerene Cage (Smooth 64x64 Atoms + Curved Tube Bonds)
    const phi = (1 + Math.sqrt(5)) / 2;
    const invPhi = 1 / phi;
    const rawVerts = [
      // (±1, ±1, ±1)
      [-1, -1, -1], [-1, -1, 1], [-1, 1, -1], [-1, 1, 1],
      [1, -1, -1], [1, -1, 1], [1, 1, -1], [1, 1, 1],
      // (0, ±1/phi, ±phi)
      [0, -invPhi, -phi], [0, -invPhi, phi], [0, invPhi, -phi], [0, invPhi, phi],
      // (±1/phi, ±phi, 0)
      [-invPhi, -phi, 0], [-invPhi, phi, 0], [invPhi, -phi, 0], [invPhi, phi, 0],
      // (±phi, 0, ±1/phi)
      [-phi, 0, -invPhi], [phi, 0, -invPhi], [-phi, 0, invPhi], [phi, 0, invPhi],
    ];

    const cageScale = 2.6;
    const cagePoints = rawVerts.map(([x, y, z]) => new THREE.Vector3(x * cageScale, y * cageScale, z * cageScale));
    const atomSphereLg = new THREE.SphereGeometry(0.52, 64, 64);
    const atomSphereSm = new THREE.SphereGeometry(0.42, 64, 64);

    // Central Coordination Core Atom
    const centerAtom = new THREE.Mesh(new THREE.SphereGeometry(1.15, 64, 64), matEmeraldChrome);
    latticeGroup.add(centerAtom);

    cagePoints.forEach((pt, idx) => {
      const m = new THREE.Mesh(idx % 2 === 0 ? atomSphereLg : atomSphereSm, idx % 2 === 0 ? matEmeraldChrome : matPlatinumPearl);
      m.position.copy(pt);
      latticeGroup.add(m);

      // Radial coordination bonds from center to inner vertices
      if (idx < 8) {
        const radCurve = new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), pt);
        const radTube = new THREE.Mesh(new THREE.TubeGeometry(radCurve, 12, 0.06, 24, false), matBondTube);
        latticeGroup.add(radTube);
      }
    });

    // Connect adjacent Fullerene vertices (edge length = 2/phi * cageScale ≈ 1.236 * cageScale)
    const targetEdge = (2 * invPhi) * cageScale;
    for (let i = 0; i < cagePoints.length; i++) {
      for (let j = i + 1; j < cagePoints.length; j++) {
        const dist = cagePoints[i].distanceTo(cagePoints[j]);
        if (Math.abs(dist - targetEdge) < 0.25) {
          const edgeCurve = new THREE.LineCurve3(cagePoints[i], cagePoints[j]);
          const edgeMesh = new THREE.Mesh(new THREE.TubeGeometry(edgeCurve, 12, 0.075, 24, false), matBondTube);
          latticeGroup.add(edgeMesh);
        }
      }
    }

    // Outer Solvation Wave Ring
    const solvationRing = createSmoothShell(6.4, 0x10b981);
    solvationRing.rotation.x = Math.PI / 2.6;
    latticeGroup.add(solvationRing);

    // --- CONSTRUCT 3: KINETIC GAS CONTAINMENT & 3D ACTIVATION ENERGY CURVE (Ch 6 - 9) ---
    // Position: (18, -1, -38)
    const kineticsGroup = new THREE.Group();
    kineticsGroup.position.set(18, -1, -38);
    scene.add(kineticsGroup);

    // Smooth Fresnel Glass Containment Sphere (128x128 — Zero Transparency Glitches!)
    const chamberShellMat = new THREE.ShaderMaterial({
      vertexShader: ORBITAL_CLOUD_VERTEX,
      fragmentShader: ORBITAL_CLOUD_FRAGMENT,
      uniforms: {
        uColor: { value: new THREE.Color(0x34d399) },
        uOpacity: { value: 0.42 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const chamber = new THREE.Mesh(new THREE.SphereGeometry(4.8, 128, 128), chamberShellMat);
    kineticsGroup.add(chamber);

    // Machined Equatorial Containment Flange
    const flangeRing = createSmoothShell(4.9, 0x38bdf8);
    flangeRing.rotation.x = Math.PI / 2;
    kineticsGroup.add(flangeRing);

    // 3D Sculpted Activation Energy (Ea) Reaction Pathway Ribbon inside Chamber
    const eaCurvePts = [
      new THREE.Vector3(-3.6, -1.2, 0),
      new THREE.Vector3(-2.0, -1.0, 0.6),
      new THREE.Vector3(0.0, 2.6, 0),    // Transition State Peak (Activated Complex)
      new THREE.Vector3(2.0, -1.6, -0.6),
      new THREE.Vector3(3.6, -1.8, 0),
    ];
    const eaCurve = new THREE.CatmullRomCurve3(eaCurvePts, false);
    const eaTubeGeo = new THREE.TubeGeometry(eaCurve, 120, 0.11, 32, false);
    const eaTubeMat = new THREE.MeshStandardMaterial({
      color: 0x6ee7b7,
      emissive: 0x10b981,
      emissiveIntensity: 1.8,
      roughness: 0.1,
      metalness: 0.5,
    });
    kineticsGroup.add(new THREE.Mesh(eaTubeGeo, eaTubeMat));

    // Catalyzed Lower-Ea Pathway Ribbon
    const catCurvePts = [
      new THREE.Vector3(-3.6, -1.2, 0),
      new THREE.Vector3(-1.8, -0.6, -0.6),
      new THREE.Vector3(0.0, 0.8, 0),    // Lower Catalyzed Peak
      new THREE.Vector3(1.8, -1.4, 0.6),
      new THREE.Vector3(3.6, -1.8, 0),
    ];
    const catCurve = new THREE.CatmullRomCurve3(catCurvePts, false);
    const catTubeGeo = new THREE.TubeGeometry(catCurve, 120, 0.08, 24, false);
    const catTubeMat = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      emissive: 0x00d4ff,
      emissiveIntensity: 1.8,
      roughness: 0.1,
      metalness: 0.5,
    });
    kineticsGroup.add(new THREE.Mesh(catTubeGeo, catTubeMat));

    // High-Subdivision Kinetic Bouncing Gas Particles
    const gasCount = 28;
    const gasParticles: { mesh: THREE.Mesh; vel: THREE.Vector3 }[] = [];
    const gasGeo = new THREE.SphereGeometry(0.24, 32, 32);

    for (let i = 0; i < gasCount; i++) {
      const g = new THREE.Mesh(gasGeo, i % 2 === 0 ? matEmeraldChrome : matPlatinumPearl);
      const r = Math.random() * 3.4;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      g.position.set(r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), r * Math.cos(ph));
      kineticsGroup.add(g);
      gasParticles.push({
        mesh: g,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 0.085,
          (Math.random() - 0.5) * 0.085,
          (Math.random() - 0.5) * 0.085
        ),
      });
    }

    // --- CONSTRUCT 4: AROMATIC BENZENE PI-CLOUD & HELICAL POLYMER (Ch 10 - 13) ---
    // Position: (-16, 1, -64)
    const organicGroup = new THREE.Group();
    organicGroup.position.set(-16, 1, -64);
    scene.add(organicGroup);

    const benzeneRadius = 3.5;
    const carbonGeo = new THREE.SphereGeometry(0.58, 64, 64);
    const carbonMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e293b,
      metalness: 0.96,
      roughness: 0.06,
      clearcoat: 1.0,
      iridescence: 0.6,
    });
    const hydrogenGeo = new THREE.SphereGeometry(0.34, 48, 48);

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const cPos = new THREE.Vector3(Math.cos(angle) * benzeneRadius, Math.sin(angle) * benzeneRadius, 0);
      const hPos = new THREE.Vector3(Math.cos(angle) * (benzeneRadius + 1.55), Math.sin(angle) * (benzeneRadius + 1.55), 0);

      const cMesh = new THREE.Mesh(carbonGeo, carbonMat);
      cMesh.position.copy(cPos);
      organicGroup.add(cMesh);

      const hMesh = new THREE.Mesh(hydrogenGeo, matPlatinumPearl);
      hMesh.position.copy(hPos);
      organicGroup.add(hMesh);

      // Smooth C-H Tube Bond
      const chCurve = new THREE.LineCurve3(cPos, hPos);
      organicGroup.add(new THREE.Mesh(new THREE.TubeGeometry(chCurve, 8, 0.055, 20, false), matBondTube));

      // Smooth C-C Aromatic Ring Bond
      const nextAngle = ((i + 1) / 6) * Math.PI * 2;
      const nextCPos = new THREE.Vector3(Math.cos(nextAngle) * benzeneRadius, Math.sin(nextAngle) * benzeneRadius, 0);
      const ccCurve = new THREE.LineCurve3(cPos, nextCPos);
      organicGroup.add(new THREE.Mesh(new THREE.TubeGeometry(ccCurve, 12, 0.1, 24, false), matEmeraldChrome));
    }

    // Delocalized Pi-Electron Clouds (Above & Below Plane — Custom Fresnel Shader, 256 segments)
    const piRingGeo = new THREE.TorusGeometry(2.6, 0.42, 64, 256);
    const piTop = new THREE.Mesh(piRingGeo, lobeMatEmerald);
    piTop.position.z = 1.05;
    organicGroup.add(piTop);

    const piBottom = new THREE.Mesh(piRingGeo, lobeMatCyan);
    piBottom.position.z = -1.05;
    organicGroup.add(piBottom);

    // Outer Helical Polymer Macromolecule Chain encircling the Benzene Core
    const polyPts: THREE.Vector3[] = [];
    for (let i = 0; i < 200; i++) {
      const u = (i / 200) * Math.PI * 2;
      const r = 6.4 + 0.6 * Math.cos(u * 6);
      polyPts.push(new THREE.Vector3(r * Math.cos(u), r * Math.sin(u), 1.4 * Math.sin(u * 6)));
    }
    const polyCurve = new THREE.CatmullRomCurve3(polyPts, true);
    const polyMesh = new THREE.Mesh(new THREE.TubeGeometry(polyCurve, 240, 0.08, 24, true), matBondTube);
    organicGroup.add(polyMesh);

    // ========== 7. EVENT LISTENERS ==========
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseRef.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // ========== 8. RENDER & SCROLL ANIMATION LOOP ==========
    let frameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const p = scrollRef.current;

      smoothMouse.current.x += (mouseRef.current.x - smoothMouse.current.x) * 0.04;
      smoothMouse.current.y += (mouseRef.current.y - smoothMouse.current.y) * 0.04;

      nucleusMat.uniforms.uTime.value = t;

      // 1. Rotate Bohr Atom & Quantum Orbitals
      bohrGroup.rotation.y = t * 0.22;
      shell1.rotation.z = t * 0.55;
      shell2.rotation.z = -t * 0.4;
      shell3.rotation.z = t * 0.28;

      for (let i = 0; i < electronCount; i++) {
        const shellR = i < 2 ? 4.5 : i < 6 ? 6.2 : 7.8;
        const spd = i < 2 ? 1.6 : i < 6 ? 1.1 : 0.75;
        const phase = (i / electronCount) * Math.PI * 2;
        const a = t * spd + phase;
        bohrElectrons[i].position.set(
          Math.cos(a) * shellR,
          Math.sin(a) * shellR * (i % 2 === 0 ? 0.7 : -0.7),
          Math.sin(a * 1.5) * 1.5
        );
      }

      // 2. Rotate Fullerene Bonding Cage
      latticeGroup.rotation.x = t * 0.16;
      latticeGroup.rotation.y = t * 0.24;
      solvationRing.rotation.z = -t * 0.35;

      // 3. Kinetic Gas Particles & Chamber
      for (const gp of gasParticles) {
        gp.mesh.position.add(gp.vel);
        if (gp.mesh.position.length() > 3.9) {
          gp.vel.reflect(gp.mesh.position.clone().normalize());
        }
      }
      kineticsGroup.rotation.y = Math.sin(t * 0.25) * 0.35;

      // 4. Organic Benzene & Polymer Chain
      organicGroup.rotation.y = t * 0.24;
      organicGroup.rotation.x = Math.sin(t * 0.35) * 0.22;
      polyMesh.rotation.z = -t * 0.18;

      stars.rotation.y = t * 0.004;

      // 5. CAMERA FLIGHT ALONG CHEMISTRY CHAPTER CLUSTERS
      if (p < 0.25) {
        const s = p / 0.25;
        targetCamPos.set(
          THREE.MathUtils.lerp(0, 10, s),
          THREE.MathUtils.lerp(2, 2.5, s),
          THREE.MathUtils.lerp(40, 23, s)
        );
        targetLookAt.set(
          THREE.MathUtils.lerp(0, 16, s),
          THREE.MathUtils.lerp(0, 2, s),
          THREE.MathUtils.lerp(0, 10, s)
        );
      } else if (p < 0.50) {
        const s = (p - 0.25) / 0.25;
        targetCamPos.set(
          THREE.MathUtils.lerp(10, -10, s),
          THREE.MathUtils.lerp(2.5, 1.0, s),
          THREE.MathUtils.lerp(23, -1, s)
        );
        targetLookAt.set(
          THREE.MathUtils.lerp(16, -18, s),
          THREE.MathUtils.lerp(2, 0, s),
          THREE.MathUtils.lerp(10, -14, s)
        );
      } else if (p < 0.75) {
        const s = (p - 0.50) / 0.25;
        targetCamPos.set(
          THREE.MathUtils.lerp(-10, 11, s),
          THREE.MathUtils.lerp(1.0, 0.5, s),
          THREE.MathUtils.lerp(-1, -25, s)
        );
        targetLookAt.set(
          THREE.MathUtils.lerp(-18, 18, s),
          THREE.MathUtils.lerp(0, -1, s),
          THREE.MathUtils.lerp(-14, -38, s)
        );
      } else {
        const s = (p - 0.75) / 0.25;
        targetCamPos.set(
          THREE.MathUtils.lerp(11, -8, s),
          THREE.MathUtils.lerp(0.5, 2.0, s),
          THREE.MathUtils.lerp(-25, -51, s)
        );
        targetLookAt.set(
          THREE.MathUtils.lerp(18, -16, s),
          THREE.MathUtils.lerp(-1, 1, s),
          THREE.MathUtils.lerp(-38, -64, s)
        );
      }

      currentCamPos.lerp(targetCamPos, 0.05);
      currentLookAt.lerp(targetLookAt, 0.05);

      camera.position.x = currentCamPos.x + smoothMouse.current.x * 0.8;
      camera.position.y = currentCamPos.y + smoothMouse.current.y * 0.6;
      camera.position.z = currentCamPos.z;
      camera.lookAt(currentLookAt);

      composer.render();
    };

    animate();

    // ========== 9. CLEANUP ==========
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material?.dispose();
        }
        if (obj instanceof THREE.Points) {
          obj.geometry?.dispose();
          (obj.material as THREE.Material)?.dispose();
        }
      });

      bokehTex.dispose();
      envMap.dispose();
      pmremGenerator.dispose();
      composer.dispose();

      if (renderer.domElement?.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      aria-hidden="true"
    />
  );
}
