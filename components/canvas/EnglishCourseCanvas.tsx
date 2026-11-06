'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

interface EnglishCourseCanvasProps {
  scrollProgress: number; // 0.0 to 1.0 across 12 chapters
}

// ============================================================================
// CUSTOM GLSL SHADERS FOR LINGUISTIC CORES & HOLOGRAPHIC SHELLS
// ============================================================================

const CORE_VERTEX_SHADER = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewPosition;
  uniform float uTime;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    float wave = sin(position.x * 2.4 + uTime * 1.8) * cos(position.y * 2.4 - uTime * 1.5) * sin(position.z * 2.4 + uTime * 1.6);
    vec3 displaced = position + normal * (wave * 0.065);
    vPosition = displaced;
    vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const CORE_FRAGMENT_SHADER = `
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
    vec3 shift = vec3(42.0);
    for (int i = 0; i < 4; ++i) {
      v += a * (sin(p.x) * cos(p.y) + sin(p.y) * cos(p.z) + sin(p.z) * cos(p.x)) * 0.3333;
      p = p * 2.03 + shift;
      a *= 0.5;
    }
    return v * 0.5 + 0.5;
  }

  void main() {
    vec3 viewDir = normalize(vViewPosition);
    vec3 normal = normalize(vNormal);

    vec3 p = vPosition * 1.35 + vec3(uTime * 0.28, -uTime * 0.22, uTime * 0.18);
    float n = fbm(p * 1.75);
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.5);

    vec3 col = mix(uColorDeep, uColorMid, smoothstep(0.25, 0.8, n));
    col += uColorGlow * (pow(n, 2.8) * 0.75 + fresnel * 1.35);

    gl_FragColor = vec4(col, 1.0);
  }
`;

const HOLO_SHELL_VERTEX = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const HOLO_SHELL_FRAGMENT = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  uniform vec3 uColor;
  uniform float uOpacity;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    float ndotv = max(dot(normal, viewDir), 0.0);
    float fresnel = pow(1.0 - ndotv, 2.1);
    float core = pow(ndotv, 1.6) * 0.3;

    vec3 lightDir = normalize(vec3(0.5, 0.8, 0.6));
    vec3 halfVec = normalize(lightDir + viewDir);
    float spec = pow(max(dot(normal, halfVec), 0.0), 84.0);

    vec3 finalCol = uColor * (fresnel * 1.25 + core) + vec3(1.0) * spec * 0.75;
    float alpha = clamp((fresnel + core) * uOpacity + spec * 0.45, 0.04, 0.86);
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
  gradient.addColorStop(0.2, 'rgba(226, 232, 240, 0.85)');
  gradient.addColorStop(0.5, 'rgba(148, 163, 184, 0.22)');
  gradient.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

