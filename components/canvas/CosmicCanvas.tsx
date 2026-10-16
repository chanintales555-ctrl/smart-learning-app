'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

interface CosmicCanvasProps {
  scrollProgress: number;
  isWarping?: boolean;
}

// ============================================================================
// CUSTOM GLSL SHADERS (Per-Pixel Mathematical Smoothness — Zero Polygon Edges)
// ============================================================================

const PLASMA_VERTEX_SHADER = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  varying vec3 vViewPosition;
  uniform float uTime;

  // Smooth 3D harmonic displacement for living plasma surface
  void main() {
    vNormal = normalize(normalMatrix * normal);
    
    // Subtle organic harmonic breathing
    float wave = sin(position.x * 2.2 + uTime * 1.8) * cos(position.y * 2.2 - uTime * 1.4) * sin(position.z * 2.2 + uTime * 1.6);
    vec3 displaced = position + normal * (wave * 0.08);
    
    vPosition = displaced;
    vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
    vWorldPosition = worldPos.xyz;
    vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const PLASMA_FRAGMENT_SHADER = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  varying vec3 vViewPosition;
  uniform float uTime;
  uniform vec3 uColorDeep;
  uniform vec3 uColorMid;
  uniform vec3 uColorGlow;

  // Compact 3D Simplex-like trigonometric turbulence (100% smooth C-infinity continuous)
  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    vec3 shift = vec3(100.0);
    for (int i = 0; i < 4; ++i) {
      v += a * (sin(p.x) * cos(p.y) + sin(p.y) * cos(p.z) + sin(p.z) * cos(p.x)) * 0.3333;
      p = p * 2.02 + shift;
      a *= 0.5;
    }
    return v * 0.5 + 0.5;
  }

  void main() {
    vec3 viewDir = normalize(vViewPosition);
    vec3 normal = normalize(vNormal);

    // Multi-layered flowing plasma convection
    vec3 p = vPosition * 1.35 + vec3(uTime * 0.35, -uTime * 0.28, uTime * 0.22);
    float n1 = fbm(p);
    float n2 = fbm(p * 2.1 - vec3(n1 * 1.8) + uTime * 0.4);
    float pattern = smoothstep(0.2, 0.85, n2);

    // Fresnel atmospheric rim lighting
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.6);

    vec3 baseColor = mix(uColorDeep, uColorMid, pattern);
    baseColor = mix(baseColor, uColorGlow, pow(pattern, 2.5) * 0.85);
    vec3 finalColor = baseColor + uColorGlow * fresnel * 1.45;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

const FRESNEL_SHELL_VERTEX = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRESNEL_SHELL_FRAGMENT = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  uniform vec3 uRimColor;
  uniform vec3 uInnerColor;
  uniform float uPower;
  uniform float uOpacity;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), uPower);
    
    // Specular studio highlight
    vec3 lightDir = normalize(vec3(0.6, 0.8, 0.7));
    vec3 halfVec = normalize(lightDir + viewDir);
    float spec = pow(max(dot(normal, halfVec), 0.0), 96.0);

    vec3 col = mix(uInnerColor, uRimColor, fresnel) + vec3(1.0) * spec * 0.9;
    float alpha = clamp(fresnel * uOpacity + spec * 0.7, 0.04, 0.92);
    gl_FragColor = vec4(col, alpha);
  }
`;

const ACCRETION_VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ACCRETION_FRAGMENT_SHADER = `
  varying vec2 vUv;
  uniform float uTime;
  uniform vec3 uColorInner;
  uniform vec3 uColorOuter;

  void main() {
    vec2 centered = vUv * 2.0 - 1.0;
    float r = length(centered);
    float angle = atan(centered.y, centered.x);

    // Smooth radial ring mask
    float ringMask = smoothstep(0.36, 0.46, r) * (1.0 - smoothstep(0.82, 0.98, r));
    
    // Spiral relativistic wave filaments
    float spiral1 = sin(angle * 4.0 - r * 18.0 + uTime * 2.2) * 0.5 + 0.5;
    float spiral2 = sin(angle * 7.0 - r * 26.0 - uTime * 1.5) * 0.5 + 0.5;
    float fineRings = sin(r * 65.0 - uTime * 3.0) * 0.5 + 0.5;

    float intensity = (spiral1 * 0.55 + spiral2 * 0.3 + fineRings * 0.15) * ringMask;
    vec3 col = mix(uColorOuter, uColorInner, smoothstep(0.95, 0.4, r));
    col += vec3(0.8, 0.95, 1.0) * pow(intensity, 3.0) * 0.8;

    gl_FragColor = vec4(col, intensity * 0.78);
  }
