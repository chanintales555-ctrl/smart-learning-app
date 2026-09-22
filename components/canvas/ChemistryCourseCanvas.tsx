'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ChemistryCourseCanvasProps {
  scrollProgress: number; // 0.0 to 1.0 across 13 chapters
}

// Generate soft bokeh star sprite
function createBokehTexture(size: number = 64): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  gradient.addColorStop(0.2, 'rgba(215, 250, 235, 0.85)');
  gradient.addColorStop(0.5, 'rgba(80, 220, 160, 0.25)');
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
    scene.fog = new THREE.FogExp2(0x030306, 0.007);

    const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 800);
    camera.position.set(0, 2, 40);

    const currentCamPos = new THREE.Vector3(0, 2, 40);
    const targetCamPos = new THREE.Vector3(0, 2, 40);
    const currentLookAt = new THREE.Vector3(0, 0, 0);
    const targetLookAt = new THREE.Vector3(0, 0, 0);

    // ========== 2. RENDERER ==========
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);

    // ========== 3. STUDIO ENVIRONMENT REFLECTION (PMREM) ==========
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    const envCanvas = document.createElement('canvas');
    envCanvas.width = 512;
    envCanvas.height = 256;
    const envCtx = envCanvas.getContext('2d')!;

    const envGrad = envCtx.createLinearGradient(0, 0, 0, 256);
    envGrad.addColorStop(0, '#064e3b'); // Emerald studio tint
    envGrad.addColorStop(0.4, '#0f172a');
    envGrad.addColorStop(1, '#020306');
    envCtx.fillStyle = envGrad;
    envCtx.fillRect(0, 0, 512, 256);

    // Soft overhead light
    const softbox = envCtx.createRadialGradient(256, 40, 0, 256, 40, 130);
    softbox.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    softbox.addColorStop(0.4, 'rgba(110, 231, 183, 0.4)');
    softbox.addColorStop(1, 'rgba(0, 0, 0, 0)');
    envCtx.fillStyle = softbox;
    envCtx.fillRect(0, 0, 512, 256);

    const envTexture = new THREE.CanvasTexture(envCanvas);
    envTexture.mapping = THREE.EquirectangularReflectionMapping;
    const envMap = pmremGenerator.fromEquirectangular(envTexture).texture;
    scene.environment = envMap;

    // ========== 4. LIGHTING ==========
    const ambient = new THREE.AmbientLight(0x042f2e, 2.5);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xe2e8f0, 3.0);
    keyLight.position.set(20, 30, 25);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x10b981, 1.8);
    fillLight.position.set(-20, 15, 20);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.5);
    rimLight.position.set(0, -10, -30);
    scene.add(rimLight);

    // ========== 5. BOKEH STARFIELD ==========
    const bokehTex = createBokehTexture(64);
    const starCount = 1500;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);

    const starPalette = [
      new THREE.Color(0xffffff),
      new THREE.Color(0xa7f3d0), // Mint
      new THREE.Color(0x6ee7b7), // Emerald
      new THREE.Color(0xdbeafe), // Pale blue
    ];

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 60 + Math.pow(Math.random(), 0.5) * 260;
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
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // =========================================================================
    // 6. PROCEDURAL 3D MODELS FOR CHEMISTRY CHAPTERS
    // =========================================================================

    // --- CONSTRUCT 1: ATOMIC STRUCTURE & BOHR ELECTRON SHELLS (Ch 1 - 2) ---
    // Position: (16, 2, 10)
    const bohrGroup = new THREE.Group();
    bohrGroup.position.set(16, 2, 10);
    scene.add(bohrGroup);

    // Nucleus (Protons & Neutrons Cluster)
    const nucleusGeo = new THREE.SphereGeometry(1.6, 48, 48);
    const nucleusMat = new THREE.MeshPhysicalMaterial({
      color: 0x064e3b,
      emissive: 0x10b981,
      emissiveIntensity: 0.8,
      metalness: 0.2,
      roughness: 0.05,
      transmission: 0.85,
      thickness: 2.0,
      clearcoat: 1.0,
    });
    const bohrNucleus = new THREE.Mesh(nucleusGeo, nucleusMat);
    bohrGroup.add(bohrNucleus);

    // Bohr Shell Rings (n=1, n=2, n=3)
    const createShell = (radius: number, color: number) => {
      const geo = new THREE.TorusGeometry(radius, 0.06, 32, 100);
      const mat = new THREE.MeshPhysicalMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.4,
        metalness: 0.9,
        roughness: 0.1,
        clearcoat: 1.0,
      });
      return new THREE.Mesh(geo, mat);
    };

    const shell1 = createShell(3.5, 0x34d399);
    shell1.rotation.x = Math.PI / 3;
    const shell2 = createShell(5.2, 0x6ee7b7);
    shell2.rotation.x = -Math.PI / 4;
    shell2.rotation.y = Math.PI / 6;
    const shell3 = createShell(7.0, 0xa7f3d0);
    shell3.rotation.x = Math.PI / 2.2;

    bohrGroup.add(shell1);
    bohrGroup.add(shell2);
    bohrGroup.add(shell3);

    // Orbiting Electrons (Glossy Platinum Spheres)
    const electronCount = 8;
    const bohrElectrons: THREE.Mesh[] = [];
    const electronGeo = new THREE.SphereGeometry(0.24, 24, 24);
    const electronMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      emissive: 0x34d399,
      emissiveIntensity: 1.5,
      metalness: 0.95,
      roughness: 0.02,
      clearcoat: 1.0,
    });
    for (let i = 0; i < electronCount; i++) {
      const e = new THREE.Mesh(electronGeo, electronMat);
      bohrGroup.add(e);
      bohrElectrons.push(e);
    }

    // --- CONSTRUCT 2: CHEMICAL BONDING & CRYSTAL LATTICE (Ch 3 - 5) ---
    // Position: (-18, 0, -14)
    const latticeGroup = new THREE.Group();
    latticeGroup.position.set(-18, 0, -14);
    scene.add(latticeGroup);

    // Crystalline Cube Frame
    const latticeSize = 3;
    const latticeSpacing = 2.2;
    const latticeAtoms: THREE.Mesh[] = [];
    const atomGeoLg = new THREE.SphereGeometry(0.55, 32, 32);
    const atomGeoSm = new THREE.SphereGeometry(0.38, 32, 32);

    const matNa = new THREE.MeshPhysicalMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.5,
      metalness: 0.85,
      roughness: 0.1,
      clearcoat: 1.0,
    });
    const matCl = new THREE.MeshPhysicalMaterial({
      color: 0xf1f5f9,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.4,
      metalness: 0.95,
      roughness: 0.08,
      clearcoat: 1.0,
    });

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const isNa = (x + y + z) % 2 === 0;
          const aMesh = new THREE.Mesh(isNa ? atomGeoLg : atomGeoSm, isNa ? matNa : matCl);
          aMesh.position.set(x * latticeSpacing, y * latticeSpacing, z * latticeSpacing);
          latticeGroup.add(aMesh);
          latticeAtoms.push(aMesh);
        }
      }
    }

    // Connecting Struts between adjacent atoms
    const bondStrutGeo = new THREE.CylinderGeometry(0.045, 0.045, latticeSpacing, 12);
    const bondStrutMat = new THREE.MeshPhysicalMaterial({
      color: 0x94a3b8,
      metalness: 0.95,
      roughness: 0.15,
      clearcoat: 0.6,
    });

    // Add orthogonal bonds
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          if (x < 1) {
            const b = new THREE.Mesh(bondStrutGeo, bondStrutMat);
            b.position.set((x + 0.5) * latticeSpacing, y * latticeSpacing, z * latticeSpacing);
            b.rotation.z = Math.PI / 2;
            latticeGroup.add(b);
          }
          if (y < 1) {
            const b = new THREE.Mesh(bondStrutGeo, bondStrutMat);
            b.position.set(x * latticeSpacing, (y + 0.5) * latticeSpacing, z * latticeSpacing);
            latticeGroup.add(b);
          }
          if (z < 1) {
            const b = new THREE.Mesh(bondStrutGeo, bondStrutMat);
            b.position.set(x * latticeSpacing, y * latticeSpacing, (z + 0.5) * latticeSpacing);
            b.rotation.x = Math.PI / 2;
            latticeGroup.add(b);
          }
        }
      }
    }

    // --- CONSTRUCT 3: KINETIC GAS LAWS & REACTION EQUILIBRIUM (Ch 6 - 9) ---
    // Position: (18, -1, -38)
    const kineticsGroup = new THREE.Group();
    kineticsGroup.position.set(18, -1, -38);
    scene.add(kineticsGroup);

    // Glass Chamber Sphere
    const chamberGeo = new THREE.SphereGeometry(4.6, 48, 48);
    const chamberMat = new THREE.MeshPhysicalMaterial({
      color: 0x022c22,
      emissive: 0x064e3b,
      emissiveIntensity: 0.2,
      metalness: 0.05,
      roughness: 0.04,
      transmission: 0.94,
      thickness: 2.2,
      ior: 1.5,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.88,
    });
    const chamber = new THREE.Mesh(chamberGeo, chamberMat);
    kineticsGroup.add(chamber);

    // Kinetic Bouncing Gas Particles
    const gasCount = 36;
    const gasParticles: { mesh: THREE.Mesh; vel: THREE.Vector3 }[] = [];
    const gasGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const gasMatA = new THREE.MeshPhysicalMaterial({
      color: 0x10b981,
      emissive: 0x34d399,
      emissiveIntensity: 1.2,
      metalness: 0.3,
    });
    const gasMatB = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 1.2,
      metalness: 0.3,
    });

    for (let i = 0; i < gasCount; i++) {
      const g = new THREE.Mesh(gasGeo, i % 2 === 0 ? gasMatA : gasMatB);
      const r = Math.random() * 3.5;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      g.position.set(r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), r * Math.cos(ph));
      kineticsGroup.add(g);
      gasParticles.push({
        mesh: g,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 0.08,
          (Math.random() - 0.5) * 0.08,
          (Math.random() - 0.5) * 0.08
        ),
      });
    }

    // --- CONSTRUCT 4: ORGANIC CHEMISTRY BENZENE RING & POLYMERS (Ch 10 - 13) ---
    // Position: (-16, 1, -64)
    const organicGroup = new THREE.Group();
    organicGroup.position.set(-16, 1, -64);
    scene.add(organicGroup);

    // Aromatic Benzene Hexagon (C6H6)
    const benzeneRadius = 3.6;
    const carbonGeo = new THREE.SphereGeometry(0.5, 32, 32);
    const carbonMat = new THREE.MeshPhysicalMaterial({
      color: 0x334155,
      metalness: 0.95,
      roughness: 0.1,
      clearcoat: 1.0,
    });
    const hydrogenGeo = new THREE.SphereGeometry(0.28, 24, 24);
    const hydrogenMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      emissive: 0x6ee7b7,
      emissiveIntensity: 0.6,
      metalness: 0.5,
      roughness: 0.05,
    });

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const cX = Math.cos(angle) * benzeneRadius;
      const cY = Math.sin(angle) * benzeneRadius;

      // Carbon node
      const c = new THREE.Mesh(carbonGeo, carbonMat);
      c.position.set(cX, cY, 0);
      organicGroup.add(c);

      // Hydrogen node
      const hX = Math.cos(angle) * (benzeneRadius + 1.4);
      const hY = Math.sin(angle) * (benzeneRadius + 1.4);
      const h = new THREE.Mesh(hydrogenGeo, hydrogenMat);
      h.position.set(hX, hY, 0);
      organicGroup.add(h);

      // C-H bond
      const chBond = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 1.4, 12),
        bondStrutMat
      );
      chBond.position.set((cX + hX) / 2, (cY + hY) / 2, 0);
      chBond.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(hX - cX, hY - cY, 0).normalize()
      );
      organicGroup.add(chBond);

      // C-C ring bond
      const nextAngle = ((i + 1) / 6) * Math.PI * 2;
      const nextX = Math.cos(nextAngle) * benzeneRadius;
      const nextY = Math.sin(nextAngle) * benzeneRadius;
      const ccDist = Math.hypot(nextX - cX, nextY - cY);

      const ccBond = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, ccDist, 12),
        matNa
      );
      ccBond.position.set((cX + nextX) / 2, (cY + nextY) / 2, 0);
      ccBond.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(nextX - cX, nextY - cY, 0).normalize()
      );
      organicGroup.add(ccBond);
    }

    // Delocalized Pi-Electron Torus Rings (Above and Below Benzene Ring)
    const piRingGeo = new THREE.TorusGeometry(2.4, 0.22, 24, 64);
    const piRingMat = new THREE.MeshPhysicalMaterial({
      color: 0x10b981,
      emissive: 0x34d399,
      emissiveIntensity: 0.9,
      metalness: 0.1,
      roughness: 0.05,
      transmission: 0.8,
      thickness: 1.0,
      transparent: true,
      opacity: 0.85,
    });
    const piTop = new THREE.Mesh(piRingGeo, piRingMat);
    piTop.position.z = 0.9;
    organicGroup.add(piTop);

    const piBottom = new THREE.Mesh(piRingGeo, piRingMat);
    piBottom.position.z = -0.9;
    organicGroup.add(piBottom);

    // ========== 7. EVENT LISTENERS ==========
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

    // ========== 8. RENDER & SCROLL ANIMATION LOOP ==========
    let frameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const p = scrollRef.current; // 0.0 to 1.0

      smoothMouse.current.x += (mouseRef.current.x - smoothMouse.current.x) * 0.04;
      smoothMouse.current.y += (mouseRef.current.y - smoothMouse.current.y) * 0.04;

      // 1. Rotate Bohr Atom Model
      bohrGroup.rotation.y = t * 0.2;
      shell1.rotation.z = t * 0.6;
      shell2.rotation.z = -t * 0.45;
      shell3.rotation.z = t * 0.3;

      for (let i = 0; i < electronCount; i++) {
        const shellR = i < 2 ? 3.5 : i < 6 ? 5.2 : 7.0;
        const spd = i < 2 ? 1.8 : i < 6 ? 1.2 : 0.8;
        const phase = (i / electronCount) * Math.PI * 2;
        const a = t * spd + phase;
        bohrElectrons[i].position.set(
          Math.cos(a) * shellR,
          Math.sin(a) * shellR * (i % 2 === 0 ? 0.7 : -0.7),
          Math.sin(a * 1.5) * 1.5
        );
      }

      // 2. Rotate Crystal Lattice
      latticeGroup.rotation.x = t * 0.15;
      latticeGroup.rotation.y = t * 0.22;

      // 3. Kinetic Gas Particles Bouncing
      for (const gp of gasParticles) {
        gp.mesh.position.add(gp.vel);
        if (gp.mesh.position.length() > 3.8) {
          gp.vel.reflect(gp.mesh.position.clone().normalize());
        }
      }
      chamber.rotation.y = t * 0.1;

      // 4. Organic Benzene Ring Rotation
      organicGroup.rotation.y = t * 0.25;
      organicGroup.rotation.x = Math.sin(t * 0.4) * 0.2;

      // Starfield gentle drift
      stars.rotation.y = t * 0.005;

      // 5. CAMERA FLIGHT ALONG CHEMISTRY CHAPTER CLUSTERS
      // Progress 0.0 -> 0.25: Focus on Bohr Atom (Ch 1 - 2)
      // Progress 0.25 -> 0.50: Sweep to Crystal Lattice (Ch 3 - 5)
      // Progress 0.50 -> 0.75: Glide to Kinetic Chamber (Ch 6 - 9)
      // Progress 0.75 -> 1.00: Arrive at Organic Benzene Ring (Ch 10 - 13)

      if (p < 0.25) {
        const s = p / 0.25;
        targetCamPos.set(
          THREE.MathUtils.lerp(0, 10, s),
          THREE.MathUtils.lerp(2, 2.5, s),
          THREE.MathUtils.lerp(40, 22, s)
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
          THREE.MathUtils.lerp(22, -2, s)
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
          THREE.MathUtils.lerp(-2, -26, s)
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
          THREE.MathUtils.lerp(-26, -52, s)
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

      renderer.render(scene, camera);
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
