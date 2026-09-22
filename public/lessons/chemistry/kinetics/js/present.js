// ============================================================
// present.js — Presentation Mode
//  • ▶ นำเสนอ → fullscreen และสกรอลล์ทีละสไลด์ (mouse wheel /
//    PgUp / PgDn / ←→ / Home / End)
//  • Esc หรือปุ่ม ✕ ออกจากโหมด
//  • ซ่อน header ระหว่างนำเสนอ (content กินเต็มจอ)
// ============================================================
(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);

  function slides() {
    return Array.prototype.slice.call(document.querySelectorAll('main section[id^="slide-"]'));
  }

  let active = false;
  let idx = 0;
  let wheelLock = false;

  function slideOf(i) {
    const list = slides();
    return list[Math.max(0, Math.min(i, list.length - 1))];
  }

  function show(i, smooth) {
    idx = Math.max(0, Math.min(i, slides().length - 1));
    slideOf(idx).scrollIntoView({ behavior: smooth === false ? 'auto' : 'smooth', block: 'start' });
  }

  function step(delta) {
    if (wheelLock) return;
    wheelLock = true;
    setTimeout(function () { wheelLock = false; }, 700);
    show(idx + delta);
  }

  function onKey(e) {
    if (!active) return;
    switch (e.key) {
      case 'Escape':
        stop();
        break;
      case 'PageDown': case 'ArrowRight': case ' ': e.preventDefault(); step(1); break;
      case 'PageUp': case 'ArrowLeft': e.preventDefault(); step(-1); break;
      case 'Home': e.preventDefault(); show(0); break;
      case 'End': e.preventDefault(); show(slides().length - 1); break;
    }
  }

  function onWheel(e) {
    if (!active) return;
    e.preventDefault();
    const d = e.deltaY;
    if (Math.abs(d) < 8) return;
    step(d > 0 ? 1 : -1);
  }

  function start() {
    if (active) return;
    active = true;

    document.documentElement.classList.add('presenting');

    // inject presenter overlay
    const bar = document.createElement('div');
    bar.id = 'present-bar';
    bar.innerHTML =
      '<span id="present-counter"></span>' +
      '<span id="present-hint">เลื่อนเมาส์ / ←→ / PgUp-PgDn ทีละสไลด์ • Esc ออก</span>' +
      '<button id="present-exit" title="ออก (Esc)">✕</button>';
    document.body.appendChild(bar);

    $('#present-exit').addEventListener('click', stop);
    window.addEventListener('keydown', onKey, true);
    document.addEventListener('wheel', onWheel, { passive: false, capture: true });

    // remember where the user was
    document.body.dataset.prescroll = String(window.scrollY);

    const req = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
    if (req && req.catch) req.catch(function () { /* browser refused — scroll mode still works */ });

    // start at the first slide
    setTimeout(function () { show(0, false); }, 60);
    update();
  }

  function stop() {
    if (!active) return;
    active = false;
    document.documentElement.classList.remove('presenting');
    const bar = document.getElementById('present-bar');
    if (bar) bar.remove();
    window.removeEventListener('keydown', onKey, true);
    document.removeEventListener('wheel', onWheel, { capture: true });
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(function () {});
    }
    window.scrollTo({ top: parseInt(document.body.dataset.prescroll || '0', 10) || 0, behavior: 'auto' });
  }

  function update() {
    const c = document.getElementById('present-counter');
    if (c) c.textContent = (idx + 1) + ' / ' + slides().length;
  }

  // keep the counter in sync while scrolling manually
  window.addEventListener('scroll', function () {
    if (!active) return;
    const mid = window.scrollY + window.innerHeight / 2;
    let best = 0;
    slides().forEach(function (s, i) {
      const top = s.getBoundingClientRect().top + window.scrollY;
      if (top <= mid) best = i;
    });
    idx = best;
    update();
  });

  document.addEventListener('DOMContentLoaded', function () {
    const btn = document.getElementById('present-btn');
    if (btn) btn.addEventListener('click', start);
  });
})();
