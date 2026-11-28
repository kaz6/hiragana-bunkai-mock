// ボタンを背景のマス目にそろえて書く試作（相談チャット 2026-11-28）
// 大きい字は2×2マス、小さい行は1マスに1字。押せる範囲は赤ペンの囲み（A）か、朱で薄く塗ったマス（B）
(function(mode){
  const gkEl = document.querySelector('.gk'); if (!gkEl) return;
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  const red = dark ? '#E07A5E' : '#C4553A';
  const CELL = 24, GAP = 6, PITCH = 30;
  const st = document.createElement('style'); st.textContent = `
   #btnSolo.gb,#btnDuo.gb{background:transparent!important;color:var(--ink)!important;height:72px!important;position:relative;padding:0;border:0;box-shadow:none;overflow:visible}
   .gb .big{position:absolute;width:54px;height:48px;display:grid;place-items:center;font:600 34px/1 var(--f-kana)}
   .gb .sm{position:absolute;width:24px;height:24px;display:grid;place-items:center;font:600 15px/1 var(--f-ui);color:var(--ink)}
   .gb .go{position:absolute;width:24px;height:48px;display:grid;place-items:center;color:${red};font-size:18px}
   .gb svg{position:absolute;overflow:visible;pointer-events:none}
   #btnSolo.gb:focus-visible,#btnDuo.gb:focus-visible{outline:3px solid var(--ink);outline-offset:4px;border-radius:4px}`;
  document.head.appendChild(st);
  const L = { btnSolo: ['ひとりで', 'CPUとあそぶ'], btnDuo: ['ふたりで', 'あいことばで'] };
  const jit = (n) => (Math.sin(n * 12.9898) * 43758.5453 % 1) * 2.2;
  for (const id of ['btnSolo', 'btnDuo']) {
    const b = document.getElementById(id);
    b.setAttribute('aria-label', b.textContent.replace(/\s+/g, ' ').trim());
    b.classList.add('gb'); b.innerHTML = '';
    // 縦をマス目にそろえる
    const g = gkEl.getBoundingClientRect(), ox = g.left + GAP, oy = g.top + GAP;
    let r = b.getBoundingClientRect(); const dy = (((r.top - oy) % CELL) + CELL) % CELL;
    if (dy) b.style.marginTop = (parseFloat(getComputedStyle(b).marginTop) + (CELL - dy)) + 'px';
    r = b.getBoundingClientRect();
    const X = c => ox + c * PITCH - r.left, Y = row => oy + Math.round((r.top - oy) / CELL) * CELL + row * CELL - r.top;
    const [word, sub] = L[id];
    const add = (cls, t, x, y) => { const e = document.createElement('span'); e.className = cls; e.textContent = t; e.style.left = x + 'px'; e.style.top = y + 'px'; e.setAttribute('aria-hidden', 'true'); b.appendChild(e); };
    add('go', '▶', X(1), Y(0));
    [...word].forEach((ch, i) => add('big', ch, X(2 + i * 2), Y(0)));
    [...sub].forEach((ch, i) => add('sm', ch, X(2 + i), Y(2)));
    const x0 = X(1) - 7, y0 = Y(0) - 6, x1 = X(10) + 6, y1 = Y(3) + 5;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('style', `left:0;top:0;width:1px;height:1px`);
    if (mode === 'A') { // 赤ペンでぐるっと囲む（少しゆがんだ線、書き始めが少し重なる）
      const k = id.length;
      const p = `M${x0 + 14} ${y0 + jit(k)} L${x1 - 10} ${y0 - 1 + jit(k + 1)} Q${x1 + 2} ${y0} ${x1 + jit(k + 2)} ${y0 + 12} L${x1 - 1 + jit(k + 3)} ${y1 - 10} Q${x1} ${y1 + 2} ${x1 - 12} ${y1 + jit(k + 4)} L${x0 + 10} ${y1 + 1} Q${x0 - 2} ${y1} ${x0 - 1} ${y1 - 12} L${x0 + jit(k + 5)} ${y0 + 12} Q${x0} ${y0 - 1} ${x0 + 22} ${y0 - 2}`;
      svg.innerHTML = `<path d="${p}" fill="none" stroke="${red}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>`;
    } else { // 朱で薄く塗ったマス（書いた字のマスだけ）
      let h = '';
      for (let i = 0; i < word.length; i++) h += `<rect x="${X(2 + i * 2)}" y="${Y(0)}" width="54" height="48" fill="${red}" opacity="${dark ? .22 : .13}"/>`;
      h += `<rect x="${X(1)}" y="${Y(0)}" width="24" height="48" fill="${red}" opacity="${dark ? .22 : .13}"/>`;
      h += `<rect x="${X(2)}" y="${Y(2)}" width="${sub.length * PITCH - GAP}" height="24" fill="${red}" opacity="${dark ? .12 : .07}"/>`;
      svg.innerHTML = h;
    }
    b.prepend(svg);
  }
})(window.__gbMode || 'A');
