// 割る・くっつける の動き（HB-051, D-085）。動きを許した設定（reducedMotion なし）で開く。結果（札の並び）は動きに左右されない
const { test, expect } = require('@playwright/test');
const { openGame, startSolo, setBasket, tapTiles, press, state, expectClean } = require('../helpers');

test.describe('動きを許した設定', () => {
  test.use({ reducedMotion: 'no-preference' });
  test.beforeEach(async ({ page }, info) => { info.ctx = await openGame(page); await startSolo(page); });
  test.afterEach(async ({}, info) => expectClean(info.ctx));

  test('割ると斬る線と二つの半分が出て、割ったあとに消える。結果は同じ', async ({ page }) => {
    await setBasket(page, ['く', 'し', 'さ']); await tapTiles(page, [2]);
    expect(await page.evaluate(() => window.HB_TEST.FX.angle)).toBe(57);
    await page.click('#aSplit');
    await expect(page.locator('.tile.cut .slash')).toHaveCount(1);
    await expect(page.locator('.tile.cut .half')).toHaveCount(2);
    await page.waitForFunction(() => !window.HB_TEST.S().busy);
    await expect(page.locator('.slash, .half')).toHaveCount(0);
    expect((await state(page)).mine).toBe('くしし' === '' ? '' : (await state(page)).mine);
    expect((await state(page)).mine).toBe('くし十⊂');
  });

  test('くっつけると2枚の残像が重なり、できた札に snap が付いて外れる', async ({ page }) => {
    await setBasket(page, ['う', '｜', 'こ']); await tapTiles(page, [0, 1]);
    await page.click('#aMerge');
    await expect(page.locator('.ghost')).toHaveCount(2);
    await expect(page.locator('.tile.snap')).toHaveCount(1);
    expect(await page.evaluate(() => window.HB_TEST.S().mine.filter(p => !p.filler).length)).toBe(2);
    await page.waitForFunction(() => !document.querySelector('.ghost') && !document.querySelector('.tile.snap'));
  });
});

test.describe('動きを減らす設定（テストの既定）', () => {
  test.beforeEach(async ({ page }, info) => { info.ctx = await openGame(page); await startSolo(page); });
  test.afterEach(async ({}, info) => expectClean(info.ctx));
  test('割る・くっつけるで動きの要素を出さない', async ({ page }) => {
    await setBasket(page, ['う', '｜', 'さ']); await tapTiles(page, [0, 1]);
    await page.click('#aMerge');
    await expect(page.locator('.ghost, .tile.snap, .slash, .half')).toHaveCount(0);
  });
});
