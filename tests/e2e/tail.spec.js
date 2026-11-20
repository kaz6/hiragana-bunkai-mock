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
