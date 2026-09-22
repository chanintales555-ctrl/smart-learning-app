// ============================================================
// widgets.js — Interactive teaching widgets
//  1. Straddling-table rate finder        (slide 2)
//  2. Equation-from-table + catalyst trap (slide 2)
//  3. X/Y/Z missing-value puzzle          (slide 5)
//  4. Three-reactant rate law             (slide 6)
//  5. Multi-step mechanism 3-peak diagram (slide 4)
// ============================================================
(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);

  function fmt(v, d) {
    const s = Number(v).toFixed(d === undefined ? 2 : d);
    return s.replace(/\.?0+$/, '');
  }

  // ------------------------------------------------------------
  // 1) STRADDLING TABLE (slide 2)
  // ------------------------------------------------------------
  function initStraddle() {
    const tbody = document.querySelector('#straddle-table tbody');
    const btnBox = $('#straddle-target-btns');
    if (!tbody || !btnBox || tbody.children.length) return;

    // Real Zn + HCl gas-collection data (t s, V cm³) — every row shows its
    // own average rate to the next row, so students see "average ≠ at t0"
    const rows = [[0, 0], [9, 24], [15, 42], [19, 51], [25, 60], [31, 66], [39, 70], [47, 72], [55, 72]];

    rows.forEach((r, i) => {
      let avg = '–';
      if (i < rows.length - 1) {
        avg = fmt((rows[i + 1][1] - r[1]) / (rows[i + 1][0] - r[0]), 2);
      }
      tbody.insertAdjacentHTML('beforeend',
        '<tr data-t="' + r[0] + '" class="border-b border-slate-100 hover:bg-slate-50 transition">' +
        '<td class="border border-slate-200 px-2 py-1.5 font-mono">' + r[0] + '</td>' +
        '<td class="border border-slate-200 px-2 py-1.5 font-mono">' + r[1] + '</td>' +
        '<td class="border border-slate-200 px-2 py-1.5 font-mono text-emerald-700">' + avg + '</td>' +
        '</tr>');
    });

    function pairFor(t0) {
      const lower = rows.filter(function (r) { return r[0] < t0; });
      const upper = rows.filter(function (r) { return r[0] > t0; });
      if (!lower.length || !upper.length) return null;
      return [lower[lower.length - 1], upper[0]];
    }

    function select(t0) {
      const pair = pairFor(t0);
      if (!pair) return;
      const lo = pair[0], hi = pair[1];
      tbody.querySelectorAll('tr').forEach(function (tr) {
        const t = +tr.dataset.t;
        const isPair = (t === lo[0] || t === hi[0]);
        const isTarget = (t === t0);
        tr.classList.toggle('bg-amber-100', isPair);
        tr.classList.toggle('font-semibold', isPair);
        tr.classList.toggle('ring-2', isTarget);
        tr.classList.toggle('ring-amber-500', isTarget);
      });
      const dV = hi[1] - lo[1];
      const dt = hi[0] - lo[0];
      $('#straddle-step1').textContent = 't\u2080 = ' + t0 + ' s \u2192 \u0e43\u0e0a\u0e49\u0e0a\u0e48\u0e27\u0e07 ' + lo[0] + '\u2013' + hi[0] + ' s (\u0e04\u0e23\u0e48\u0e2d\u0e21 t\u2080 \u0e1e\u0e2d\u0e14\u0e35)';
      $('#straddle-step2').textContent = '\u0394V = ' + hi[1] + ' \u2212 ' + lo[1] + ' = ' + dV + ' cm\u00b3 ,  \u0394t = ' + hi[0] + ' \u2212 ' + lo[0] + ' = ' + dt + ' s';
      $('#straddle-step3').textContent = '\u0e2d\u0e31\u0e15\u0e23\u0e32\u0e17\u0e35\u0e48 t\u2080 \u2248 \u0394V/\u0394t = ' + dV + '/' + dt + ' \u2248 ' + fmt(dV / dt, 2) + ' cm\u00b3/s';
      $('#straddle-tip').textContent = '\u0e2b\u0e32\u0e27\u0e34\u0e19\u0e32\u0e17\u0e35\u0e48 ' + t0 + ' \u0e15\u0e49\u0e2d\u0e07\u0e43\u0e0a\u0e49\u0e0a\u0e48\u0e27\u0e07 ' + lo[0] + '\u2013' + hi[0] + ' \u0e04\u0e23\u0e48\u0e2d\u0e21\u0e1e\u0e2d\u0e14\u0e35 \u2014 \u0e2b\u0e49\u0e32\u0e21\u0e43\u0e0a\u0e49\u0e0a\u0e48\u0e27\u0e07\u0e17\u0e35\u0e48\u0e44\u0e21\u0e48\u0e04\u0e23\u0e48\u0e2d\u0e21 t\u2080!';

      btnBox.querySelectorAll('button').forEach(function (b) {
        const on = (+b.dataset.t === t0);
        b.className = 'text-xs font-bold rounded-lg px-2.5 py-1.5 border transition ' +
          (on ? 'bg-amber-500 text-white border-amber-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50');
      });
    }

    [15, 25, 31].forEach(function (t0) {
      const b = document.createElement('button');
      b.textContent = 't = ' + t0 + ' s';
      b.dataset.t = t0;
      b.addEventListener('click', function () { select(t0); });
      btnBox.appendChild(b);
    });

    select(15);
  }

  // ------------------------------------------------------------
  // 2) EQUATION FROM TABLE + CATALYST TRAP (slide 2)
  // ------------------------------------------------------------
  function initEqSolve() {
    const head = $('#eqsolve-head');
    const body = $('#eqsolve-body');
    const analysis = $('#eqsolve-analysis');
    const conclusion = $('#eqsolve-conclusion');
    if (!head || !body || head.children.length > 1) return;

    const species = [
      { name: 'A', vals: [0.60, 0.40, 0.20, 0.00], trend: 'down' },
      { name: 'B', vals: [0.60, 0.50, 0.40, 0.30], trend: 'down' },
      { name: 'C', vals: [0.20, 0.20, 0.20, 0.20], trend: 'flat' },
      { name: 'D', vals: [0.00, 0.10, 0.20, 0.30], trend: 'up' }
    ];
    const times = [0, 10, 20, 30];

    // header: keep the first "เวลา" th, add one per species (clickable)
    species.forEach(function (s) {
      const th = document.createElement('th');
      th.className = 'border border-slate-200 px-2 py-1.5 font-bold cursor-pointer hover:bg-slate-200 transition';
      th.innerHTML = '\u0e2a\u0e32\u0e23 ' + s.name + ' (mol)';
      th.addEventListener('click', function () { analyze(s); });
      head.appendChild(th);
    });

    times.forEach(function (t, i) {
      let html = '<tr><td class="border border-slate-200 px-2 py-1.5 font-mono bg-slate-50">' + t + '</td>';
      species.forEach(function (s) { html += '<td class="border border-slate-200 px-2 py-1.5 font-mono">' + s.vals[i] + '</td>'; });
      html += '</tr>';
      body.insertAdjacentHTML('beforeend', html);
    });

    function analyze(clicked) {
      // delta per 10 s for each species
      const deltas = species.map(function (s) {
        return (s.vals[s.vals.length - 1] - s.vals[0]) / (times[times.length - 1] - times[0]) * 10;
      });
      analysis.innerHTML = species.map(function (s, i) {
        const styles = {
          down: 'bg-rose-50 border-rose-300 text-rose-800',
          up: 'bg-emerald-50 border-emerald-300 text-emerald-800',
          flat: 'bg-amber-50 border-amber-300 text-amber-800'
        }[s.trend];
        const label = { down: '\u0e25\u0e14 \u2192 \u0e2a\u0e32\u0e23\u0e15\u0e31\u0e49\u0e07\u0e15\u0e49\u0e19', up: '\u0e40\u0e1e\u0e34\u0e48\u0e21 \u2192 \u0e1c\u0e25\u0e34\u0e15\u0e20\u0e31\u0e13\u0e11\u0e4c', flat: '\u0e04\u0e07\u0e17\u0e35\u0e48 \u2192 \u0e15\u0e31\u0e27\u0e40\u0e23\u0e48\u0e07!' }[s.trend];
        return '<div class="p-2 rounded-lg border ' + styles + (clicked && clicked.name === s.name ? ' ring-2 ring-slate-900' : '') + '">' +
          '<div class="font-bold">' + s.name + ': ' + label + '</div>' +
          '<div class="font-mono">\u0394/10s = ' + fmt(Math.abs(deltas[i]), 2) + '</div></div>';
      }).join('');

      // ratio: divide by smallest nonzero delta
      const moving = deltas.map(function (d, i) { return { d: Math.abs(d), s: species[i] }; })
        .filter(function (x) { return x.d > 1e-9; })
        .sort(function (a, b) { return a.d - b.d; });
      const min = moving[0].d;
      const ratio = moving.map(function (x) { return { name: x.s.name, r: x.d / min, dir: x.s.trend }; });
      const lhs = ratio.filter(function (x) { return x.dir === 'down'; })
        .map(function (x) { return fmt(x.r, 0) + x.name; }).join(' + ');
      const rhs = ratio.filter(function (x) { return x.dir === 'up'; })
        .map(function (x) { return fmt(x.r, 0) + x.name; }).join(' + ');
      const cat = species.filter(function (s) { return s.trend === 'flat'; }).map(function (s) { return s.name; });

      conclusion.innerHTML =
        '<div class="font-bold text-emerald-300 mb-1">\u0e2a\u0e21\u0e01\u0e32\u0e23\u0e17\u0e35\u0e48\u0e41\u0e01\u0e30\u0e44\u0e14\u0e49:</div>' +
        '<div class="font-mono text-sm text-center p-2 bg-white/10 rounded-lg">' +
        (lhs || '?') + ' \u2500\u2500' + (cat.length ? cat[0] : '') + '\u2500\u2500\u25b6 ' + (rhs || '?') + '</div>' +
        (cat.length
          ? '<div class="mt-2 text-rose-300 font-bold">\u26a0\ufe0f \u0e08\u0e33\u0e44\u0e14\u0e49: \u0e2a\u0e32\u0e23 ' + cat.join(', ') +
            ' \u0e04\u0e07\u0e17\u0e35\u0e48\u0e15\u0e25\u0e2d\u0e14 \u2192 \u0e40\u0e1b\u0e47\u0e19\u0e15\u0e31\u0e27\u0e40\u0e23\u0e48\u0e07 \u201c\u0e2b\u0e49\u0e32\u0e21\u0e43\u0e2a\u0e48\u0e43\u0e19\u0e2a\u0e21\u0e01\u0e32\u0e23\u0e40\u0e04\u0e21\u0e35\u201d \u0e40\u0e02\u0e35\u0e22\u0e19\u0e04\u0e23\u0e48\u0e2d\u0e21\u0e25\u0e39\u0e01\u0e28\u0e23\u0e40\u0e17\u0e48\u0e32\u0e19\u0e31\u0e49\u0e19!</div>'
          : '');
    }

    analyze(species[3]);
  }

  // ------------------------------------------------------------
  // 3) X / Y / Z MISSING-VALUE PUZZLE (slide 5)
  //    2A + 3B \u2192 C ; every 10 s interval consumes in ratio 2:3:1
  // ------------------------------------------------------------
  function initXYZ() {
    const head = $('#xyz-head');
    const body = $('#xyz-body');
    if (!head || !body || head.children.length) return;

    const species = ['A', 'B', 'C'];
    const times = [0, 10, 20, 30];
    const known = {
      'A,0': '6.0', 'B,0': '9.0', 'C,0': '0',
      'A,10': '4.8', 'B,10': '7.2', 'C,10': '0.6',
      'A,20': 'X', 'B,20': 'Y', 'C,20': '1.2',
      'A,30': '2.4', 'B,30': 'Z', 'C,30': '1.8'
    };
    const answers = { X: 3.6, Y: 5.4, Z: 4.5 };

    head.innerHTML = '<th class="border border-slate-200 px-2 py-1.5">\u0e40\u0e27\u0e25\u0e32 (s)</th>' +
      species.map(function (s) {
        return '<th class="border border-slate-200 px-2 py-1.5">\u0e2a\u0e32\u0e23 ' + s + ' (mol)</th>';
      }).join('');

    body.innerHTML = times.map(function (t) {
      return '<tr>' +
        '<td class="border border-slate-200 px-2 py-1.5 font-mono bg-slate-50">' + t + '</td>' +
        species.map(function (s) {
          const v = known[s + ',' + t];
          const isVar = (v === 'X' || v === 'Y' || v === 'Z');
          return '<td class="border border-slate-200 px-2 py-1.5 font-mono ' +
            (isVar ? 'bg-violet-100 font-bold text-violet-800' : '') + '">' + v + '</td>';
        }).join('') + '</tr>';
    }).join('');

    $('#xyz-equation').textContent = '2A  +  3B  \u2192  C';

    $('#xyz-inputs').innerHTML = ['X', 'Y', 'Z'].map(function (v) {
      return '<label class="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1.5">' +
        '<span class="font-bold text-violet-700">' + v + ' =</span>' +
        '<input type="number" step="0.1" class="xyz-in w-16 text-xs border border-slate-200 rounded px-1.5 py-0.5" data-var="' + v + '">' +
        '<span class="text-slate-400 text-[10px]">mol</span></label>';
    }).join('') +
      '<button id="xyz-check" class="text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-lg px-3 py-1.5 transition">\u0e15\u0e23\u0e27\u0e08\u0e04\u0e33\u0e15\u0e2d\u0e1a</button>';

    function check() {
      let ok = 0;
      ['X', 'Y', 'Z'].forEach(function (v) {
        const input = document.querySelector('.xyz-in[data-var="' + v + '"]');
        const good = Math.abs((parseFloat(input.value) || 0) - answers[v]) < 0.05;
        if (good) ok++;
        input.classList.toggle('border-emerald-500', good);
        input.classList.toggle('border-rose-500', !good);
      });
      const msg = (ok === 3)
        ? '\u2705 \u0e16\u0e39\u0e01\u0e17\u0e38\u0e01\u0e15\u0e31\u0e27! \u0394\u0e2a\u0e32\u0e23 \u221d \u0e2a\u0e31\u0e21\u0e1b\u0e23\u0e30\u0e2a\u0e34\u0e17\u0e18\u0e34\u0e4c\u0e42\u0e21\u0e25\u0e17\u0e38\u0e01\u0e0a\u0e48\u0e27\u0e07\u0e40\u0e27\u0e25\u0e32'
        : '\u0e16\u0e39\u0e01 ' + ok + '/3 \u2014 \u0e40\u0e04\u0e25\u0e47\u0e14: \u0e0a\u0e48\u0e27\u0e07 0\u219210 s \u0e43\u0e2b\u0e49 \u0394A:\u0394B:\u0394C = 1.2 : 1.8 : 0.6 = 2 : 3 : 1 \u0e41\u0e25\u0e49\u0e27\u0e44\u0e25\u0e48\u0e40\u0e0a\u0e37\u0e48\u0e2d\u0e21\u0e17\u0e38\u0e01\u0e0a\u0e48\u0e27\u0e07';
      $('#xyz-feedback').innerHTML = '<span class="' + (ok === 3 ? 'text-emerald-700 font-bold' : 'text-amber-700') + '">' + msg + '</span>';
    }

    const checkBtn = $('#xyz-check');
    if (checkBtn) checkBtn.addEventListener('click', check);

    const newBtn = $('#xyz-new-btn');
    if (newBtn) newBtn.addEventListener('click', function () {
      $('#xyz-hint-line').textContent = '\u0e17\u0e38\u0e01\u0e0a\u0e48\u0e27\u0e07 10 s: \u0394A = 1.2, \u0394B = 1.8, \u0394C = 0.6 \u2192 \u0e2d\u0e31\u0e15\u0e23\u0e32\u0e2a\u0e48\u0e27\u0e19 2:3:1 \u0e15\u0e32\u0e21\u0e2a\u0e31\u0e21\u0e1b\u0e23\u0e30\u0e2a\u0e34\u0e17\u0e18\u0e34\u0e4c\u2014\u0e08\u0e36\u0e07\u0e40\u0e0a\u0e37\u0e48\u0e2d\u0e21\u0e04\u0e48\u0e32 X, Y, Z \u0e44\u0e14\u0e49\u0e17\u0e32\u0e07\u0e01\u0e32\u0e23\u0e17\u0e38\u0e01\u0e0a\u0e48\u0e27\u0e07';
      check();
    });
  }

  // ------------------------------------------------------------
  // 4) THREE-REACTANT RATE LAW (slide 6)
  // ------------------------------------------------------------
  function initRate3() {
    const head = $('#rate3-head');
    const body = $('#rate3-body');
    if (!head || !body || head.children.length) return;

    const ordersFor = function () {
      // random orders, avoid all-zero
      let o;
      do {
        o = [0, 1, 2].map(function () { return Math.floor(Math.random() * 3); });
      } while (o[0] + o[1] + o[2] === 0);
      return o;
    };

    function newRound() {
      const o = ordersFor();
      const k = +(Math.random() * 2 + 0.5).toFixed(2);
      const exps = [
        { A: 0.10, B: 0.10, C: 0.10 },
        { A: 0.20, B: 0.10, C: 0.10 },
        { A: 0.10, B: 0.20, C: 0.10 },
        { A: 0.10, B: 0.10, C: 0.20 }
      ];
      const rate = function (e) {
        return k * Math.pow(e.A, o[0]) * Math.pow(e.B, o[1]) * Math.pow(e.C, o[2]);
      };
      // readable formatting for small rates (avoid "0.000")
      const fmtRate = function (r) {
        return (r >= 0.001) ? r.toFixed(3) : r.toExponential(2);
      };

      head.innerHTML = '<th class="border border-slate-200 px-2 py-1.5">\u0e01\u0e32\u0e23\u0e17\u0e14\u0e25\u0e2d\u0e07</th>' +
        ['A', 'B', 'C'].map(function (s) {
          return '<th class="border border-slate-200 px-2 py-1.5">[' + s + '] (M)</th>';
        }).join('') +
        '<th class="border border-slate-200 px-2 py-1.5">\u0e2d\u0e31\u0e15\u0e23\u0e32\u0e40\u0e23\u0e34\u0e48\u0e21\u0e15\u0e49\u0e19 (M/s)</th>';

      body.innerHTML = exps.map(function (e, i) {
        return '<tr class="hover:bg-slate-50">' +
          '<td class="border border-slate-200 px-2 py-1.5 font-bold bg-slate-50">' + (i + 1) + '</td>' +
          '<td class="border border-slate-200 px-2 py-1.5 font-mono">' + e.A.toFixed(2) + '</td>' +
          '<td class="border border-slate-200 px-2 py-1.5 font-mono">' + e.B.toFixed(2) + '</td>' +
          '<td class="border border-slate-200 px-2 py-1.5 font-mono">' + e.C.toFixed(2) + '</td>' +
          '<td class="border border-slate-200 px-2 py-1.5 font-mono font-bold text-blue-700">' + fmtRate(rate(e)) + '</td>' +
          '</tr>';
      }).join('');

      // prediction scenario: [A]=0.20, [B]=0.30, [C]=0.40
      const f = Math.pow(2, o[0]) * Math.pow(3, o[1]) * Math.pow(4, o[2]);
      const newRate = rate(exps[0]) * f;

      const lawStr = 'r = ' + k + '[A]^' + o[0] + '[B]^' + o[1] + '[C]^' + o[2];
      const predStr = 'r \u0e43\u0e2b\u0e21\u0e48 = r\u2081 \u00d7 (2)^' + o[0] + ' \u00d7 (3)^' + o[1] + ' \u00d7 (4)^' + o[2] +
        ' = ' + fmtRate(rate(exps[0])) + ' \u00d7 ' + f + ' = ' + fmtRate(newRate) + ' M/s';

      body.dataset.answer = lawStr + ' ||| ' + predStr;
      $('#rate3-law').textContent = '\u0e04\u0e25\u0e34\u0e01\u0e1b\u0e38\u0e48\u0e21\u0e14\u0e49\u0e32\u0e19\u0e25\u0e48\u0e32\u0e07 \u201c\u0e40\u0e09\u0e25\u0e22\u201d \u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e40\u0e1b\u0e34\u0e14\u0e40\u0e09\u0e25\u0e22\u0e25\u0e30\u0e40\u0e2d\u0e35\u0e22\u0e14 \u2014 \u0e40\u0e17\u0e35\u0e22\u0e1a\u0e04\u0e39\u0e48 1\u21942 \u0e2b\u0e32 x, 1\u21943 \u0e2b\u0e32 y, 1\u21944 \u0e2b\u0e32 z';
      $('#rate3-predict').textContent = '\u0e17\u0e33\u0e19\u0e32\u0e22\u0e2d\u0e31\u0e15\u0e23\u0e32\u0e17\u0e35\u0e48 [A]=0.20, [B]=0.30, [C]=0.40 (\u0e08\u0e32\u0e01\u0e01\u0e32\u0e23\u0e17\u0e14\u0e25\u0e2d\u0e07\u0e17\u0e35\u0e48 1)';
    }

    newRound();

    const reveal = function () {
      const parts = (body.dataset.answer || '').split(' ||| ');
      if (parts.length === 2) {
        $('#rate3-law').textContent = parts[0];
        $('#rate3-predict').textContent = parts[1];
      }
    };

    const lawBox = $('#rate3-law');
    const predBox = $('#rate3-predict');
    if (lawBox) lawBox.addEventListener('click', reveal);
    if (predBox) predBox.addEventListener('click', reveal);

    const newBtn = $('#rate3-new-btn');
    if (newBtn) newBtn.addEventListener('click', newRound);
  }

  // ------------------------------------------------------------
  // 5) MULTI-STEP MECHANISM DIAGRAM (slide 4)
  //    3 peaks, 2 wells: R \u2192 B \u2192 C \u2192 P (B, C = intermediates)
  // ------------------------------------------------------------
  function initMultiStep() {
    const box = $('#multistep-widget');
    if (!box || box.dataset.init) return;
    box.dataset.init = '1';

    const W = 720, H = 300, padL = 58, padT = 30, padB = 40;
    const yFor = function (e) { return padT + (1 - e) * (H - padT - padB); };
    const xFor = function (u) { return padL + u * (W - padL - 18); };

    // Profile: R, peak1, well B, peak2(TS), well C, peak3, P
    const nodes = [
      { u: 0.02, e: 0.20, label: 'R', kind: 'station' },
      { u: 0.15, e: 0.72, label: 'TS\u2081 (E)', kind: 'peak' },
      { u: 0.30, e: 0.40, label: 'B', kind: 'well' },
      { u: 0.46, e: 0.95, label: 'TS\u2082 (F)', kind: 'peak' },
      { u: 0.62, e: 0.48, label: 'C', kind: 'well' },
      { u: 0.80, e: 0.78, label: 'TS\u2083 (G)', kind: 'peak' },
      { u: 0.98, e: 0.28, label: 'P', kind: 'station' }
    ];

    const pathD = nodes.map(function (n, i) {
      return (i ? 'L' : 'M') + xFor(n.u).toFixed(1) + ',' + yFor(n.e).toFixed(1);
    }).join(' ');

    box.innerHTML =
      '<svg viewBox="0 0 ' + W + ' ' + H + '" class="w-full" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px">' +
      '<defs>' +
      '<marker id="msA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="#334155"/></marker>' +
      '</defs>' +
      '<text x="8" y="18" font-size="12" fill="#334155" font-weight="bold">\u0e1e\u0e25\u0e31\u0e07\u0e07\u0e32\u0e19\u0e28\u0e31\u0e01\u0e22\u0e4c</text>' +
      '<text x="' + (W - 190) + '" y="' + (H - 8) + '" font-size="12" fill="#334155">\u0e01\u0e32\u0e23\u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e02\u0e2d\u0e07\u0e1b\u0e0f\u0e34\u0e01\u0e34\u0e23\u0e34\u0e22\u0e32 \u2192</text>' +
      '<path d="' + pathD + '" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linejoin="round"/>' +
      nodes.map(function (n, i) {
        return '<circle class="ms-dot" data-i="' + i + '" cx="' + xFor(n.u).toFixed(1) + '" cy="' + yFor(n.e).toFixed(1) + '" r="7" fill="' +
          (n.kind === 'peak' ? '#f59e0b' : n.kind === 'well' ? '#10b981' : '#2563eb') +
          '" style="cursor:pointer"><title>' + n.label + '</title></circle>';
      }).join('') +
      nodes.map(function (n) {
        return '<text x="' + xFor(n.u).toFixed(1) + '" y="' + (yFor(n.e) - 12).toFixed(1) + '" font-size="11" font-weight="bold" text-anchor="middle" fill="#0f172a">' + n.label + '</text>';
      }).join('') +
      '</svg>' +
      '<div class="mt-2 flex flex-wrap gap-2 text-[11px]">' +
      '<span class="px-2 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300">\u0e2d\u0e34\u0e48\u0e21 = \u0e22\u0e2d\u0e14\u0e40\u0e02\u0e32 = \u0e2a\u0e32\u0e23\u0e40\u0e0a\u0e34\u0e07\u0e0b\u0e49\u0e2d\u0e19\u0e01\u0e31\u0e21\u0e21\u0e31\u0e19\u0e15\u0e4c (Activated Complex)</span>' +
      '<span class="px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">\u0e40\u0e02\u0e35\u0e22\u0e27 = \u0e2b\u0e25\u0e38\u0e21 = \u0e2a\u0e32\u0e23\u0e21\u0e31\u0e18\u0e22\u0e31\u0e19\u0e15\u0e23\u0e4c (Intermediate)</span>' +
      '<span class="px-2 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300">Ea \u0e2a\u0e39\u0e07\u0e2a\u0e38\u0e14 = \u0e02\u0e31\u0e49\u0e19\u0e01\u0e33\u0e2b\u0e19\u0e14\u0e2d\u0e31\u0e15\u0e23\u0e32 (RDS)</span>' +
      '</div>' +
      '<div id="ms-info" class="mt-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 min-h-[46px]">\u0e04\u0e25\u0e34\u0e01\u0e08\u0e38\u0e14\u0e1a\u0e19\u0e01\u0e23\u0e32\u0e1f\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e2a\u0e33\u0e23\u0e27\u0e08</div>';

    const info = box.querySelector('#ms-info');
    const texts = {
      peak: function (n) {
        return '<strong class="text-amber-700">\u0e22\u0e2d\u0e14\u0e40\u0e02\u0e32 ' + n.label + ' = \u0e2a\u0e32\u0e23\u0e40\u0e0a\u0e34\u0e07\u0e0b\u0e49\u0e2d\u0e19\u0e01\u0e31\u0e21\u0e21\u0e31\u0e19\u0e15\u0e4c (Activated Complex)</strong> \u2014 \u0e08\u0e38\u0e14\u0e1e\u0e25\u0e34\u0e01\u0e1c\u0e31\u0e19\u0e17\u0e35\u0e48\u0e1e\u0e31\u0e19\u0e18\u0e30\u0e40\u0e01\u0e48\u0e32\u0e01\u0e33\u0e25\u0e31\u0e07\u0e2b\u0e31\u0e01\u0e41\u0e25\u0e30\u0e1e\u0e31\u0e19\u0e18\u0e30\u0e43\u0e2b\u0e21\u0e48\u0e01\u0e33\u0e25\u0e31\u0e07\u0e40\u0e01\u0e34\u0e14 \u0e44\u0e21\u0e48\u0e40\u0e2a\u0e16\u0e35\u0e22\u0e23 \u0e2d\u0e22\u0e39\u0e48\u0e44\u0e14\u0e49\u0e40\u0e1e\u0e35\u0e22\u0e07\u0e0a\u0e31\u0e48\u0e27\u0e02\u0e13\u0e30';
      },
      well: function (n) {
        return '<strong class="text-emerald-700">\u0e2b\u0e25\u0e38\u0e21 ' + n.label + ' = \u0e2a\u0e32\u0e23\u0e21\u0e31\u0e18\u0e22\u0e31\u0e19\u0e15\u0e23\u0e4c (Intermediate)</strong> \u2014 \u0e40\u0e01\u0e34\u0e14\u0e43\u0e19\u0e02\u0e31\u0e49\u0e19\u0e2b\u0e19\u0e36\u0e48\u0e07\u0e41\u0e25\u0e30\u0e16\u0e39\u0e01\u0e1a\u0e23\u0e34\u0e42\u0e20\u0e04\u0e43\u0e19\u0e02\u0e31\u0e49\u0e19\u0e16\u0e31\u0e14\u0e44\u0e1b \u0e08\u0e36\u0e07\u0e44\u0e21\u0e48\u0e1b\u0e23\u0e32\u0e01\u0e0f\u0e43\u0e19\u0e2a\u0e21\u0e01\u0e32\u0e23\u0e23\u0e27\u0e21 (\u0e2b\u0e49\u0e32\u0e21\u0e40\u0e02\u0e35\u0e22\u0e19\u0e43\u0e19\u0e2a\u0e21\u0e01\u0e32\u0e23\u0e23\u0e27\u0e21!)';
      },
      station: function (n, i) {
        return (i === 0)
          ? '<strong class="text-blue-700">R = \u0e2a\u0e32\u0e23\u0e15\u0e31\u0e49\u0e07\u0e15\u0e49\u0e19</strong> \u2014 \u0e23\u0e30\u0e14\u0e31\u0e1a\u0e1e\u0e25\u0e31\u0e07\u0e07\u0e32\u0e19\u0e40\u0e23\u0e34\u0e48\u0e21\u0e15\u0e49\u0e19\u0e02\u0e2d\u0e07\u0e23\u0e30\u0e1a\u0e1a'
          : '<strong class="text-blue-700">P = \u0e1c\u0e25\u0e34\u0e15\u0e20\u0e31\u0e13\u0e11\u0e4c</strong> \u2014 \u0e23\u0e30\u0e14\u0e31\u0e1a\u0e1e\u0e25\u0e31\u0e07\u0e07\u0e32\u0e19\u0e2a\u0e38\u0e14\u0e17\u0e49\u0e32\u0e22; P \u0e15\u0e48\u0e33\u0e01\u0e27\u0e48\u0e32 R \u2192 \u0e23\u0e27\u0e21\u0e19\u0e35\u0e49\u0e04\u0e32\u0e22\u0e04\u0e27\u0e32\u0e21\u0e23\u0e49\u0e2d\u0e19 (\u0394H &lt; 0)';
      }
    };

    box.querySelectorAll('.ms-dot').forEach(function (dot) {
      dot.addEventListener('click', function () {
        const n = nodes[+dot.dataset.i];
        box.querySelectorAll('.ms-dot').forEach(function (d) { d.setAttribute('stroke', 'none'); });
        dot.setAttribute('stroke', '#0f172a');
        dot.setAttribute('stroke-width', '2.5');
        if (n.kind === 'station') { info.innerHTML = texts.station(n, +dot.dataset.i); return; }
        info.innerHTML = texts[n.kind](n);
        if (n.kind === 'peak') {
          // show its Ea (rise from the preceding well/station)
          const prev = nodes[+dot.dataset.i - 1];
          const ea = (n.e - prev.e) * 100;
          info.innerHTML += '<div class="mt-1 font-mono text-[11px] text-rose-700">Ea(\u0e02\u0e31\u0e49\u0e19\u0e19\u0e35\u0e49) \u2248 ' + ea.toFixed(0) + ' \u0e2b\u0e19\u0e48\u0e27\u0e22\u0e2a\u0e31\u0e21\u0e21\u0e31\u0e17\u0e18\u0e34\u0e4c\u0e02\u0e2d\u0e07\u0e01\u0e23\u0e32\u0e1f' +
            (+dot.dataset.i === 3 ? ' \u2014 <strong>\u0e2a\u0e39\u0e07\u0e17\u0e35\u0e48\u0e2a\u0e38\u0e14 \u2192 \u0e02\u0e31\u0e49\u0e19\u0e19\u0e35\u0e49\u0e04\u0e37\u0e2d RDS (\u0e02\u0e31\u0e49\u0e19\u0e01\u0e33\u0e2b\u0e19\u0e14\u0e2d\u0e31\u0e15\u0e23\u0e32)</strong>' : '') + '</div>';
        }
      });
    });
  }

  // ------------------------------------------------------------
  // 6) POWDER vs EXTRA MASS — kinetic curves (slide 5)
  //    บดผง: ชันขึ้น ยอดเท่าเดิม | เพิ่มมวล: ชันขึ้น + ยอดสูงขึ้น
  // ------------------------------------------------------------
  function initPowder() {
    const box = $('#powder-widget');
    if (!box || box.dataset.init) return;
    box.dataset.init = '1';

    const W = 680, H = 280, padL = 52, padB = 36, padT = 20;
    const T = 60, VMAX = 100;
    const xOf = function (t) { return padL + (t / T) * (W - padL - 20); };
    const yOf = function (v) { return padT + (1 - v / VMAX) * (H - padT - padB); };

    // V(t) = Vmax * (1 - e^(-kt))
    const curve = function (vmax, k, color, dash) {
      let d = '';
      for (let t = 0; t <= T; t += 1.5) {
        const v = vmax * (1 - Math.exp(-k * t));
        d += (d ? ' L' : 'M') + xOf(t).toFixed(1) + ',' + yOf(v).toFixed(1);
      }
      return '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="2.5"' +
        (dash ? ' stroke-dasharray="6 4"' : '') + '/>';
    };

    const plateau = function (vmax, color, label) {
      return '<line x1="' + padL + '" y1="' + yOf(vmax) + '" x2="' + (W - 20) + '" y2="' + yOf(vmax) +
        '" stroke="' + color + '" stroke-width="1" stroke-dasharray="3 4" opacity="0.6"/>' +
        '<text x="' + (W - 24) + '" y="' + (yOf(vmax) - 5) + '" font-size="10" fill="' + color + '" text-anchor="end">' + label + '</text>';
    };

    let grid = '';
    for (let v = 0; v <= VMAX; v += 25) {
      grid += '<line x1="' + padL + '" y1="' + yOf(v) + '" x2="' + (W - 20) + '" y2="' + yOf(v) +
        '" stroke="#e2e8f0" stroke-width="1"/>' +
        '<text x="' + (padL - 6) + '" y="' + (yOf(v) + 3) + '" font-size="9" fill="#64748b" text-anchor="end">' + v + '</text>';
    }
    for (let t = 0; t <= T; t += 15) {
      grid += '<text x="' + xOf(t) + '" y="' + (H - padB + 14) + '" font-size="9" fill="#64748b" text-anchor="middle">' + t + '</text>';
    }

    box.innerHTML =
      '<svg viewBox="0 0 ' + W + ' ' + H + '" class="w-full" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px">' +
      grid +
      '<text x="10" y="14" font-size="11" font-weight="bold" fill="#334155">ปริมาตร H\u2082 (cm\u00b3)</text>' +
      '<text x="' + (W - 90) + '" y="' + (H - 6) + '" font-size="11" fill="#334155">\u0e40\u0e27\u0e25\u0e32 (\u0e27\u0e34\u0e19\u0e32\u0e17\u0e35) \u2192</text>' +
      curve(72, 0.055, '#94a3b8') +
      curve(72, 0.11, '#059669') +
      curve(96, 0.09, '#7c3aed') +
      plateau(72, '#059669', '72 cm\u00b3 (\u0e40\u0e17\u0e48\u0e32\u0e40\u0e14\u0e34\u0e21)') +
      plateau(96, '#7c3aed', '96 cm\u00b3 (\u0e2a\u0e39\u0e07\u0e02\u0e36\u0e49\u0e19!)') +
      '</svg>' +
      '<div class="mt-2 flex flex-wrap gap-2 text-[11px]">' +
      '<span class="px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">\u2014 \u2014 \u0e2a\u0e20\u0e32\u0e27\u0e30\u0e40\u0e14\u0e34\u0e21</span>' +
      '<span class="px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">\u2014 \u0e1a\u0e14\u0e1c\u0e07\u0e25\u0e30\u0e40\u0e2d\u0e35\u0e22\u0e14: \u0e0a\u0e31\u0e19\u0e02\u0e36\u0e49\u0e19 \u0e22\u0e2d\u0e14\u0e40\u0e17\u0e48\u0e32\u0e40\u0e14\u0e34\u0e21</span>' +
      '<span class="px-2 py-1 rounded-full bg-violet-100 text-violet-800 border border-violet-300">\u2014 \u0e40\u0e1e\u0e34\u0e48\u0e21\u0e1b\u0e23\u0e34\u0e21\u0e32\u0e13\u0e2a\u0e32\u0e23: \u0e0a\u0e31\u0e19\u0e02\u0e36\u0e49\u0e19 + \u0e22\u0e2d\u0e14\u0e2a\u0e39\u0e07\u0e02\u0e36\u0e49\u0e19</span>' +
      '</div>' +
      '<div class="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">' +
      '<div class="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900"><strong>\u0e1a\u0e14\u0e1c\u0e07:</strong> \u0e1e\u0e37\u0e49\u0e19\u0e17\u0e35\u0e48\u0e1c\u0e34\u0e27\u0e40\u0e1e\u0e34\u0e48\u0e21 \u2192 \u0e0a\u0e19\u0e16\u0e35\u0e48\u0e02\u0e36\u0e49\u0e19 \u0e41\u0e15\u0e48 \u0e21\u0e2d\u0e25\u0e2a\u0e32\u0e23\u0e15\u0e31\u0e49\u0e07\u0e15\u0e49\u0e19\u0e40\u0e17\u0e48\u0e32\u0e40\u0e14\u0e34\u0e21 \u2192 \u0e1c\u0e25\u0e34\u0e15\u0e20\u0e31\u0e13\u0e11\u0e4c\u0e2a\u0e38\u0e14\u0e17\u0e49\u0e32\u0e22<strong>\u0e40\u0e17\u0e48\u0e32\u0e40\u0e14\u0e34\u0e21</strong></div>' +
      '<div class="p-2.5 rounded-xl bg-violet-50 border border-violet-200 text-violet-900"><strong>\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e1b\u0e23\u0e34\u0e21\u0e32\u0e13:</strong> \u0e21\u0e2d\u0e25\u0e2a\u0e32\u0e23\u0e15\u0e31\u0e49\u0e07\u0e15\u0e49\u0e19\u0e40\u0e1e\u0e34\u0e48\u0e21 \u2192 \u0e0a\u0e19\u0e16\u0e35\u0e48\u0e02\u0e36\u0e49\u0e19 \u0e41\u0e25\u0e30 \u0e1c\u0e25\u0e34\u0e15\u0e20\u0e31\u0e13\u0e11\u0e4c\u0e2a\u0e38\u0e14\u0e17\u0e49\u0e32\u0e22<strong>\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e02\u0e36\u0e49\u0e19</strong></div>' +
      '</div>';
  }

  // ------------------------------------------------------------
  // Boot
  // ------------------------------------------------------------
  function boot() {
    try { initStraddle(); } catch (e) { console.warn('straddle widget:', e); }
    try { initEqSolve(); } catch (e) { console.warn('eqsolve widget:', e); }
    try { initXYZ(); } catch (e) { console.warn('xyz widget:', e); }
    try { initRate3(); } catch (e) { console.warn('rate3 widget:', e); }
    try { initMultiStep(); } catch (e) { console.warn('multistep widget:', e); }
    try { initPowder(); } catch (e) { console.warn('powder widget:', e); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
