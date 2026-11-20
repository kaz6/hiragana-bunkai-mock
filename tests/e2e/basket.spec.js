// カゴが12こを超えたら負け（D-004。上限 CAP=12）。ちょうど12こはまだ負けない
const { test, expect } = require('@playwright/test');
const { openGame, startSolo, setBasket, tapTiles, press, state, expectClean } = require('../helpers');

test.beforeEach(async ({ page }, info) => { info.ctx = await openGame(page); await startSolo(page); });
test.afterEach(async ({}, info) => expectClean(info.ctx));

const fill = n => Array.from({ length: n }, () => 'よ');
// 相手（CPU）のカゴを letters にして、その言葉を投げさせる
const cpuThrows = (page, letters, word) => page.evaluate(([ls, w]) => {
  const T = window.HB_TEST, S = T.S(); S.opp = ls.map(l => T.mk(l)); T.cpuThrow(w); T.render();
}, [letters, word]);

test('上限は12こ', async ({ page }) => {
  expect(await page.evaluate(() => window.HB_TEST.CAP)).toBe(12);
});

test('相手の言葉が届いて自分のカゴが13こ → 負け', async ({ page }) => {
  await setBasket(page, fill(11));
  await cpuThrows(page, ['い', 'し', 'こ'], 'いし');
  await expect(page.locator('#result')).toBeVisible();
  await expect(page.locator('#resBig')).toContainText('カゴがあふれた。負け');
  expect((await state(page)).over).toBe('lose');
});

test('ちょうど12こはまだ負けない', async ({ page }) => {
  await setBasket(page, fill(10));
  await cpuThrows(page, ['い', 'し', 'こ'], 'いし');
  const s = await state(page);
  expect(s.mine.length).toBe(12);
  expect(s.over).toBe(null);
  await expect(page.locator('#result')).toBeHidden();
});

test('自分の言葉で相手のカゴが13こ → 勝ち', async ({ page }) => {
  await page.evaluate(() => { const T = window.HB_TEST; T.S().opp = Array.from({ length: 11 }, () => T.mk('よ')); });
  await setBasket(page, ['い', 'し', 'こ']);
  await tapTiles(page, [0, 1]);
  await press(page, '#aThrow');
  await expect(page.locator('#resBig')).toContainText('相手のカゴがあふれた。勝ち');
});

test('12このときは割れない', async ({ page }) => {
  await setBasket(page, ['は', ...fill(11)]);
  await tapTiles(page, [0]);
  expect((await state(page)).canSplit).toBe(false);
});
