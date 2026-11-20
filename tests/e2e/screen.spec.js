// 画面：390px で開いてエラーがない。遊び方が開く。ひとりでが始まる。辞書の語数
const { test, expect } = require('@playwright/test');
const { openGame, startSolo, expectClean, EXTRA_WORDS } = require('../helpers');
const { DICT_WORDS_NOW, PAGE_WORDS_NOW, MIN_RATIO } = require('../counts');

test.afterEach(async ({}, info) => expectClean(info.ctx));

const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

test('390px で開いてエラーがない。はじめの画面に ひとりで・ふたりで', async ({ page }, info) => {
  info.ctx = await openGame(page);
  await expect(page.locator('#btnSolo')).toBeVisible();
  await expect(page.locator('#btnJoin')).toBeVisible();
  expect(page.viewportSize().width).toBe(390);
  expect(await noOverflow(page)).toBe(true);
});

test('「？ 遊び方」が開いて、ルールの3行がある。とじるで閉じる', async ({ page }, info) => {
  info.ctx = await openGame(page);
  await startSolo(page, 'ゆるゆる');
  await page.click('#btnHow');
  await expect(page.locator('#sheet')).toBeVisible();
  await expect(page.locator('#rulesHow li')).toHaveCount(3);
  await expect(page.locator('#rulesHow')).toContainText('相手のカゴが12こをこえたら勝ち');
  await expect(page.locator('#recipes')).toContainText('と ＝ ｜ ＋ ⊂'); // 作り方の一覧は RECIPE から（D-069）
  await page.click('#btnClose');
  await expect(page.locator('#sheet')).toBeHidden();
});

test('ひとりで（ふつう）を押すと始まり、最初の手は5枚で ｜ を含む（D-034）。札をタップで選べる', async ({ page }, info) => {
  info.ctx = await openGame(page);
  await startSolo(page, 'ふつう');
  await expect(page.locator('#menu')).toBeHidden();
  await expect(page.locator('#basket .tile')).toHaveCount(5);
  const mine = await page.evaluate(() => { const T = window.HB_TEST; return T.S().mine.map(T.letterOf); });
  expect(mine).toContain('｜');
  await page.locator('#basket .tile').first().click(); // 本物のタップ
  await expect(page.locator('#basket .tile.sel')).toHaveCount(1);
  expect(await noOverflow(page)).toBe(true);
});

test('最初の1戦の案内（記録を消した状態）でもエラーがない', async ({ page }, info) => {
  info.ctx = await openGame(page, { guide: true });
  await startSolo(page, 'ゆるゆる');
  await expect(page.locator('#basket .tile')).toHaveCount(5);
});

test('辞書の語数：ページの語数が大きく減っていない。extra_words（固定の数語）が足される', async ({ page }, info) => {
  info.ctx = await openGame(page);
  const r = await page.evaluate(ws => ({ n: window.HB_TEST.words().length, has: ws.map(w => window.HB_TEST.DICT.has(w)), dictN: document.getElementById('dictN').textContent }), EXTRA_WORDS);
  expect(r.has).toEqual(EXTRA_WORDS.map(() => true));
  expect(r.n).toBeGreaterThanOrEqual(Math.floor(PAGE_WORDS_NOW * MIN_RATIO));
  expect(Number(r.dictN)).toBe(r.n);
  info.annotations.push({ type: 'words', description: `page ${r.n} (記録 ${PAGE_WORDS_NOW}), dict-ipadic ${DICT_WORDS_NOW}` });
});

test('extra_words が読めなくても遊べる（Supabase が空の返事）', async ({ page }, info) => {
  info.ctx = await openGame(page, { extraWords: [] });
  await startSolo(page, 'ゆるゆる');
  await expect(page.locator('#basket .tile')).toHaveCount(5);
});
