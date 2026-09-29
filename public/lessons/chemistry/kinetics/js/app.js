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
  const answeredSet = {};
  // Worked example: t2 มีข้อมูลเฉพาะแนว / t6 สร้างอัตโนมัติจาก steps + เฉลยข้อสอบจริง
  const we = blueprint.workedExample || {
    question: linkedExam.question,
    setup: 'จัดข้อมูลจากโจทย์ให้ครบทุกชุด แล้วระบุให้ชัดว่าโจทย์ถามหาอะไร',
    work: blueprint.steps.map(st => `<strong>${st.title}.</strong> ${st.detail}`),
    answer: linkedExam.explanation
  };

  container.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- Left: Step pager (single-frame) -->
      <div class="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div class="border-b border-slate-100 pb-4 mb-4">
          <span class="badge-academic bg-blue-50 text-blue-700 border border-blue-200 mb-1.5">${blueprint.badge}</span>
          <h3 class="text-lg font-bold text-slate-900 font-heading leading-snug">${blueprint.title}</h3>
          <p class="text-xs text-slate-500 mt-1 leading-relaxed">${blueprint.desc}</p>
        </div>

        <!-- Single-frame Step Stage: เลื่อนหน้าในกรอบเดิม ไม่งอกยาว -->
        <div id="${topicKey}-stage" class="bp-stage"></div>

        <div class="mt-4 pt-4 border-t border-slate-100">
          <div class="flex items-center justify-between gap-3">
            <button id="${topicKey}-stage-prev" class="bp-nav-btn px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 flex items-center gap-1">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
              <span>ถอยหลัง</span>
            </button>
            <div class="text-xs text-slate-500">
              Step <span id="${topicKey}-stage-counter" class="font-bold text-blue-600">1 / ${blueprint.steps.length}</span>
            </div>
            <button id="${topicKey}-stage-next" class="bp-nav-btn px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-1.5">
              <span>สเต็ปถัดไป</span>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            </button>
          </div>
          <div id="${topicKey}-stage-dots" class="bp-stage-dots flex items-center justify-center gap-1.5 mt-3"></div>
        </div>

                


      </div>

      <!-- Right: ตัวอย่างโจทย์ ไล่บรรทัดวิธีทำตาม Step (ซิงก์กับตัวเลขจริง) -->
      <div class="lg:col-span-7 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 border border-slate-700 shadow-lg flex flex-col">
        <div class="flex items-center justify-between border-b border-slate-700 pb-3 mb-4">
          <span class="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            ตัวอย่างโจทย์ — บรรทัดวิธีทำจะปรากฏทีละบรรทัดตาม Step ฝั่งซ้าย
          </span>
          <span class="text-[11px] text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">${we.tag || 'โจทย์ตัวอย่างของแนวนี้'}</span>
        </div>
        <div class="text-xs leading-relaxed text-slate-100 mb-3 whitespace-pre-line rounded-xl bg-slate-800/60 border border-slate-700 p-3">${we.question}</div>
        ${we.visual ? `<div id="${topicKey}-we-visual"></div>` : ''}
        <div class="text-[11px] text-slate-400 mb-2"><span class="font-bold text-amber-300">จัดข้อมูล:</span> ${we.setup}</div>
        <div id="${topicKey}-work-lines" class="space-y-2 flex-1">
          ${we.work.map((line, i) => `
            <div class="work-line" data-work-idx="${i}">
              <span class="wl-num">${i + 1}</span>
              <span>${line}</span>
            </div>
          `).join('')}
          <div class="work-line work-final" data-work-idx="${Math.max(we.work.length - 1, 0)}">
            <span class="wl-num">✓</span>
            <span><strong>คำตอบ:</strong> ${we.answer}</span>
          </div>
        </div>
        <div class="mt-3 text-[11px] text-slate-500 italic" id="${topicKey}-work-hint">กด "สเต็ปถัดไป" ฝั่งซ้าย — บรรทัดวิธีทำจะเพิ่มขึ้นมาตาม Step จนครบ</div>
      </div>
    </div>

    ${hasSamples ? `
    <!-- ชุดโจทย์ ข้อ 1-5: ตอบก่อน ค่อยเฉลย -->
    <div class="mt-6 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
        <h4 class="text-sm font-bold text-slate-900 font-heading flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          ฝึกทำเอง — ชุดโจทย์ 5 ข้อ (ง่าย → ข้อสอบแข่งขัน) • เลือกคำตอบก่อน แล้วเฉลยจะปรากฏ
        </h4>
        <div class="flex flex-wrap gap-1.5" id="${topicKey}-sample-tabs"></div>
      </div>
      <div id="${topicKey}-sample-body" class="text-slate-900"></div>
    </div>` : ''}
  `;

  // Render KaTeX for newly created blueprint nodes
  renderAllMath(container);

  // ---- Stage Pager: ภาพเดียว เลื่อนหน้าในกรอบเดิม + ซิงก์บรรทัดวิธีทำฝั่งขวา ----
  let currentStepIdx = 0;
  const totalSteps = blueprint.steps.length;
  const stage = document.getElementById(`${topicKey}-stage`);
  const counter = document.getElementById(`${topicKey}-stage-counter`);
  const prevBtn = document.getElementById(`${topicKey}-stage-prev`);
  const nextBtn = document.getElementById(`${topicKey}-stage-next`);
  const dotsBox = document.getElementById(`${topicKey}-stage-dots`);
  const workLines = container.querySelectorAll('.work-line');
  const workHint = document.getElementById(`${topicKey}-work-hint`);
  const visualBox = document.getElementById(`${topicKey}-we-visual`);

  // ---- Renderer ของสิ่งที่มาพร้อมโจทย์: ตารางที่ไฮไลต์ตาม Step / กราฟที่วาดทีละชั้น ----
  function renderVisual(vis, idx) {
    if (!visualBox) return;
    if (!vis || vis.type !== 'table') { visualBox.innerHTML = ''; return; }

    const atLast = (idx >= totalSteps);
    const hl = new Set((vis.highlight && ((atLast && vis.highlight.final) || vis.highlight[idx])) || []);
    let html = '<div class="we-visual"><table class="we-table">';
    html += '<thead><tr>' + vis.head.map(h => `<th>${h}</th>`).join('') + '</tr></thead><tbody>';
    vis.rows.forEach((row, r) => {
      html += '<tr>';
      row.forEach((cell, c) => {
        const id = `${r}-${c}`;
        const cls = [
          hl.has(id) ? 'hl' : '',
          (vis.mark || []).includes(id) ? 'target' : '',
          (vis.unknownCells || []).includes(id) ? 'unknown' : '',
          vis.colClass && vis.colClass[c] && c > 0 ? vis.colClass[c] : ''
        ].filter(Boolean).join(' ');
        html += `<td class="${cls}">${cell}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    const badge = vis.badges ? ((atLast && vis.badges.final) || vis.badges[idx]) : null;
    if (badge) html += `<div class="we-badge">${badge}</div>`;
    html += '</div>';
    visualBox.innerHTML = html;
  }

  function renderGraph(vis, idx) {
    if (!visualBox) return;
    if (!vis || vis.type !== 'graph') { visualBox.innerHTML = ''; return; }

    const W = 420, H = 280, padL = 48, padB = 34, padT = 16, padR = 14;
    const pw = W - padL - padR, ph = H - padT - padB;
    const xOf = t => padL + (t / vis.xmax) * pw;
    const yOf = v => padT + (1 - v / vis.ymax) * ph;

    const active = new Set(vis.layers[idx] || vis.layers[1]);
    const curvePts = vis.curve.map(p => `${xOf(p[0]).toFixed(1)},${yOf(p[1]).toFixed(1)}`).join(' ');
    const [tx1, ty1, tx2, ty2] = vis.tangent;
    const triY = yOf(ty1), triX2 = xOf(tx2), triX1 = xOf(tx1);

    // จุดสัมผัสบนเส้นโค้ง + เส้นสัมผัส (วาดจากจุดสัมผัสออกสองทิศ)
    const touchPt = vis.curve.find(p => p[0] === vis.tangentPoint);
    const tX = xOf(vis.tangentPoint);
    const tY = yOf(vis.touchY !== undefined ? vis.touchY : (touchPt ? touchPt[1] : ty1));
    const ax1 = xOf(tx1), ay1 = yOf(ty1), ax2 = xOf(tx2), ay2 = yOf(ty2);
    const lenL = Math.hypot(tX - ax1, tY - ay1).toFixed(1);
    const lenR = Math.hypot(ax2 - tX, ay2 - tY).toFixed(1);

    let svg = `<svg viewBox="0 0 ${W} ${H}" class="we-graph">`;
    svg += `<g class="g-layer" style="opacity:${active.has('grid') ? 1 : 0}">`;
    for (let v = 0; v <= vis.ymax + 1e-9; v += 0.1) {
      const y = yOf(v).toFixed(1);
      svg += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`;
      if (Math.round(v * 10) % 2 === 0) svg += `<text x="${padL - 6}" y="${Number(y) + 3}" font-size="9" fill="#64748b" text-anchor="end">${v.toFixed(1)}</text>`;
    }
    for (let t = 0; t <= vis.xmax; t += 4) {
      const x = xOf(t).toFixed(1);
      svg += `<line x1="${x}" y1="${padT}" x2="${x}" y2="${H - padB}" stroke="#f1f5f9" stroke-width="1"/>`;
      if (t % 8 === 0) svg += `<text x="${x}" y="${H - padB + 13}" font-size="9" fill="#64748b" text-anchor="middle">${t}</text>`;
    }
    svg += `<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H - padB}" stroke="#334155" stroke-width="1.5"/>`;
    svg += `<line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" stroke="#334155" stroke-width="1.5"/>`;
    svg += `<text x="${W - padR - 4}" y="${H - padB + 26}" font-size="10" fill="#334155" text-anchor="end">${vis.xlabel}</text>`;
    svg += `<text x="10" y="${padT + 4}" font-size="10" fill="#334155">${vis.ylabel}</text>`;
    svg += '</g>';

    svg += `<g class="g-layer" style="opacity:${active.has('curve') ? 1 : 0}">`;
    svg += `<polyline points="${curvePts}" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round"/>`;
    svg += '</g>';

    // ชั้นจุดสัมผัส: crosshair ประ + จุดวงแหวนบนเส้นโค้ง
    svg += `<g class="g-layer" style="opacity:${active.has('touch') ? 1 : 0}">`;
    svg += `<line x1="${tX}" y1="${tY}" x2="${tX}" y2="${H - padB}" stroke="#f59e0b" stroke-width="1.2" stroke-dasharray="4 3"/>`;
    svg += `<line x1="${padL}" y1="${tY}" x2="${tX}" y2="${tY}" stroke="#f59e0b" stroke-width="1.2" stroke-dasharray="4 3"/>`;
    svg += `<text x="${tX}" y="${H - padB + 13}" font-size="9.5" fill="#b45309" font-weight="bold" text-anchor="middle">t = ${vis.tangentPoint} s</text>`;
    svg += `<text x="${padL - 6}" y="${tY + 3}" font-size="9.5" fill="#b45309" font-weight="bold" text-anchor="end">${vis.touchY.toFixed(2)}</text>`;
    svg += `<circle class="touch-dot" cx="${tX}" cy="${tY}" r="5.5" fill="#f59e0b" stroke="#fff" stroke-width="2"/>`;
    svg += `<text x="${tX + 8}" y="${tY - 9}" font-size="9.5" fill="#b45309" font-weight="bold">จุดสัมผัส (${vis.tangentPoint}, ${vis.touchY.toFixed(2)})</text>`;
    svg += '</g>';

    // ชั้นเส้นสัมผัส: อนิเมชัน "หมุนไม้บรรทัด" — เส้นตรงปักหมุดที่จุดสัมผัส
    // หมุนจากมุมเอียง (ทะลุโค้ง 2 จุด = แดง) ไปจบที่มุมแตะโค้งจุดเดียวพอดี (ส้ม)
    // จากนั้นจุด 2 จุดบนเส้นตรง (จุดตัดแกน) + ป้ายพิกัดค่อยปรากฏท้ายสุด เพื่อเอาไปคิดความชัน
    svg += `<g class="g-layer" style="opacity:${active.has('tangent') ? 1 : 0}">`;
    svg += `<g class="ruler-group" style="transform-origin:${tX}px ${tY}px">`;
    svg += `<line class="ruler" x1="${ax1}" y1="${ay1}" x2="${ax2}" y2="${ay2}" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"/>`;
    svg += `<circle class="ruler-pivot" cx="${tX}" cy="${tY}" r="3.5" fill="#b45309"/>`;
    svg += `</g>`;
    svg += `<text class="cut-label" x="${(padL + W - padR) / 2}" y="${padT + 22}" font-size="10.5" fill="#dc2626" font-weight="bold" text-anchor="middle">✗ ตัดผ่านเส้นโค้ง — ไม่ใช่เส้นสัมผัส</text>`;
    svg += `<text class="ok-label" x="${(padL + W - padR) / 2}" y="${padT + 22}" font-size="10.5" fill="#047857" font-weight="bold" text-anchor="middle">✓ แตะโค้งจุดเดียวพอดี = เส้นสัมผัส (Tangent)</text>`;
    svg += `<g class="t-labels">`;
    svg += `<circle cx="${ax1}" cy="${ay1}" r="4.5" fill="#d97706"/><circle cx="${ax2}" cy="${ay2}" r="4.5" fill="#d97706"/>`;
    svg += `<text x="${ax1 + 7}" y="${ay1 - 7}" font-size="9.5" fill="#b45309" font-weight="bold">(${tx1}, ${ty1.toFixed(2)})</text>`;
    svg += `<text x="${ax2 - 7}" y="${ay2 - 8}" font-size="9.5" fill="#b45309" font-weight="bold" text-anchor="end">(${tx2}, ${ty2.toFixed(2)})</text>`;
    svg += `<text x="${tX + 10}" y="${tY + 48}" font-size="9" fill="#92400e" font-weight="bold">เลือก 2 จุด "บนเส้นตรง" (จุดตัดแกนพอดี) เพื่อคิดความชัน</text>`;
    svg += `</g>`;
    svg += '</g>';

    svg += `<g class="g-layer" style="opacity:${active.has('triangle') ? 1 : 0}">`;
    svg += `<polygon points="${triX1},${triY} ${triX2},${triY} ${triX2},${yOf(ty2)}" fill="rgba(16,185,129,.12)" stroke="#10b981" stroke-width="1.5" stroke-dasharray="5 3"/>`;
    svg += `<line x1="${(triX1 + triX2) / 2}" y1="${triY}" x2="${(triX1 + triX2) / 2}" y2="${yOf(ty2)}" stroke="#10b981" stroke-width="1.5" marker-start="url(#we-arrow)" marker-end="url(#we-arrow)"/>`;
    svg += `<text x="${(triX1 + triX2) / 2 + 6}" y="${(triY + yOf(ty2)) / 2}" font-size="9.5" fill="#047857" font-weight="bold">Δy = 0.60 M</text>`;
    svg += `<line x1="${triX1}" y1="${triY + 12}" x2="${triX2}" y2="${triY + 12}" stroke="#10b981" stroke-width="1.5" marker-start="url(#we-arrow)" marker-end="url(#we-arrow)"/>`;
    svg += `<text x="${(triX1 + triX2) / 2}" y="${triY + 25}" font-size="9.5" fill="#047857" font-weight="bold" text-anchor="middle">Δx = 40 s</text>`;
    svg += '</g>';
    svg += `<defs><marker id="we-arrow" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="#10b981"/></marker></defs>`;
    svg += '</svg>';

    const badge = vis.badges ? vis.badges[idx] : null;
    if (badge) svg += `<div class="we-badge">${badge}</div>`;
    visualBox.innerHTML = svg;
  }

  function updateVisual(idx) {
    const vis = we.visual;
    if (!vis) return;
    if (vis.type === 'table') renderVisual(vis, idx + 1);
    if (vis.type === 'graph') renderGraph(vis, idx + 1);
  }

