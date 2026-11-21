// 動詞から作る名詞の形の辞書（dict-renyo.js。HB-052, D-086）。テストでは固定の数語を返す（本物の中身は JMdict を取れる毎日の更新が作る）
const { test, expect } = require('@playwright/test');
const { openGame, startSolo, setBasket, tapTiles, state, expectClean } = require('../helpers');

const FIXED = "window.HB_RENYO='さまよい きこし';";
async function pick(page, letters) {
  await setBasket(page, letters);
  await tapTiles(page, letters.map((_, i) => i));
  return state(page);
}

test('dict-renyo.js にある語は言葉として通る（さまよい）。辞書の語数にも入る', async ({ page }, info) => {
  info.ctx = await openGame(page, { dictRenyo: { status: 200, body: FIXED } }); await startSolo(page);
  expect(await page.evaluate(() => window.HB_TEST.words().includes('さまよい') && window.HB_TEST.words().includes('きこし'))).toBe(true);
  expect((await pick(page, ['さ', 'ま', 'よ', 'い'])).msg).toBe('投げられる');
  expectClean(info.ctx);
});

test('dict-renyo.js が空でも、無くても（404）ページは動く。さまよい は通らない', async ({ page }) => {
  for (const [status, body] of [[200, ''], [404, '']]) {
    await openGame(page, { dictRenyo: { status, body } }); await startSolo(page); // 404 のときのコンソールの「読み込めなかった」は、ここでは見ない
    expect(await page.evaluate(() => window.HB_TEST.words().includes('さまよい'))).toBe(false);
    expect((await pick(page, ['さ', 'ま', 'よ', 'い'])).msg).not.toBe('投げられる');
    expect(await page.evaluate(() => window.HB_TEST.words().length)).toBeGreaterThan(30000);
  }
});
