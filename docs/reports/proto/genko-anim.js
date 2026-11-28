// はじめの画面の作文用紙（試作2。相談チャット 2026-11-27）
// 用紙の左上の角だけ見せる。字は10ほどを全体に散らし、それぞれが部品に割れてマス目を越えて離れ、戻ってくっつく。ときどき回る
(function(){
  const T = window.HB_TEST || {};
  const RECIPE = T.RECIPE || {};
  const host = document.getElementById('menu'), inner = host.querySelector('.menu-in');
  const X0 = window.__gkX0 ?? 57, Y0 = window.__gkY0 ?? 145, CELL = 24, GAP = 6, PITCH = CELL + GAP, N = 10;
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  const css = `
  .menu-in{position:relative;z-index:1}
  .gk{position:absolute;left:${X0}px;top:${Y0}px;right:0;min-height:calc(100% - ${Y0}px);z-index:0;pointer-events:none;color:var(--ink);
      background:color-mix(in srgb,var(--bg) ${dark?92:70}%,#fff);box-shadow:-2px -2px 8px rgba(60,40,20,.14)}
  .gk svg.lines{position:absolute;left:0;top:0;opacity:${dark?.45:.26}}
  .gk .k{position:absolute;width:${CELL}px;height:${CELL}px;display:grid;place-items:center;font:500 18px/1 var(--f-kana);opacity:${dark?.4:.32};
      transition:transform 1.4s cubic-bezier(.45,.05,.3,1),opacity .6s}
  .gk svg.ln{position:absolute;left:0;top:0;overflow:visible}
  .gk svg.ln line{stroke:currentColor;stroke-width:.7;opacity:0;transition:opacity .5s}.gk svg.ln circle{fill:currentColor;opacity:0;transition:opacity .5s}.gk svg.ln .on{opacity:${dark?.4:.34}}
  .gk svg.ln line.on{opacity:${dark?.35:.3}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const gk = document.createElement('div'); gk.className = 'gk'; gk.setAttribute('aria-hidden','true'); host.prepend(gk);
  const W = gk.clientWidth, H = Math.max(gk.clientHeight, inner.scrollHeight - Y0);
  const cols = Math.ceil(W / PITCH), rows = Math.ceil((H - GAP) / CELL);
  const red = dark ? '#D06A4E' : '#C4553A';
  let s = `<svg class="lines" xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`;
  s += `<rect x="${GAP/2}" y="${GAP/2}" width="${W+40}" height="${H+40}" fill="none" stroke="${red}" stroke-width="1.2"/>`;
  for (let c = 0; c < cols; c++) { const x = GAP + c * PITCH;
    s += `<rect x="${x}" y="${GAP}" width="${CELL}" height="${rows*CELL}" fill="none" stroke="${red}" stroke-width=".9"/>`;
    for (let r = 1; r < rows; r++) s += `<line x1="${x}" y1="${GAP + r*CELL}" x2="${x+CELL}" y2="${GAP + r*CELL}" stroke="${red}" stroke-width=".6"/>`; }
  gk.insertAdjacentHTML('beforeend', s + '</svg>');
  const ln = document.createElementNS('http://www.w3.org/2000/svg','svg'); ln.setAttribute('class','ln'); ln.setAttribute('width', W); ln.setAttribute('height', H); gk.appendChild(ln);
  // 置かない所：ロゴ・副題・ボタン・出どころ・名義の後ろ
  const g = gk.getBoundingClientRect();
  const block = [...inner.children].filter(e => e.offsetParent && !e.hidden).map(e => { const r = e.getBoundingClientRect(); return { x: r.left - g.left - 10, y: r.top - g.top - 10, w: r.width + 20, h: r.height + 20 }; });
  const at = (c, r) => ({ x: GAP + c * PITCH, y: GAP + r * CELL });
  const free = (c, r) => { const p = at(c, r); return c > 0 && c < cols - 1 && r > 0 && p.y + CELL < H - 20 && p.x + CELL < W - 4 && !block.some(b => p.x + CELL > b.x && p.x < b.x + b.w && p.y + CELL > b.y && p.y < b.y + b.h); };
  const ok = Object.keys(RECIPE).filter(k => RECIPE[k].every(p => p !== '＞') && k.length === 1 && !/[゛゜がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ]/.test(k));
  const show = ch => ch === '∘' ? '゜' : ch;
  const ROT = { 'し': ['つ', -90], 'つ': ['し', 90], 'こ': ['い', 90], 'い': ['こ', -90], 'く': ['へ', 90], 'へ': ['く', -90] };
  const wait = ms => new Promise(f => setTimeout(f, ms));
  // 10字を、空いているマス全体に散らす（字どうしは2マス以上あける）
  const spots = []; const cand = []; for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) if (free(c, r)) cand.push({ c, r });
  for (let t = 0; t < 400 && spots.length < N; t++) { const q = cand[(Math.random() * cand.length) | 0]; if (q && !spots.some(o => Math.abs(o.c - q.c) < 3 && Math.abs(o.r - q.r) < 3)) spots.push(q); }
  const mk = (t, p) => { const e = document.createElement('span'); e.className = 'k'; e.textContent = show(t); e.style.left = p.x + 'px'; e.style.top = p.y + 'px'; gk.appendChild(e); return e; };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches && !window.__gkForceMotion;
  const ROTONLY = 2, MAXSPLIT = 4; let splitting = 0;
  const rk = Object.keys(ROT);
  spots.forEach((sp, i) => { const turner = i < ROTONLY; const ch = turner ? rk[(Math.random() * rk.length) | 0] : ok[(Math.random() * ok.length) | 0]; const p = at(sp.c, sp.r); const el = mk(ch, p);
    if (!reduce) (turner ? spin : life)(el, ch, p, i); });
  async function spin(el, ch, p, i) { // 回るだけの字
    await wait(800 + i * 900);
    for (;;) { if (document.hidden || host.hidden) { await wait(1000); continue; }
      const [to, deg] = ROT[ch]; el.style.transform = `rotate(${deg}deg)`; await wait(1500);
      el.style.transition = 'none'; el.style.transform = ''; el.textContent = to; ch = to; void el.offsetWidth; el.style.transition = '';
      await wait(1800 + Math.random() * 1800); } }
  async function life(el, ch, p, i) {
    await wait(400 + i * 650);
    for (;;) {
      if (document.hidden || host.hidden || getComputedStyle(host).display === 'none') { await wait(1000); continue; }
      const parts = RECIPE[ch];
      if (ROT[ch] && Math.random() < .3) { // 回る
        const [to, deg] = ROT[ch]; el.style.transform = `rotate(${deg}deg)`; await wait(1500);
        el.style.transition = 'none'; el.style.transform = ''; el.textContent = to; ch = to; void el.offsetWidth; el.style.transition = '';
      } else if (parts && splitting < MAXSPLIT) { // 割れて、マス目を越えて離れ、戻ってくっつく（同時に4字まで）
        splitting++;
        const a = mk(parts[0], p), b = mk(parts[1], p); el.style.opacity = 0;
        const ang = Math.random() * Math.PI, d = PITCH * (1.5 + Math.random() * 1.5);
        const dx = Math.cos(ang) * d, dy = Math.sin(ang) * d * .9;
        const cx = p.x + CELL / 2, cy = p.y + CELL / 2;
        const NS = ln.namespaceURI, la = document.createElementNS(NS, 'line'), lb = document.createElementNS(NS, 'line'), knot = document.createElementNS(NS, 'circle');
        knot.setAttribute('cx', cx); knot.setAttribute('cy', cy); knot.setAttribute('r', 1.6); knot.setAttribute('class', 'knot');
        ln.append(la, lb, knot);
        let live = true; const g0 = () => gk.getBoundingClientRect();
        const pull = (line, e) => { const r = e.getBoundingClientRect(), g = g0(); line.setAttribute('x1', cx); line.setAttribute('y1', cy); line.setAttribute('x2', r.left - g.left + r.width / 2); line.setAttribute('y2', r.top - g.top + r.height / 2); };
        const tick = () => { if (!live) return; pull(la, a); pull(lb, b); requestAnimationFrame(tick); }; tick();
        la.classList.add('on'); lb.classList.add('on'); knot.classList.add('on');
        await wait(40); a.style.transform = `translate(${-dx}px,${-dy}px) rotate(${(Math.random()*30-15)|0}deg)`; b.style.transform = `translate(${dx}px,${dy}px) rotate(${(Math.random()*30-15)|0}deg)`;
        await wait(1400 + 1600 + Math.random() * 1200);
        a.style.transform = b.style.transform = ''; await wait(1450);
        live = false; la.remove(); lb.remove(); knot.remove();
        a.remove(); b.remove(); el.style.opacity = ''; splitting--;
      }
      await wait(1500 + Math.random() * 2500);
    }
  }
})();
