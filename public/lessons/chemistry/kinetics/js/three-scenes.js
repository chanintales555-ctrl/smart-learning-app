/**
 * Three.js 3D Molecular Simulation Engine
 * Topic: Chemical Kinetics (อัตราการเกิดปฏิกิริยาเคมี)
 * Author: Jeff (เจฟ)
 */

window.Kinetics3D = {
  // Scene 1: Collision Theory & Activated Complex
  collisionScene: null,
  // Scene 2: Energy Profile & Rolling Particle
  energyScene: null,
  // Scene 3: Factors Lab Simulation
  factorsScene: null,

  // Initialize Collision Theory Scene
  initCollisionScene: function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 400;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 5, 18);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 30;
    controls.minDistance = 6;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(10, 20, 15);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0x93c5fd, 0.5);
    backLight.position.set(-10, -10, -10);
    scene.add(backLight);

    // Subtle Ground Grid
    const grid = new THREE.GridHelper(20, 20, 0xcbd5e1, 0xe2e8f0);
    grid.position.y = -4;
    scene.add(grid);

    // Materials
    const matA = new THREE.MeshPhysicalMaterial({
      color: 0x2563eb, // Cobalt Blue
      roughness: 0.2,
      metalness: 0.1,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1
    });

    const matB = new THREE.MeshPhysicalMaterial({
      color: 0xef4444, // Red
      roughness: 0.2,
      metalness: 0.1,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1
    });

    const matBond = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.4,
      transparent: true
    });

    const matActivated = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Amber glow
      emissive: 0xd97706,
      emissiveIntensity: 0.6,
      roughness: 0.3
    });

    // Helper: Create Diatomic Molecule (VERTICAL: bond axis along Y, so two
    // molecules can approach in PARALLEL and collide side-on — both atom pairs
    // touch simultaneously, the textbook-correct collision orientation)
    function createDiatomic(mat1, mat2, distance = 2.4) {
      const group = new THREE.Group();
      const geomAtom = new THREE.SphereGeometry(0.8, 32, 32);

      const atom1 = new THREE.Mesh(geomAtom, mat1);
      atom1.position.y = distance / 2;
      atom1.castShadow = true;
      group.add(atom1);

      const atom2 = new THREE.Mesh(geomAtom, mat2);
      atom2.position.y = -distance / 2;
      atom2.castShadow = true;
      group.add(atom2);

      const bondGeom = new THREE.CylinderGeometry(0.2, 0.2, distance, 16);
      const bond = new THREE.Mesh(bondGeom, matBond);
      group.add(bond);

      return { group, atom1, atom2, bond };
    }

    // Reactant Molecule 1 (A2: Blue - Blue)
    const mol1 = createDiatomic(matA, matA);
    scene.add(mol1.group);

    // Reactant Molecule 2 (B2: Red - Red)
    const mol2 = createDiatomic(matB, matB);
    scene.add(mol2.group);

    // Product A-B bonds (horizontal), shown only after successful collision:
    // top pair bonds together and bottom pair bonds together (partner swap)
    const prodBondGeom = new THREE.CylinderGeometry(0.2, 0.2, 2.4, 16);
    const bondTop = new THREE.Mesh(prodBondGeom, matBond);
    bondTop.rotation.z = Math.PI / 2; // horizontal
    bondTop.position.set(0, 1.2, 0);
    bondTop.visible = false;
    scene.add(bondTop);

    const bondBottom = new THREE.Mesh(prodBondGeom, matBond);
    bondBottom.rotation.z = Math.PI / 2;
    bondBottom.position.set(0, -1.2, 0);
    bondBottom.visible = false;
    scene.add(bondBottom);

    // Activated Complex Glow Sphere (hidden by default)
    const glowGeom = new THREE.SphereGeometry(2.4, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0,
      wireframe: true
    });
    const glowSphere = new THREE.Mesh(glowGeom, glowMat);
    scene.add(glowSphere);

    // State Variables
    let animProgress = 0; // 0 to 1
    let isPlaying = true;
    let mode = 'success'; // 'success', 'wrong-orient', 'low-energy'
    let speed = 1.0;

    function resetSimulation() {
      animProgress = 0;
      mol1.group.rotation.set(0, 0, 0);
      mol2.group.rotation.set(0, 0, 0);
      glowMat.opacity = 0;
      glowSphere.scale.setScalar(1);

      // Restore pristine VERTICAL diatomic geometry (atoms on local Y axis)
      mol1.atom1.position.set(0, 1.2, 0);
      mol1.atom2.position.set(0, -1.2, 0);
      mol2.atom1.position.set(0, 1.2, 0);
      mol2.atom2.position.set(0, -1.2, 0);

      mol1.atom1.material = matA;
      mol1.atom2.material = matA;
      mol2.atom1.material = matB;
      mol2.atom2.material = matB;

      mol1.bond.visible = true;
      mol2.bond.visible = true;
      mol1.bond.scale.set(1, 1, 1);
      mol2.bond.scale.set(1, 1, 1);
      matBond.opacity = 1;

      // Product cross-bonds hidden and reset
      bondTop.visible = false;
      bondBottom.visible = false;
      bondTop.position.set(0, 1.2, 0);
      bondBottom.position.set(0, -1.2, 0);
      bondTop.scale.set(1, 1, 1);
      bondBottom.scale.set(1, 1, 1);

      mol1.group.position.set(-7, 0, 0);
      mol2.group.position.set(7, 0, 0);

      // Detach any product-phase atoms back into their groups (local coords)
      if (mol1.atom1.parent !== mol1.group) mol1.group.add(mol1.atom1);
      if (mol1.atom2.parent !== mol1.group) mol1.group.add(mol1.atom2);
      if (mol2.atom1.parent !== mol2.group) mol2.group.add(mol2.atom1);
      if (mol2.atom2.parent !== mol2.group) mol2.group.add(mol2.atom2);
    }

    resetSimulation();

    // Animation Loop
    function animate() {
      requestAnimationFrame(animate);

      if (isPlaying) {
        animProgress += 0.008 * speed;
        if (animProgress > 1.25) {
          animProgress = 0;
          resetSimulation(); // full state reset on loop wrap
        }

        const t = Math.min(animProgress, 1.0);

        if (mode === 'success') {
          // PARALLEL (side-on) collision — the correct orientation for A2 + B2:
          // both molecules stay VERTICAL (bond axis along Y) while approaching
          // along X, so at contact BOTH blue-red atom pairs touch simultaneously
          // (4-center activated complex). Then the cross pairs bond:
          // top (blue+red) and bottom (red+blue) = 2 AB products.
          // TIMELINE:
          //   t 0.00-0.45 : parallel approach along X
          //   t 0.45-0.65 : activated complex — old bonds stretch, cross bonds form
          //   t 0.65-1.00 : partner swap complete, 2 AB separate along Y

          if (t < 0.45) {
            const factor = t / 0.45;
            // 7 -> 0.8 : at 0.8 the facing surfaces JUST touch
            // (atom centers 1.6 apart horizontally = radius sum, both pairs)
            const ease = factor * factor * (3 - 2 * factor);
            const halfSep = 7 - 6.2 * ease;
            mol1.group.position.set(-halfSep, 0, 0);
            mol2.group.position.set(halfSep, 0, 0);
            mol1.group.rotation.set(0, 0, 0);
            mol2.group.rotation.set(0, 0, 0);
            glowMat.opacity = 0;

            // Pristine vertical A2 / B2; old bonds stretch (weaken) near contact
            const stretch = factor > 0.7 ? 1 + (factor - 0.7) : 1; // up to 1.3x
            mol1.bond.scale.y = stretch;
            mol2.bond.scale.y = stretch;
            mol1.bond.visible = true;
            mol2.bond.visible = true;
            mol1.atom1.material = matA; mol1.atom2.material = matA;
            mol2.atom1.material = matB; mol2.atom2.material = matB;
          } else if (t < 0.65) {
            // ---- ACTIVATED COMPLEX (4-center, X-axis compression only) ----
            const phase = (t - 0.45) / 0.2;
            const press = 0.2 * Math.sin(phase * Math.PI); // 0.8 -> 0.6 -> 0.8
            const halfSep = 0.8 - press;
            mol1.group.position.set(-halfSep, 0, 0);
            mol2.group.position.set(halfSep, 0, 0);
            glowMat.opacity = 0.5 + 0.3 * Math.sin(phase * Math.PI);
            glowSphere.scale.setScalar(1 + 0.15 * Math.sin(phase * Math.PI));

            // Old (vertical) bonds stretch then snap; all atoms amber
            const bondStretch = 1 + phase * 1.6;
            mol1.bond.scale.y = bondStretch;
            mol2.bond.scale.y = bondStretch;
            mol1.bond.visible = phase < 0.85;
            mol2.bond.visible = phase < 0.85;
            mol1.atom1.material = matActivated;
            mol1.atom2.material = matActivated;
            mol2.atom1.material = matActivated;
            mol2.atom2.material = matActivated;

            // New cross bonds (horizontal) grow between facing pairs:
            // top: blue(A)-red(B), bottom: red(B)-blue(A)
            const gap = 2 * halfSep; // horizontal distance between atom centers
            const grow = Math.min(1, phase * 1.6);
            bondTop.visible = true;
            bondBottom.visible = true;
            bondTop.position.set(0, 1.2, 0);
            bondBottom.position.set(0, -1.2, 0);
            bondTop.scale.x = (gap / 2.4) * grow;
            bondBottom.scale.x = (gap / 2.4) * grow;
            matBond.opacity = grow;
          } else {
            // ---- PRODUCTS: partner swap -> top AB + bottom AB ----
            // Top pair: blue(A, left) + red(B, right). Bottom pair:
            // red(B, left) + blue(A, right). Groups stay put at (±0.8, 0);
            // each atom slides vertically in local space (group rotation = 0),
            // so each AB pair moves as one RIGID unit — no distortion.
            const phase = (t - 0.65) / 0.35;
            glowMat.opacity = Math.max(0, 0.4 * (1 - phase * 2));

            // Recolor the swapped atoms (idempotent)
            mol1.atom1.material = matA; // top-left    blue A
            mol1.atom2.material = matB; // bottom-left red  B  (was A)
            mol2.atom1.material = matB; // top-right   red  B
            mol2.atom2.material = matA; // bottom-right blue A (was B)
            mol1.bond.visible = false;  // old A-A bond gone
            mol2.bond.visible = false;  // old B-B bond gone

            // New AB bonds span each horizontal pair (centers 1.6 apart)
            bondTop.visible = true;
            bondBottom.visible = true;
            bondTop.scale.x = 1.6 / 2.4;
            bondBottom.scale.x = 1.6 / 2.4;
            matBond.opacity = 1;

            // Rigid vertical separation of the two AB products (net momentum 0)
            const sep = 3.2 * phase;
            mol1.atom1.position.y = 1.2 + sep;
            mol2.atom1.position.y = 1.2 + sep;
            mol1.atom2.position.y = -1.2 - sep;
            mol2.atom2.position.y = -1.2 - sep;
            bondTop.position.y = 1.2 + sep;
            bondBottom.position.y = -1.2 - sep;
          }
        } else if (mode === 'wrong-orient') {
          // Shaking & wrong angle -> Bounce back without reaction
          if (t < 0.45) {
            const factor = t / 0.45;
            mol1.group.position.set(-6 + 5.2 * factor, 0, 0);
            mol2.group.position.set(6 - 5.2 * factor, 0, 0);
            mol1.group.rotation.z = factor * 1.8; // Bad angle!
            mol2.group.rotation.x = factor * 2.2;
            glowMat.opacity = 0;
          } else {
            // Bounce away untouched (tilted molecules, no reaction)
            const bounce = (t - 0.45) / 0.55;
            mol1.group.position.set(-0.8 - 5 * bounce, 2 * bounce, 0);
            mol2.group.position.set(0.8 + 5 * bounce, -2 * bounce, 0);
            mol1.group.rotation.z += 0.02;
            mol2.group.rotation.x += 0.02;
            glowMat.opacity = 0;
          }
        } else if (mode === 'low-energy') {
          // Very slow, gentle touch, cannot overcome Ea, bounce back softly
          if (t < 0.5) {
            const factor = t / 0.5;
            mol1.group.position.set(-6 + 5.2 * factor, 0, 0);
            mol2.group.position.set(6 - 5.2 * factor, 0, 0);
            glowMat.opacity = 0;
          } else {
            const bounce = (t - 0.5) / 0.5;
            mol1.group.position.set(-0.8 - 3.5 * bounce, 0, 0);
            mol2.group.position.set(0.8 + 3.5 * bounce, 0, 0);
            glowMat.opacity = 0;
          }
        }
      }

      controls.update();
      renderer.render(scene, camera);
    }

    animate();

    // Store controller object
    window.Kinetics3D.collisionScene = {
      setMode: function(newMode) {
        mode = newMode;
        resetSimulation();
      },
      setSpeed: function(newSpeed) {
        speed = newSpeed;
      },
      restart: function() {
        resetSimulation();
        isPlaying = true;
      },
      togglePlay: function() {
        isPlaying = !isPlaying;
      },
      resize: function() {
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      },
      // Debug/inspection: current molecule state (positions, colors, bonds)
      getState: function() {
        const col = m => {
          const c = m.material.color;
          return '#' + c.getHexString();
        };
        return {
          progress: +animProgress.toFixed(3),
          mol1: {
            pos: mol1.group.position.toArray().map(v => +v.toFixed(2)),
            atom1: { x: +mol1.atom1.position.x.toFixed(2), y: +mol1.atom1.position.y.toFixed(2), color: col(mol1.atom1) },
            atom2: { x: +mol1.atom2.position.x.toFixed(2), y: +mol1.atom2.position.y.toFixed(2), color: col(mol1.atom2) },
            bondVisible: mol1.bond.visible
          },
          mol2: {
            pos: mol2.group.position.toArray().map(v => +v.toFixed(2)),
            atom1: { x: +mol2.atom1.position.x.toFixed(2), y: +mol2.atom1.position.y.toFixed(2), color: col(mol2.atom1) },
            atom2: { x: +mol2.atom2.position.x.toFixed(2), y: +mol2.atom2.position.y.toFixed(2), color: col(mol2.atom2) },
            bondVisible: mol2.bond.visible
          },
          mode, speed, isPlaying
        };
      }
    };
  },

  // Initialize Energy Profile 3D Landscape & Rolling Ball
  initEnergyScene: function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 400;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 2.2, 27);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2 + 0.1;
    controls.minDistance = 8;
    controls.maxDistance = 35;

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(10, 20, 15);
    scene.add(sun);

    // Energy Curve Generation
    let isExothermic = true;
    let hasCatalyst = false;
    let curveMesh = null;
    let catalystMesh = null;

    // ---------- Text Sprite Helper (Thai-capable labels in 3D) ----------
    function makeTextSprite(text, opts = {}) {
      const { fontSize = 44, color = '#334155', scale = 0.85, bold = false } = opts;
      const canvas = document.createElement('canvas');
      const pad = 20;
      const ctx0 = canvas.getContext('2d');
      ctx0.font = `${bold ? 'bold ' : ''}${fontSize}px Sarabun, Arial, sans-serif`;
      const w = Math.ceil(ctx0.measureText(text).width) + pad * 2;
      canvas.width = w;
      canvas.height = fontSize + pad * 2;
      const ctx = canvas.getContext('2d');
      ctx.font = `${bold ? 'bold ' : ''}${fontSize}px Sarabun, Arial, sans-serif`;
      ctx.fillStyle = color;
      ctx.textBaseline = 'middle';
      ctx.fillText(text, pad, canvas.height / 2);
      const tex = new THREE.CanvasTexture(canvas);
      tex.minFilter = THREE.LinearFilter;
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set((canvas.width / canvas.height) * scale, scale, 1);
      return sprite;
    }

    // ---------- Axes with arrow tips + labels ----------
    const axisGroup = new THREE.Group();
    const axisMat = new THREE.LineBasicMaterial({ color: 0x475569 });
    axisGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-8, -4, 0), new THREE.Vector3(8.4, -4, 0)
    ]), axisMat));
    axisGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-8, -4, 0), new THREE.Vector3(-8, 6.4, 0)
    ]), axisMat));

    // Arrow tip cones
    const tipMat = new THREE.MeshBasicMaterial({ color: 0x475569 });
    const tipX = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.4, 12), tipMat);
    tipX.position.set(8.4, -4, 0);
    tipX.rotation.z = -Math.PI / 2;
    axisGroup.add(tipX);
    const tipY = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.4, 12), tipMat);
    tipY.position.set(-8, 6.4, 0);
    axisGroup.add(tipY);

    // Axis labels: Y = Potential Energy, X = Reaction Progress
    const yAxisLabel = makeTextSprite('พลังงานศักย์ (Potential Energy)', { fontSize: 40, scale: 0.62, color: '#475569', bold: true });
    yAxisLabel.position.set(-6.6, 7.0, 0);
    axisGroup.add(yAxisLabel);
    const xAxisLabel = makeTextSprite('การดำเนินของปฏิกิริยา (Reaction Progress) →', { fontSize: 40, scale: 0.62, color: '#475569', bold: true });
    xAxisLabel.position.set(3.6, -4.9, 0);
    axisGroup.add(xAxisLabel);
    scene.add(axisGroup);

    // ---------- Reaction title ----------
    const reactionTitle = makeTextSprite('ปฏิกิริยาตัวอย่าง:  A₂ + B₂ ⇌ 2AB', { fontSize: 46, scale: 0.78, color: '#1d4ed8', bold: true });
    reactionTitle.position.set(1.6, 8.1, 0);
    scene.add(reactionTitle);

    // Mathematical formula for the Energy Curve
    function getEnergyHeight(x, exo, cat) {
      // x from -7 to 7
      // Peak around x = 0
      const reactantH = 0;
      const productH = exo ? -2.5 : 2.5;
      const peakH = cat ? 2.5 : 5.2;

      // Sigmoid transition + Gaussian barrier
      const baseline = reactantH + (productH - reactantH) / (1 + Math.exp(-0.9 * x));
      const gaussian = (peakH - baseline) * Math.exp(-0.15 * x * x);
      return baseline + gaussian;
    }

    function buildCurves() {
      if (curveMesh) scene.remove(curveMesh);
      if (catalystMesh) scene.remove(catalystMesh);

      // Uncatalyzed Curve
      const points = [];
      for (let x = -7; x <= 7; x += 0.2) {
        points.push(new THREE.Vector3(x, getEnergyHeight(x, isExothermic, false), 0));
      }
      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeom = new THREE.TubeGeometry(curve, 70, 0.15, 12, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: 0x2563eb,
        roughness: 0.3
      });
      curveMesh = new THREE.Mesh(tubeGeom, tubeMat);
      scene.add(curveMesh);

      // Catalyzed Curve (Green dashed / thinner)
      if (hasCatalyst) {
        const catPoints = [];
        for (let x = -7; x <= 7; x += 0.2) {
          catPoints.push(new THREE.Vector3(x, getEnergyHeight(x, isExothermic, true), 0));
        }
        const catCurve = new THREE.CatmullRomCurve3(catPoints);
        const catTubeGeom = new THREE.TubeGeometry(catCurve, 70, 0.12, 12, false);
        const catTubeMat = new THREE.MeshStandardMaterial({
          color: 0x059669, // Emerald Green
          roughness: 0.3
        });
        catalystMesh = new THREE.Mesh(catTubeGeom, catTubeMat);
        scene.add(catalystMesh);
      }
    }

    // ---------- Ea / ΔH indicator lines ----------
    // Vertical double-arrows at x = -7.6 measuring:
    //   Ea fwd = peak - reactant level (red), Ea rev = peak - product level
    //   (violet), ΔH = product - reactant level (emerald), plus dashed guides
    const measureGroup = new THREE.Group();
    scene.add(measureGroup);

    function makeDashedLine(y1, y2, color) {
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-7.6, y1, 0), new THREE.Vector3(-7.6, y2, 0)
      ]);
      return new THREE.Line(g, new THREE.LineDashedMaterial({ color, dashSize: 0.22, gapSize: 0.14 }));
    }
    function makeArrowHead(y, dir, color) {
      const m = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.3, 10), new THREE.MeshBasicMaterial({ color }));
      m.position.set(-7.6, y, 0);
      m.rotation.z = dir > 0 ? 0 : Math.PI;
      return m;
    }

    function buildMeasurements() {
      while (measureGroup.children.length) measureGroup.remove(measureGroup.children[0]);

      const exo = isExothermic, cat = hasCatalyst;
      const peakY = getEnergyHeight(0, exo, cat);
      const rY = getEnergyHeight(-7, exo, cat);
      const pY = getEnergyHeight(7, exo, cat);

      // Horizontal dashed guides from curve to the measure axis
      const gPeak = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-7.6, peakY, 0), new THREE.Vector3(0, peakY, 0)
      ]), new THREE.LineDashedMaterial({ color: 0xdc2626, dashSize: 0.2, gapSize: 0.15 }));
      gPeak.computeLineDistances();
      measureGroup.add(gPeak);

      const gR = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-7.6, rY, 0), new THREE.Vector3(-6.2, rY, 0)
      ]), new THREE.LineDashedMaterial({ color: 0x2563eb, dashSize: 0.2, gapSize: 0.15 }));
      gR.computeLineDistances();
      measureGroup.add(gR);

      const gP = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-7.6, pY, 0), new THREE.Vector3(6.2, pY, 0)
      ]), new THREE.LineDashedMaterial({ color: 0x7c3aed, dashSize: 0.2, gapSize: 0.15 }));
      gP.computeLineDistances();
      measureGroup.add(gP);

      // Ea forward (red double arrow): reactant level -> peak
      const aF = new THREE.Group();
      aF.add(makeDashedLine(rY + 0.15, peakY - 0.15, 0xdc2626));
      aF.add(makeArrowHead(peakY - 0.15, 1, 0xdc2626));
      aF.add(makeArrowHead(rY + 0.15, -1, 0xdc2626));
      measureGroup.add(aF);
      const lF = makeTextSprite('Ea ไป', { fontSize: 36, scale: 0.55, color: '#dc2626', bold: true });
      lF.position.set(-7.0, (rY + peakY) / 2, 0);
      measureGroup.add(lF);

      // Ea reverse (violet double arrow): product level -> peak
      const aR = new THREE.Group();
      aR.add(makeDashedLine(pY + 0.15, peakY - 0.15, 0x7c3aed));
      aR.add(makeArrowHead(peakY - 0.15, 1, 0x7c3aed));
      aR.add(makeArrowHead(pY + 0.15, -1, 0x7c3aed));
      measureGroup.add(aR);
      const lR = makeTextSprite('Ea ย้อนกลับ', { fontSize: 36, scale: 0.55, color: '#7c3aed', bold: true });
      lR.position.set(-6.9, (pY + peakY) / 2 - 0.1, 0);
      measureGroup.add(lR);

      // ΔH (emerald double arrow): reactant level <-> product level
      const aH = new THREE.Group();
      aH.add(makeDashedLine(Math.min(rY, pY) + 0.12, Math.max(rY, pY) - 0.12, 0x059669));
      aH.add(makeArrowHead(Math.max(rY, pY) - 0.12, 1, 0x059669));
      aH.add(makeArrowHead(Math.min(rY, pY) + 0.12, -1, 0x059669));
      measureGroup.add(aH);
      const lH = makeTextSprite('ΔH', { fontSize: 38, scale: 0.58, color: '#059669', bold: true });
      lH.position.set(-7.0, (rY + pY) / 2 + 0.15, 0);
      measureGroup.add(lH);
    }

    buildCurves();
    buildMeasurements();

    // ---------- Platform labels ----------
    const lblReactant = makeTextSprite('สารตั้งต้น A₂ + B₂', { fontSize: 40, scale: 0.6, color: '#1e40af', bold: true });
    lblReactant.position.set(-5.4, 1.0, 0);
    scene.add(lblReactant);
    const lblProduct = makeTextSprite('ผลิตภัณฑ์ 2AB', { fontSize: 40, scale: 0.6, color: '#6d28d9', bold: true });
    lblProduct.position.set(5.4, 1.0, 0);
    scene.add(lblProduct);

    // ---------- Energy trail (amber tube revealed progressively) ----------
    let trailMesh = null;

    function buildTrail() {
      if (trailMesh) { scene.remove(trailMesh); trailMesh.geometry.dispose(); }
      const pts = [];
      for (let x = -7; x <= 7; x += 0.2) {
        pts.push(new THREE.Vector3(x, getEnergyHeight(x, isExothermic, hasCatalyst) + 0.02, 0.34));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const geom = new THREE.TubeGeometry(curve, 120, 0.22, 8, false);
      const mat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.9 });
      trailMesh = new THREE.Mesh(geom, mat);
      trailMesh.visible = false;
      scene.add(trailMesh);
    }
    buildTrail();

    // ---------- Molecule bundles (PARALLEL orientation: bond axes ⊥ motion) ----------
    // Reactant bundle: A2 (blue-blue) + B2 (red-red), both vertical (bond along Y)
    // Product bundle: two AB (blue over red), also vertical
    // Complex cluster: 2x2 square — old vertical bonds breaking (faint), new horizontal DASHED A-B bonds forming
    const matA2 = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.25 });
    const matB2 = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.25 });
    const matProdHot = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.7, roughness: 0.3 });

    const reactantBundle = new THREE.Group();
    const productBundle = new THREE.Group();
    const complexCluster = new THREE.Group();
    scene.add(reactantBundle, productBundle, complexCluster);

    const bondMatMol = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });

    function verticalDiatomic(parent, mTop, mBottom, xOff) {
      const g = new THREE.SphereGeometry(0.34, 24, 24);
      const aT = new THREE.Mesh(g, mTop); aT.position.set(xOff, 0.4, 0);
      const aB = new THREE.Mesh(g, mBottom); aB.position.set(xOff, -0.4, 0);
      const bond = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 10), bondMatMol);
      bond.position.set(xOff, 0, 0);
      parent.add(aT, aB, bond);
    }

    verticalDiatomic(reactantBundle, matA2, matA2, -0.55); // A2
    verticalDiatomic(reactantBundle, matB2, matB2, 0.55);  // B2
    verticalDiatomic(productBundle, matA2, matB2, -0.55);  // AB
    verticalDiatomic(productBundle, matA2, matB2, 0.55);   // AB

    // Dashed bond: row of small cylinders with gaps (reads as an unstable / forming bond)
    function dashedBond(parent, x1, y1, x2, y2, color, opacity) {
      const grp = new THREE.Group();
      const n = 4, gapFrac = 0.45;
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      const segLen = (len * (1 - gapFrac)) / n;
      const ang = Math.atan2(dy, dx);
      for (let i = 0; i < n; i++) {
        const c = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.05, segLen, 8),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity })
        );
        const t0 = (i + 0.25) / n;
        const mx = x1 + dx * t0 + (dx / len) * (segLen / 2);
        const my = y1 + dy * t0 + (dy / len) * (segLen / 2);
        c.position.set(mx, my, 0);
        c.rotation.z = ang - Math.PI / 2;
        grp.add(c);
      }
      parent.add(grp);
      return grp;
    }

    // Activated complex: 2x2 — A(colored, left) and B(colored, right) rows,
    // old vertical bonds fading, new horizontal A-B dashed bonds pulsing
    const complexBreakBonds = [];
    const complexFormBonds = [];
    (function buildComplex() {
      const g = new THREE.SphereGeometry(0.34, 24, 24);
      const pos = [[-0.42, 0.42], [-0.42, -0.42], [0.42, 0.42], [0.42, -0.42]];
      pos.forEach(([x, y]) => {
        const s = new THREE.Mesh(g, matProdHot);
        s.position.set(x, y, 0);
        complexCluster.add(s);
      });
      // breaking old bonds: vertical A-A (left) and B-B (right) — faint gray
      [-0.42, 0.42].forEach((x) => {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.84, 8),
          new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.35 }));
        b.position.set(x, 0, 0);
        complexCluster.add(b);
        complexBreakBonds.push(b);
      });
      // forming new bonds: horizontal DASHED A-B (top and bottom) — amber
      [0.42, -0.42].forEach((y) => {
        const grp = dashedBond(complexCluster, -0.42, y, 0.42, y, 0xfbbf24, 0.9);
        complexFormBonds.push(grp);
      });
    })();

    // Caption sprite shown above the activated complex
    const complexLabel = makeTextSprite('จุดยอด: สารเชิงซ้อน (Activated Complex) — ไม่เสถียร พันธะเก่ากำลังขาด พันธะใหม่กำลังก่อตัว', { fontSize: 40, scale: 0.62, color: '#b45309', bold: true });
    complexLabel.visible = false;
    scene.add(complexLabel);

    // Step captions (top corners of the scene)
    const step1Label = makeTextSprite('STEP 1: เคลื่อนที่ขึ้นสู่จุดยอด → เกิดสารเชิงซ้อน (พันธะเส้นประ = ไม่เสถียร)', { fontSize: 40, scale: 0.55, color: '#1d4ed8', bold: true });
    step1Label.position.set(-0.5, -6.0, 0);
    scene.add(step1Label);
    const step2Label = makeTextSprite('STEP 2: ข้ามจุดยอด → พันธะใหม่ A-B สมบูรณ์ เกิดผลิตภัณฑ์ 2AB', { fontSize: 40, scale: 0.55, color: '#059669', bold: true });
    step2Label.position.set(-0.5, -6.0, 0);
    step2Label.visible = false;
    scene.add(step2Label);

    // Glow ring riding the curve with the molecules
    const energyGlow = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.07, 12, 32),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.95 })
    );
    scene.add(energyGlow);

    // Ride state: step 1 = approach → stop at the peak (activated complex),
    // step 2 = cross the summit → products. Same rule both directions.
    let rideProgress = 0;   // 0..1 (0 = start plateau, 1 = products plateau)
    let isRolling = true;
    let ballKineticEnergy = 'sufficient';
    let playDir = 'fwd';    // 'fwd' | 'rev'
    let rideStep = 1;       // 1 = to peak, 2 = peak → products
    let rideStall = false;  // insufficient energy: stalling below the peak

    const PEAK_P = 0.5;     // rideProgress at the summit
    const PEAK_HOLD_X = 0;  // x where the complex forms

    function setStep(n) {
      rideStep = n;
      complexLabel.visible = false;
      if (n === 1) step1Label.visible = true;
      else { step1Label.visible = false; step2Label.visible = n === 2; }
    }

    const TUBE_INDICES = 120 * 8 * 6;

    function setTrailFraction(frac, fromRight) {
      if (!trailMesh) return;
      trailMesh.visible = true;
      const total = TUBE_INDICES;
      if (!fromRight) {
        trailMesh.geometry.setDrawRange(0, Math.floor(total * Math.min(1, Math.max(0, frac)) / 6) * 6);
      } else {
        const start = Math.floor(total * Math.min(1, Math.max(0, frac)) / 6) * 6;
        trailMesh.geometry.setDrawRange(start, total - start);
      }
    }

    function hideBundles() {
      reactantBundle.visible = false;
      productBundle.visible = false;
      complexCluster.visible = false;
    }

    function rideReset() {
      rideProgress = playDir === 'fwd' ? 0 : 1;
      isRolling = true;
      rideStall = false;
      setStep(1);
      hideBundles();
      if (playDir === 'fwd') reactantBundle.visible = true;
      else productBundle.visible = true;
      if (trailMesh) trailMesh.visible = false;
      energyGlow.material.opacity = 0;
    }

    function animate() {
      requestAnimationFrame(animate);

      if (isRolling) {
        // Insufficient energy (step 1): stall below the summit, then roll back down
        if (ballKineticEnergy === 'insufficient' && rideStep === 1 && rideProgress >= 0.38) rideStall = true;

        if (rideStall) {
          rideProgress -= 0.008 * (playDir === 'fwd' ? 1 : -1);
          if (playDir === 'fwd' ? rideProgress <= 0 : rideProgress >= 1) {
            rideProgress = playDir === 'fwd' ? 0 : 1;
            rideStall = false;
            isRolling = false;
          }
        } else {
          rideProgress += 0.004 * (playDir === 'fwd' ? 1 : -1);

          // STEP BOUNDARY: halt exactly at the summit — step 2 must be pressed to cross
          if (rideStep === 1 &&
              ((playDir === 'fwd' && rideProgress >= PEAK_P) ||
               (playDir === 'rev' && rideProgress <= PEAK_P))) {
            rideProgress = PEAK_P;
            isRolling = false;
          } else if (rideProgress <= 0 || rideProgress >= 1) {
            rideProgress = Math.max(0, Math.min(1, rideProgress));
            isRolling = false;
          }
        }

        const x = -7 + 14 * rideProgress;
        const atPeak = rideProgress === PEAK_P;
        const showComplex = atPeak || (Math.abs(x) < 1.3 && rideStep === 2);

        const y = getEnergyHeight(x, isExothermic, hasCatalyst) + 0.45;

        // Bundle visibility by phase
        hideBundles();
        if (showComplex) {
          complexCluster.visible = true;
          complexCluster.position.set(x, y - 0.45 + 0.55, 0);
          const pulse = 1 + 0.12 * Math.sin(performance.now() * 0.012);
          complexCluster.scale.setScalar(pulse);
          complexLabel.position.set(0, getEnergyHeight(0, isExothermic, hasCatalyst) + 1.9, 0);
          complexLabel.visible = true;
        } else {
          complexLabel.visible = false;
          const onReactantSide = rideProgress < PEAK_P;
          if (onReactantSide) {
            reactantBundle.visible = true;
            reactantBundle.position.set(x, y, 0);
          } else {
            productBundle.visible = true;
            productBundle.position.set(x, y, 0);
          }
        }

        // Amber trail marks "energy reached so far" along the curve
        const frac = (x + 7) / 14;
        setTrailFraction(frac, playDir === 'rev');

        // Glow ring on the measure axis showing current energy height
        energyGlow.position.set(-7.6, y - 0.45, 0.05);
        energyGlow.material.opacity = 0.35 + 0.45 * Math.abs(Math.sin(performance.now() * 0.004));
      }

      controls.update();
      renderer.render(scene, camera);
    }

    animate();

    window.Kinetics3D.energyScene = {
      setThermicType: function(type) {
        isExothermic = (type === 'exo');
        buildCurves();
        buildMeasurements();
        buildTrail();
        rideReset();
      },
      toggleCatalyst: function(val) {
        hasCatalyst = val;
        buildCurves();
        buildMeasurements();
        buildTrail();
        rideReset();
      },
      setEnergyLevel: function(level) {
        ballKineticEnergy = level;
        rideReset();
      },
      setDirection: function(dir) {
        playDir = (dir === 'rev') ? 'rev' : 'fwd';
        rideReset();
      },
      playStep: function(step) {
        if (step === 1) {
          // Replay step 1 from the starting plateau
          rideProgress = playDir === 'fwd' ? 0 : 1;
          setStep(1);
          hideBundles();
          if (playDir === 'fwd') reactantBundle.visible = true;
          else productBundle.visible = true;
          if (trailMesh) trailMesh.visible = false;
          isRolling = true;
        } else {
          // From the held peak, cross the summit to the products
          rideProgress = PEAK_P;
          rideStall = false;
          setStep(2);
          isRolling = true;
        }
      },
      restart: function() {
        rideReset();
      },
      seek: function(p) {
        rideProgress = Math.max(0, Math.min(1, p));
        rideStall = false;
        setStep(rideProgress >= PEAK_P ? 2 : 1);
        isRolling = true;
      },
      // Debug/inspection helper
      getState: function() {
        return {
          rideProgress: +rideProgress.toFixed(3),
          isExothermic, hasCatalyst, ballKineticEnergy,
          playDir, rideStep, isRolling,
          reactantVisible: reactantBundle.visible,
          productVisible: productBundle.visible,
          complexVisible: complexCluster.visible,
          complexLabelVisible: complexLabel.visible,
          trailVisible: trailMesh ? trailMesh.visible : false,
          curveVisible: curveMesh ? curveMesh.visible : null,
          curveInScene: curveMesh ? curveMesh.parent === scene : null,
          curvePos: curveMesh ? curveMesh.position.toArray().map(v=>+v.toFixed(2)) : null,
          curveScale: curveMesh ? curveMesh.scale.toArray().map(v=>+v.toFixed(2)) : null
        };
      },
      sceneRef: scene,
      cameraRef: camera,
      resize: function() {
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    };
  },

  // Initialize Factors Lab 3D Simulation
  initFactorsScene: function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 400;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 4, 18);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const light = new THREE.DirectionalLight(0xffffff, 1.0);
    light.position.set(10, 15, 10);
    scene.add(light);

    // Glass Chamber Box
    const boxSize = 8;
    const boxGeom = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
    const boxMat = new THREE.MeshPhysicalMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.12,
      roughness: 0.1,
      metalness: 0.1,
      clearcoat: 1.0,
      side: THREE.BackSide
    });
    const chamber = new THREE.Mesh(boxGeom, boxMat);
    scene.add(chamber);

    // Wireframe edges
    const edgesGeom = new THREE.EdgesGeometry(boxGeom);
    const edgesMat = new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.6 });
    scene.add(new THREE.LineSegments(edgesGeom, edgesMat));

    // Particle System (Reactant A: Blue, Reactant B: Red)
    let particleCount = 40;
    const particles = [];
    const geom = new THREE.SphereGeometry(0.3, 16, 16);
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.3 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });

    const particleGroup = new THREE.Group();
    scene.add(particleGroup);

    function createParticles(num) {
      // Clear existing
      while (particleGroup.children.length > 0) {
        particleGroup.remove(particleGroup.children[0]);
      }
      particles.length = 0;

      for (let i = 0; i < num; i++) {
        const isBlue = (i % 2 === 0);
        const mesh = new THREE.Mesh(geom, isBlue ? blueMat : redMat);
        mesh.position.set(
          (Math.random() - 0.5) * (boxSize - 1.2),
          (Math.random() - 0.5) * (boxSize - 1.2),
          (Math.random() - 0.5) * (boxSize - 1.2)
        );

        const velocity = new THREE.Vector3(
          (Math.random() - 0.5) * 0.08,
          (Math.random() - 0.5) * 0.08,
          (Math.random() - 0.5) * 0.08
        );

        particles.push({ mesh, velocity, isBlue });
        particleGroup.add(mesh);
      }
    }

    createParticles(particleCount);

    // Surface Area Chunk vs Powder Objects
    let surfaceMode = 'none'; // 'none', 'chunk', 'powder'
    const solidGroup = new THREE.Group();
    scene.add(solidGroup);

    function updateSurfaceArea(mode) {
      surfaceMode = mode;
      while (solidGroup.children.length > 0) {
        solidGroup.remove(solidGroup.children[0]);
      }

      if (mode === 'chunk') {
        // One large solid block
        const chunkGeom = new THREE.BoxGeometry(3.2, 3.2, 3.2);
        const chunkMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 });
        const chunk = new THREE.Mesh(chunkGeom, chunkMat);
        solidGroup.add(chunk);
      } else if (mode === 'powder') {
        // 27 small mini-cubes distributed
        const miniGeom = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const miniMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 });
        for (let x = -1.2; x <= 1.2; x += 1.2) {
          for (let y = -1.2; y <= 1.2; y += 1.2) {
            for (let z = -1.2; z <= 1.2; z += 1.2) {
              const mini = new THREE.Mesh(miniGeom, miniMat);
              mini.position.set(x, y, z);
              solidGroup.add(mini);
            }
          }
        }
      }
    }

    // Catalyst Plate Mesh
    let hasCatalystPlate = false;
    const catPlateGeom = new THREE.CylinderGeometry(2.5, 2.5, 0.2, 32);
    const catPlateMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      metalness: 0.7,
      roughness: 0.2
    });
    const catPlate = new THREE.Mesh(catPlateGeom, catPlateMat);
    catPlate.position.y = -boxSize / 2 + 0.4;
    catPlate.visible = false;
    scene.add(catPlate);

    // Control parameters
    let tempFactor = 1.0; // 0.5 to 3.0
    let reactionCount = 0;

    // Simulation loop
    const half = (boxSize - 1.0) / 2;
    function animate() {
      requestAnimationFrame(animate);

      // Rotate solid chunk slightly
      solidGroup.rotation.y += 0.005;

      // Update particle positions
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.mesh.position.addScaledVector(p.velocity, tempFactor);

        // Wall collisions
        if (Math.abs(p.mesh.position.x) > half) p.velocity.x *= -1;
        if (Math.abs(p.mesh.position.y) > half) p.velocity.y *= -1;
        if (Math.abs(p.mesh.position.z) > half) p.velocity.z *= -1;
      }

      controls.update();
      renderer.render(scene, camera);
    }

    animate();

    window.Kinetics3D.factorsScene = {
      setConcentration: function(val) {
        particleCount = parseInt(val, 10);
        createParticles(particleCount);
      },
      setTemperature: function(val) {
        tempFactor = parseFloat(val);
      },
      setSurfaceArea: function(mode) {
        updateSurfaceArea(mode);
      },
      toggleCatalyst: function(enabled) {
        hasCatalystPlate = enabled;
        catPlate.visible = enabled;
      },
      resize: function() {
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    };
  },

  // Auto handle window resize
  handleResize: function() {
    if (this.collisionScene) this.collisionScene.resize();
    if (this.energyScene) this.energyScene.resize();
    if (this.factorsScene) this.factorsScene.resize();
  }
};

window.addEventListener('resize', () => {
  window.Kinetics3D.handleResize();
});
