// 選んでいる途中の割る・くっつける（HB-034, D-070）。回す・裏返すと同じく、選んだ末尾に効く
const { test, expect } = require('@playwright/test');
const { openGame, startSolo, setBasket, tapTiles, press, state, expectClean } = require('../helpers');

test.beforeEach(async ({ page }, info) => { info.ctx = await openGame(page); await startSolo(page); });
test.afterEach(async ({}, info) => expectClean(info.ctx));

test('くっつける＝選んだ最後の2枚。できた字は選ばれたまま（う・る・し・｜ → う・る・い）', async ({ page }) => {
  await setBasket(page, ['う', 'る', 'し', '｜', 'よ']);
  await tapTiles(page, [0, 1, 2, 3]);
  const a = await state(page);
  expect(a.canMerge).toBe(true);
  expect(a.msg).toBe('「｜」は部品。言葉には使えない'); // 3枚以上は言葉の知らせを先に出す
  await press(page, '#aMerge');
  const b = await state(page);
  expect(b.mine).toBe('うるいよ');
  expect(b.sel).toBe('うるい');
});

test('3枚以上で、言葉にもなり末尾もくっつけられるときは「投げられる」を出し、くっつけるも押せる（あしこし）', async ({ page }) => {
  await setBasket(page, ['あ', 'し', 'こ', 'し']); // 末尾の こ＋し → も
  await tapTiles(page, [0, 1, 2, 3]);
  const s = await state(page);
  expect(s.msg).toBe('投げられる');
  expect(s.canMerge).toBe(true);
});

test('割る＝選んだ最後の1枚。割った2つは選ばれない。前に選んだ札はそのまま', async ({ page }) => {
  await setBasket(page, ['こ', 'は', 'よ']);
  await tapTiles(page, [0, 1]);
  expect((await state(page)).canSplit).toBe(true);
  await press(page, '#aSplit');
  const s = await state(page);
  expect(s.mine).toBe('こ｜よよ');
  expect(s.sel).toBe('こ');
});

test('末尾が割れない字なら割るは押せない', async ({ page }) => {
  await setBasket(page, ['は', 'よ']);
  await tapTiles(page, [0, 1]);
  expect((await state(page)).canSplit).toBe(false);
});

test('2枚だけのときは今までどおり「くっつけられる」。くっつけた字は選ばれたまま', async ({ page }) => {
  await setBasket(page, ['｜', 'し']);
  await tapTiles(page, [0, 1]);
  const a = await state(page);
  expect(a.msg).toBe('くっつけられる');
  await press(page, '#aMerge');
  const b = await state(page);
  expect(b.mine).toBe('い');
  expect(b.sel).toBe('い');
});

test('途中でも、い＋一 は せ になる（う・い・一 → う・せ。「どっち」は出ない。D-072）', async ({ page }) => {
  await setBasket(page, ['う', 'い', '一']);
  await tapTiles(page, [0, 1, 2]);
  await press(page, '#aMerge');
  await expect(page.locator('#trayPick')).toBeHidden();
  expect((await state(page)).sel).toBe('うせ');
});

// 向きずれの札も、もとの字として割れる（HB-069, D-098）
test('向きずれの札（に を1回回した）を割ると、ふつうの向きの ｜＋こ。割るも押せる', async ({ page }) => {
  await setBasket(page, ['に', 'よ']);
  await tapTiles(page, [0]);
  await press(page, '#aRot');
  expect(await page.evaluate(() => window.HB_TEST.letterOf(window.HB_TEST.S().mine[0]))).toBe(null); // 黄色い札
  expect((await state(page)).canSplit).toBe(true);
  await press(page, '#aSplit');
  const s = await state(page);
  expect(s.mine).toBe('｜こよ'); // 出た札は字（ふつうの向き）
  const log = await page.evaluate(() => window.HB_TEST.logText());
  expect(log).toContain('割る に（向きずれ）→｜＋こ');
});

test('向きずれから割った★：回しただけでは付かず、割ったぶん（1）だけ。割って戻すと0', async ({ page }) => {
  await setBasket(page, ['に', 'よ']);
  await tapTiles(page, [0]);
  await press(page, '#aRot');
  expect(await page.evaluate(() => window.HB_TEST.comboOf([window.HB_TEST.S().mine[0]]))).toBe(0); // 回しただけ
  await press(page, '#aSplit');
  expect(await page.evaluate(() => window.HB_TEST.S().mine.slice(0, 2).map(p => window.HB_TEST.comboOf([p])))).toEqual([1, 1]);
  await tapTiles(page, [0, 1]);
  await press(page, '#aMerge'); // ｜＋こ→に（ふつうの向き）
  const m = await page.evaluate(() => { const T = window.HB_TEST, p = T.S().mine[0]; return { L: T.letterOf(p), k: T.comboOf([p]) }; });
  expect(m).toEqual({ L: 'に', k: 0 }); // 戻すだけの往復は数えない（D-067）
});

test('い を回した こ は いまどおり 一＋一（向きずれではない）', async ({ page }) => {
  await setBasket(page, ['い', 'よ']);
  await tapTiles(page, [0]);
  await press(page, '#aRot');
  expect((await state(page)).mine).toBe('こよ');
  await press(page, '#aSplit');
  expect((await state(page)).mine).toBe('一一よ');
});