`;

// Soft circular bokeh texture for starfield
function createBokehTexture(size: number = 128): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  gradient.addColorStop(0.15, 'rgba(240, 248, 255, 0.9)');
  gradient.addColorStop(0.45, 'rgba(160, 210, 255, 0.25)');
  gradient.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

// Helper: Generate a smooth 3D Torus Knot / Stellarator Parametric Curve
function createStellaratorCurve(R: number, r: number, p: number, q: number, segments: number = 256): THREE.CatmullRomCurve3 {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const rad = R + r * Math.cos(q * t);
    const x = rad * Math.cos(p * t);
    const y = rad * Math.sin(p * t);
    const z = r * Math.sin(q * t);
    pts.push(new THREE.Vector3(x, y, z));
  }
  return new THREE.CatmullRomCurve3(pts, true);
}

export default function CosmicCanvas({ scrollProgress, isWarping = false }: CosmicCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<number>(scrollProgress);
  const warpingRef = useRef<boolean>(isWarping);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const smoothMouse = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    scrollRef.current = scrollProgress;
  }, [scrollProgress]);

  useEffect(() => {
    warpingRef.current = isWarping;
  }, [isWarping]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ========== 1. SCENE & CAMERA ==========
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030306);
    scene.fog = new THREE.FogExp2(0x030306, 0.0055);

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 800);
    camera.position.set(0, 2, 48);

    const currentCamPos = new THREE.Vector3(0, 2, 48);
    const targetCamPos = new THREE.Vector3(0, 2, 48);
    const currentLookAt = new THREE.Vector3(0, 0, 0);
    const targetLookAt = new THREE.Vector3(0, 0, 0);

    // ========== 2. RENDERER & STUDIO ENVIRONMENT (RoomEnvironment) ==========
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    const dpr = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // Authentic Three.js RoomEnvironment for liquid-smooth metallic & clearcoat reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envMap = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    scene.environment = envMap;
    roomEnv.dispose();

    // ========== 3. CINEMATIC POST-PROCESSING (UnrealBloomPass) ==========
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.52, // Subtle luxury optical bloom strength
      0.65, // Smooth bloom radius
      0.68  // Only bright emissive highlights bloom
    );
    composer.addPass(bloomPass);

    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    // ========== 4. STUDIO 3-POINT LIGHTING ==========
    const ambient = new THREE.AmbientLight(0x0d1526, 1.8);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xf8fafc, 3.0);
    keyLight.position.set(25, 35, 30);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.5);
    fillLight.position.set(-25, 15, 20);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x34d399, 1.4);
    rimLight.position.set(0, -15, -35);
    scene.add(rimLight);

    const physLight = new THREE.PointLight(0x00e5ff, 6.0, 50, 1.4);
    physLight.position.set(24, 2, -16);
    scene.add(physLight);

    const chemLight = new THREE.PointLight(0x10b981, 6.0, 50, 1.4);
    chemLight.position.set(-26, 2, -48);
    scene.add(chemLight);

    // ========== 5. CELESTIAL BOKEH STARFIELD ==========
    const bokehTex = createBokehTexture(128);
    const starCount = 1600;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);

    const starPalette = [
      new THREE.Color(0xffffff),
      new THREE.Color(0xdbeafe),
      new THREE.Color(0xfef3c7),
      new THREE.Color(0xa7f3d0),
    ];

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 65 + Math.pow(Math.random(), 0.55) * 280;
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
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // =========================================================================
    // 6. 🪐 PHYSICS REALM: RELATIVISTIC TOKAMAK & SINGULARITY (at 24, 0, -16)
    // =========================================================================
    const physGroup = new THREE.Group();
    physGroup.position.set(24, 0, -16);
    scene.add(physGroup);

    // A. Custom Shader Living Plasma Singularity Core (128x128 — Zero Facets!)
    const physPlasmaMat = new THREE.ShaderMaterial({
      vertexShader: PLASMA_VERTEX_SHADER,
      fragmentShader: PLASMA_FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uColorDeep: { value: new THREE.Color(0x020617) },
        uColorMid: { value: new THREE.Color(0x0284c7) },
        uColorGlow: { value: new THREE.Color(0x7dd3fc) },
      },
    });
    const physCoreMesh = new THREE.Mesh(new THREE.SphereGeometry(2.65, 128, 128), physPlasmaMat);
    physGroup.add(physCoreMesh);

    // B. Outer Optical Containment Shell (Smooth Fresnel Glass Shader)
    const physShellMat = new THREE.ShaderMaterial({
      vertexShader: FRESNEL_SHELL_VERTEX,
      fragmentShader: FRESNEL_SHELL_FRAGMENT,
      uniforms: {
        uRimColor: { value: new THREE.Color(0x38bdf8) },
        uInnerColor: { value: new THREE.Color(0x03112b) },
        uPower: { value: 2.3 },
        uOpacity: { value: 0.85 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const physShellMesh = new THREE.Mesh(new THREE.SphereGeometry(3.35, 128, 128), physShellMat);
    physGroup.add(physShellMesh);

    // C. Sculpted 3D Tokamak Magnetic Flux Ribbon (Smooth Continuous Spline)
    const stellaratorCurve = createStellaratorCurve(5.6, 1.15, 2, 3, 300);
    const stellaratorGeo = new THREE.TubeGeometry(stellaratorCurve, 300, 0.11, 32, true);
    const chromeRibbonMat = new THREE.MeshPhysicalMaterial({
      color: 0xf1f5f9,
      emissive: 0x0369a1,
      emissiveIntensity: 0.35,
      metalness: 0.98,
      roughness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      iridescence: 0.7,
      iridescenceIOR: 1.3,
    });
    const stellaratorMesh = new THREE.Mesh(stellaratorGeo, chromeRibbonMat);
    physGroup.add(stellaratorMesh);

    // Secondary Inner Energy Filament Ribbon (Harmonic 3,5 Knot)
    const innerKnotCurve = createStellaratorCurve(4.4, 0.65, 3, 5, 300);
    const innerKnotGeo = new THREE.TubeGeometry(innerKnotCurve, 300, 0.045, 24, true);
    const cyanFilamentMat = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      emissive: 0x00d4ff,
      emissiveIntensity: 2.2,
      roughness: 0.1,
      metalness: 0.5,
    });
    const innerKnotMesh = new THREE.Mesh(innerKnotGeo, cyanFilamentMat);
    physGroup.add(innerKnotMesh);

    // D. Precision-Machined Gyroscopic Gimbal Rings (256-segment Ultra Smooth)
    const createMachinedGimbal = (radius: number, tube: number, emissiveHex: number) => {
      const group = new THREE.Group();
      // Main Brushed Titanium Ring
      const mainGeo = new THREE.TorusGeometry(radius, tube, 64, 256);
      const mainMat = new THREE.MeshPhysicalMaterial({
        color: 0xe2e8f0,
        metalness: 0.96,
        roughness: 0.08,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
      });
      group.add(new THREE.Mesh(mainGeo, mainMat));

      // Inner Luminous Laser Track
      const trackGeo = new THREE.TorusGeometry(radius - tube * 0.85, tube * 0.28, 32, 256);
      const trackMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: emissiveHex,
        emissiveIntensity: 2.0,
      });
      group.add(new THREE.Mesh(trackGeo, trackMat));
      return group;
    };

    const gimbalA = createMachinedGimbal(7.4, 0.14, 0x00e5ff);
    gimbalA.rotation.x = Math.PI / 3.1;
    physGroup.add(gimbalA);

    const gimbalB = createMachinedGimbal(9.1, 0.1, 0x38bdf8);
    gimbalB.rotation.x = -Math.PI / 2.5;
    gimbalB.rotation.y = Math.PI / 5;
    physGroup.add(gimbalB);

    // E. Relativistic Accretion Disk (Custom Spiral Shader)
    const accretionMat = new THREE.ShaderMaterial({
      vertexShader: ACCRETION_VERTEX_SHADER,
      fragmentShader: ACCRETION_FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uColorInner: { value: new THREE.Color(0x7dd3fc) },
        uColorOuter: { value: new THREE.Color(0x1d4ed8) },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const accretionDisk = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), accretionMat);
    accretionDisk.rotation.x = Math.PI / 2.25;
    accretionDisk.rotation.y = -0.2;
    physGroup.add(accretionDisk);

    // F. Orbiting Liquid-Mercury Quantum Spheres (64x64)
    const mercuryCount = 8;
    const mercuryNodes: THREE.Mesh[] = [];
    const mercuryGeo = new THREE.SphereGeometry(0.32, 64, 64);
    const mercuryMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.2,
      metalness: 1.0,
      roughness: 0.0,
      clearcoat: 1.0,
    });
    for (let i = 0; i < mercuryCount; i++) {
      const m = new THREE.Mesh(mercuryGeo, mercuryMat);
      physGroup.add(m);
      mercuryNodes.push(m);
    }

    // =========================================================================
    // 7. 🧪 CHEMISTRY REALM: SCULPTED DNA HELIX & LIQUID ORBITAL (at -26, 0, -48)
    // =========================================================================
    const chemGroup = new THREE.Group();
    chemGroup.position.set(-26, 0, -48);
    scene.add(chemGroup);

    // A. Central Quantum Orbital Droplet (128x128 Custom Shader — Zero Flat Edges!)
    const chemCoreMat = new THREE.ShaderMaterial({
      vertexShader: PLASMA_VERTEX_SHADER,
      fragmentShader: PLASMA_FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uColorDeep: { value: new THREE.Color(0x022c22) },
        uColorMid: { value: new THREE.Color(0x059669) },
        uColorGlow: { value: new THREE.Color(0x6ee7b7) },
      },
    });
    const chemCoreMesh = new THREE.Mesh(new THREE.SphereGeometry(2.55, 128, 128), chemCoreMat);
    chemGroup.add(chemCoreMesh);

    // Outer Iridescent Glass Meniscus Shell
    const chemShellMat = new THREE.ShaderMaterial({
      vertexShader: FRESNEL_SHELL_VERTEX,
      fragmentShader: FRESNEL_SHELL_FRAGMENT,
      uniforms: {
        uRimColor: { value: new THREE.Color(0x34d399) },
        uInnerColor: { value: new THREE.Color(0x022c22) },
        uPower: { value: 2.2 },
        uOpacity: { value: 0.85 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const chemShellMesh = new THREE.Mesh(new THREE.SphereGeometry(3.25, 128, 128), chemShellMat);
    chemGroup.add(chemShellMesh);

    // B. Sculpted 3D Double-Helix Macromolecule Ring (Smooth Parametric Helices)
    const dnaGroup = new THREE.Group();
    chemGroup.add(dnaGroup);

    const createHelixTorusCurve = (majorR: number, minorR: number, twists: number, phaseOffset: number) => {
      const pts: THREE.Vector3[] = [];
      const steps = 280;
      for (let i = 0; i < steps; i++) {
        const u = (i / steps) * Math.PI * 2;
        const v = u * twists + phaseOffset;
        const r = majorR + minorR * Math.cos(v);
        const x = r * Math.cos(u);
        const y = r * Math.sin(u);
        const z = minorR * Math.sin(v);
        pts.push(new THREE.Vector3(x, y, z));
      }
      return new THREE.CatmullRomCurve3(pts, true);
    };

    const strandCurveA = createHelixTorusCurve(6.4, 0.95, 8, 0);
    const strandCurveB = createHelixTorusCurve(6.4, 0.95, 8, Math.PI);

    const strandMatPlatinum = new THREE.MeshPhysicalMaterial({
      color: 0xf8fafc,
      emissive: 0x059669,
      emissiveIntensity: 0.25,
      metalness: 0.96,
      roughness: 0.06,
      clearcoat: 1.0,
      iridescence: 0.85,
      iridescenceIOR: 1.35,
    });

    const strandMeshA = new THREE.Mesh(new THREE.TubeGeometry(strandCurveA, 280, 0.12, 32, true), strandMatPlatinum);
    const strandMeshB = new THREE.Mesh(new THREE.TubeGeometry(strandCurveB, 280, 0.12, 32, true), strandMatPlatinum);
    dnaGroup.add(strandMeshA);
    dnaGroup.add(strandMeshB);

    // Smooth Base-Pair Rungs & Glossy Valence Nodes along the Circular Double-Helix
    const rungCount = 24;
    const nodeGeoChem = new THREE.SphereGeometry(0.28, 48, 48);
    const nodeMatEmerald = new THREE.MeshPhysicalMaterial({
      color: 0x34d399,
      emissive: 0x10b981,
      emissiveIntensity: 1.4,
      metalness: 0.3,
      roughness: 0.04,
      clearcoat: 1.0,
    });
    const nodeMatCyan = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.4,
      metalness: 0.3,
      roughness: 0.04,
      clearcoat: 1.0,
    });

    for (let i = 0; i < rungCount; i++) {
      const t = i / rungCount;
      const pA = strandCurveA.getPointAt(t);
      const pB = strandCurveB.getPointAt(t);

      // Smooth connecting covalent bridge
      const bridgeCurve = new THREE.LineCurve3(pA, pB);
      const bridgeGeo = new THREE.TubeGeometry(bridgeCurve, 8, 0.045, 16, false);
      const bridgeMesh = new THREE.Mesh(bridgeGeo, i % 2 === 0 ? nodeMatEmerald : nodeMatCyan);
      dnaGroup.add(bridgeMesh);

      // Glossy valence nodes at junctions
      const nA = new THREE.Mesh(nodeGeoChem, nodeMatEmerald);
      nA.position.copy(pA);
      dnaGroup.add(nA);

      const nB = new THREE.Mesh(nodeGeoChem, nodeMatCyan);
      nB.position.copy(pB);
      dnaGroup.add(nB);
    }

    dnaGroup.rotation.x = Math.PI / 2.8;
    dnaGroup.rotation.y = -0.35;

    // C. Outer Precision Orbital Gimbal Ring
    const chemGimbal = createMachinedGimbal(9.2, 0.09, 0x10b981);
    chemGimbal.rotation.x = -Math.PI / 3.2;
    chemGimbal.rotation.z = Math.PI / 5;
    chemGroup.add(chemGimbal);

    // D. Orbiting Iridescent Valence Atoms (64x64 Smooth Pearlescent Spheres)
    const valenceGroup = new THREE.Group();
    chemGroup.add(valenceGroup);

    const valenceCount = 6;
    const valenceAtoms: THREE.Mesh[] = [];
    const valenceGeo = new THREE.SphereGeometry(0.58, 64, 64);
    const valenceMat = new THREE.MeshPhysicalMaterial({
      color: 0xa7f3d0,
      emissive: 0x059669,
      emissiveIntensity: 0.6,
      metalness: 0.65,
      roughness: 0.04,
      clearcoat: 1.0,
      iridescence: 1.0,
      iridescenceIOR: 1.4,
    });

    for (let i = 0; i < valenceCount; i++) {
      const v = new THREE.Mesh(valenceGeo, valenceMat);
      valenceGroup.add(v);
      valenceAtoms.push(v);
    }

    // ========== 8. EVENT LISTENERS ==========
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

    // ========== 9. ANIMATION & CHOREOGRAPHY LOOP ==========
    let frameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const p = scrollRef.current;

      // Smooth mouse inertia
      smoothMouse.current.x += (mouseRef.current.x - smoothMouse.current.x) * 0.04;
      smoothMouse.current.y += (mouseRef.current.y - smoothMouse.current.y) * 0.04;

      // Update Custom Shader Time Uniforms
      physPlasmaMat.uniforms.uTime.value = t;
      accretionMat.uniforms.uTime.value = t;
      chemCoreMat.uniforms.uTime.value = t * 0.9;

      // --- PHYSICS ANIMATION ---
      stellaratorMesh.rotation.z = t * 0.28;
      stellaratorMesh.rotation.x = Math.sin(t * 0.3) * 0.25;
      innerKnotMesh.rotation.z = -t * 0.45;
      innerKnotMesh.rotation.y = t * 0.25;

      gimbalA.rotation.z = t * 0.35;
      gimbalB.rotation.z = -t * 0.22;
      accretionDisk.rotation.z = -t * 0.15;

      for (let i = 0; i < mercuryCount; i++) {
        const angle = t * (0.65 + (i % 3) * 0.15) + (i / mercuryCount) * Math.PI * 2;
        const rad = 4.8 + (i % 2) * 3.2;
        mercuryNodes[i].position.set(
          Math.cos(angle) * rad,
          Math.sin(angle * 1.4) * 1.6,
          Math.sin(angle) * rad
        );
      }

      // --- CHEMISTRY ANIMATION ---
      dnaGroup.rotation.z = t * 0.22;
      dnaGroup.rotation.x = Math.PI / 2.8 + Math.sin(t * 0.35) * 0.12;
      chemGimbal.rotation.z = -t * 0.28;

      for (let i = 0; i < valenceCount; i++) {
        const angle = -t * 0.5 + (i / valenceCount) * Math.PI * 2;
        const rad = 4.6;
        valenceAtoms[i].position.set(
          Math.cos(angle) * rad,
          Math.sin(angle * 2.0) * 1.3,
          Math.sin(angle) * rad
        );
      }

      // Starfield drift
      stars.rotation.y = t * 0.004;

      // --- CINEMATIC CAMERA CHOREOGRAPHY ---
      if (p < 0.25) {
        const s = p / 0.25;
        targetCamPos.set(
          THREE.MathUtils.lerp(0, 10, s),
          THREE.MathUtils.lerp(2, 1.5, s),
          THREE.MathUtils.lerp(48, 30, s)
        );
        targetLookAt.set(
          THREE.MathUtils.lerp(0, 14, s),
          THREE.MathUtils.lerp(0, 0, s),
          THREE.MathUtils.lerp(0, -6, s)
        );
      } else if (p < 0.55) {
        const s = (p - 0.25) / 0.3;
        targetCamPos.set(
          THREE.MathUtils.lerp(10, 18, s),
          THREE.MathUtils.lerp(1.5, 3.0, s),
          THREE.MathUtils.lerp(30, 1, s)
        );
        targetLookAt.set(
          THREE.MathUtils.lerp(14, 24, s),
          THREE.MathUtils.lerp(0, 0, s),
          THREE.MathUtils.lerp(-6, -16, s)
        );
      } else if (p < 0.85) {
        const s = (p - 0.55) / 0.3;
        targetCamPos.set(
          THREE.MathUtils.lerp(18, -16, s),
          THREE.MathUtils.lerp(3.0, 2.5, s),
          THREE.MathUtils.lerp(1, -33, s)
        );
        targetLookAt.set(
          THREE.MathUtils.lerp(24, -26, s),
          THREE.MathUtils.lerp(0, 0, s),
          THREE.MathUtils.lerp(-16, -48, s)
        );
      } else {
        const s = (p - 0.85) / 0.15;
        targetCamPos.set(
          THREE.MathUtils.lerp(-16, 0, s),
          THREE.MathUtils.lerp(2.5, 25, s),
          THREE.MathUtils.lerp(-33, -10, s)
        );
        targetLookAt.set(
          THREE.MathUtils.lerp(-26, 0, s),
          THREE.MathUtils.lerp(0, -4, s),
          THREE.MathUtils.lerp(-48, -32, s)
        );
      }

      if (warpingRef.current) {
        targetCamPos.set(-26, 0, -47.2);
        targetLookAt.set(-26, 0, -52);
        currentCamPos.lerp(targetCamPos, 0.12);
        currentLookAt.lerp(targetLookAt, 0.12);
        camera.fov = THREE.MathUtils.lerp(camera.fov, 80, 0.08);
        camera.updateProjectionMatrix();
      } else {
        currentCamPos.lerp(targetCamPos, 0.05);
        currentLookAt.lerp(targetLookAt, 0.05);
      }

      camera.position.x = currentCamPos.x + smoothMouse.current.x * (warpingRef.current ? 0.1 : 0.9);
      camera.position.y = currentCamPos.y + smoothMouse.current.y * (warpingRef.current ? 0.1 : 0.7);
      camera.position.z = currentCamPos.z;
      camera.lookAt(currentLookAt);

      composer.render();
    };

    animate();

    // ========== 10. CLEANUP ==========
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
