// 動詞の命令形の辞書（dict-meirei.js。HB-070, D-099）。テストでは固定の数語を返す（本物の中身は tools/build_dict.js が作る）
const { test, expect } = require('@playwright/test');
const { openGame, startSolo, setBasket, tapTiles, state, expectClean } = require('../helpers');

const FIXED = "window.HB_MEIREI='たべろ にげろ';";
async function pick(page, letters) {
  await setBasket(page, letters);
  await tapTiles(page, letters.map((_, i) => i));
  return state(page);
}

test('dict-meirei.js にある語は言葉として通る（たべろ・にげろ）。辞書の語数にも入る', async ({ page }, info) => {
  info.ctx = await openGame(page, { dictMeirei: { status: 200, body: FIXED } }); await startSolo(page);
  expect(await page.evaluate(() => window.HB_TEST.words().includes('たべろ') && window.HB_TEST.words().includes('にげろ'))).toBe(true);
  expect((await pick(page, ['た', 'へ', 'ろ'])).msg).not.toBe('投げられる'); // へ ≠ べ。字が違えば通らない
  expect((await pick(page, ['に', 'け', 'ろ'])).msg).not.toBe('投げられる'); // け ≠ げ
  expectClean(info.ctx);
});

test('dict-meirei.js の語（にげろ）は、濁点をくっつけた字でも投げられる', async ({ page }, info) => {
  info.ctx = await openGame(page, { dictMeirei: { status: 200, body: FIXED } }); await startSolo(page);
  expect((await pick(page, ['に', 'げ', 'ろ'])).msg).toBe('投げられる');
  expect((await pick(page, ['た', 'べ', 'ろ'])).msg).toBe('投げられる');
  expectClean(info.ctx);
});

test('dict-meirei.js が空でも、無くても（404）ページは動く。たべろ は通らない', async ({ page }) => {
  for (const [status, body] of [[200, ''], [404, '']]) {
    await openGame(page, { dictMeirei: { status, body } }); await startSolo(page); // 404 のときのコンソールの「読み込めなかった」は、ここでは見ない
    expect(await page.evaluate(() => window.HB_TEST.words().includes('たべろ'))).toBe(false);
    expect((await pick(page, ['た', 'べ', 'ろ'])).msg).not.toBe('投げられる');
    expect(await page.evaluate(() => window.HB_TEST.words().length)).toBeGreaterThan(30000);
  }
});

test('本物の dict-meirei.js で たべろ・にげろ が通る（辞書の外から足した形）', async ({ page }, info) => {
  info.ctx = await openGame(page); await startSolo(page);
  expect(await page.evaluate(() => ['たべろ', 'にげろ', 'あそべ'].every(w => window.HB_TEST.words().includes(w)))).toBe(true);
  expect((await pick(page, ['に', 'げ', 'ろ'])).msg).toBe('投げられる');
  expectClean(info.ctx);
});
