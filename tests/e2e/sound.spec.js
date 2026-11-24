// 手触りの音（D-100・HB-073）。中身は sound.js。自分の割る・回す・裏返す・くっつける・投げる で鳴る。CPU・失敗では鳴らない
// 耳では確かめられないので、「どの動きを鳴らしたか」（HB_SE.played。自動テストの窓が開いているときだけ覚える）と、音を作ってもエラーが出ないことを見る
const { test, expect } = require('@playwright/test');
const { openGame, startSolo, setBasket, tapTiles, press, state, expectClean } = require('../helpers');

const played = page => page.evaluate(() => window.HB_SE.played.slice());

test.describe('音あり', () => {
  test.beforeEach(async ({ page }, info) => { info.ctx = await openGame(page); await startSolo(page); });
  test.afterEach(async ({}, info) => expectClean(info.ctx));

  test('作者が選んだ組（割る＝回すのA／回す＝割るのB／裏返す＝B／くっつける＝割るのA／投げる＝A）', async ({ page }) => {
    const m = await page.evaluate(() => window.HB_SOUND.moves);
    expect(Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v.wood]))).toEqual({ split: 'A', turn: 'B', flip: 'B', merge: 'A', throw: 'A' });
    expect(m.split.hits.length).toBe(1);          // 「コッ」
    expect(m.turn.hits).toEqual(m.merge.hits);    // どちらも「コン・カッ」
    expect(m.throw.hits.length).toBe(3);          // 「コロコロ」
  });

  test('割る・回す・裏返す・くっつける・投げる で、それぞれの音を鳴らす', async ({ page }) => {
    await setBasket(page, ['は', 'こ', 'し', 'よ']);
    expect(await played(page)).toEqual([]);
    await tapTiles(page, [0]); await press(page, '#aSplit');           // は → ｜＋よ
    await tapTiles(page, [0]); await press(page, '#aRot');             // こ を回す
    await press(page, '#aFlip');                                       // そのまま裏返す
    expect(await played(page)).toEqual(['split', 'turn', 'flip']);
    await setBasket(page, ['｜', 'し', 'し']);
    await tapTiles(page, [0, 1]); await press(page, '#aMerge');        // ｜＋し → い
    expect((await state(page)).mine).toBe('いし');
    await tapTiles(page, [1]);                                         // できた い は選ばれたまま。し を足して「いし」
    await press(page, '#aThrow');
    expect(await played(page)).toEqual(['split', 'turn', 'flip', 'merge', 'throw']);
  });

  test('投げられない並びでは鳴らさない。CPU の投げでも鳴らさない', async ({ page }) => {
    await setBasket(page, ['ぬ', 'ぬ']);
    await tapTiles(page, [0, 1]); await press(page, '#aThrow');
    await page.evaluate(() => { const T = window.HB_TEST, S = T.S(); S.opp = ['い', 'し'].map(l => T.mk(l)); T.cpuThrow('いし'); T.render(); });
    expect(await played(page)).toEqual([]);
  });
});

test('sound.js が読めなくても遊べる（音が鳴らないだけ）', async ({ page }) => {
  const ctx = await openGame(page, { soundJs: { status: 404, body: '' } });
  ctx.errors.length = 0; // 404 の読み込みエラーはこのテストでは見ない
  await startSolo(page);
  await setBasket(page, ['は', 'よ']);
  await tapTiles(page, [0]); await press(page, '#aSplit');
  expect((await state(page)).mine).toBe('｜よよ');
  expect(await page.evaluate(() => window.HB_SE)).toBeUndefined();
  expect(ctx.errors.filter(e => !/404|Failed to load/.test(e))).toEqual([]);
  expect(ctx.blocked).toEqual([]);
});
