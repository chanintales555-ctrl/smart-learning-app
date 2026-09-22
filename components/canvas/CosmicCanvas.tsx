'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface CosmicCanvasProps {
  scrollProgress: number;
  isWarping?: boolean;
}

// Generate soft bokeh texture for celestial stars
function createBokehTexture(size: number = 64): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  gradient.addColorStop(0.2, 'rgba(235, 245, 255, 0.85)');
  gradient.addColorStop(0.5, 'rgba(160, 200, 255, 0.25)');
  gradient.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
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
    scene.fog = new THREE.FogExp2(0x030306, 0.006);

    const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 800);
    camera.position.set(0, 2, 48);

    const currentCamPos = new THREE.Vector3(0, 2, 48);
    const targetCamPos = new THREE.Vector3(0, 2, 48);
    const currentLookAt = new THREE.Vector3(0, 0, 0);
    const targetLookAt = new THREE.Vector3(0, 0, 0);

    // ========== 2. RENDERER & HIGH-END POST SETTINGS ==========
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // ========== 3. PROCEDURAL STUDIO ENVIRONMENT MAP (Luxury PBR Reflections) ==========
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    const envCanvas = document.createElement('canvas');
    envCanvas.width = 512;
    envCanvas.height = 256;
    const envCtx = envCanvas.getContext('2d')!;

    // Soft dark studio gradient with overhead diffuse lighting
    const envGrad = envCtx.createLinearGradient(0, 0, 0, 256);
    envGrad.addColorStop(0, '#1e293b');
    envGrad.addColorStop(0.35, '#0f172a');
    envGrad.addColorStop(0.7, '#05070f');
    envGrad.addColorStop(1, '#020306');
    envCtx.fillStyle = envGrad;
    envCtx.fillRect(0, 0, 512, 256);

    // Overhead studio softbox
    const softbox = envCtx.createRadialGradient(256, 40, 0, 256, 40, 140);
    softbox.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    softbox.addColorStop(0.4, 'rgba(180, 220, 255, 0.4)');
    softbox.addColorStop(1, 'rgba(0, 0, 0, 0)');
    envCtx.fillStyle = softbox;
    envCtx.fillRect(0, 0, 512, 256);

    // Side rim softbox
    const sidebox = envCtx.createRadialGradient(80, 120, 0, 80, 120, 90);
    sidebox.addColorStop(0, 'rgba(140, 200, 255, 0.6)');
    sidebox.addColorStop(1, 'rgba(0, 0, 0, 0)');
    envCtx.fillStyle = sidebox;
    envCtx.fillRect(0, 0, 512, 256);

    const envTexture = new THREE.CanvasTexture(envCanvas);
    envTexture.mapping = THREE.EquirectangularReflectionMapping;
    const envMap = pmremGenerator.fromEquirectangular(envTexture).texture;
    scene.environment = envMap;

    // ========== 4. STUDIO LIGHTING HIERARCHY ==========
    const ambient = new THREE.AmbientLight(0x0c1322, 2.2);
    scene.add(ambient);

    // Key Light - Precision Cool Platinum
    const keyLight = new THREE.DirectionalLight(0xe2e8f0, 3.2);
    keyLight.position.set(25, 35, 30);
    scene.add(keyLight);

    // Fill Light - Subtle Cyan
    const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
    fillLight.position.set(-25, 15, 20);
    scene.add(fillLight);

    // Rim Backlight - Crisp Edge Definition
    const rimLight = new THREE.DirectionalLight(0x94a3b8, 2.0);
    rimLight.position.set(0, -10, -35);
    scene.add(rimLight);

    // Accent Lights
    const physAccent = new THREE.PointLight(0x00f0ff, 4.5, 45, 1.4);
    physAccent.position.set(24, 2, -16);
    scene.add(physAccent);

    const chemAccent = new THREE.PointLight(0x10b981, 4.5, 45, 1.4);
    chemAccent.position.set(-26, 0, -48);
    scene.add(chemAccent);

    // ========== 5. REFINED CELESTIAL BOKEH STARFIELD ==========
    const bokehTex = createBokehTexture(64);
    const starCount = 1800; // Elegant, not crowded
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);

    const starPalette = [
      new THREE.Color(0xffffff), // Pure white
      new THREE.Color(0xdbeafe), // Ice blue
      new THREE.Color(0xfef3c7), // Warm champagne
      new THREE.Color(0xbae6fd), // Pale cyan
    ];

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 70 + Math.pow(Math.random(), 0.5) * 280;
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
      size: 1.6,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // ========== 6. 🪐 PHYSICS REALM: THE QUANTUM CORE (at 24, 0, -16) ==========
    const physGroup = new THREE.Group();
    physGroup.position.set(24, 0, -16);
    scene.add(physGroup);

    // A. Outer Optical Glass Sphere (Ultra-smooth 64x64, Refractive)
    const glassSphereGeo = new THREE.SphereGeometry(3.4, 64, 64);
    const glassSphereMat = new THREE.MeshPhysicalMaterial({
      color: 0x020817,
      emissive: 0x002855,
      emissiveIntensity: 0.3,
      metalness: 0.05,
      roughness: 0.03,
      transmission: 0.92,
      thickness: 3.2,
      ior: 1.54,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      transparent: true,
      opacity: 0.95,
    });
    const glassCore = new THREE.Mesh(glassSphereGeo, glassSphereMat);
    physGroup.add(glassCore);

    // Inner Luminous Quantum Singularity
    const innerCoreGeo = new THREE.SphereGeometry(1.6, 48, 48);
    const innerCoreMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x00d4ff,
      emissiveIntensity: 2.4,
      roughness: 0.1,
      metalness: 0.2,
    });
    const innerCore = new THREE.Mesh(innerCoreGeo, innerCoreMat);
    physGroup.add(innerCore);

    // B. Precision-Engineered Liquid Platinum / Titanium Rings
    const createLuxuryRing = (radius: number, tube: number, color: number, emissive: number) => {
      const geo = new THREE.TorusGeometry(radius, tube, 48, 128);
      const mat = new THREE.MeshPhysicalMaterial({
        color,
        emissive,
        emissiveIntensity: 0.2,
        metalness: 0.96,
        roughness: 0.08,
        clearcoat: 1.0,
        clearcoatRoughness: 0.06,
        reflectivity: 1.0,
      });
      return new THREE.Mesh(geo, mat);
    };

    const ringA = createLuxuryRing(6.8, 0.14, 0xe2e8f0, 0x0284c7);
    ringA.rotation.x = Math.PI / 3.2;
    ringA.rotation.y = 0.35;
    physGroup.add(ringA);

    const ringB = createLuxuryRing(8.4, 0.11, 0xcfd8dc, 0x0369a1);
    ringB.rotation.x = -Math.PI / 2.6;
    ringB.rotation.y = Math.PI / 6;
    physGroup.add(ringB);

    const ringC = createLuxuryRing(10.2, 0.08, 0x94a3b8, 0x0284c7);
    ringC.rotation.x = Math.PI / 2.1;
    ringC.rotation.z = Math.PI / 4.5;
    physGroup.add(ringC);

    // C. Orbiting Platinum-Mercury Nodes (Clean, minimal, 10 nodes)
    const fluxGroup = new THREE.Group();
    physGroup.add(fluxGroup);

    const nodeGeo = new THREE.SphereGeometry(0.3, 32, 32);
    const nodeMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.4,
      metalness: 0.98,
      roughness: 0.02,
      clearcoat: 1.0,
    });

    const fluxCount = 10;
    const fluxNodes: THREE.Mesh[] = [];
    for (let i = 0; i < fluxCount; i++) {
      const n = new THREE.Mesh(nodeGeo, nodeMat);
      fluxGroup.add(n);
      fluxNodes.push(n);
    }

    // ========== 7. 🧪 CHEMISTRY REALM: THE MOLECULAR PRISM (at -26, 0, -48) ==========
    const chemGroup = new THREE.Group();
    chemGroup.position.set(-26, 0, -48);
    scene.add(chemGroup);

    // A. Faceted Optical Emerald Crystal (Icosahedron Subdivision 3)
    const crystalGeo = new THREE.IcosahedronGeometry(3.6, 3);
    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: 0x012417,
      emissive: 0x059669,
      emissiveIntensity: 0.45,
      metalness: 0.08,
      roughness: 0.04,
      transmission: 0.88,
      thickness: 2.8,
      ior: 1.58,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      transparent: true,
      opacity: 0.93,
    });
    const crystalCore = new THREE.Mesh(crystalGeo, crystalMat);
    chemGroup.add(crystalCore);

    // Inner Emerald Pulse Sphere
    const chemInnerGeo = new THREE.SphereGeometry(1.7, 48, 48);
    const chemInnerMat = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x10b981,
      emissiveIntensity: 2.0,
      roughness: 0.05,
      metalness: 0.1,
    });
    const chemInner = new THREE.Mesh(chemInnerGeo, chemInnerMat);
    chemGroup.add(chemInner);

    // B. Molecular Lattice Nodes (Curated Platinum & Emerald Spheres)
    const latticeGroup = new THREE.Group();
    chemGroup.add(latticeGroup);

    const atomCount = 8;
    const atomMeshes: THREE.Mesh[] = [];
    const atomGeo = new THREE.SphereGeometry(0.7, 40, 40);

    // Refined dual-tone palette: Emerald glass & Liquid Platinum
    const atomMatEmerald = new THREE.MeshPhysicalMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.5,
      metalness: 0.3,
      roughness: 0.1,
      clearcoat: 1.0,
    });
    const atomMatPlatinum = new THREE.MeshPhysicalMaterial({
      color: 0xf1f5f9,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.3,
      metalness: 0.95,
      roughness: 0.08,
      clearcoat: 1.0,
    });

    for (let i = 0; i < atomCount; i++) {
      const mat = i % 2 === 0 ? atomMatEmerald : atomMatPlatinum;
      const atom = new THREE.Mesh(atomGeo, mat);
      latticeGroup.add(atom);
      atomMeshes.push(atom);
    }

    // Cylindrical struts connecting atoms
    const strutGeo = new THREE.CylinderGeometry(0.06, 0.06, 1, 16);
    const strutMat = new THREE.MeshPhysicalMaterial({
      color: 0x94a3b8,
      metalness: 0.95,
      roughness: 0.15,
      clearcoat: 0.6,
    });
    const struts: THREE.Mesh[] = [];
    for (let i = 0; i < atomCount; i++) {
      const s = new THREE.Mesh(strutGeo, strutMat);
      latticeGroup.add(s);
      struts.push(s);
    }

    // C. Orbital Platinum Tracks
    const chemRingA = createLuxuryRing(7.2, 0.09, 0xa7f3d0, 0x059669);
    chemRingA.rotation.x = Math.PI / 2.3;
    chemRingA.rotation.z = 0.25;
    chemGroup.add(chemRingA);

    const chemRingB = createLuxuryRing(9.2, 0.07, 0x94a3b8, 0x10b981);
    chemRingB.rotation.x = -Math.PI / 3.2;
    chemRingB.rotation.y = Math.PI / 4.5;
    chemGroup.add(chemRingB);

    // ========== 8. VOLUMETRIC STUDIO FOG GLOW ==========
    const createSoftFog = (pos: THREE.Vector3, color: number, scale: number) => {
      const geo = new THREE.SphereGeometry(1, 32, 32);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.045,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      mesh.scale.setScalar(scale);
      return mesh;
    };

    scene.add(createSoftFog(new THREE.Vector3(24, 0, -16), 0x0099ff, 26));
    scene.add(createSoftFog(new THREE.Vector3(-26, 0, -48), 0x00e676, 24));
    scene.add(createSoftFog(new THREE.Vector3(0, -4, -30), 0x1e1b4b, 45));

    // ========== 9. EVENT LISTENERS ==========
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseRef.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // ========== 10. SMOOTH RENDER LOOP ==========
    let frameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const p = scrollRef.current;

      // Mouse inertia damping
      smoothMouse.current.x += (mouseRef.current.x - smoothMouse.current.x) * 0.04;
      smoothMouse.current.y += (mouseRef.current.y - smoothMouse.current.y) * 0.04;

      // --- PHYSICS ROTATION & HARMONICS ---
      ringA.rotation.z = t * 0.45;
      ringA.rotation.x = Math.PI / 3.2 + Math.sin(t * 0.25) * 0.08;
      ringB.rotation.z = -t * 0.35;
      ringB.rotation.y = Math.PI / 6 + Math.cos(t * 0.2) * 0.06;
      ringC.rotation.z = t * 0.25;

      const pPulse = 1.0 + Math.sin(t * 1.8) * 0.035;
      glassCore.scale.setScalar(pPulse);
      innerCore.scale.setScalar(pPulse * 0.55);
      (innerCoreMat.emissiveIntensity as number) = 1.8 + Math.sin(t * 2.5) * 0.6;

      // Flux nodes smooth orbit
      for (let i = 0; i < fluxCount; i++) {
        const orbitR = 5.2 + (i % 2) * 2.4;
        const speed = 0.7 + (i % 3) * 0.2;
        const phase = (i / fluxCount) * Math.PI * 2;
        const angle = t * speed + phase;
        fluxNodes[i].position.set(
          Math.cos(angle) * orbitR,
          Math.sin(angle * 1.2) * orbitR * 0.3,
          Math.sin(angle) * orbitR * 0.8
        );
      }

      physAccent.intensity = 3.8 + Math.sin(t * 2) * 0.8;

      // --- CHEMISTRY ROTATION & HARMONICS ---
      crystalCore.rotation.y = t * 0.12;
      crystalCore.rotation.x = Math.sin(t * 0.25) * 0.12;
      chemInner.scale.setScalar(1.0 + Math.sin(t * 2) * 0.05);

      for (let i = 0; i < atomCount; i++) {
        const r = 5.2 + (i % 2) * 2.2;
        const speed = 0.45 + (i % 2) * 0.12;
        const phase = (i / atomCount) * Math.PI * 2;
        const a = t * speed + phase;
        atomMeshes[i].position.set(
          Math.cos(a) * r,
          Math.sin(a * 0.8) * r * 0.35,
          Math.sin(a) * r
        );
      }

      for (let i = 0; i < atomCount; i++) {
        const p1 = atomMeshes[i].position;
        const p2 = atomMeshes[(i + 1) % atomCount].position;
        const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        const dir = new THREE.Vector3().subVectors(p2, p1);
        const len = dir.length();

        struts[i].position.copy(mid);
        struts[i].scale.set(1, len, 1);
        struts[i].quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      }

      chemRingA.rotation.z = t * 0.3;
      chemRingB.rotation.z = -t * 0.22;
      chemAccent.intensity = 3.8 + Math.sin(t * 1.8) * 0.8;

      // Starfield gentle drift
      stars.rotation.y = t * 0.005;

      // --- CINEMATIC CAMERA CHOREOGRAPHY ---
      if (p < 0.25) {
        // Stage 1: Hero Vista
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
        // Stage 2: Quantum Physics Approach
        const s = (p - 0.25) / 0.3;
        targetCamPos.set(
          THREE.MathUtils.lerp(10, 18, s),
          THREE.MathUtils.lerp(1.5, 3.2, s),
          THREE.MathUtils.lerp(30, 0, s)
        );
        targetLookAt.set(
          THREE.MathUtils.lerp(14, 24, s),
          THREE.MathUtils.lerp(0, 0, s),
          THREE.MathUtils.lerp(-6, -16, s)
        );
      } else if (p < 0.85) {
        // Stage 3: Molecular Chemistry Sweep
        const s = (p - 0.55) / 0.3;
        targetCamPos.set(
          THREE.MathUtils.lerp(18, -16, s),
          THREE.MathUtils.lerp(3.2, 2.5, s),
          THREE.MathUtils.lerp(0, -34, s)
        );
        targetLookAt.set(
          THREE.MathUtils.lerp(24, -26, s),
          THREE.MathUtils.lerp(0, 0, s),
          THREE.MathUtils.lerp(-16, -48, s)
        );
      } else {
        // Stage 4: Nexus Overview
        const s = (p - 0.85) / 0.15;
        targetCamPos.set(
          THREE.MathUtils.lerp(-16, 0, s),
          THREE.MathUtils.lerp(2.5, 26, s),
          THREE.MathUtils.lerp(-34, -12, s)
        );
        targetLookAt.set(
          THREE.MathUtils.lerp(-26, 0, s),
          THREE.MathUtils.lerp(0, -4, s),
          THREE.MathUtils.lerp(-48, -32, s)
        );
      }

      // Check if hyper-speed warp transition is active
      if (warpingRef.current) {
        // Accelerate camera directly plunging into the emerald crystal (-26, 0, -48)
        targetCamPos.set(-26, 0, -47.2);
        targetLookAt.set(-26, 0, -52);
        currentCamPos.lerp(targetCamPos, 0.12);
        currentLookAt.lerp(targetLookAt, 0.12);
        camera.fov = THREE.MathUtils.lerp(camera.fov, 80, 0.08);
        camera.updateProjectionMatrix();
      } else {
        // Smooth camera interpolation
        currentCamPos.lerp(targetCamPos, 0.05);
        currentLookAt.lerp(targetLookAt, 0.05);
      }

      camera.position.x = currentCamPos.x + smoothMouse.current.x * (warpingRef.current ? 0.1 : 0.9);
      camera.position.y = currentCamPos.y + smoothMouse.current.y * (warpingRef.current ? 0.1 : 0.7);
      camera.position.z = currentCamPos.z;
      camera.lookAt(currentLookAt);

      renderer.render(scene, camera);
    };

    animate();

    // ========== 11. CLEANUP ==========
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
        if (obj instanceof THREE.Points) {
          obj.geometry?.dispose();
          (obj.material as THREE.Material)?.dispose();
        }
      });

      bokehTex.dispose();
      envTexture.dispose();
      envMap.dispose();
      pmremGenerator.dispose();

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
