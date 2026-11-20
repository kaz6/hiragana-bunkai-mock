// ★（工夫の数。D-031）。割って戻すだけ・くっつけて戻すだけの往復は数えない（D-067）。ふつうの工夫は数える
const { test, expect } = require('@playwright/test');
const { openGame, startSolo, setBasket, tapTiles, press, state, expectClean } = require('../helpers');

test.beforeEach(async ({ page }, info) => { info.ctx = await openGame(page); await startSolo(page); });
test.afterEach(async ({}, info) => expectClean(info.ctx));

// 投げたあと、最後に投げた言葉の工夫の数
const lastK = page => page.evaluate(() => { const L = window.HB_TEST.S().log; return L.length ? { word: L[L.length - 1].word, k: L[L.length - 1].k } : null; });
// カゴの札の工夫の数（道すじの → の数）
const comboAll = page => page.evaluate(() => { const T = window.HB_TEST; return T.S().mine.filter(p => !p.filler).map(p => T.comboOf([p])); });

async function throwAll(page, n) {
  if (await page.locator('#btnClear').isVisible()) await press(page, '#btnClear'); // くっつけた字は選ばれたまま（D-070）なので、一度えらび直す
  await tapTiles(page, [...Array(n).keys()]);
  await press(page, '#aThrow');
}

test('ふつうの工夫は数える：こ を回して い にして「いし」＝工夫1', async ({ page }) => {
  await setBasket(page, ['こ', 'し']);
  await tapTiles(page, [0]);
  await press(page, '#aRot');
  expect((await state(page)).mine).toBe('いし');
  await throwAll(page, 2);
  expect(await lastK(page)).toEqual({ word: 'いし', k: 1 });
});

test('ふつうの工夫は数える：は を割った ｜ と こ をくっつけて に＝工夫2', async ({ page }) => {
  await setBasket(page, ['は', 'こ']);
  await tapTiles(page, [0]);
  await press(page, '#aSplit'); // ｜ よ こ
  await tapTiles(page, [0, 2]);
  await press(page, '#aMerge'); // に よ
  expect((await state(page)).mine).toBe('によ');
  expect(await comboAll(page)).toEqual([2, 1]); // に＝（は→｜）＋こ→に、よ＝は→よ
});

test('割ってそのまま戻すだけ（ぷ→ふ＋゜→ぷ）は数えない：「ろーぷ」＝工夫0', async ({ page }) => {
  await setBasket(page, ['ろ', '一', 'ぷ']);
  await tapTiles(page, [2]);
  await press(page, '#aSplit'); // ろ 一 ふ ∘
  expect((await state(page)).mine).toBe('ろ一ふ∘');
  await tapTiles(page, [2, 3]);
  await press(page, '#aMerge');
  expect((await state(page)).mine).toBe('ろ一ぷ');
  expect(await comboAll(page)).toEqual([0, 0, 0]);
  await throwAll(page, 3);
  expect(await lastK(page)).toEqual({ word: 'ろーぷ', k: 0 });
});

test('割ってそのまま戻すだけ（こ→一＋一→こ）は数えない：「こし」＝工夫0', async ({ page }) => {
  await setBasket(page, ['こ', 'し']);
  await tapTiles(page, [0]);
  await press(page, '#aSplit');
  await tapTiles(page, [0, 1]);
  await press(page, '#aMerge');
  await throwAll(page, 2);
  expect(await lastK(page)).toEqual({ word: 'こし', k: 0 });
});

test('くっつけて割って戻すだけ（る＋｜→ね→｜＋る）は数えない', async ({ page }) => {
  await setBasket(page, ['る', '｜']);
  await tapTiles(page, [0, 1]);
  await press(page, '#aMerge'); // ね（選ばれたまま。D-070）
  expect((await state(page)).mine).toBe('ね');
  await press(page, '#aSplit');
  expect((await state(page)).mine).toBe('｜る');
  expect(await comboAll(page)).toEqual([0, 0]);
});

test('片方だけ別の札と組むと数える（割った ｜ を別の よ と）', async ({ page }) => {
  await setBasket(page, ['は', 'よ']);
  await tapTiles(page, [0]);
  await press(page, '#aSplit'); // ｜ よ(割った) よ(もとから)
  await tapTiles(page, [0, 2]);
  await press(page, '#aMerge'); // は（｜は割ったもの、よ はもとから）
  const k = await comboAll(page);
  expect(k.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
});
