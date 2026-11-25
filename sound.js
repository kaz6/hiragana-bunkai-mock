/* 手触りの音（D-100・HB-073）。積み木の音。録音・素材は使わず、ここで作る（Web Audio）
   作者が試聴ページ（docs/reports/audio/hb-072-tsumiki.html）で選んだ組（2026-11-24 22:37）：
     割る＝「回す」の A ／ 回す＝「割る」の B ／ 裏返す＝B ／ くっつける＝「割る」の A ／ 投げる＝A
     落ちてきた＝「投げる C の逆再生」の R2（2026-11-26 8:34・HB-086）
   変えるとき：下の HB_SOUND の表だけを直す（index.html は触らない）。このファイルが読めないときは音が鳴らないだけ
   wood：木の音色。f＝いちばん下の音の高さ(Hz)、decay＝鳴りの長さ(秒)、parts＝[倍率, 大きさ, 長さの倍率]、
         click＝打った瞬間の「コッ」（雑音を帯域で絞る）、tone＝こもらせる上限(Hz)
   moves：動きごとに、どの木で・どう鳴らすか。hits の t＝鳴らす時刻(秒)、p＝高さの倍率、g＝大きさ
   vibMs：音といっしょに震わせる長さ(ミリ秒)。0 で震わせない。作者が「ごく短い」（8ms）を選んだ（2026-11-24 22:51・HB-074）。
          Android は navigator.vibrate。iPhone は長さを選べず、switch の付いた checkbox を切り替えて軽い1回（Safari 18 以降。公式の仕組みではない） */
window.HB_SOUND = {
  volume: 0.6,
  vibMs: 8,
  wood: {
    A: { f: 1350, decay: 0.055, parts: [[1, 1, 1], [2.76, 0.32, 0.5], [5.40, 0.10, 0.3]], click: { f: 4200, q: 1.2, amp: 0.22, dur: 0.010 }, tone: 9000 },
    B: { f: 880,  decay: 0.085, parts: [[1, 1, 1], [2.76, 0.28, 0.5], [5.40, 0.08, 0.3]], click: { f: 2600, q: 1.4, amp: 0.28, dur: 0.012 }, tone: 6500 },
    C: { f: 500,  decay: 0.130, parts: [[1, 1, 1], [2.30, 0.22, 0.6], [4.10, 0.06, 0.3]], click: { f: 1300, q: 1.6, amp: 0.32, dur: 0.016 }, tone: 3200 } // 試聴の C 木の箱
  },
  moves: {
    split: { wood: 'A', hits: [{ t: 0, p: 1.12, g: 1 }] },                                     // 試聴の「回す」の A（軽く1回「コッ」）
    turn:  { wood: 'B', hits: [{ t: 0, p: 1, g: 1 }, { t: 0.06, p: 1.26, g: 0.75 }] },          // 試聴の「割る」の B（「コン・カッ」）
    flip:  { wood: 'B', hits: [{ t: 0, p: 0.92, g: 0.8 }, { t: 0.028, p: 1.10, g: 0.85 }] },    // 試聴の「裏返す」の B（「カタッ」）
    merge: { wood: 'A', hits: [{ t: 0, p: 1, g: 1 }, { t: 0.06, p: 1.26, g: 0.75 }] },          // 試聴の「割る」の A（「コン・カッ」）
    throw: { wood: 'A', hits: [{ t: 0, p: 1, g: 0.8 }, { t: 0.065, p: 1.19, g: 0.8 }, { t: 0.13, p: 1.5, g: 0.9 }] }, // 試聴の「投げる」の A（「コロコロ」）
    drop:  { wood: 'C', hits: [{ t: 0, p: 1.5, g: 0.9 }, { t: 0.065, p: 1.19, g: 0.8 }, { t: 0.13, p: 1, g: 0.8 }] }  // 字が自分のカゴに落ちてきた。試聴の「投げる C の逆再生」R2（並びだけ逆＝下がるコロコロ）。作者 2026-11-26 8:34。HB-086
  }
};

/* 鳴らす仕組み。index.html は HB_SE.play('split') のように呼ぶだけ */
window.HB_SE = (function () {
  var ctx = null, master = null, noiseBuf = null, played = [], hap = null;
  function buzz() {
    var ms = +(window.HB_SOUND.vibMs || 0);
    if (!ms) return;
    if (navigator.vibrate) { navigator.vibrate(ms); return; }
    if (!hap) { // iPhone 向け。見えない所に置く
      hap = document.createElement('label'); hap.setAttribute('aria-hidden', 'true');
      hap.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none';
      var inp = document.createElement('input'); inp.type = 'checkbox'; inp.setAttribute('switch', ''); inp.tabIndex = -1;
      hap.appendChild(inp); document.body.appendChild(hap);
      hap.addEventListener('click', function (e) { e.stopPropagation(); }); // ページのほかの「どこかを押したら」の動きに届かせない
    }
    hap.click();
  }
  function ready() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) {
      ctx = new AC();
      var comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -10; comp.ratio.value = 6;
      master = ctx.createGain(); master.gain.value = window.HB_SOUND.volume;
      master.connect(comp); comp.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.05), ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume().catch(function () {});
    return ctx;
  }
  function knock(w, at, p, g) {
    var f = w.f * p;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = w.tone; lp.connect(master);
    w.parts.forEach(function (pt) {
      var o = ctx.createOscillator(), e = ctx.createGain(), len = Math.max(0.012, w.decay * pt[2]);
      o.type = 'sine';
      o.frequency.setValueAtTime(f * pt[0] * 1.06, at);
      o.frequency.exponentialRampToValueAtTime(f * pt[0], at + 0.012);
      e.gain.setValueAtTime(0.0001, at);
      e.gain.exponentialRampToValueAtTime(pt[1] * g * 1.2, at + 0.0015);
      e.gain.exponentialRampToValueAtTime(0.0001, at + len);
      o.connect(e); e.connect(lp);
      o.start(at); o.stop(at + len + 0.02);
    });
    var c = w.click, n = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), ne = ctx.createGain();
    n.buffer = noiseBuf; bp.type = 'bandpass'; bp.frequency.value = c.f * Math.sqrt(p); bp.Q.value = c.q;
    ne.gain.setValueAtTime(c.amp * g, at);
    ne.gain.exponentialRampToValueAtTime(0.0001, at + c.dur);
    n.connect(bp); bp.connect(ne); ne.connect(lp);
    n.start(at); n.stop(at + c.dur + 0.01);
  }
  function play(key) {
    var cfg = window.HB_SOUND, m = cfg && cfg.moves && cfg.moves[key];
    if (!m) return;
    if (window.HB_TEST) played.push(key); // 自動テストの窓が開いているときだけ、鳴らした動きを覚える
    try { buzz(); } catch (e) { /* 震えなくても遊びは止めない */ }
    try {
      if (!ready()) return;
      var w = cfg.wood[m.wood]; if (!w) return;
      var t0 = ctx.currentTime + 0.005;
      m.hits.forEach(function (h) { knock(w, t0 + h.t, h.p, h.g); });
    } catch (e) { /* 音が鳴らなくても遊びは止めない */ }
  }
  return { play: play, played: played };
})();
