'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface CosmicCanvasProps {
  scrollProgress: number;
}

// Generate a soft circular bokeh sprite texture on a canvas (no external image needed)
function createBokehTexture(size: number = 64): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0.0, 'rgba(255,255,255,1.0)');
  gradient.addColorStop(0.15, 'rgba(255,255,255,0.8)');
  gradient.addColorStop(0.4, 'rgba(255,255,255,0.3)');
  gradient.addColorStop(1.0, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export default function CosmicCanvas({ scrollProgress }: CosmicCanvasProps) {
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

    // ========== 1. SCENE ==========
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030308, 0.005);

    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 800);
    camera.position.set(0, 3, 50);

    const currentCamPos = new THREE.Vector3(0, 3, 50);
    const targetCamPos = new THREE.Vector3(0, 3, 50);
    const currentLookAt = new THREE.Vector3(0, 0, 0);
    const targetLookAt = new THREE.Vector3(0, 0, 0);

    // ========== 2. RENDERER ==========
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // ========== 3. STUDIO LIGHTING (3-Point Setup) ==========
    const ambient = new THREE.AmbientLight(0x0a1628, 3.0);
    scene.add(ambient);

    // Key Light (warm-cool directional)
    const keyLight = new THREE.DirectionalLight(0xdbe9ff, 2.5);
    keyLight.position.set(20, 30, 25);
    keyLight.castShadow = true;
    scene.add(keyLight);

    // Fill Light (cool blue from left)
    const fillLight = new THREE.DirectionalLight(0x4488ff, 1.2);
    fillLight.position.set(-20, 10, 15);
    scene.add(fillLight);

    // Rim Light (warm accent from behind)
    const rimLight = new THREE.DirectionalLight(0xff8844, 1.0);
    rimLight.position.set(0, -5, -30);
    scene.add(rimLight);

    // Physics & Chemistry Accent Lights
    const physAccent = new THREE.PointLight(0x00d4ff, 4.0, 45, 1.5);
    physAccent.position.set(26, 2, -18);
    scene.add(physAccent);

    const chemAccent = new THREE.PointLight(0x22ffaa, 4.0, 45, 1.5);
    chemAccent.position.set(-28, 0, -52);
    scene.add(chemAccent);

    // ========== 4. SOFT BOKEH STARFIELD (Round, No Pixel Squares!) ==========
    const bokehTex = createBokehTexture(64);
    const starCount = 3000;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);

    const starPalette = [
      new THREE.Color(0xcce8ff), // Cool white
      new THREE.Color(0x88ccff), // Soft blue
      new THREE.Color(0xffeedd), // Warm cream
      new THREE.Color(0xaaddff), // Ice blue
      new THREE.Color(0xffe8cc), // Warm glow
    ];

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 60 + Math.pow(Math.random(), 0.5) * 300;
      starPos[i3] = radius * Math.sin(phi) * Math.cos(theta);
      starPos[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPos[i3 + 2] = radius * Math.cos(phi);

      const c = starPalette[Math.floor(Math.random() * starPalette.length)];
      starCol[i3] = c.r;
      starCol[i3 + 1] = c.g;
      starCol[i3 + 2] = c.b;

      starSizes[i] = 0.8 + Math.random() * 2.5;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    starGeo.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));

    const starMat = new THREE.PointsMaterial({
      map: bokehTex,
      size: 1.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // ========== 5. PHYSICS REALM: POLISHED GYROSCOPE REACTOR (at 26, 0, -18) ==========
    const physGroup = new THREE.Group();
    physGroup.position.set(26, 0, -18);
    scene.add(physGroup);

    // A. GLASS ENERGY CORE (Smooth, Reflective, 64 Segments)
    const coreGeo = new THREE.SphereGeometry(3.2, 64, 64);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0x001833,
      emissive: 0x0066cc,
      emissiveIntensity: 0.6,
      metalness: 0.1,
      roughness: 0.05,
      transmission: 0.7,
      thickness: 2.0,
      ior: 1.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      transparent: true,
      opacity: 0.92,
    });
    const coreSphere = new THREE.Mesh(coreGeo, coreMat);
    physGroup.add(coreSphere);

    // Inner Glow Sphere (Solid emissive)
    const innerGlowGeo = new THREE.SphereGeometry(1.8, 48, 48);
    const innerGlowMat = new THREE.MeshStandardMaterial({
      color: 0x00aaff,
      emissive: 0x0088dd,
      emissiveIntensity: 2.0,
      roughness: 0.0,
      metalness: 0.0,
    });
    const innerGlow = new THREE.Mesh(innerGlowGeo, innerGlowMat);
    physGroup.add(innerGlow);

    // B. POLISHED TITANIUM GYROSCOPE RINGS (Smooth Torus, High Subdivision)
    const createSmoothRing = (
      radius: number, tube: number, color: number, emissive: number,
      metalness: number, clearcoat: number
    ) => {
      const geo = new THREE.TorusGeometry(radius, tube, 48, 128);
      const mat = new THREE.MeshPhysicalMaterial({
        color,
        emissive,
        emissiveIntensity: 0.25,
        metalness,
        roughness: 0.15,
        clearcoat,
        clearcoatRoughness: 0.1,
        reflectivity: 1.0,
      });
      return new THREE.Mesh(geo, mat);
    };

    const ringA = createSmoothRing(6.5, 0.18, 0x88bbee, 0x2266aa, 0.95, 1.0);
    ringA.rotation.x = Math.PI / 3.5;
    ringA.rotation.y = 0.4;
    physGroup.add(ringA);

    const ringB = createSmoothRing(8.0, 0.14, 0xaaccee, 0x3377bb, 0.9, 1.0);
    ringB.rotation.x = -Math.PI / 2.8;
    ringB.rotation.y = Math.PI / 5;
    physGroup.add(ringB);

    const ringC = createSmoothRing(9.8, 0.1, 0xccddff, 0x5599cc, 0.85, 0.8);
    ringC.rotation.x = Math.PI / 2.2;
    ringC.rotation.z = Math.PI / 4;
    physGroup.add(ringC);

    // C. ORBITING ELECTRON SPHERES (Smooth small glossy spheres, NOT dots)
    const electronGroup = new THREE.Group();
    physGroup.add(electronGroup);

    const electronGeo = new THREE.SphereGeometry(0.35, 32, 32);
    const electronMat = new THREE.MeshPhysicalMaterial({
      color: 0x44ddff,
      emissive: 0x22aadd,
      emissiveIntensity: 1.2,
      metalness: 0.3,
      roughness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
    });

    const electronCount = 18;
    const electrons: THREE.Mesh[] = [];
    for (let i = 0; i < electronCount; i++) {
      const e = new THREE.Mesh(electronGeo, electronMat);
      electronGroup.add(e);
      electrons.push(e);
    }

    // ========== 6. CHEMISTRY REALM: MOLECULAR GLASS SCULPTURE (at -28, 0, -52) ==========
    const chemGroup = new THREE.Group();
    chemGroup.position.set(-28, 0, -52);
    scene.add(chemGroup);

    // A. CENTRAL NUCLEUS (Polished Glass Icosahedron)
    const nucleusGeo = new THREE.IcosahedronGeometry(3.8, 3); // Subdivision 3 = very smooth
    const nucleusMat = new THREE.MeshPhysicalMaterial({
      color: 0x003322,
      emissive: 0x00aa66,
      emissiveIntensity: 0.5,
      metalness: 0.05,
      roughness: 0.05,
      transmission: 0.65,
      thickness: 2.5,
      ior: 1.45,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      transparent: true,
      opacity: 0.9,
    });
    const nucleus = new THREE.Mesh(nucleusGeo, nucleusMat);
    chemGroup.add(nucleus);

    // Inner Glow for Chemistry
    const chemInnerGeo = new THREE.SphereGeometry(2.0, 48, 48);
    const chemInnerMat = new THREE.MeshStandardMaterial({
      color: 0x22ff88,
      emissive: 0x11cc66,
      emissiveIntensity: 1.8,
      roughness: 0.0,
      metalness: 0.0,
    });
    const chemInner = new THREE.Mesh(chemInnerGeo, chemInnerMat);
    chemGroup.add(chemInner);

    // B. ORBITING GLOSSY ATOM SPHERES + SMOOTH BOND CYLINDERS
    const atomGroup = new THREE.Group();
    chemGroup.add(atomGroup);

    const atomColors = [0x22dd88, 0xaa55ff, 0xff6633, 0x33bbff, 0xffcc22, 0xff4488];
    const atomCount = 10;
    const atomMeshes: THREE.Mesh[] = [];
    const atomGeo = new THREE.SphereGeometry(0.8, 48, 48);

    for (let i = 0; i < atomCount; i++) {
      const color = atomColors[i % atomColors.length];
      const mat = new THREE.MeshPhysicalMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.35,
        metalness: 0.4,
        roughness: 0.1,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        reflectivity: 0.8,
      });
      const atom = new THREE.Mesh(atomGeo, mat);
      atomGroup.add(atom);
      atomMeshes.push(atom);
    }

    // Bond cylinders connecting atoms (smooth, metallic tubes)
    const bondGeo = new THREE.CylinderGeometry(0.08, 0.08, 1, 16);
    const bondMat = new THREE.MeshPhysicalMaterial({
      color: 0x556677,
      metalness: 0.9,
      roughness: 0.2,
      clearcoat: 0.5,
    });
    const bonds: THREE.Mesh[] = [];
    // Create bonds connecting consecutive atoms
    for (let i = 0; i < atomCount; i++) {
      const bond = new THREE.Mesh(bondGeo, bondMat);
      atomGroup.add(bond);
      bonds.push(bond);
    }

    // C. ORBITAL RINGS (smooth polished orbital paths)
    const orbRingA = createSmoothRing(7.5, 0.1, 0x33dd99, 0x11aa66, 0.85, 1.0);
    orbRingA.rotation.x = Math.PI / 2.5;
    orbRingA.rotation.z = 0.3;
    chemGroup.add(orbRingA);

    const orbRingB = createSmoothRing(9.5, 0.08, 0x88eebb, 0x44bb88, 0.8, 0.9);
    orbRingB.rotation.x = -Math.PI / 3.5;
    orbRingB.rotation.y = Math.PI / 4;
    chemGroup.add(orbRingB);

    // ========== 7. AMBIENT NEBULA GLOW (Soft large spheres as volumetric fog) ==========
    const createNebulaGlow = (pos: THREE.Vector3, color: number, scale: number) => {
      const geo = new THREE.SphereGeometry(1, 32, 32);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.06,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      mesh.scale.setScalar(scale);
      return mesh;
    };

    scene.add(createNebulaGlow(new THREE.Vector3(26, 0, -18), 0x0066ff, 28));
    scene.add(createNebulaGlow(new THREE.Vector3(-28, 0, -52), 0x00ff88, 26));
    scene.add(createNebulaGlow(new THREE.Vector3(0, -5, -35), 0x220044, 50));

    // ========== 8. EVENT LISTENERS ==========
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

    // ========== 9. ANIMATION LOOP ==========
    let frameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const p = scrollRef.current;

      // Smooth mouse
      smoothMouse.current.x += (mouseRef.current.x - smoothMouse.current.x) * 0.05;
      smoothMouse.current.y += (mouseRef.current.y - smoothMouse.current.y) * 0.05;

      // === PHYSICS ANIMATIONS ===
      // Gyroscope rings: differential rotation speeds
      ringA.rotation.z = t * 0.6;
      ringA.rotation.x = Math.PI / 3.5 + Math.sin(t * 0.3) * 0.1;
      ringB.rotation.z = -t * 0.45;
      ringB.rotation.y = Math.PI / 5 + Math.cos(t * 0.25) * 0.08;
      ringC.rotation.z = t * 0.35;
      ringC.rotation.x = Math.PI / 2.2 + Math.sin(t * 0.4) * 0.06;

      // Core gentle pulse
      const pulse = 1.0 + Math.sin(t * 2) * 0.05;
      coreSphere.scale.setScalar(pulse);
      innerGlow.scale.setScalar(pulse * 0.56);
      (innerGlowMat.emissiveIntensity as number) = 1.5 + Math.sin(t * 3) * 0.5;

      // Electrons orbit on smooth 3D paths
      for (let i = 0; i < electronCount; i++) {
        const orbitR = 5.5 + (i % 3) * 2.5;
        const speed = 0.8 + (i % 4) * 0.25;
        const phase = (i / electronCount) * Math.PI * 2;
        const inclination = ((i % 3) - 1) * 0.7;
        const angle = t * speed + phase;

        electrons[i].position.set(
          Math.cos(angle) * orbitR,
          Math.sin(angle * 1.3 + inclination) * orbitR * 0.35,
          Math.sin(angle) * orbitR * Math.cos(inclination * 0.5)
        );
      }

      // Light accent pulse
      physAccent.intensity = 3.5 + Math.sin(t * 2.5) * 1.0;

      // === CHEMISTRY ANIMATIONS ===
      nucleus.rotation.y = t * 0.15;
      nucleus.rotation.x = Math.sin(t * 0.3) * 0.15;
      chemInner.scale.setScalar(1.0 + Math.sin(t * 2.2) * 0.08);
      (chemInnerMat.emissiveIntensity as number) = 1.4 + Math.sin(t * 2.8) * 0.4;

      // Atoms orbit in 3D with smooth positions
      for (let i = 0; i < atomCount; i++) {
        const r = 5.5 + (i % 3) * 2.0;
        const speed = 0.5 + (i % 3) * 0.15;
        const phase = (i / atomCount) * Math.PI * 2;
        const tilt = ((i % 3) - 1) * 0.8;
        const a = t * speed + phase;

        const ax = Math.cos(a) * r;
        const ay = Math.sin(a * 0.8 + tilt) * r * 0.4;
        const az = Math.sin(a) * r;
        atomMeshes[i].position.set(ax, ay, az);
      }

      // Update bond cylinders to connect consecutive atoms
      for (let i = 0; i < atomCount; i++) {
        const a1 = atomMeshes[i].position;
        const a2 = atomMeshes[(i + 1) % atomCount].position;
        const mid = new THREE.Vector3().addVectors(a1, a2).multiplyScalar(0.5);
        const dir = new THREE.Vector3().subVectors(a2, a1);
        const len = dir.length();

        bonds[i].position.copy(mid);
        bonds[i].scale.set(1, len, 1);
        bonds[i].quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          dir.normalize()
        );
      }

      // Chemistry orbital rings rotation
      orbRingA.rotation.z = t * 0.4;
      orbRingB.rotation.z = -t * 0.3;

      chemAccent.intensity = 3.5 + Math.sin(t * 2) * 1.0;

      // Starfield subtle rotation
      stars.rotation.y = t * 0.006;

      // === CAMERA CHOREOGRAPHY ===
      if (p < 0.25) {
        // Stage 1: Deep Space
        const s = p / 0.25;
        targetCamPos.set(
          THREE.MathUtils.lerp(0, 12, s),
          THREE.MathUtils.lerp(3, 2, s),
          THREE.MathUtils.lerp(50, 30, s)
        );
        targetLookAt.set(
          THREE.MathUtils.lerp(0, 16, s),
          THREE.MathUtils.lerp(0, 0, s),
          THREE.MathUtils.lerp(0, -8, s)
        );
      } else if (p < 0.55) {
        // Stage 2: Physics Approach
        const s = (p - 0.25) / 0.3;
        targetCamPos.set(
          THREE.MathUtils.lerp(12, 20, s),
          THREE.MathUtils.lerp(2, 4, s),
          THREE.MathUtils.lerp(30, -2, s)
        );
        targetLookAt.set(
          THREE.MathUtils.lerp(16, 26, s),
          THREE.MathUtils.lerp(0, 0, s),
          THREE.MathUtils.lerp(-8, -18, s)
        );
      } else if (p < 0.85) {
        // Stage 3: Chemistry Sweep
        const s = (p - 0.55) / 0.3;
        targetCamPos.set(
          THREE.MathUtils.lerp(20, -18, s),
          THREE.MathUtils.lerp(4, 3, s),
          THREE.MathUtils.lerp(-2, -38, s)
        );
        targetLookAt.set(
          THREE.MathUtils.lerp(26, -28, s),
          THREE.MathUtils.lerp(0, 0, s),
          THREE.MathUtils.lerp(-18, -52, s)
        );
      } else {
        // Stage 4: Nexus Overview
        const s = (p - 0.85) / 0.15;
        targetCamPos.set(
          THREE.MathUtils.lerp(-18, 0, s),
          THREE.MathUtils.lerp(3, 30, s),
          THREE.MathUtils.lerp(-38, -10, s)
        );
        targetLookAt.set(
          THREE.MathUtils.lerp(-28, 0, s),
          THREE.MathUtils.lerp(0, -6, s),
          THREE.MathUtils.lerp(-52, -35, s)
        );
      }

      // Smooth interpolation
      currentCamPos.lerp(targetCamPos, 0.055);
      currentLookAt.lerp(targetLookAt, 0.055);

      // Mouse parallax
      camera.position.x = currentCamPos.x + smoothMouse.current.x * 1.0;
      camera.position.y = currentCamPos.y + smoothMouse.current.y * 0.8;
      camera.position.z = currentCamPos.z;
      camera.lookAt(currentLookAt);

      renderer.render(scene, camera);
    };

    animate();

    // ========== 10. CLEANUP ==========
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);

      // Dispose all geometries and materials
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
