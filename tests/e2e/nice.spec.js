// 素敵な言葉の演出（D-065）と虹色（HB-043, D-077）：うんこ・うんち は花吹雪＋文字を虹色。すき（heart）・よろしく（petals）はいまのまま
const { test, expect } = require('@playwright/test');
const { openGame, startSolo, expectClean } = require('../helpers');

test.beforeEach(async ({ page }, info) => { info.ctx = await openGame(page); await startSolo(page); });
test.afterEach(async ({}, info) => expectClean(info.ctx));

// 言葉を投げた体で showMeaning を呼び、花吹雪（.pt）・ハート（.ht）の数と、真ん中の言葉・ログの行が虹色かを返す
const probe = (page, word, who = 'me') => page.evaluate(([word, who]) => {
  const T = window.HB_TEST; T.newGame();
  const box = document.getElementById('niceFx'); if (box) box.innerHTML = '';
  T.showMeaning(word, who);
  const S = T.S(); S.log.push({ who, word, k: 0 }); T.render();
  const mw = document.querySelector('#meaning .mw');
  return { petals: document.querySelectorAll('#niceFx .pt').length, hearts: document.querySelectorAll('#niceFx .ht').length,
    mwRainbow: !!mw && mw.classList.contains('rb'), logRainbow: document.querySelectorAll('#log .row .w .rb').length };
}, [word, who]);

for (const w of ['うんこ', 'うんち']) {
  test(`${w} を投げると花吹雪と虹色（真ん中・ログ）`, async ({ page }) => {
    const r = await probe(page, w);
    expect(r.petals).toBeGreaterThan(0); expect(r.hearts).toBe(0);
    expect(r.mwRainbow).toBe(true); expect(r.logRainbow).toBe(1);
  });
}

test('相手が投げても虹色', async ({ page }) => {
  const r = await probe(page, 'うんこ', 'op');
  expect(r.petals).toBeGreaterThan(0); expect(r.mwRainbow).toBe(true); expect(r.logRainbow).toBe(1);
});

test('すき（heart）・よろしく（petals）は虹色にならず、いまのまま', async ({ page }) => {
  const a = await probe(page, 'すき');
  expect(a.hearts).toBeGreaterThan(0); expect(a.petals).toBe(0); expect(a.mwRainbow).toBe(false); expect(a.logRainbow).toBe(0);
  const b = await probe(page, 'よろしく');
  expect(b.petals).toBeGreaterThan(0); expect(b.hearts).toBe(0); expect(b.mwRainbow).toBe(false); expect(b.logRainbow).toBe(0);
});

// 色の言葉（HB-053, D-087）：字の色だけ。演出（花吹雪・ハート）は出さない
const ink = (page, word, who = 'me') => page.evaluate(([word, who]) => {
  const T = window.HB_TEST; T.newGame();
  const box = document.getElementById('niceFx'); if (box) box.innerHTML = '';
  T.showMeaning(word, who);
  const S = T.S(); S.log.push({ who, word, k: 0 }); T.render();
  const mw = document.querySelector('#meaning .mw'), lw = document.querySelector('#log .row .w span');
  const st = el => el ? { style: el.getAttribute('style') || '', rb: el.classList.contains('rb') } : null;
  return { fx: document.querySelectorAll('#niceFx i').length, mw: st(mw), log: st(lw) };
}, [word, who]);

test('しろ を投げると字が白（真ん中・ログ）。演出は出ない', async ({ page }) => {
  const r = await ink(page, 'しろ');
  expect(r.fx).toBe(0);
  expect(r.mw.style).toContain('color:#FFFFFF'); expect(r.log.style).toContain('color:#FFFFFF');
});
test('相手（CPU）が投げても色が付く', async ({ page }) => {
  const r = await ink(page, 'あかいろ', 'op');
  expect(r.mw.style).toContain('#E5484D'); expect(r.log.style).toContain('#E5484D');
});
test('くろ・あいいろ・こんいろ・しろくろ は白い縁。しろ は灰色の縁。あか は縁なし', async ({ page }) => {
  for (const w of ['くろ', 'あいいろ', 'こんいろ', 'しろくろ']) expect((await ink(page, w)).mw.style).toContain('-webkit-text-stroke');
  expect((await ink(page, 'あかいろ')).mw.style).not.toContain('-webkit-text-stroke');
  expect((await ink(page, 'しろ')).mw.style).toContain('-webkit-text-stroke:3px #6B7A80'); // 白い字は明るい地で見えないので灰色の縁（仮決め）
});
test('しろくろ は白と黒の半分ずつ', async ({ page }) => {
  expect((await ink(page, 'しろくろ')).mw.style).toContain('linear-gradient(90deg,#FFFFFF 50%,#111111 50%)');
});
test('いろいろ・いろ は虹色の字だけで花吹雪なし', async ({ page }) => {
  for (const w of ['いろいろ', 'いろ']) { const r = await ink(page, w); expect(r.fx).toBe(0); expect(r.mw.rb).toBe(true); expect(r.log.rb).toBe(true); }
});
test('一覧に無い語は色が付かない', async ({ page }) => {
  const r = await ink(page, 'ほし');
  expect(r.mw.style).toBe(''); expect(r.mw.rb).toBe(false); expect(r.log).toBeNull();
});
