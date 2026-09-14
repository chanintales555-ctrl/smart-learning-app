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

  // Keep scroll progress updated in ref for requestAnimationFrame loop
  useEffect(() => {
    scrollRef.current = scrollProgress;
  }, [scrollProgress]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. SCENE & CAMERA SETUP
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05050a, 0.008);

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 2, 42);

    // Current & Target vectors for buttery smooth LERP
    const currentCamPos = new THREE.Vector3(0, 2, 42);
    const targetCamPos = new THREE.Vector3(0, 2, 42);
    const currentLookAt = new THREE.Vector3(0, 0, 0);
    const targetLookAt = new THREE.Vector3(0, 0, 0);

    // 2. RENDERER SETUP
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // 3. LIGHTING
    const ambientLight = new THREE.AmbientLight(0x0f172a, 1.8);
    scene.add(ambientLight);

    const physicsPointLight = new THREE.PointLight(0x38bdf8, 5, 50, 1.2);
    physicsPointLight.position.set(22, -2, -15);
    scene.add(physicsPointLight);

    const chemistryPointLight = new THREE.PointLight(0x10b981, 5, 50, 1.2);
    chemistryPointLight.position.set(-24, -3, -50);
    scene.add(chemistryPointLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(10, 30, 20);
    scene.add(keyLight);

    // 4. PROCEDURAL STARFIELD & NEBULA PARTICLES
    const starCount = 3500;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    const palette = [
      new THREE.Color(0x38bdf8), // Cyan
      new THREE.Color(0x60a5fa), // Blue
      new THREE.Color(0xf59e0b), // Amber
      new THREE.Color(0xffffff), // Pure white
      new THREE.Color(0xa855f7), // Violet
    ];

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      starPositions[i3] = (Math.random() - 0.5) * 400;
      starPositions[i3 + 1] = (Math.random() - 0.5) * 400;
      starPositions[i3 + 2] = (Math.random() - 0.5) * 400;

      const col = palette[Math.floor(Math.random() * palette.length)];
      starColors[i3] = col.r;
      starColors[i3 + 1] = col.g;
      starColors[i3 + 2] = col.b;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 0.9,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // 5. 🪐 PHYSICS PLANET: THE QUANTUM SINGULARITY (at 22, -2, -15)
    const physicsGroup = new THREE.Group();
    physicsGroup.position.set(22, -2, -15);
    scene.add(physicsGroup);

    // Physics Core (Pulsing Energy Sphere)
    const physCoreGeo = new THREE.SphereGeometry(4.2, 32, 32);
    const physCoreMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x0369a1,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.8,
    });
    const physCore = new THREE.Mesh(physCoreGeo, physCoreMat);
    physicsGroup.add(physCore);

    // Physics Wireframe Lattice Shell
    const physWireGeo = new THREE.SphereGeometry(4.5, 20, 20);
    const physWireMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    });
    const physWire = new THREE.Mesh(physWireGeo, physWireMat);
    physicsGroup.add(physWire);

    // Tri-Axial Gyroscopic Bohr Rings
    const createRing = (radius: number, tube: number, color: number, rotX: number, rotY: number) => {
      const ringGeo = new THREE.TorusGeometry(radius, tube, 16, 120);
      const ringMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.6,
        roughness: 0.3,
        metalness: 0.9,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = rotX;
      ring.rotation.y = rotY;
      return ring;
    };

    const ring1 = createRing(8.2, 0.12, 0x38bdf8, Math.PI / 4, 0);
    const ring2 = createRing(10.2, 0.1, 0x60a5fa, -Math.PI / 3, Math.PI / 6);
    const ring3 = createRing(12.2, 0.08, 0xf59e0b, Math.PI / 2.2, -Math.PI / 4);
    physicsGroup.add(ring1);
    physicsGroup.add(ring2);
    physicsGroup.add(ring3);

    // Orbiting Quantum Electrons (Particle stream)
    const electronCount = 48;
    const electronGeo = new THREE.BufferGeometry();
    const electronPositions = new Float32Array(electronCount * 3);
    for (let i = 0; i < electronCount; i++) {
      const i3 = i * 3;
      electronPositions[i3] = 0;
      electronPositions[i3 + 1] = 0;
      electronPositions[i3 + 2] = 0;
    }
    electronGeo.setAttribute('position', new THREE.BufferAttribute(electronPositions, 3));
    const electronMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 1.5,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.9,
    });
    const electronParticles = new THREE.Points(electronGeo, electronMat);
    physicsGroup.add(electronParticles);

    // 6. 🧪 CHEMISTRY PLANET: THE MOLECULAR CRYSTAL (at -24, -3, -50)
    const chemistryGroup = new THREE.Group();
    chemistryGroup.position.set(-24, -3, -50);
    scene.add(chemistryGroup);

    // Chemistry Faceted Crystal Core
    const chemCoreGeo = new THREE.IcosahedronGeometry(4.8, 1);
    const chemCoreMat = new THREE.MeshStandardMaterial({
      color: 0x059669,
      emissive: 0x047857,
      emissiveIntensity: 0.7,
      flatShading: true,
      roughness: 0.25,
      metalness: 0.5,
    });
    const chemCore = new THREE.Mesh(chemCoreGeo, chemCoreMat);
    chemistryGroup.add(chemCore);

    // Outer Crystal Cage
    const chemCageGeo = new THREE.IcosahedronGeometry(5.4, 1);
    const chemCageMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    });
    const chemCage = new THREE.Mesh(chemCageGeo, chemCageMat);
    chemistryGroup.add(chemCage);

    // Orbiting Molecular Lattice Structure
    const moleculeLattice = new THREE.Group();
    chemistryGroup.add(moleculeLattice);

    const atomColors = [0x10b981, 0xa855f7, 0xf97316, 0x38bdf8];
    const atomCount = 12;
    const atomRadius = 9.5;
    const atomMeshes: THREE.Mesh[] = [];

    for (let i = 0; i < atomCount; i++) {
      const angle = (i / atomCount) * Math.PI * 2;
      const x = Math.cos(angle) * atomRadius;
      const z = Math.sin(angle) * atomRadius;
      const y = Math.sin(i * 1.5) * 2.5;

      const aGeo = new THREE.SphereGeometry(0.75, 16, 16);
      const aMat = new THREE.MeshStandardMaterial({
        color: atomColors[i % atomColors.length],
        emissive: atomColors[i % atomColors.length],
        emissiveIntensity: 0.5,
        roughness: 0.3,
        metalness: 0.7,
      });
      const atom = new THREE.Mesh(aGeo, aMat);
      atom.position.set(x, y, z);
      moleculeLattice.add(atom);
      atomMeshes.push(atom);
    }

    // Reaction Mist Particles around Chemistry Planet
    const mistCount = 400;
    const mistGeo = new THREE.BufferGeometry();
    const mistPositions = new Float32Array(mistCount * 3);
    for (let i = 0; i < mistCount; i++) {
      const i3 = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 6.0 + Math.random() * 8.0;
      mistPositions[i3] = r * Math.sin(phi) * Math.cos(theta);
      mistPositions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      mistPositions[i3 + 2] = r * Math.cos(phi);
    }
    mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPositions, 3));
    const mistMat = new THREE.PointsMaterial({
      color: 0x34d399,
      size: 0.8,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    const mistParticles = new THREE.Points(mistGeo, mistMat);
    chemistryGroup.add(mistParticles);

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

    // 9. ANIMATION & RENDER LOOP
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const progress = scrollRef.current; // 0.0 to 1.0

      // A. Planet Self-Rotations
      physicsGroup.rotation.y = elapsed * 0.15;
      ring1.rotation.z = elapsed * 0.5;
      ring2.rotation.x = elapsed * 0.4;
      ring3.rotation.y = elapsed * 0.35;
      physWire.rotation.y = -elapsed * 0.2;

      // Quantum Electrons Orbiting
      const posAttr = electronParticles.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < electronCount; i++) {
        const speed = 1.2 + (i % 3) * 0.4;
        const angle = elapsed * speed + (i / electronCount) * Math.PI * 2;
        const r = 8.5 + (i % 4) * 1.2;
        const inclination = (i % 3) * 0.6;
        posAttr.setXYZ(
          i,
          Math.cos(angle) * r,
          Math.sin(angle * 2) * Math.sin(inclination) * 3,
          Math.sin(angle) * r * Math.cos(inclination)
        );
      }
      posAttr.needsUpdate = true;

      // Chemistry Planet Rotation & Molecular Lattice
      chemistryGroup.rotation.y = -elapsed * 0.12;
      chemCore.rotation.x = elapsed * 0.2;
      chemCore.rotation.y = elapsed * 0.3;
      chemCage.rotation.x = -elapsed * 0.15;
      moleculeLattice.rotation.y = elapsed * 0.4;
      mistParticles.rotation.y = -elapsed * 0.1;

      // Starfield subtle drift
      starField.rotation.y = elapsed * 0.015;

      // B. CAMERA FLIGHT CHOREOGRAPHY (Keyframed along scroll progress)
      if (progress < 0.25) {
        // Stage 1: Hero
        const t = progress / 0.25;
        targetCamPos.set(
          THREE.MathUtils.lerp(0, 8, t),
          THREE.MathUtils.lerp(2, 1, t),
          THREE.MathUtils.lerp(42, 28, t)
        );
        targetLookAt.set(
          THREE.MathUtils.lerp(0, 10, t),
          THREE.MathUtils.lerp(0, -1, t),
          THREE.MathUtils.lerp(0, -5, t)
        );
      } else if (progress < 0.55) {
        // Stage 2: Zoom & Orbit into Physics Planet (22, -2, -15)
        const t = (progress - 0.25) / 0.3;
        targetCamPos.set(
          THREE.MathUtils.lerp(8, 17, t),
          THREE.MathUtils.lerp(1, 1.5, t),
          THREE.MathUtils.lerp(28, 2, t)
        );
        targetLookAt.set(
          THREE.MathUtils.lerp(10, 22, t),
          THREE.MathUtils.lerp(-1, -2, t),
          THREE.MathUtils.lerp(-5, -15, t)
        );
      } else if (progress < 0.85) {
        // Stage 3: Sweep across the cosmos to Chemistry Planet (-24, -3, -50)
        const t = (progress - 0.55) / 0.3;
        targetCamPos.set(
          THREE.MathUtils.lerp(17, -16, t),
          THREE.MathUtils.lerp(1.5, -0.5, t),
          THREE.MathUtils.lerp(2, -35, t)
        );
        targetLookAt.set(
          THREE.MathUtils.lerp(22, -24, t),
          THREE.MathUtils.lerp(-2, -3, t),
          THREE.MathUtils.lerp(-15, -50, t)
        );
      } else {
        // Stage 4: Nexus Overview
        const t = (progress - 0.85) / 0.15;
        targetCamPos.set(
          THREE.MathUtils.lerp(-16, 0, t),
          THREE.MathUtils.lerp(-0.5, 24, t),
          THREE.MathUtils.lerp(-35, -10, t)
        );
        targetLookAt.set(
          THREE.MathUtils.lerp(-24, 0, t),
          THREE.MathUtils.lerp(-3, -5, t),
          THREE.MathUtils.lerp(-50, -32, t)
        );
      }

      // Smooth interpolation for cinematic inertia
      const lerpSpeed = 0.055;
      currentCamPos.lerp(targetCamPos, lerpSpeed);
      currentLookAt.lerp(targetLookAt, lerpSpeed);

      // Add gentle mouse parallax to camera position
      camera.position.x = currentCamPos.x + mouseRef.current.x * 0.8;
      camera.position.y = currentCamPos.y + mouseRef.current.y * 0.8;
      camera.position.z = currentCamPos.z;

      camera.lookAt(currentLookAt);

      renderer.render(scene, camera);
    };

    animate();

    // 10. CLEANUP ON UNMOUNT
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);

      // Dispose geometries & materials
      starGeo.dispose();
      starMat.dispose();
      physCoreGeo.dispose();
      physCoreMat.dispose();
      physWireGeo.dispose();
      physWireMat.dispose();
      ring1.geometry.dispose();
      (ring1.material as THREE.Material).dispose();
      chemCoreGeo.dispose();
      chemCoreMat.dispose();
      chemCageGeo.dispose();
      chemCageMat.dispose();
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
