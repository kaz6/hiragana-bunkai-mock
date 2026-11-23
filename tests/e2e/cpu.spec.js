// CPU：禁止用語（cpu-ng.js）を投げない（D-064）。ゆっくり・ふつう・つよい を短く回してエラーが出ない
const { test, expect } = require('@playwright/test');
const { openGame, startSolo, expectClean } = require('../helpers');

test.beforeEach(async ({ page }, info) => { info.ctx = await openGame(page); });
test.afterEach(async ({}, info) => expectClean(info.ctx));

const LEVELS = ['ゆるゆる', 'のんびり', 'ゆっくり', 'ふつう', 'つよい'];

for (const lv of LEVELS) {
  test(`${lv}：cpu-ng.js の語を投げない（その語しか作れないカゴでも）`, async ({ page }) => {
    await startSolo(page, lv);
    const r = await page.evaluate(() => {
      const T = window.HB_TEST, NG = window.HB_CPU_NG || [];
      const thrown = [];
      for (const w of NG) {
        for (let i = 0; i < 12; i++) {
          const S = T.S(); if (S.over || S.ending) T.newGame();
          const S2 = T.S(); S2.started = true; S2.used = new Set();
          S2.opp = [...w].map(c => T.mk(c === 'ー' ? '一' : c));
          S2.mine = Array.from({ length: 3 }, () => T.mk('よ'));
          const before = S2.log.length;
          T.cpuAct();
          T.S().log.slice(before).filter(x => x.who === 'op').forEach(x => thrown.push(x.word));
        }
      }
      return { ng: NG, thrown, bad: thrown.filter(x => !T.cpuOk(x)) };
    });
    expect(r.ng.length).toBeGreaterThan(0);
    expect(r.bad).toEqual([]);
  });
}

for (const lv of ['ゆっくり', 'ふつう', 'つよい']) {
  test(`${lv}：短く回してエラーが出ない（3戦×120手）`, async ({ page }, info) => {
    await startSolo(page, lv);
    const r = await page.evaluate(() => {
      const T = window.HB_TEST; let throws = 0, acts = 0, maxMs = 0;
      for (let g = 0; g < 3; g++) {
        T.newGame(); T.S().started = true;
        for (let i = 0; i < 120; i++) {
          const S = T.S(); if (S.over || S.ending) break;
          // 落ちてくる字（5秒待ち）の代わりに、2手ごとに袋から1こ足す。自分のカゴは負けないように減らす
          if (i % 2 === 0 && S.opp.length < 10) S.opp.push(T.mk(T.BAG[(g * 7 + i) % T.BAG.length]));
          if (S.mine.length > 8) S.mine.splice(0, S.mine.length - 4);
          const before = S.log.length, t = performance.now();
          T.cpuAct(); acts++;
          maxMs = Math.max(maxMs, performance.now() - t);
          throws += T.S().log.slice(before).filter(x => x.who === 'op').length;
        }
      }
      return { throws, acts, maxMs };
    });
    info.annotations.push({ type: 'cpu', description: JSON.stringify(r) });
    expect(r.acts).toBeGreaterThan(100);
    expect(r.throws).toBeGreaterThan(0);
  });
}

