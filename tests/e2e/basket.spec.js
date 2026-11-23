// カゴが14こを超えたら負け（D-004。上限は rules.js の cap=14。D-082・HB-066）。ちょうど14こはまだ負けない
const { test, expect } = require('@playwright/test');
const { openGame, startSolo, setBasket, tapTiles, press, state, expectClean } = require('../helpers');

test.beforeEach(async ({ page }, info) => { info.ctx = await openGame(page); await startSolo(page); });
test.afterEach(async ({}, info) => expectClean(info.ctx));

const fill = n => Array.from({ length: n }, () => 'よ');
// 相手（CPU）のカゴを letters にして、その言葉を投げさせる
const cpuThrows = (page, letters, word) => page.evaluate(([ls, w]) => {
  const T = window.HB_TEST, S = T.S(); S.opp = ls.map(l => T.mk(l)); T.cpuThrow(w); T.render();
}, [letters, word]);

test('上限は14こ（rules.js の値。はじめから）', async ({ page }) => {
  expect(await page.evaluate(() => window.HB_TEST.CAP)).toBe(14);
  expect(await page.evaluate(() => window.HB_RULES.cap)).toBe(14);
  expect(await page.evaluate(() => window.HB_TEST.logText())).toContain('上限:14');
  await expect(page.locator('#myNum')).toContainText('/ 14');
});

test('相手の言葉が届いて自分のカゴが15こ → 負け', async ({ page }) => {
  await setBasket(page, fill(13));
  await cpuThrows(page, ['い', 'し', 'こ'], 'いし');
  await expect(page.locator('#result')).toBeVisible();
  await expect(page.locator('#resBig')).toContainText('カゴがあふれた。負け');
  expect((await state(page)).over).toBe('lose');
});

test('13こ・14こはまだ負けない', async ({ page }) => {
  await setBasket(page, fill(11));
  await cpuThrows(page, ['い', 'し', 'こ'], 'いし');
  let s = await state(page);
  expect(s.mine.length).toBe(13); expect(s.over).toBe(null);
  await setBasket(page, fill(12));
  await cpuThrows(page, ['い', 'し', 'こ'], 'いし');
  s = await state(page);
  expect(s.mine.length).toBe(14); expect(s.over).toBe(null);
  await expect(page.locator('#result')).toBeHidden();
});

test('自分の言葉で相手のカゴが15こ → 勝ち（14こまではまだ）', async ({ page }) => {
  await page.evaluate(() => { const T = window.HB_TEST; T.S().opp = Array.from({ length: 12 }, () => T.mk('よ')); });
  await setBasket(page, ['い', 'し', 'こ']);
  await tapTiles(page, [0, 1]);
  await press(page, '#aThrow');
  expect((await state(page)).over).toBe(null); // 14こ。ちょうどはまだ
  await page.evaluate(() => { const T = window.HB_TEST; T.newGame(); T.S().opp = Array.from({ length: 13 }, () => T.mk('よ')); });
  await setBasket(page, ['い', 'し', 'こ']);
  await tapTiles(page, [0, 1]);
  await press(page, '#aThrow');
  await expect(page.locator('#resBig')).toContainText('相手のカゴがあふれた。勝ち');
});

test('14このときは割れない・13このときは割れる', async ({ page }) => {
  await setBasket(page, ['は', ...fill(13)]);
  await tapTiles(page, [0]);
  expect((await state(page)).canSplit).toBe(false);
  await setBasket(page, ['は', ...fill(12)]);
  await tapTiles(page, [0]);
  expect((await state(page)).canSplit).toBe(true);
});

// カゴの上限は 14 に固定（HB-066, D-082 の追記）。12／14 の選びは無い。値は rules.js
test.describe('上限は固定（HB-066）', () => {
  test('メニューに上限の選びが無い', async ({ page }) => {
    await page.goto('http://hb.test/');
    await expect(page.locator('#capSet')).toHaveCount(0);
    await expect(page.locator('#capBox')).toHaveCount(0);
  });

  test('端末に hb.cap=12 が残っていても 14', async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem('hb.cap', '12'); } catch (e) {} });
    await page.goto('http://hb.test/');
    await startSolo(page);
    expect(await page.evaluate(() => window.HB_TEST.CAP)).toBe(14);
    await expect(page.locator('#myNum')).toContainText('/ 14');
  });

  test('ふたりでも 14（合図の cap が 12 や無しでも、こちらの値）', async ({ page }) => {
    await page.goto('http://hb.test/');
    const caps = await page.evaluate(() => {
      const T = window.HB_TEST, out = [];
      T.NET.starting = false; T.onStartMessage({ matchId: 'm1', cap: 14 }); out.push(T.NET.cap);
      T.NET.starting = false; T.onStartMessage({ matchId: 'm2', cap: 12 }); out.push(T.NET.cap);
      T.NET.starting = false; T.onStartMessage({ matchId: 'm3' }); out.push(T.NET.cap);
      return out;
    });
    expect(caps).toEqual([14, 14, 14]);
  });
});

test('負けたあと「もう一回」で新しい一戦が始まる（HB-060。HB-059 でボタンの働きが消えていた）', async ({ page }) => {
  await setBasket(page, fill(13));
  await cpuThrows(page, ['い', 'し', 'こ'], 'いし');
  await expect(page.locator('#result')).toBeVisible();
  await page.locator('#btnAgain').click();
  await expect(page.locator('#result')).toBeHidden();
  const s = await state(page);
  expect(s.over).toBe(null);
  expect(s.mine.length).toBe(5);
});
