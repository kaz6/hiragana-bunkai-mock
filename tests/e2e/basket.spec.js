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

// カゴの上限を12／14から選べる（HB-048, D-082）。はじめは12。設定は端末に覚え、次の一戦から効く
test.describe('上限の設定（12／14）', () => {
  test('はじめは12。メニューに設定が出て、12が選ばれている', async ({ page }) => {
    await page.goto('http://hb.test/');
    await expect(page.locator('#capSet button[data-cap="12"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#capSet button[data-cap="14"]')).toHaveAttribute('aria-pressed', 'false');
  });

  test('14を選ぶと覚える。ひとりで始めると上限14・ログの頭が「上限:14」', async ({ page }) => {
    await page.goto('http://hb.test/');
    await page.click('#capSet button[data-cap="14"]');
    expect(await page.evaluate(() => localStorage.getItem('hb.cap'))).toBe('14');
    await page.reload();
    await expect(page.locator('#capSet button[data-cap="14"]')).toHaveAttribute('aria-pressed', 'true');
    await startSolo(page);
    expect(await page.evaluate(() => window.HB_TEST.CAP)).toBe(14);
    expect(await page.evaluate(() => window.HB_TEST.logText())).toContain('上限:14');
    await expect(page.locator('#myNum')).toContainText('/ 14');
  });

  test('14では13こはあふれず15こであふれる（自分・相手）', async ({ page }) => {
    await page.goto('http://hb.test/');
    await page.click('#capSet button[data-cap="14"]');
    await startSolo(page);
    await setBasket(page, fill(11));
    await cpuThrows(page, ['い', 'し', 'こ'], 'いし');
    let s = await state(page);
    expect(s.mine.length).toBe(13); expect(s.over).toBe(null);
    await page.evaluate(() => window.HB_TEST.newGame());
    await setBasket(page, fill(13));
    await cpuThrows(page, ['い', 'し', 'こ'], 'いし');
    s = await state(page);
    expect(s.mine.length).toBe(15); expect(s.over).toBe('lose');
    await page.evaluate(() => { const T = window.HB_TEST; T.newGame(); T.S().opp = Array.from({ length: 13 }, () => T.mk('よ')); });
    await setBasket(page, ['い', 'し', 'こ']);
    await tapTiles(page, [0, 1]);
    await press(page, '#aThrow');
    await expect(page.locator('#resBig')).toContainText('相手のカゴがあふれた。勝ち');
  });

  test('14では13このときも割れる（12では割れない）', async ({ page }) => {
    await page.goto('http://hb.test/');
    await page.click('#capSet button[data-cap="14"]');
    await startSolo(page);
    await setBasket(page, ['は', ...fill(12)]);
    await tapTiles(page, [0]);
    expect((await state(page)).canSplit).toBe(true);
  });

  test('ふたりでは合図を出した側の上限に合わせる（合図に cap が無ければ12）', async ({ page }) => {
    await page.goto('http://hb.test/');
    const caps = await page.evaluate(() => {
      const T = window.HB_TEST, out = [];
      T.NET.starting = false; T.onStartMessage({ matchId: 'm1', cap: 14 }); out.push(T.NET.cap);
      T.NET.starting = false; T.onStartMessage({ matchId: 'm2' }); out.push(T.NET.cap);
      T.NET.starting = false; T.onStartMessage({ matchId: 'm3', cap: 99 }); out.push(T.NET.cap);
      return out;
    });
    expect(caps).toEqual([14, 12, 12]);
  });
});