// ---- HB-050（D-084）：CPU の回す・裏返すを、人と同じ手数にそろえる ----
test('CPU の向きの手：TURN は人の最短手順（turnShortcuts）と同じ手数・同じ一言。へ→く・し→つ・て→ん は2手、⊂→つ・い→こ・さ→ち は1手', async ({ page }) => {
  await startSolo(page, 'とまる');
  const r = await page.evaluate(() => { const T = window.HB_TEST, sc = T.turnShortcuts(); const bad = [];
    let n = 0;
    for (const [from, list] of Object.entries(T.TURN)) for (const [to, v, hands, path, ops] of list) { n++;
      const h = sc.find(x => x.from === from && x.to === to);
      if (!h || h.ops.length !== hands || h.ops.join() !== ops.join()) bad.push(from + '→' + to); }
    // 人にはできて CPU の表にない組は、TURN_NOT_CPU と ＞（CPU の札にならない部品）だけ
    const missing = sc.filter(x => !(T.TURN[x.from] || []).some(a => a[0] === x.to)).map(x => x.from + '→' + x.to)
      .filter(k => !T.TURN_NOT_CPU.has(k) && !k.includes('＞'));
    const hands = (a, b) => (T.TURN[a].find(x => x[0] === b) || [])[2];
    return { n, bad, missing, h: { へく: hands('へ', 'く'), べぐ: hands('べ', 'ぐ'), しつ: hands('し', 'つ'), つし: hands('つ', 'し'), じづ: hands('じ', 'づ'), てん: hands('て', 'ん'), んて: hands('ん', 'て'),
      '⊂つ': hands('⊂', 'つ'), いこ: hands('い', 'こ'), こい: hands('こ', 'い'), さち: hands('さ', 'ち'), くへ: hands('く', 'へ'), 縦一: hands('｜', '一') } }; });
  expect(r.n).toBeGreaterThan(15);
  expect(r.bad).toEqual([]);
  expect(r.missing).toEqual([]);
  expect(r.h).toEqual({ へく: 2, べぐ: 2, しつ: 2, つし: 2, じづ: 2, てん: 2, んて: 2, '⊂つ': 1, いこ: 1, こい: 1, さち: 1, くへ: 1, 縦一: 1 });
});

test('CPU が へ→く（2手）を打つと、ログは1手ずつ（「へ」を回した→「＞」を裏返した）で、次の手まで2回分の時間をかける。い→こ は1手', async ({ page }) => {
  await startSolo(page, 'とまる');
  const r = await page.evaluate(() => { const T = window.HB_TEST; const out = {};
    for (const [from, to] of [['へ', 'く'], ['し', 'つ'], ['て', 'ん'], ['い', 'こ']]) {
      T.newGame(); const S = T.S(); S.opp = [T.mk(from)]; const before = S.log.length;
      const st = T.stepsOf([from]).find(x => x.t === 'turn' && x.to === to);
      T.cpuApply(st);
      out[from + to] = { n: st.n, hands: T.S().cpuHands, now: T.S().opp.map(T.letterOf).join(''), say: T.S().say, text: T.logText().split('\n').filter(x => x.includes('相手｜')).slice(-st.n).map(x => x.replace(/^.*相手｜/, '').replace(/　［.*$/, '')) }; }
    return out; });
  expect(r['へく']).toMatchObject({ n: 2, hands: 2, now: 'く', text: ['「へ」を回した', '「＞」を裏返した'] });
  expect(r['しつ']).toMatchObject({ n: 2, hands: 2, now: 'つ', text: ['「し」を回した', '「⊂」を裏返した'] });
  expect(r['てん']).toMatchObject({ n: 2, hands: 2, now: 'ん' });
  expect(r['てん'].text[0]).toBe('「て」を回した');
  expect(r['てん'].text[1]).toContain('裏返した');
  expect(r['いこ']).toMatchObject({ n: 1, hands: 1, now: 'こ', text: ['「い」を回した'] });
});

test('CPU の2手先の読み：向きの2手は1手目で手数を使い切る（へ→く のあと、もう1手の作り替えは読まない）', async ({ page }) => {
  await startSolo(page, 'つよい');
  const r = await page.evaluate(() => { const T = window.HB_TEST; T.newGame(); const S = T.S(); S.started = true;
    // へ・し・て を持つ CPU が、どの強さでも向きの手で止まらず動けること（手数のちがいでエラーにならない）
    S.opp = ['へ', 'し', 'て', 'さ', 'い'].map(c => T.mk(c)); S.mine = Array.from({ length: 3 }, () => T.mk('よ'));
    const acts = []; for (let i = 0; i < 20; i++) { const s = T.S(); if (s.over || s.ending) break; T.cpuAct(); acts.push(T.S().cpuHands || 1); }
    return { acts, hands: Math.max(...acts) }; });
  expect(r.acts.length).toBeGreaterThan(5);
  expect(r.hands).toBeLessThanOrEqual(2);
});

