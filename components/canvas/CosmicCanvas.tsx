'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface CosmicCanvasProps {
  scrollProgress: number; // 0.0 to 1.0
}

export default function CosmicCanvas({ scrollProgress }: CosmicCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<number>(scrollProgress);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    scrollRef.current = scrollProgress;
  }, [scrollProgress]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. SCENE & CAMERA SETUP
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x040408, 0.007);

    const camera = new THREE.PerspectiveCamera(
      58,
      window.innerWidth / window.innerHeight,
      0.1,
      1200
    );
    camera.position.set(0, 3, 44);

    const currentCamPos = new THREE.Vector3(0, 3, 44);
    const targetCamPos = new THREE.Vector3(0, 3, 44);
    const currentLookAt = new THREE.Vector3(0, 0, 0);
    const targetLookAt = new THREE.Vector3(0, 0, 0);

    // 2. RENDERER
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);

    // 3. LIGHTING
    const ambientLight = new THREE.AmbientLight(0x0f172a, 2.0);
    scene.add(ambientLight);

    const physicsLight = new THREE.PointLight(0x00f0ff, 6, 60, 1.2);
    physicsLight.position.set(24, 0, -20);
    scene.add(physicsLight);

    const chemistryLight = new THREE.PointLight(0x10b981, 6, 60, 1.2);
    chemistryLight.position.set(-28, -2, -55);
    scene.add(chemistryLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(15, 35, 25);
    scene.add(keyLight);

    // 4. SPHERICAL CELESTIAL DOME & SPIRAL GALAXY (Natural spherical distribution, NO BOX!)
    const starCount = 4500;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    const starPalette = [
      new THREE.Color(0x38bdf8), // Cyan
      new THREE.Color(0x818cf8), // Indigo
      new THREE.Color(0xfbbf24), // Warm Gold
      new THREE.Color(0xffffff), // Pure White
      new THREE.Color(0x34d399), // Emerald
      new THREE.Color(0xf43f5e), // Plasma Pink
    ];

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      // Spherical distribution with logarithmic radial depth
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 90 + Math.pow(Math.random(), 0.6) * 350;

      starPositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i3 + 2] = radius * Math.cos(phi);

      const color = starPalette[Math.floor(Math.random() * starPalette.length)];
      starColors[i3] = color.r;
      starColors[i3 + 1] = color.g;
      starColors[i3 + 2] = color.b;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // Cosmic Dust Plane (Galactic Horizon)
    const dustCount = 800;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      const i3 = i * 3;
      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 180;
      dustPos[i3] = Math.cos(angle) * dist;
      dustPos[i3 + 1] = (Math.random() - 0.5) * 20; // Flattened disk
      dustPos[i3 + 2] = Math.sin(angle) * dist;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 1.8,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
    });
    const galacticDisk = new THREE.Points(dustGeo, dustMat);
    scene.add(galacticDisk);

    // =========================================================================
    // 5. 🪐 PHYSICS REALM: WARPED SPACETIME & RELATIVISTIC SINGULARITY (at 24, 0, -20)
    // =========================================================================
    const physicsGroup = new THREE.Group();
    physicsGroup.position.set(24, 0, -20);
    scene.add(physicsGroup);

    // A. EINSTEIN'S WARPED SPACETIME GRID (General Relativity Gravity Well)
    const gridSegments = 40;
    const gridGeo = new THREE.PlaneGeometry(55, 55, gridSegments, gridSegments);
    gridGeo.rotateX(-Math.PI / 2);
    // Deform grid vertices downward into a gravitational funnel
    const gridPosAttr = gridGeo.attributes.position;
    for (let i = 0; i < gridPosAttr.count; i++) {
      const vx = gridPosAttr.getX(i);
      const vz = gridPosAttr.getZ(i);
      const dist = Math.sqrt(vx * vx + vz * vz);
      const depth = -12.0 / (1.0 + dist * 0.28); // Gravitational well function
      gridPosAttr.setY(i, depth - 4.5);
    }
    gridGeo.computeVertexNormals();

    const gridMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.28,
    });
    const spacetimeGrid = new THREE.Mesh(gridGeo, gridMat);
    physicsGroup.add(spacetimeGrid);

    // B. BLACK HOLE PHOTON SPHERE & EVENT HORIZON (The Singularity Core)
    const singularityGeo = new THREE.SphereGeometry(3.6, 32, 32);
    const singularityMat = new THREE.MeshBasicMaterial({
      color: 0x020617, // Pure gravitational abyss
    });
    const singularity = new THREE.Mesh(singularityGeo, singularityMat);
    physicsGroup.add(singularity);

    // Blinding Photon Sphere Glow Shell
    const photonShellGeo = new THREE.SphereGeometry(4.0, 32, 32);
    const photonShellMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.45,
      wireframe: true,
    });
    const photonShell = new THREE.Mesh(photonShellGeo, photonShellMat);
    physicsGroup.add(photonShell);

    // C. RELATIVISTIC ACCRETION DISK (Keplerian Plasma Swirl)
    const diskParticleCount = 2200;
    const diskGeo = new THREE.BufferGeometry();
    const diskPositions = new Float32Array(diskParticleCount * 3);
    const diskColors = new Float32Array(diskParticleCount * 3);
    const diskRadii = new Float32Array(diskParticleCount);
    const diskAngles = new Float32Array(diskParticleCount);
    const diskSpeeds = new Float32Array(diskParticleCount);

    const plasmaHot = new THREE.Color(0xffffff); // Core energy
    const plasmaCyan = new THREE.Color(0x00f0ff);
    const plasmaElectric = new THREE.Color(0x3b82f6);
    const plasmaOrange = new THREE.Color(0xf97316);

    for (let i = 0; i < diskParticleCount; i++) {
      const r = 4.8 + Math.pow(Math.random(), 1.6) * 14.5;
      const angle = Math.random() * Math.PI * 2;
      diskRadii[i] = r;
      diskAngles[i] = angle;
      // Keplerian velocity: inner particles orbit much faster than outer particles (v ~ 1/sqrt(r))
      diskSpeeds[i] = 4.2 / Math.sqrt(r);

      const i3 = i * 3;
      diskPositions[i3] = Math.cos(angle) * r;
      diskPositions[i3 + 1] = (Math.random() - 0.5) * (0.2 + (r - 4.8) * 0.08); // Disk thickness
      diskPositions[i3 + 2] = Math.sin(angle) * r;

      // Color gradation from blinding white-hot to plasma orange
      const ratio = (r - 4.8) / 14.5;
      let pColor = new THREE.Color();
      if (ratio < 0.2) pColor.lerpColors(plasmaHot, plasmaCyan, ratio / 0.2);
      else if (ratio < 0.6) pColor.lerpColors(plasmaCyan, plasmaElectric, (ratio - 0.2) / 0.4);
      else pColor.lerpColors(plasmaElectric, plasmaOrange, (ratio - 0.6) / 0.4);

      diskColors[i3] = pColor.r;
      diskColors[i3 + 1] = pColor.g;
      diskColors[i3 + 2] = pColor.b;
    }

    diskGeo.setAttribute('position', new THREE.BufferAttribute(diskPositions, 3));
    diskGeo.setAttribute('color', new THREE.BufferAttribute(diskColors, 3));

    const diskMat = new THREE.PointsMaterial({
      size: 1.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    const accretionDisk = new THREE.Points(diskGeo, diskMat);
    accretionDisk.rotation.x = Math.PI * 0.12; // Tilted accretion disk
    physicsGroup.add(accretionDisk);

    // D. RELATIVISTIC POLAR JETS (Astrophysical Plasma Beam)
    const jetGeo = new THREE.CylinderGeometry(0.2, 2.5, 30, 16, 1, true);
    const jetMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const northJet = new THREE.Mesh(jetGeo, jetMat);
    northJet.position.y = 15;
    physicsGroup.add(northJet);

    const southJet = northJet.clone();
    southJet.rotation.z = Math.PI;
    southJet.position.y = -15;
    physicsGroup.add(southJet);

    // Magnetic Dipole Field Lines (Looping from North Pole to South Pole)
    const dipoleGroup = new THREE.Group();
    const lineCount = 8;
    for (let k = 0; k < lineCount; k++) {
      const curve = new THREE.EllipseCurve(
        0, 0,
        9.5, 14.0,
        0, 2 * Math.PI,
        false,
        0
      );
      const points = curve.getPoints(50);
      const lGeo = new THREE.BufferGeometry().setFromPoints(
        points.map(p => new THREE.Vector3(p.x, p.y, 0))
      );
      const lMat = new THREE.LineBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.25,
      });
      const dipoleLine = new THREE.Line(lGeo, lMat);
      dipoleLine.rotation.y = (k / lineCount) * Math.PI;
      dipoleGroup.add(dipoleLine);
    }
    physicsGroup.add(dipoleGroup);

    // =========================================================================
    // 6. 🧪 CHEMISTRY REALM: MACROMOLECULAR DNA HELIX & QUANTUM ORBITALS (at -28, -2, -55)
    // =========================================================================
    const chemistryGroup = new THREE.Group();
    chemistryGroup.position.set(-28, -2, -55);
    scene.add(chemistryGroup);

    // A. DNA DOUBLE HELIX STRUCTURE (Realistic Organic Molecular Biology)
    const helixGroup = new THREE.Group();
    chemistryGroup.add(helixGroup);

    const basePairCount = 28;
    const helixHeight = 32;
    const helixRadius = 5.2;
    const helixTwist = 3.5; // full turns

    const sugarMat1 = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.6,
    });
    const sugarMat2 = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.6,
    });
    const bondMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.4,
      metalness: 0.8,
    });

    const baseColors = [0x10b981, 0xa855f7, 0xf59e0b, 0xf43f5e]; // A, T, C, G
    const nodeGeo = new THREE.SphereGeometry(0.7, 16, 16);
    const rungCylGeo = new THREE.CylinderGeometry(0.12, 0.12, helixRadius * 2, 8);
    rungCylGeo.rotateZ(Math.PI / 2);

    for (let i = 0; i < basePairCount; i++) {
      const progressRatio = i / (basePairCount - 1);
      const y = (progressRatio - 0.5) * helixHeight;
      const angle = progressRatio * Math.PI * 2 * helixTwist;

      // Strand 1 Node
      const x1 = Math.cos(angle) * helixRadius;
      const z1 = Math.sin(angle) * helixRadius;
      const node1 = new THREE.Mesh(nodeGeo, sugarMat1);
      node1.position.set(x1, y, z1);
      helixGroup.add(node1);

      // Strand 2 Node (180 degrees opposite)
      const x2 = Math.cos(angle + Math.PI) * helixRadius;
      const z2 = Math.sin(angle + Math.PI) * helixRadius;
      const node2 = new THREE.Mesh(nodeGeo, sugarMat2);
      node2.position.set(x2, y, z2);
      helixGroup.add(node2);

      // Connecting Base-Pair Hydrogen Bond Rod
      const rungMat = new THREE.MeshStandardMaterial({
        color: baseColors[i % baseColors.length],
        emissive: baseColors[i % baseColors.length],
        emissiveIntensity: 0.6,
        roughness: 0.2,
      });
      const rung = new THREE.Mesh(rungCylGeo, rungMat);
      rung.position.set(0, y, 0);
      rung.rotation.y = -angle;
      helixGroup.add(rung);
    }

    // B. QUANTUM ELECTRON ORBITAL PROBABILITY CLOUDS (p-Orbital Dumbbells)
    const orbitalCloudCount = 1400;
    const orbitalGeo = new THREE.BufferGeometry();
    const orbitalPositions = new Float32Array(orbitalCloudCount * 3);
    const orbitalColors = new Float32Array(orbitalCloudCount * 3);

    for (let i = 0; i < orbitalCloudCount; i++) {
      const i3 = i * 3;
      // Quantum p-orbital mathematical probability distribution |Y_1^0|^2 ~ cos^2(theta)
      const u = Math.random();
      const theta = Math.acos(2 * Math.random() - 1);
      const phi = Math.random() * Math.PI * 2;
      const probRadius = 8.5 * Math.pow(Math.abs(Math.cos(theta)), 0.8) + Math.random() * 2.5;

      orbitalPositions[i3] = probRadius * Math.sin(theta) * Math.cos(phi);
      orbitalPositions[i3 + 1] = probRadius * Math.cos(theta);
      orbitalPositions[i3 + 2] = probRadius * Math.sin(theta) * Math.sin(phi);

      const isNorthLobe = Math.cos(theta) > 0;
      const col = isNorthLobe ? new THREE.Color(0x10b981) : new THREE.Color(0xa855f7);
      orbitalColors[i3] = col.r;
      orbitalColors[i3 + 1] = col.g;
      orbitalColors[i3 + 2] = col.b;
    }

    orbitalGeo.setAttribute('position', new THREE.BufferAttribute(orbitalPositions, 3));
    orbitalGeo.setAttribute('color', new THREE.BufferAttribute(orbitalColors, 3));

    const orbitalMat = new THREE.PointsMaterial({
      size: 1.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });
    const quantumOrbitalClouds = new THREE.Points(orbitalGeo, orbitalMat);
    chemistryGroup.add(quantumOrbitalClouds);

    // C. EXPANDING REACTION MIST (Chemical Catalysis Aura)
    const mistCount = 600;
    const mistGeo = new THREE.BufferGeometry();
    const mistPositions = new Float32Array(mistCount * 3);
    for (let i = 0; i < mistCount; i++) {
      const i3 = i * 3;
      const angle = Math.random() * Math.PI * 2;
      const r = 4.0 + Math.random() * 12.0;
      mistPositions[i3] = Math.cos(angle) * r;
      mistPositions[i3 + 1] = (Math.random() - 0.5) * 24.0;
      mistPositions[i3 + 2] = Math.sin(angle) * r;
    }
    mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPositions, 3));
    const mistMat = new THREE.PointsMaterial({
      color: 0x34d399,
      size: 1.0,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
    });
    const chemicalMist = new THREE.Points(mistGeo, mistMat);
    chemistryGroup.add(chemicalMist);

    // 7. MOUSE LISTENER FOR PARALLAX
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseRef.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // 8. RESIZE LISTENER
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // 9. ANIMATION & CAMERA FLIGHT CHOREOGRAPHY
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const progress = scrollRef.current; // 0.0 to 1.0

      // A. Physics Relativistic Accretion Disk Physics Rotation
      const posAttr = accretionDisk.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < diskParticleCount; i++) {
        diskAngles[i] += diskSpeeds[i] * 0.02;
        const r = diskRadii[i];
        const a = diskAngles[i];
        posAttr.setX(i, Math.cos(a) * r);
        posAttr.setZ(i, Math.sin(a) * r);
      }
      posAttr.needsUpdate = true;

      // Singularity Shells & Dipole Rotation
      photonShell.rotation.y = elapsed * 0.4;
      dipoleGroup.rotation.y = elapsed * 0.15;
      northJet.rotation.y = elapsed * 0.8;
      southJet.rotation.y = -elapsed * 0.8;

      // Spacetime Grid Gentle Gravitational Ripple
      const gridAttr = spacetimeGrid.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < gridAttr.count; i++) {
        const vx = gridAttr.getX(i);
        const vz = gridAttr.getZ(i);
        const dist = Math.sqrt(vx * vx + vz * vz);
        const depth = -12.0 / (1.0 + dist * 0.28);
        const ripple = Math.sin(dist * 0.6 - elapsed * 2.5) * 0.35 * Math.exp(-dist * 0.08);
        gridAttr.setY(i, depth - 4.5 + ripple);
      }
      gridAttr.needsUpdate = true;

      // B. Chemistry DNA Helix & Quantum Orbitals Rotation
      helixGroup.rotation.y = elapsed * 0.25;
      quantumOrbitalClouds.rotation.y = -elapsed * 0.18;
      quantumOrbitalClouds.rotation.z = Math.sin(elapsed * 0.5) * 0.2;
      chemicalMist.rotation.y = elapsed * 0.12;

      // Slow Celestial Horizon Drift
      starField.rotation.y = elapsed * 0.008;
      galacticDisk.rotation.y = elapsed * 0.012;

      // C. CINEMATIC CAMERA FLIGHT (High-G Banking, Dynamic Perspectives & Warp Swoops)
      // 0.00 - 0.22: Deep Space Launch (Majestic wide perspective)
      // 0.25 - 0.52: Physics Low-Angle Warp (Swooping through warped spacetime & accretion disk)
      // 0.55 - 0.82: Chemistry Orbital Spiral (Whipping across galaxy into DNA double helix)
      // 0.85 - 1.00: Mission Control (Panoramic vantage point overlooking cosmos)

      let targetBankAngle = 0; // Camera roll (banking)

      if (progress < 0.25) {
        // Stage 1: Deep Space Launch
        const t = progress / 0.25;
        targetCamPos.set(
          THREE.MathUtils.lerp(0, 10, t),
          THREE.MathUtils.lerp(3, 1, t),
          THREE.MathUtils.lerp(44, 26, t)
        );
        targetLookAt.set(
          THREE.MathUtils.lerp(0, 14, t),
          THREE.MathUtils.lerp(0, -1, t),
          THREE.MathUtils.lerp(0, -8, t)
        );
        targetBankAngle = t * 0.05;
      } else if (progress < 0.55) {
        // Stage 2: Approach Physics (Low-angle camera swooping up from warped spacetime grid through the glowing accretion disk)
        const t = (progress - 0.25) / 0.3;
        targetCamPos.set(
          THREE.MathUtils.lerp(10, 19, t),
          THREE.MathUtils.lerp(1, -2.5, t), // Low-angle perspective looking up at the singularity!
          THREE.MathUtils.lerp(26, -5, t)
        );
        targetLookAt.set(
          THREE.MathUtils.lerp(14, 24, t),
          THREE.MathUtils.lerp(-1, 0, t),
          THREE.MathUtils.lerp(-8, -20, t)
        );
        targetBankAngle = Math.sin(t * Math.PI) * 0.15; // Banking into the gravitational curve
      } else if (progress < 0.85) {
        // Stage 3: Hyperspace Slingshot to Chemistry (Swooping orbital arc across the galaxy into DNA helix)
        const t = (progress - 0.55) / 0.3;
        targetCamPos.set(
          THREE.MathUtils.lerp(19, -20, t),
          THREE.MathUtils.lerp(-2.5, 3.5, t),
          THREE.MathUtils.lerp(-5, -42, t)
        );
        targetLookAt.set(
          THREE.MathUtils.lerp(24, -28, t),
          THREE.MathUtils.lerp(0, -2, t),
          THREE.MathUtils.lerp(-20, -55, t)
        );
        targetBankAngle = -Math.sin(t * Math.PI) * 0.18; // Banking opposite direction during orbital whip
      } else {
        // Stage 4: Mission Control Overhead Panorama
        const t = (progress - 0.85) / 0.15;
        targetCamPos.set(
          THREE.MathUtils.lerp(-20, 0, t),
          THREE.MathUtils.lerp(3.5, 32, t),
          THREE.MathUtils.lerp(-42, -8, t)
        );
        targetLookAt.set(
          THREE.MathUtils.lerp(-28, 0, t),
          THREE.MathUtils.lerp(-2, -8, t),
          THREE.MathUtils.lerp(-55, -35, t)
        );
        targetBankAngle = 0;
      }

      // Smooth inertia interpolation
      const lerpSpeed = 0.06;
      currentCamPos.lerp(targetCamPos, lerpSpeed);
      currentLookAt.lerp(targetLookAt, lerpSpeed);

      // Apply mouse parallax with damping
      camera.position.x = currentCamPos.x + mouseRef.current.x * 1.2;
      camera.position.y = currentCamPos.y + mouseRef.current.y * 1.2;
      camera.position.z = currentCamPos.z;

      camera.lookAt(currentLookAt);

      // Camera Banking (Roll angle)
      camera.rotation.z += targetBankAngle;

      renderer.render(scene, camera);
    };

    animate();

    // 10. CLEANUP
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);

      // Dispose resources
      starGeo.dispose();
      starMat.dispose();
      dustGeo.dispose();
      dustMat.dispose();
      gridGeo.dispose();
      gridMat.dispose();
      singularityGeo.dispose();
      singularityMat.dispose();
      photonShellGeo.dispose();
      photonShellMat.dispose();
      diskGeo.dispose();
      diskMat.dispose();
      jetGeo.dispose();
      jetMat.dispose();
      nodeGeo.dispose();
      rungCylGeo.dispose();
      sugarMat1.dispose();
      sugarMat2.dispose();
      bondMat.dispose();
      orbitalGeo.dispose();
      orbitalMat.dispose();
      mistGeo.dispose();
      mistMat.dispose();

      if (renderer.domElement && renderer.domElement.parentNode) {
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