test('う＋｜ でできた向きずれの か を割ると う＋｜（くっつける前の札に戻る・★0）', async ({ page }) => {
  await setBasket(page, ['う', '｜', 'よ']);
  await tapTiles(page, [0, 1]);
  await press(page, '#aMerge');
  const k = await page.evaluate(() => { const T = window.HB_TEST, p = T.S().mine[0]; return { L: T.letterOf(p), r: p.r, f: p.f }; });
  expect(k).toEqual({ L: null, r: 1, f: 1 }); // 向きずれの か
  expect((await state(page)).canSplit).toBe(true);
  await press(page, '#aSplit');
  expect((await state(page)).mine).toBe('う｜よ');
  expect(await page.evaluate(() => window.HB_TEST.S().mine.slice(0, 2).map(p => window.HB_TEST.comboOf([p])))).toEqual([0, 0]);
});

test('割り方のない字（く）の向きずれは割れない', async ({ page }) => {
  await setBasket(page, ['く', 'よ']);
  await tapTiles(page, [0]);
  await press(page, '#aRot'); // へ
  await press(page, '#aRot'); // ＞（部品）
  await press(page, '#aRot'); // 黄色い札
  expect(await page.evaluate(() => window.HB_TEST.letterOf(window.HB_TEST.S().mine[0]))).toBe(null);
  expect((await state(page)).canSplit).toBe(false);
});

test('上限いっぱいのときは、向きずれの札も割れない（いまどおり）', async ({ page }) => {
  await setBasket(page, ['に', ...Array(13).fill('よ')]);
  await tapTiles(page, [0]);
  await press(page, '#aRot');
  expect((await state(page)).canSplit).toBe(false);
});

test('割れない字 ん の向きずれは、もとの字 て としては割れない（カード：割れない字に割り方を足さない）', async ({ page }) => {
  await setBasket(page, ['ん', 'よ']);
  await tapTiles(page, [0]);
  await press(page, '#aRot'); // 黄色い札
  expect(await page.evaluate(() => window.HB_TEST.letterOf(window.HB_TEST.S().mine[0]))).toBe(null);
  expect((await state(page)).canSplit).toBe(false);
});

test('さ を裏返した ち を回して向きずれ→割る→ち の割り方（つ＋十）。そのままくっつけ直すと ち に戻り、★は割る前と同じ（答え：最後に見えていた字 p.was で割る）', async ({ page }) => {
  await setBasket(page, ['さ', 'よ']);
  await tapTiles(page, [0]);
  await press(page, '#aFlip'); // ち
  const before = await page.evaluate(() => { const T = window.HB_TEST, p = T.S().mine[0]; return { L: T.letterOf(p), k: T.comboOf([p]), d: p.d }; });
  expect(before.L).toBe('ち');
  await press(page, '#aRot');  // 向きずれ
  expect(await page.evaluate(() => window.HB_TEST.letterOf(window.HB_TEST.S().mine[0]))).toBe(null);
  await press(page, '#aSplit'); // ち として つ＋十
  expect(await page.evaluate(() => [...window.HB_TEST.S().mine.slice(0, 2).map(p => window.HB_TEST.letterOf(p))].sort().join(''))).toBe(['つ', '十'].sort().join(''));
  expect((await state(page)).mine.endsWith('よ')).toBe(true);
  await tapTiles(page, [0, 1]);
  await press(page, '#aMerge');
  const m = await page.evaluate(() => { const T = window.HB_TEST, p = T.S().mine[0]; return { L: T.letterOf(p), was: p.was, k: T.comboOf([p]), d: p.d }; });
  expect(m.L).toBe('ち');
  expect(m.was).toBe('ち');
  expect(m.k).toBe(before.k); // ★は割る前と同じ
  expect(m.d).toBe(before.d); // 道すじも割る前のまま
});

test('べ・づ・ぢ の向きずれも、見えていた字で割って戻すと ★ が増えない・割れる字だけ', async ({ page }) => {
  let n = 0;
  for (const g of ['べ', 'づ', 'ぢ']) {
    await setBasket(page, [g, 'よ']);
    await tapTiles(page, [0]);
    const k0 = await page.evaluate(() => { const T = window.HB_TEST; return T.comboOf([T.S().mine[0]]); });
    await press(page, '#aRot');
    const skew = await page.evaluate(() => window.HB_TEST.letterOf(window.HB_TEST.S().mine[0]));
    if (skew !== null) continue; // 回して字になる字はいまどおり（この検査の対象外）
    await press(page, '#aSplit');
    await tapTiles(page, [0, 1]);
    await press(page, '#aMerge');
    const m = await page.evaluate(() => { const T = window.HB_TEST, p = T.S().mine[0]; return { L: T.letterOf(p), k: T.comboOf([p]) }; });
    expect(m.L, g).toBe(g);
    expect(m.k, g).toBe(k0);
    n++;
  }
  expect(n).toBe(3); // 3字とも向きずれから割って戻した
});