// ---- HB-064（D-096）：つよい の CPU が、トドメの一投に「トドメの一言」（cpu-todome.js）の語を選ぶ ----
// カゴを組んで cpuAct を1回打ち、CPU が投げた語（ログ）と タグを返す
const todomeTry = (page, { opp, mine, used = [], n = 12 }) => page.evaluate(({ opp, mine, used, n }) => {
  const T = window.HB_TEST, out = [];
  for (let i = 0; i < n; i++) {
    T.newGame(); const S = T.S(); S.started = true; S.used = new Set(used);
    S.opp = [...opp].map(c => T.mk(c === 'ー' ? '一' : c));
    S.mine = Array.from({ length: mine }, () => T.mk('よ'));
    const before = S.log.length; T.cpuAct();
    const x = T.S().log.slice(before).filter(e => e.who === 'op')[0];
    out.push(x ? x.word : null);
  }
  return { words: out, cap: T.CAP, list: T.TODOME, logs: T.logText() };
}, { opp, mine, used, n });

test('つよい：その一投で上限を超えるとき、トドメの語（ざこ）を投げる。点数の高い別の語（さくらんぼ）も作れるカゴでも', async ({ page }) => {
  await startSolo(page, 'つよい');
  const cap = await page.evaluate(() => window.HB_TEST.CAP);
  const r = await todomeTry(page, { opp: 'ざこさくらんぼ', mine: cap - 1 });
  expect(r.words.every(w => w === 'ざこ')).toBe(true);
  expect(r.logs).toContain('投げる「ざこ」（トドメ）');
});

test('つよい：一覧は辞書の形に直る（ちょろい→ちよろい）。作者の12語がそろう', async ({ page }) => {
  await startSolo(page, 'つよい');
  const list = await page.evaluate(() => window.HB_TEST.TODOME);
  for (const w of ['ざこ', 'あほ', 'よわい', 'まぬけ', 'へたくそ', 'ざんねん', 'よわむし', 'なさけない', 'ちよろい', 'あまい', 'ばいばい', 'さよなら']) expect(list).toContain(w);
  expect(list.length).toBe(12);
});

test('つよい：その一投で上限を超えないときは、いまの決め手のまま（トドメにしない）', async ({ page }) => {
  await startSolo(page, 'つよい');
  const cap = await page.evaluate(() => window.HB_TEST.CAP);
  // 決め手の条件（こちら9こ以上）は満たし、さくら（3字）を投げても ちょうど上限で超えない → トドメにしない
  const r = await todomeTry(page, { opp: 'ざこさくら', mine: Math.max(cap - 3, 9) });
  expect(cap - 3).toBeGreaterThanOrEqual(9);
  expect(r.logs).not.toContain('（トドメ）');
  expect(r.words.filter(Boolean).length).toBeGreaterThan(0);
});

test('つよい：一覧の語が作れないカゴではトドメにしない（いまの決め手のまま）', async ({ page }) => {
  await startSolo(page, 'つよい');
  const cap = await page.evaluate(() => window.HB_TEST.CAP);
  const r = await todomeTry(page, { opp: 'さくらんぼ', mine: cap - 1 });
  expect(r.logs).not.toContain('（トドメ）');
  expect(r.words.filter(Boolean).length).toBeGreaterThan(0);
});

test('つよい：一度きり（もうリストに出た語）は選ばない。ざこ を使い済みなら あほ', async ({ page }) => {
  await startSolo(page, 'つよい');
  const cap = await page.evaluate(() => window.HB_TEST.CAP);
  const r = await todomeTry(page, { opp: 'ざこあほさくらんぼ', mine: cap - 1, used: ['ざこ'] });
  expect(r.words.every(w => w === 'あほ')).toBe(true);
});

for (const lv of ['ふつう', 'ゆっくり']) {
  test(`${lv}：トドメの語を使わない（つよい 以外は変わらない）`, async ({ page }) => {
    await startSolo(page, lv);
    const cap = await page.evaluate(() => window.HB_TEST.CAP);
    const r = await todomeTry(page, { opp: 'ざこさくらんぼ', mine: cap - 1, n: 6 });
    expect(r.logs).not.toContain('（トドメ）');
  });
}
