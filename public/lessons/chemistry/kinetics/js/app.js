/**
 * Main Application Logic & Pinned Scrollytelling Controller
 * Topic: Chemical Kinetics (อัตราการเกิดปฏิกิริยาเคมี)
 * Author: Jeff (เจฟ)
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize KaTeX on static elements
  renderAllMath();

  // 2. Setup Scrollytelling Navigation & Dots
  setupNavigation();

  // 3. Setup Blueprint Flowchart Hubs (Topic 2 & Topic 6)
  setupBlueprintHub('t2');
  setupBlueprintHub('t6');

  // 4. Setup 3D Scenes on viewport entry
  setup3DTriggers();

  // 5. Setup Exam Practice Hub (Topic 7)
  setupExamHub();
});

// Helper: Render KaTeX safely across element or document
function renderAllMath(targetElement = document.body) {
  if (window.renderMathInElement) {
    try {
      window.renderMathInElement(targetElement, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false }
        ],
        throwOnError: false
      });
    } catch (e) {
      console.warn('KaTeX render warning:', e);
    }
  } else {
    // Retry after 200ms if KaTeX is still loading from CDN
    setTimeout(() => renderAllMath(targetElement), 200);
  }
}

// ----------------------------------------------------
// Navigation & Scrollytelling Setup
// ----------------------------------------------------
function setupNavigation() {
  const sections = document.querySelectorAll('.scrolly-slide');
  const dotsContainer = document.getElementById('slide-dots');
  const progressBar = document.getElementById('top-progress-bar');
  const currentSlideLabel = document.getElementById('current-slide-label');

  if (!dotsContainer) return;

  dotsContainer.innerHTML = '';

  const slideTitles = [
    "1. อัตราการเปลี่ยนแปลงสาร",
    "2. อัตราการเกิดปฏิกิริยา & Blueprint",
    "3. ทฤษฎีที่เกี่ยวข้อง (3D)",
    "4. พลังงานกับการดำเนินไป (3D)",
    "5. ปัจจัยที่มีผลต่อปฏิกิริยา (3D Lab)",
    "6. กฎอัตรา & Blueprint อันดับ/k",
    "7. คลังข้อสอบจริง 20 ข้อ"
  ];

  sections.forEach((section, idx) => {
    const dot = document.createElement('div');
    dot.className = `slide-nav-dot ${idx === 0 ? 'active' : ''}`;
    dot.title = slideTitles[idx] || `สไลด์ที่ ${idx + 1}`;
    dot.addEventListener('click', () => {
      section.scrollIntoView({ behavior: 'smooth' });
    });
    dotsContainer.appendChild(dot);
  });

  // Track active slide on scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const index = Array.from(sections).indexOf(entry.target);
        if (index !== -1) {
          // Update active dot
          document.querySelectorAll('.slide-nav-dot').forEach((d, i) => {
            d.classList.toggle('active', i === index);
          });
          // Update top slide label
          if (currentSlideLabel) {
            currentSlideLabel.textContent = slideTitles[index] || `สไลด์ ${index + 1}`;
          }
          // Update progress
          if (progressBar) {
            const pct = ((index + 1) / sections.length) * 100;
            progressBar.style.width = `${pct}%`;
          }
        }
      }
    });
  }, { threshold: 0.4 });

  sections.forEach(s => observer.observe(s));

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    if (e.key === 'PageDown' || e.key === 'ArrowDown') {
      // Find current active index
      const currentDot = document.querySelector('.slide-nav-dot.active');
      const dots = Array.from(document.querySelectorAll('.slide-nav-dot'));
      const currentIndex = dots.indexOf(currentDot);
      if (currentIndex < sections.length - 1 && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        // e.preventDefault();
        // sections[currentIndex + 1].scrollIntoView({ behavior: 'smooth' });
      }
    }
  });
}

// ----------------------------------------------------
// Blueprint Flowchart Hub Setup
// ----------------------------------------------------
function setupBlueprintHub(topicKey) {
  const isTopic2 = (topicKey === 't2');
  const blueprints = isTopic2 ? blueprintTopic2 : blueprintTopic6;
  const tabsContainer = document.getElementById(`${topicKey}-blueprint-tabs`);
  const contentContainer = document.getElementById(`${topicKey}-blueprint-content`);

  if (!tabsContainer || !contentContainer) return;

  tabsContainer.innerHTML = '';

  blueprints.forEach((bp, index) => {
    const btn = document.createElement('button');
    btn.className = `tab-btn px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-2 shadow-sm ${index === 0 ? 'active' : ''}`;
    btn.innerHTML = `
      <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index === 0 ? 'bg-white text-blue-600' : 'bg-slate-100 text-slate-600'}">${index + 1}</span>
      <span class="truncate max-w-[200px] text-left">${bp.title.split(':')[0]}</span>
    `;

    btn.addEventListener('click', () => {
      tabsContainer.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderBlueprintDetail(topicKey, bp);
    });

    tabsContainer.appendChild(btn);
  });

  // Render initial blueprint
  renderBlueprintDetail(topicKey, blueprints[0]);
}

function renderBlueprintDetail(topicKey, blueprint) {
  const container = document.getElementById(`${topicKey}-blueprint-content`);
  if (!container) return;

  // Blueprint สไลด์ 2 มี sampleExams 5 ข้อของตัวเอง — สไลด์ 6 ยังใช้ข้อสอบจริงเชื่อมโยง
  const hasSamples = Array.isArray(blueprint.sampleExams) && blueprint.sampleExams.length > 0;
  const linkedExam = examQuestions.find(q => q.id === blueprint.sampleExamId) || examQuestions[0];

  container.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- Left: Step-by-Step Sprouting Flowchart Tree (7 Cols) -->
      <div class="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-5">
          <div>
            <span class="badge-academic bg-blue-50 text-blue-700 border border-blue-200 mb-1.5">${blueprint.badge}</span>
            <h3 class="text-lg font-bold text-slate-900 font-heading">${blueprint.title}</h3>
            <p class="text-xs text-slate-500 mt-0.5">${blueprint.desc}</p>
          </div>
          <button id="${topicKey}-sprout-all-btn" class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition flex items-center gap-1.5">
            <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            <span>คลี่แสดงครบทุก Step</span>
          </button>
        </div>

        <!-- Node Pipeline -->
        <div id="${topicKey}-nodes-pipeline" class="blueprint-container space-y-3">
          ${blueprint.steps.map((step, idx) => `
            <div class="blueprint-node ${idx === 0 ? 'node-revealed node-active' : 'node-hidden'}" data-step-idx="${idx}">
              <div class="p-4 rounded-xl border-2 ${idx === 0 ? 'border-blue-500 bg-blue-50/20' : 'border-slate-200 bg-slate-50/50'} relative transition-all">
                <div class="flex items-center gap-3 mb-2">
                  <span class="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                    ${step.stepNum}
                  </span>
                  <h4 class="font-bold text-slate-900 text-sm font-heading">${step.title}</h4>
                </div>
                <div class="text-xs text-slate-600 leading-relaxed pl-10">${step.detail}</div>
                
                ${step.formula ? `
                  <div class="my-2.5 ml-10 p-2.5 bg-slate-900 text-white rounded-lg font-mono text-center text-xs overflow-x-auto">
                    $$${step.formula}$$
                  </div>
                ` : ''}

                <div class="ml-10 mt-2 p-2 bg-amber-50 rounded-lg border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-1.5">
                  <span class="font-bold text-amber-700">💡 Exam Tip:</span>
                  <span>${step.tip}</span>
                </div>
              </div>

              ${idx < blueprint.steps.length - 1 ? `
                <div class="connector-arrow ${idx === 0 ? 'arrow-active' : ''}">
                  <div class="arrow-line"></div>
                  <div class="arrow-head"></div>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>

        <!-- Sprout Action Bar -->
        <div class="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
          <div class="text-xs text-slate-500">
            สถานะ Flow: <span id="${topicKey}-step-counter" class="font-semibold text-blue-600">สเต็ป 1 / ${blueprint.steps.length}</span>
          </div>
          <button id="${topicKey}-next-step-btn" class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition">
            <span>งอกสเต็ปถัดไป</span>
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
          </button>
        </div>
      </div>

      <!-- Right: Sample Exam Cases with Sub-Tabs (5 Cols) -->
      <div class="lg:col-span-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 border border-slate-700 shadow-lg" id="${topicKey}-exam-panel">
        <div class="flex items-center justify-between border-b border-slate-700 pb-3 mb-4">
          <span class="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            ${hasSamples ? 'ชุดโจทย์ตัวอย่าง 5 ระดับ (ง่าย → แข่งขัน)' : `กรณีศึกษาข้อสอบจริง (ข้อที่ ${linkedExam.id})`}
          </span>
          <span class="text-[11px] text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
            ${hasSamples ? 'ไต่ระดับความยาก' : linkedExam.source}
          </span>
        </div>
        ${hasSamples ? `<div id="${topicKey}-sample-tabs"></div><div id="${topicKey}-sample-body"></div>` : `
        <!-- Question text -->
        <div class="text-xs leading-relaxed text-slate-200 mb-4 whitespace-pre-line">${linkedExam.question}</div>
        <!-- Options list -->
        <div class="space-y-1.5 mb-4 text-xs">
          ${linkedExam.options.map((opt, i) => `
            <div class="p-2 rounded-lg border ${i === linkedExam.correctAnswer ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200' : 'border-slate-700/60 bg-slate-800/40 text-slate-300'} flex items-start gap-2">
              <span class="font-bold font-mono text-[11px] ${i === linkedExam.correctAnswer ? 'text-emerald-400' : 'text-slate-400'}">${i + 1}.</span>
              <span>${opt}</span>
              ${i === linkedExam.correctAnswer ? '<span class="ml-auto text-[10px] font-bold text-emerald-400">เฉลย</span>' : ''}
            </div>
          `).join('')}
        </div>
        <!-- Blueprint Solution Box -->
        <div class="p-3.5 bg-slate-800/90 rounded-xl border border-slate-700 text-xs">
          <div class="font-bold text-blue-400 mb-1.5 flex items-center gap-1"><span>⚡ การแกะรอยด้วย Blueprint:</span></div>
          <div class="text-slate-300 text-[11px] leading-relaxed">${linkedExam.explanation}</div>
        </div>`}
      </div>
    </div>
  `;

  // Render KaTeX for newly created blueprint nodes
  renderAllMath(container);

  // Setup Step Sprouter Logic
  let currentStepIdx = 0;
  const totalSteps = blueprint.steps.length;
  const nodes = container.querySelectorAll('.blueprint-node');
  const arrows = container.querySelectorAll('.connector-arrow');
  const counter = document.getElementById(`${topicKey}-step-counter`);
  const nextBtn = document.getElementById(`${topicKey}-next-step-btn`);
  const sproutAllBtn = document.getElementById(`${topicKey}-sprout-all-btn`);

  function updateStepsView() {
    nodes.forEach((n, idx) => {
      if (idx <= currentStepIdx) {
        n.classList.remove('node-hidden');
        n.classList.add('node-revealed');
        n.classList.toggle('node-active', idx === currentStepIdx);
      } else {
        n.classList.remove('node-revealed', 'node-active');
        n.classList.add('node-hidden');
      }
    });

    arrows.forEach((arr, idx) => {
      arr.classList.toggle('arrow-active', idx < currentStepIdx);
    });

    if (counter) {
      counter.textContent = `สเต็ป ${currentStepIdx + 1} / ${totalSteps}`;
    }

    if (nextBtn) {
      if (currentStepIdx >= totalSteps - 1) {
        nextBtn.innerHTML = `<span>วนกลับสเต็ป 1</span><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>`;
      } else {
        nextBtn.innerHTML = `<span>งอกสเต็ปถัดไป</span><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>`;
      }
    }
  }

  nextBtn.addEventListener('click', () => {
    if (currentStepIdx < totalSteps - 1) {
      currentStepIdx++;
    } else {
      currentStepIdx = 0;
    }
    updateStepsView();
  });

  sproutAllBtn.addEventListener('click', () => {
    currentStepIdx = totalSteps - 1;
    updateStepsView();
  });

  // ---- Sub-Tabs: สลับดูโจทย์ตัวอย่าง 5 ข้อ (ง่าย → แข่งขัน) ----
  if (hasSamples) {
    const tabsBox = document.getElementById(`${topicKey}-sample-tabs`);
    const bodyBox = document.getElementById(`${topicKey}-sample-body`);

    function renderSample(idx) {
      const s = blueprint.sampleExams[idx];
      tabsBox.querySelectorAll('.bp-sample-tab').forEach((b, i) => {
        b.classList.toggle('bg-blue-600', i === idx);
        b.classList.toggle('border-blue-600', i === idx);
        b.classList.toggle('text-white', i === idx);
        b.classList.toggle('bg-slate-800', i !== idx);
        b.classList.toggle('text-slate-300', i !== idx);
      });

      bodyBox.innerHTML = `
        <div class="mb-3">
          <span class="inline-block text-[11px] font-bold px-2.5 py-1 rounded-full border ${s.badgeClass || 'bg-slate-800 text-slate-200 border-slate-600'}">
            ข้อ ${idx + 1} • ${s.level}
          </span>
        </div>
        <div class="text-xs leading-relaxed text-slate-200 mb-4 whitespace-pre-line">${s.question}</div>
        <div class="space-y-1.5 mb-4 text-xs">
          ${s.options.map((opt, i) => `
            <div class="p-2 rounded-lg border ${i === s.correctAnswer ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200' : 'border-slate-700/60 bg-slate-800/40 text-slate-300'} flex items-start gap-2">
              <span class="font-bold font-mono text-[11px] ${i === s.correctAnswer ? 'text-emerald-400' : 'text-slate-400'}">${i + 1}.</span>
              <span>${opt}</span>
              ${i === s.correctAnswer ? '<span class="ml-auto text-[10px] font-bold text-emerald-400 shrink-0">เฉลย</span>' : ''}
            </div>
          `).join('')}
        </div>
        <div class="p-3.5 bg-slate-800/90 rounded-xl border border-slate-700 text-xs">
          <div class="font-bold text-blue-400 mb-1.5 flex items-center gap-1"><span>⚡ วิธีคิดแบบ Blueprint (ทีละสเต็ป):</span></div>
          <div class="text-slate-300 text-[11px] leading-relaxed">${s.solution}</div>
        </div>
      `;
      renderAllMath(bodyBox);
    }

    tabsBox.innerHTML = `
      <div class="flex flex-wrap gap-1.5 mb-4">
        ${blueprint.sampleExams.map((s, i) => `
          <button class="bp-sample-tab text-[11px] font-bold px-3 py-1.5 rounded-lg border transition ${i === 0 ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}">
            ข้อ ${i + 1}
          </button>
        `).join('')}
      </div>
    `;
    tabsBox.querySelectorAll('.bp-sample-tab').forEach((btn, i) => {
      btn.addEventListener('click', () => renderSample(i));
    });
    renderSample(0);
  }
}

// ----------------------------------------------------
// Setup 3D Triggers & Controls
// ----------------------------------------------------
function setup3DTriggers() {
  // Topic 3: Collision Scene
  const collisionContainer = document.getElementById('three-collision-container');
  if (collisionContainer) {
    window.Kinetics3D.initCollisionScene('three-collision-container');

    // Button controls
    const modeBtns = document.querySelectorAll('[data-collision-mode]');
    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.getAttribute('data-collision-mode');
        window.Kinetics3D.collisionScene.setMode(mode);

        const desc = document.getElementById('collision-mode-desc');
        if (desc) {
          if (mode === 'success') {
            desc.innerHTML = '<span class="text-emerald-700 font-bold">✓ การชนสำเร็จ:</span> ทิศทางเหมาะสม (ชนตรงกัน) และพลังงานจลน์ $\\ge E_a$ — พันธะเดิมยืดออกจนขาด เกิดสารเชิงซ้อนกัมมันต์ แล้วสลายพร้อมสลับคู่เกิดเป็นผลิตภัณฑ์ใหม่ <strong>2 AB (น้ำเงิน-แดง)</strong> แยกจากกัน!';
          } else if (mode === 'wrong-orient') {
            desc.innerHTML = '<span class="text-amber-700 font-bold">✗ ชนผิดทิศทาง:</span> โมเลกุลหันด้านที่ไม่เหมาะสมชนกัน แรงผลักของอิเล็กตรอนทำให้โมเลกุลกระดอนกลับ ไม่เกิดปฏิกิริยา';
          } else {
            desc.innerHTML = '<span class="text-rose-700 font-bold">✗ พลังงานไม่เพียงพอ ($E < E_a$):</span> โมเลกุลเคลื่อนที่ช้าเกินไป ไม่สามารถข้ามกำแพงพลังงานก่อกัมมันต์ได้ กระดอนกลับเป็นสารเดิม';
          }
          renderAllMath(desc);
        }
      });
    });

    const restartBtn = document.getElementById('collision-restart-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => window.Kinetics3D.collisionScene.restart());
    }
  }

  // Topic 4: Energy Profile Scene
  const energyContainer = document.getElementById('three-energy-container');
  if (energyContainer) {
    window.Kinetics3D.initEnergyScene('three-energy-container');
    updateEnergyText(true, false);

    const exoBtn = document.getElementById('energy-exo-btn');
    const endoBtn = document.getElementById('energy-endo-btn');
    const catToggle = document.getElementById('energy-catalyst-toggle');
    const energyLevel = document.getElementById('energy-particle-level');
    const dirFwdBtn = document.getElementById('energy-dir-fwd');
    const dirRevBtn = document.getElementById('energy-dir-rev');
    const step1Btn = document.getElementById('energy-step1-btn');
    const step2Btn = document.getElementById('energy-step2-btn');
    const energyRestartBtn = document.getElementById('energy-restart-btn');

    if (dirFwdBtn && dirRevBtn) {
      dirFwdBtn.addEventListener('click', () => {
        dirFwdBtn.classList.add('active');
        dirRevBtn.classList.remove('active');
        window.Kinetics3D.energyScene.setDirection('fwd');
      });
      dirRevBtn.addEventListener('click', () => {
        dirRevBtn.classList.add('active');
        dirFwdBtn.classList.remove('active');
        window.Kinetics3D.energyScene.setDirection('rev');
      });
    }

    if (step1Btn) step1Btn.addEventListener('click', () => window.Kinetics3D.energyScene.playStep(1));
    if (step2Btn) step2Btn.addEventListener('click', () => window.Kinetics3D.energyScene.playStep(2));
    if (energyRestartBtn) energyRestartBtn.addEventListener('click', () => window.Kinetics3D.energyScene.restart());

    if (exoBtn && endoBtn) {
      exoBtn.addEventListener('click', () => {
        exoBtn.classList.add('active');
        endoBtn.classList.remove('active');
        window.Kinetics3D.energyScene.setThermicType('exo');
        updateEnergyText(true, catToggle ? catToggle.checked : false);
      });
      endoBtn.addEventListener('click', () => {
        endoBtn.classList.add('active');
        exoBtn.classList.remove('active');
        window.Kinetics3D.energyScene.setThermicType('endo');
        updateEnergyText(false, catToggle ? catToggle.checked : false);
      });
    }

    if (catToggle) {
      catToggle.addEventListener('change', (e) => {
        window.Kinetics3D.energyScene.toggleCatalyst(e.target.checked);
        const isExo = exoBtn ? exoBtn.classList.contains('active') : true;
        updateEnergyText(isExo, e.target.checked);
      });
    }

    if (energyLevel) {
      energyLevel.addEventListener('change', (e) => {
        window.Kinetics3D.energyScene.setEnergyLevel(e.target.value);
      });
    }
  }

  // Topic 5: Factors Scene
  const factorsContainer = document.getElementById('three-factors-container');
  if (factorsContainer) {
    window.Kinetics3D.initFactorsScene('three-factors-container');

    const concSlider = document.getElementById('factor-conc-slider');
    const concVal = document.getElementById('factor-conc-val');
    if (concSlider) {
      concSlider.addEventListener('input', (e) => {
        if (concVal) concVal.textContent = `${e.target.value} อนุภาค`;
        window.Kinetics3D.factorsScene.setConcentration(e.target.value);
      });
    }

    const tempSlider = document.getElementById('factor-temp-slider');
    const tempVal = document.getElementById('factor-temp-val');
    if (tempSlider) {
      tempSlider.addEventListener('input', (e) => {
        if (tempVal) tempVal.textContent = `${Math.round(e.target.value * 25 + 15)} °C`;
        window.Kinetics3D.factorsScene.setTemperature(e.target.value);
      });
    }

    const surfaceBtns = document.querySelectorAll('[data-surface-mode]');
    surfaceBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        surfaceBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        window.Kinetics3D.factorsScene.setSurfaceArea(btn.getAttribute('data-surface-mode'));
      });
    });

    const catBox = document.getElementById('factor-catalyst-check');
    if (catBox) {
      catBox.addEventListener('change', (e) => {
        window.Kinetics3D.factorsScene.toggleCatalyst(e.target.checked);
      });
    }
  }
}

function updateEnergyText(isExo, hasCat) {
  const infoBox = document.getElementById('energy-analysis-info');
  if (!infoBox) return;

  if (isExo) {
    infoBox.innerHTML = `
      <div class="space-y-1.5 text-xs text-slate-700">
        <p>• <strong>ประเภทปฏิกิริยา:</strong> <span class="text-rose-600 font-bold">คายความร้อน (Exothermic)</span> $\\Delta H < 0$</p>
        <p>• พลังงานผลิตภัณฑ์ ($E_P$) ต่ำกว่าสารตั้งต้น ($E_R$) จึงคายพลังงานความร้อนออกสู่สิ่งแวดล้อม</p>
        <p>• $E_{a,\\text{ย้อนกลับ}} = E_{a,\\text{ไปข้างหน้า}} + |\\Delta H|$ (ปฏิกิริยาย้อนกลับมี $E_a$ สูงกว่า)</p>
        ${hasCat ? '<p class="text-emerald-700 font-bold">✓ เส้นสีเขียวคือเส้นทางใหม่เมื่อมีตัวเร่ง: $E_a$ ลดลง ทำให้ข้ามยอดเขาได้เร็วขึ้นมาก แต่ $\\Delta H$ เท่าเดิม!</p>' : ''}
      </div>
    `;
  } else {
    infoBox.innerHTML = `
      <div class="space-y-1.5 text-xs text-slate-700">
        <p>• <strong>ประเภทปฏิกิริยา:</strong> <span class="text-blue-600 font-bold">ดูดความร้อน (Endothermic)</span> $\\Delta H > 0$</p>
        <p>• พลังงานผลิตภัณฑ์ ($E_P$) สูงกว่าสารตั้งต้น ($E_R$) จึงดูดพลังงานความร้อนจากสิ่งแวดล้อม</p>
        <p>• $E_{a,\\text{ไปข้างหน้า}} = E_{a,\\text{ย้อนกลับ}} + \\Delta H$ (ปฏิกิริยาไปข้างหน้ามี $E_a$ สูงกว่า)</p>
        ${hasCat ? '<p class="text-emerald-700 font-bold">✓ เส้นสีเขียวคือเส้นทางใหม่เมื่อมีตัวเร่ง: $E_a$ ลดลง ทำให้ข้ามยอดเขาได้เร็วขึ้นมาก แต่ $\\Delta H$ เท่าเดิม!</p>' : ''}
      </div>
    `;
  }
  renderAllMath(infoBox);
}

// ----------------------------------------------------
// Setup Exam Practice Hub (Topic 7) — Single-Frame Viewer
// ----------------------------------------------------
function setupExamHub() {
  const viewerCard = document.getElementById('exam-viewer-card');
  const filterBtns = document.querySelectorAll('[data-exam-filter]');
  const totalCountLabel = document.getElementById('exam-total-count');
  const numberStrip = document.getElementById('exam-number-strip');
  const positionLabel = document.getElementById('exam-position-label');
  const scoreLabel = document.getElementById('exam-score-label');
  const prevBtn = document.getElementById('exam-prev-btn');
  const nextBtn = document.getElementById('exam-next-btn');

  if (!viewerCard) return;

  const state = { filter: 'all', pool: [], viewIdx: 0, answers: {} };

  function rebuildPool() {
    state.pool = (state.filter === 'all')
      ? examQuestions.slice()
      : examQuestions.filter(q => q.topic.includes(state.filter));
    // เริ่มที่ข้อแรกของ pool ใหม่ ถ้าข้อเดิมไม่อยู่ใน pool
    if (state.viewIdx >= state.pool.length) state.viewIdx = 0;
  }

  function updateStrip() {
    if (!numberStrip) return;
    numberStrip.innerHTML = state.pool.map((q, i) => {
      const ans = state.answers[q.id];
      const isCurrent = i === state.viewIdx;
      let cls = 'exam-num-btn';
      let style = 'bg-white border-slate-300 text-slate-600';
      if (ans !== undefined) {
        cls += ' answered';
        style = ans === q.correctAnswer
          ? 'bg-emerald-500 border-emerald-500 text-white'
          : 'bg-rose-500 border-rose-500 text-white';
      }
      if (isCurrent) {
        cls += ' current';
        style = 'bg-blue-600 border-blue-600 text-white ring-2 ring-blue-300';
      }
      return `<button class="${cls} ${style}" data-strip-idx="${i}" title="ข้อ ${q.id} — ${q.topic}">${i + 1}</button>`;
    }).join('');

    numberStrip.querySelectorAll('.exam-num-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.viewIdx = parseInt(btn.getAttribute('data-strip-idx'), 10);
        renderCurrentQuestion();
      });
    });
  }

  function updateMeta() {
    if (totalCountLabel) {
      totalCountLabel.textContent = `พบ ${state.pool.length} จาก ${examQuestions.length} ข้อ`;
    }
    if (positionLabel) {
      positionLabel.textContent = `ข้อ ${state.viewIdx + 1} จาก ${state.pool.length} ข้อ`;
    }
    if (scoreLabel) {
      const answered = Object.keys(state.answers).length;
      const correct = Object.entries(state.answers).filter(([qid, a]) => {
        const q = examQuestions.find(x => x.id === parseInt(qid, 10));
        return q && q.correctAnswer === a;
      }).length;
      scoreLabel.textContent = `${correct} / ${answered}`;
    }
  }

  function renderCurrentQuestion() {
    const q = state.pool[state.viewIdx];
    if (!q) {
      viewerCard.innerHTML = '<div class="text-sm text-slate-500 text-center py-10">ไม่พบข้อสอบในหมวดนี้</div>';
      updateStrip();
      updateMeta();
      return;
    }

    const picked = state.answers[q.id];
    const answered = picked !== undefined;

    viewerCard.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
        <div class="flex items-center gap-2">
          <span class="badge-academic bg-blue-50 text-blue-700 border border-blue-200 text-[11px]">
            ข้อที่ ${q.id}
          </span>
          <span class="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            ${q.topic}
          </span>
        </div>
        <span class="text-[11px] font-medium text-slate-500" title="${q.source}">
          ${q.source}
        </span>
      </div>

      <p class="text-sm text-slate-800 leading-relaxed mb-5 whitespace-pre-line">${q.question}</p>

      <div class="space-y-2 mb-4" id="viewer-options-group">
        ${q.options.map((opt, oIdx) => {
          let cls = 'border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50/40';
          if (answered) {
            if (oIdx === q.correctAnswer) cls = 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold';
            else if (oIdx === picked) cls = 'bg-rose-50 border-rose-400 text-rose-800';
            else cls = 'border-slate-200 text-slate-400 opacity-70';
          }
          return `
            <button class="w-full text-left p-3 rounded-xl border-2 text-sm transition flex items-start gap-2.5 exam-choice-btn ${cls}"
              data-oidx="${oIdx}" ${answered ? 'disabled' : ''}>
              <span class="font-bold text-slate-400 w-5 shrink-0">${oIdx + 1}.</span>
              <span class="flex-1">${opt}</span>
              ${answered && oIdx === q.correctAnswer ? '<span class="text-emerald-600 font-bold text-xs shrink-0">✓ เฉลย</span>' : ''}
              ${answered && oIdx === picked && oIdx !== q.correctAnswer ? '<span class="text-rose-500 font-bold text-xs shrink-0">✗ ที่เลือก</span>' : ''}
            </button>
          `;
        }).join('')}
      </div>

      ${answered ? `
        <div class="p-4 rounded-xl bg-slate-900 text-white text-xs border border-slate-800">
          <div class="flex items-center justify-between text-emerald-400 font-bold pb-2 mb-2 border-b border-slate-800">
            <span>✓ เฉลย: ข้อ ${q.correctAnswer + 1} ${picked === q.correctAnswer ? '— ถูกต้อง! 🎉' : `— คุณเลือกข้อ ${picked + 1}`}</span>
            <span class="text-[10px] text-slate-400 font-normal">คำอธิบายละเอียด</span>
          </div>
          <div class="text-slate-300 text-[11px] leading-relaxed">${q.explanation}</div>
        </div>
      ` : `
        <div class="text-[11px] text-slate-400 text-center pt-1">คลิกเลือกคำตอบเพื่อดูเฉลยละเอียด (ตอบแล้วจะล็อกไม่ให้แก้)</div>
      `}
    `;

    renderAllMath(viewerCard);

    if (!answered) {
      viewerCard.querySelectorAll('.exam-choice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const oidx = parseInt(btn.getAttribute('data-oidx'), 10);
          state.answers[q.id] = oidx;
          renderCurrentQuestion();
          updateStrip();
          updateMeta();
        });
      });
    }

    updateStrip();
    updateMeta();
  }

  function step(delta) {
    const next = state.viewIdx + delta;
    if (next < 0 || next >= state.pool.length) return;
    state.viewIdx = next;
    renderCurrentQuestion();
    viewerCard.scrollTop = 0;
  }

  // Filter Buttons
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.filter = btn.getAttribute('data-exam-filter');
      rebuildPool();
      renderCurrentQuestion();
    });
  });

  if (prevBtn) prevBtn.addEventListener('click', () => step(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => step(1));

  // Keyboard: ← → เปลี่ยนข้อ (ยกเว้นพิมพ์ใน input/textarea และโหมดนำเสนอ)
  window.addEventListener('keydown', (e) => {
    if (document.documentElement.classList.contains('presenting')) return;
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
  });

  rebuildPool();
  renderCurrentQuestion();
}
