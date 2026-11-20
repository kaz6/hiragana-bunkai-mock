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