// หมายเหตุ: updateVisual ถูกเรียกจาก renderStage ทุกครั้งที่กดสเต็ป — SVG ถูกสร้างใหม่
// ทำให้อนิเมชันเส้นสัมผัส (drawStroke) เล่นซ้ำทุกครั้งที่เข้าสเต็ปนั้น

  function renderStage(idx) {
    const step = blueprint.steps[idx];
    stage.innerHTML = `
      <div class="bp-stage-card rounded-xl p-5">
        <div class="flex items-center gap-3 mb-3">
          <span class="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-sm shrink-0">${step.stepNum}</span>
          <span class="text-[11px] font-bold uppercase tracking-wider text-blue-600">Step ${step.stepNum} จาก ${totalSteps}</span>
        </div>
        <h4 class="font-bold text-slate-900 text-sm font-heading mb-2">${step.title}</h4>
        <div class="text-xs text-slate-600 leading-relaxed">${step.detail}</div>
        ${step.formula ? `
          <div class="my-3 p-3 bg-slate-900 text-white rounded-xl font-mono text-center text-xs overflow-x-auto">$$${step.formula}$$</div>
        ` : ''}
        <div class="mt-3 p-2.5 bg-amber-50 rounded-lg border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-1.5">
          <span class="font-bold text-amber-700 shrink-0">💡 Exam Tip:</span>
          <span>${step.tip}</span>
        </div>
      </div>
    `;

    counter.textContent = `${idx + 1} / ${totalSteps}`;
    prevBtn.disabled = (idx === 0);
    nextBtn.disabled = (idx === totalSteps - 1);

    updateVisual(idx);

    dotsBox.innerHTML = blueprint.steps.map((_, i) =>
      `<span class="stage-dot ${i === idx ? 'active' : (i < idx ? 'done' : '')}"></span>`
    ).join('');

    workLines.forEach((el) => {
      el.classList.toggle('shown', Number(el.dataset.workIdx) <= idx);
    });
    if (workHint) {
      workHint.textContent = (idx >= totalSteps - 1)
        ? 'ครบทุก Step แล้ว — ตัวอย่างนี้แก้จบพอดี ✅ (ลองย้อนกลับดูได้ หรือลงไปฝึกชุดโจทย์ด้านล่างต่อ)'
        : `กด "สเต็ปถัดไป" เพื่อดูบรรทัดวิธีทำ ขั้นที่ ${idx + 2} (ตาม Step ${idx + 2} ฝั่งซ้าย)`;
    }

    renderAllMath(stage);
  }

  prevBtn.addEventListener('click', () => {
    if (currentStepIdx > 0) { currentStepIdx--; renderStage(currentStepIdx); }
  });
  nextBtn.addEventListener('click', () => {
    if (currentStepIdx < totalSteps - 1) { currentStepIdx++; renderStage(currentStepIdx); }
  });
  renderStage(0);

  // ---- Sub-Tabs ชุดโจทย์ 5 ข้อ: ตอบก่อน ค่อยเฉลย (เขียว/แดง + ล็อก) ----
  if (hasSamples) {
    const tabsBox = document.getElementById(`${topicKey}-sample-tabs`);
    const bodyBox = document.getElementById(`${topicKey}-sample-body`);

    function renderSample(idx) {
      const s = blueprint.sampleExams[idx];
      tabsBox.querySelectorAll('.bp-sample-tab').forEach((b, i) => {
        b.classList.toggle('bg-blue-600', i === idx);
        b.classList.toggle('border-blue-600', i === idx);
        b.classList.toggle('text-white', i === idx);
        b.classList.toggle('bg-slate-100', i !== idx);
        b.classList.toggle('text-slate-600', i !== idx);
      });

      if (!answeredSet[idx]) answeredSet[idx] = { locked: false };
      const st = answeredSet[idx];

      bodyBox.innerHTML = `
        <div class="mb-3">
          <span class="inline-block text-[11px] font-bold px-2.5 py-1 rounded-full border ${s.badgeClass || 'bg-slate-100 text-slate-700 border-slate-300'}">
            ข้อ ${idx + 1} • ${s.level}
          </span>
        </div>
        <div class="text-sm leading-relaxed text-slate-800 mb-4 whitespace-pre-line">${s.question}</div>
        <div class="space-y-2 mb-4 text-sm" id="${topicKey}-sample-options">
          ${s.options.map((opt, i) => `
            <button type="button" data-opt-idx="${i}" class="sample-opt w-full text-left p-3 rounded-xl border transition
              ${st.locked && i === s.correctAnswer ? 'bg-emerald-50 text-emerald-800 border-emerald-500' : ''}
              ${st.locked && st.picked === i && i !== s.correctAnswer ? 'bg-rose-50 text-rose-800 border-rose-400' : ''}
              ${!st.locked ? 'border-slate-200 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50/40 cursor-pointer' : 'cursor-default'}
              flex items-start gap-2">
              <span class="font-bold font-mono text-xs ${st.locked && i === s.correctAnswer ? 'text-emerald-600' : (st.locked && st.picked === i ? 'text-rose-500' : 'text-slate-400')}">${i + 1}.</span>
              <span>${opt}</span>
              ${st.locked && i === s.correctAnswer ? '<span class="ml-auto text-[10px] font-bold text-emerald-600 shrink-0">✓ คำตอบถูก</span>' : ''}
            </button>
          `).join('')}
        </div>
        ${st.locked ? `
          <div class="p-4 bg-slate-900 text-white rounded-xl text-xs">
            <div class="font-bold text-blue-400 mb-1.5 flex items-center gap-1"><span>⚡ วิธีคิดแบบ Blueprint (ทีละสเต็ป):</span></div>
            <div class="text-slate-200 leading-relaxed">${s.solution}</div>
          </div>
        ` : `
          <div class="text-[11px] text-slate-400 italic">คลิกเลือกคำตอบข้างบน — เฉลยละเอียดจะปรากฏเมื่อตอบแล้วเท่านั้น</div>
        `}
      `;

      if (!st.locked) {
        bodyBox.querySelectorAll('.sample-opt').forEach(btn => {
          btn.addEventListener('click', () => {
            st.locked = true;
            st.picked = Number(btn.dataset.optIdx);
            renderSample(idx);
            renderAllMath(bodyBox);
          });
        });
      }
      renderAllMath(bodyBox);
    }

    tabsBox.innerHTML = blueprint.sampleExams.map((s, i) => `
      <button class="bp-sample-tab text-[11px] font-bold px-3 py-1.5 rounded-lg border transition ${i === 0 ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'}">
        ข้อ ${i + 1}
      </button>
    `).join('');
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