// Create high-resolution glowing linguistic glyph texture for 3D floating typography
function createGlyphTexture(symbol: string): THREE.Texture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, size, size);

  // Subtle circular halo ring
  const grad = ctx.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, size / 2.2);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
  grad.addColorStop(0.65, 'rgba(148, 163, 184, 0.05)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Crisp typographic symbol
  ctx.font = '700 84px "Inter", "Georgia", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(255, 255, 255, 0.75)';
  ctx.shadowBlur = 18;
  ctx.fillStyle = 'rgba(248, 250, 252, 0.92)';
  ctx.fillText(symbol, size / 2, size / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export default function EnglishCourseCanvas({ scrollProgress }: EnglishCourseCanvasProps) {
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
    scene.fog = new THREE.FogExp2(0x030306, 0.0062);

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
    renderer.toneMappingExposure = 1.12;
    container.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envMap = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    scene.environment = envMap;
    roomEnv.dispose();

    // ========== 3. CINEMATIC POST-PROCESSING (Subtle Refined Bloom) ==========
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.42,
      0.6,
      0.72
    );
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());

    // ========== 4. STUDIO LIGHTING ==========
    const ambient = new THREE.AmbientLight(0x0f172a, 1.9);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xf8fafc, 2.8);
    keyLight.position.set(22, 32, 26);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x94a3b8, 1.5);
    fillLight.position.set(-22, 14, 20);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xe2e8f0, 1.4);
    rimLight.position.set(0, -12, -32);
    scene.add(rimLight);

    // ========== 5. BOKEH STARFIELD ==========
    const bokehTex = createBokehTexture(128);
    const starCount = 1400;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);

    const starPalette = [
      new THREE.Color(0xffffff),
      new THREE.Color(0xe2e8f0),
      new THREE.Color(0xcbd5e1),
      new THREE.Color(0xbae6fd),
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
      size: 1.45,
      vertexColors: true,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // ========== 5B. 3D FLOATING LINGUISTIC GLYPH STREAM ==========
    const glyphSymbols = [
      'Aa', 'S+V', 'V₃', 'Ω', '« »', '?', '¶', '§', 'If', 'To', 'æ', '[ ]'
    ];
    const glyphTextures = glyphSymbols.map((sym) => createGlyphTexture(sym));
    const glyphSprites: {
      sprite: THREE.Sprite;
      basePos: THREE.Vector3;
      phase: number;
      speed: number;
    }[] = [];

    const glyphGroup = new THREE.Group();
    scene.add(glyphGroup);

    for (let i = 0; i < 36; i++) {
      const tex = glyphTextures[i % glyphTextures.length];
      const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        opacity: 0.38,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      const zSpread = 22 - (i / 36) * 96;
      const angle = i * 1.15;
      const radius = 9 + (i % 4) * 3.5;
      const basePos = new THREE.Vector3(
        Math.cos(angle) * radius,
        Math.sin(angle * 0.8) * 5.5,
        zSpread
      );
      sprite.position.copy(basePos);
      const scale = 1.35 + (i % 3) * 0.35;
      sprite.scale.set(scale, scale, 1);
      glyphGroup.add(sprite);
      glyphSprites.push({
        sprite,
        basePos,
        phase: i * 0.7,
        speed: 0.6 + (i % 5) * 0.15,
      });
    }

    // Shared Materials (Clean Silver-Platinum & Ice-Slate)
    const matPlatinum = new THREE.MeshPhysicalMaterial({
      color: 0xf8fafc,
      emissive: 0x334155,
      emissiveIntensity: 0.35,
      metalness: 0.95,
      roughness: 0.05,
      clearcoat: 1.0,
    });

    const matBrushedTitanium = new THREE.MeshPhysicalMaterial({
      color: 0xcbd5e1,
      emissive: 0x1e293b,
      emissiveIntensity: 0.25,
      metalness: 0.9,
      roughness: 0.08,
      clearcoat: 1.0,
      iridescence: 0.45,
      iridescenceIOR: 1.3,
    });

    const matLuminousNode = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      emissive: 0xe2e8f0,
      emissiveIntensity: 1.4,
      metalness: 0.9,
      roughness: 0.03,
      clearcoat: 1.0,
    });

    const createSmoothRing = (radius: number, tube: number = 0.065) => {
      const geo = new THREE.TorusGeometry(radius, tube, 48, 256);
      return new THREE.Mesh(geo, matPlatinum);
    };

    // =========================================================================
    // 6. SCULPTED 3D LINGUISTIC CONSTRUCTS ALONG CAMERA FLIGHT
    // =========================================================================

    // --- CONSTRUCT 1: CHRONOS DIAGNOSTIC GYROSCOPE & 12-TENSE CONTINUUM (Ch 1 - 3) ---
    // Position: (16, 2, 10)
    const chronosGroup = new THREE.Group();
    chronosGroup.position.set(16, 2, 10);
    scene.add(chronosGroup);

    const coreShaderMat = new THREE.ShaderMaterial({
      vertexShader: CORE_VERTEX_SHADER,
      fragmentShader: CORE_FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uColorDeep: { value: new THREE.Color(0x0f172a) },
        uColorMid: { value: new THREE.Color(0x64748b) },
        uColorGlow: { value: new THREE.Color(0xf8fafc) },
      },
    });
    const chronosCore = new THREE.Mesh(new THREE.SphereGeometry(1.65, 128, 128), coreShaderMat);
    chronosGroup.add(chronosCore);

    const holoShellMat = new THREE.ShaderMaterial({
      vertexShader: HOLO_SHELL_VERTEX,
      fragmentShader: HOLO_SHELL_FRAGMENT,
      uniforms: {
        uColor: { value: new THREE.Color(0xe2e8f0) },
        uOpacity: { value: 0.45 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const chronosShell = new THREE.Mesh(new THREE.SphereGeometry(2.35, 128, 128), holoShellMat);
    chronosGroup.add(chronosShell);

    const ringPresent = createSmoothRing(4.4, 0.07);
    ringPresent.rotation.x = Math.PI / 3;
    const ringPast = createSmoothRing(6.0, 0.065);
    ringPast.rotation.x = -Math.PI / 3.4;
    ringPast.rotation.y = Math.PI / 5;
    const ringFuture = createSmoothRing(7.6, 0.06);
    ringFuture.rotation.x = Math.PI / 2.2;
    chronosGroup.add(ringPresent, ringPast, ringFuture);

    // 12 Orbiting Tense Nodes
    const tenseNodes: THREE.Mesh[] = [];
    const nodeGeo = new THREE.SphereGeometry(0.25, 48, 48);
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(nodeGeo, matLuminousNode);
      chronosGroup.add(m);
      tenseNodes.push(m);
    }

    // --- CONSTRUCT 2: SYNTACTIC NODE LATTICE & DUAL-POLARITY VERB HELIX (Ch 4 - 6) ---
    // Position: (-18, 0, -14)
    const syntaxGroup = new THREE.Group();
    syntaxGroup.position.set(-18, 0, -14);
    scene.add(syntaxGroup);

    const phi = (1 + Math.sqrt(5)) / 2;
    const invPhi = 1 / phi;
    const rawVerts = [
      [-1, -1, -1], [-1, -1, 1], [-1, 1, -1], [-1, 1, 1],
      [1, -1, -1], [1, -1, 1], [1, 1, -1], [1, 1, 1],
      [0, -invPhi, -phi], [0, -invPhi, phi], [0, invPhi, -phi], [0, invPhi, phi],
      [-invPhi, -phi, 0], [-invPhi, phi, 0], [invPhi, -phi, 0], [invPhi, phi, 0],
      [-phi, 0, -invPhi], [phi, 0, -invPhi], [-phi, 0, invPhi], [phi, 0, invPhi],
    ];

    const cageScale = 2.55;
    const cagePoints = rawVerts.map(
      ([x, y, z]) => new THREE.Vector3(x * cageScale, y * cageScale, z * cageScale)
    );
    const wordNodeLg = new THREE.SphereGeometry(0.46, 64, 64);
    const wordNodeSm = new THREE.SphereGeometry(0.36, 64, 64);

    const rootCenter = new THREE.Mesh(new THREE.SphereGeometry(1.1, 64, 64), matBrushedTitanium);
    syntaxGroup.add(rootCenter);

    cagePoints.forEach((pt, idx) => {
      const m = new THREE.Mesh(
        idx % 2 === 0 ? wordNodeLg : wordNodeSm,
        idx % 2 === 0 ? matPlatinum : matBrushedTitanium
      );
      m.position.copy(pt);
      syntaxGroup.add(m);

      if (idx < 8) {
        const radCurve = new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), pt);
        const radTube = new THREE.Mesh(
          new THREE.TubeGeometry(radCurve, 12, 0.055, 20, false),
          matPlatinum
        );
        syntaxGroup.add(radTube);
      }
    });

    const targetEdge = 2 * invPhi * cageScale;
    for (let i = 0; i < cagePoints.length; i++) {
      for (let j = i + 1; j < cagePoints.length; j++) {
        if (Math.abs(cagePoints[i].distanceTo(cagePoints[j]) - targetEdge) < 0.25) {
          const edgeCurve = new THREE.LineCurve3(cagePoints[i], cagePoints[j]);
          const edgeMesh = new THREE.Mesh(
            new THREE.TubeGeometry(edgeCurve, 12, 0.065, 20, false),
            matBrushedTitanium
          );
          syntaxGroup.add(edgeMesh);
        }
      }
    }

    const outerLexicalRing = createSmoothRing(6.3, 0.075);
    outerLexicalRing.rotation.x = Math.PI / 2.5;
    syntaxGroup.add(outerLexicalRing);

    // --- CONSTRUCT 3: ACOUSTIC HARMONIC WAVEFORMS & OPTICAL READING PRISM (Ch 7 - 9) ---
    // Position: (18, -1, -38)
    const prismGroup = new THREE.Group();
    prismGroup.position.set(18, -1, -38);
    scene.add(prismGroup);

    // Sculpted Octahedral Reading Prism Core
    const prismCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(2.3, 2),
      matPlatinum
    );
    prismGroup.add(prismCore);

    const prismGlass = new THREE.Mesh(
      new THREE.SphereGeometry(4.7, 128, 128),
      holoShellMat
    );
    prismGroup.add(prismGlass);

    const equatorRing = createSmoothRing(4.85, 0.07);
    equatorRing.rotation.x = Math.PI / 2;
    prismGroup.add(equatorRing);

    // 3D Acoustic Speech Waveforms
    const createWaveformRibbon = (amp: number, freq: number, zOff: number) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 80; i++) {
        const x = -3.8 + (i / 80) * 7.6;
        const env = Math.cos(((x / 3.8) * Math.PI) / 2);
        const y = Math.sin(x * freq) * amp * env;
        pts.push(new THREE.Vector3(x, y, zOff));
      }
      const curve = new THREE.CatmullRomCurve3(pts, false);
      return new THREE.Mesh(
        new THREE.TubeGeometry(curve, 140, 0.075, 24, false),
        matLuminousNode
      );
    };

    const waveA = createWaveformRibbon(1.9, 2.4, 0);
    const waveB = createWaveformRibbon(1.2, 3.6, 0.7);
    const waveC = createWaveformRibbon(1.4, 1.8, -0.7);
    prismGroup.add(waveA, waveB, waveC);

    // --- CONSTRUCT 4: PRECISION SYNTAX SCANNER & APEX CODEX NEXUS (Ch 10 - 12) ---
    // Position: (-16, 1, -64)
    const codexGroup = new THREE.Group();
    codexGroup.position.set(-16, 1, -64);
    scene.add(codexGroup);

    // Structured 3D Codex Ring Matrix
    const codexRadius = 3.6;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const pos = new THREE.Vector3(
        Math.cos(angle) * codexRadius,
        Math.sin(angle) * codexRadius,
        0
      );
      const outerPos = new THREE.Vector3(
        Math.cos(angle) * (codexRadius + 1.6),
        Math.sin(angle) * (codexRadius + 1.6),
        0
      );

      const nInner = new THREE.Mesh(wordNodeLg, matBrushedTitanium);
      nInner.position.copy(pos);
      codexGroup.add(nInner);

      const nOuter = new THREE.Mesh(wordNodeSm, matLuminousNode);
      nOuter.position.copy(outerPos);
      codexGroup.add(nOuter);

      const bridge = new THREE.LineCurve3(pos, outerPos);
      codexGroup.add(
        new THREE.Mesh(new THREE.TubeGeometry(bridge, 8, 0.055, 20, false), matPlatinum)
      );

      const nextAngle = ((i + 1) / 8) * Math.PI * 2;
      const nextPos = new THREE.Vector3(
        Math.cos(nextAngle) * codexRadius,
        Math.sin(nextAngle) * codexRadius,
        0
      );
      const ringSeg = new THREE.LineCurve3(pos, nextPos);
      codexGroup.add(
        new THREE.Mesh(new THREE.TubeGeometry(ringSeg, 12, 0.09, 24, false), matPlatinum)
      );
    }

    // Scanning Laser Torus Ring
    const scannerRing = createSmoothRing(5.8, 0.085);
    codexGroup.add(scannerRing);

    // Outer Helical Blueprint Ribbon
    const helixPts: THREE.Vector3[] = [];
    for (let i = 0; i < 200; i++) {
      const u = (i / 200) * Math.PI * 2;
      const r = 6.5 + 0.55 * Math.cos(u * 6);
      helixPts.push(new THREE.Vector3(r * Math.cos(u), r * Math.sin(u), 1.35 * Math.sin(u * 6)));
    }
    const helixCurve = new THREE.CatmullRomCurve3(helixPts, true);
    const helixMesh = new THREE.Mesh(
      new THREE.TubeGeometry(helixCurve, 240, 0.075, 24, true),
      matBrushedTitanium
    );
    codexGroup.add(helixMesh);

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

    // ========== 8. RENDER & ULTRA-SMOOTH DAMPED SCROLL ANIMATION LOOP ==========
    let frameId: number;
    const clock = new THREE.Clock();
    let dampedScroll = scrollRef.current;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Smoothly damp scroll progress & compute scroll velocity for organic inertia
      const rawTargetScroll = scrollRef.current;
      const scrollDiff = rawTargetScroll - dampedScroll;
      dampedScroll += scrollDiff * 0.065;
      const p = dampedScroll;

      smoothMouse.current.x += (mouseRef.current.x - smoothMouse.current.x) * 0.04;
      smoothMouse.current.y += (mouseRef.current.y - smoothMouse.current.y) * 0.04;

      coreShaderMat.uniforms.uTime.value = t;

      // 1. Animate Chronos Gyroscope & 12 Tense Nodes
      chronosGroup.rotation.y = t * 0.2;
      ringPresent.rotation.z = t * 0.5;
      ringPast.rotation.z = -t * 0.36;
      ringFuture.rotation.z = t * 0.25;

      for (let i = 0; i < 12; i++) {
        const ringR = i < 4 ? 4.4 : i < 8 ? 6.0 : 7.6;
        const spd = i < 4 ? 1.3 : i < 8 ? 0.95 : 0.68;
        const phase = (i / 12) * Math.PI * 2;
        const a = t * spd + phase;
        tenseNodes[i].position.set(
          Math.cos(a) * ringR,
          Math.sin(a) * ringR * (i % 2 === 0 ? 0.72 : -0.72),
          Math.sin(a * 1.4) * 1.4
        );
      }

      // 2. Animate Syntactic Node Lattice
      syntaxGroup.rotation.x = t * 0.14;
      syntaxGroup.rotation.y = t * 0.22;
      outerLexicalRing.rotation.z = -t * 0.32;

      // 3. Animate Reading Prism & Acoustic Waveforms
      prismCore.rotation.y = t * 0.38;
      prismCore.rotation.x = Math.sin(t * 0.4) * 0.3;
      prismGroup.rotation.y = Math.sin(t * 0.22) * 0.3;
      waveA.rotation.x = Math.sin(t * 1.6) * 0.25;
      waveB.rotation.x = Math.cos(t * 1.9) * 0.35;
      waveC.rotation.x = Math.sin(t * 1.3 + 1.0) * 0.3;

      // 4. Animate Codex Matrix & Precision Scanner
      codexGroup.rotation.y = t * 0.2;
      codexGroup.rotation.x = Math.sin(t * 0.3) * 0.2;
      scannerRing.position.z = Math.sin(t * 1.4) * 1.6;
      helixMesh.rotation.z = -t * 0.16;

      // 5. Animate Floating Linguistic Glyph Stream
      for (const item of glyphSprites) {
        item.sprite.position.y =
          item.basePos.y + Math.sin(t * item.speed + item.phase) * 0.85;
        item.sprite.position.x =
          item.basePos.x + Math.cos(t * (item.speed * 0.7) + item.phase) * 0.55;
      }

      stars.rotation.y = t * 0.0035;

      // 6. CAMERA FLIGHT ALONG ENGLISH CHAPTER CLUSTERS
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
      } else if (p < 0.5) {
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
        const s = (p - 0.5) / 0.25;
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

      currentCamPos.lerp(targetCamPos, 0.055);
      currentLookAt.lerp(targetLookAt, 0.055);

      camera.position.x = currentCamPos.x + smoothMouse.current.x * 0.8;
      camera.position.y = currentCamPos.y + smoothMouse.current.y * 0.6;
      camera.position.z = currentCamPos.z;
      camera.lookAt(currentLookAt);

      // Subtle cinematic banking proportional to scroll velocity
      camera.rotation.z += (scrollDiff * -0.18 - camera.rotation.z) * 0.08;

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
        if (obj instanceof THREE.Points || obj instanceof THREE.Sprite) {
          obj.geometry?.dispose();
          (obj.material as THREE.Material)?.dispose();
        }
      });

      bokehTex.dispose();
      glyphTextures.forEach((t) => t.dispose());
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
