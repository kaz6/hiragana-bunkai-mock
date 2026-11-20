// 言葉の判定（checkSel）。札を選んだときの知らせ（#trayStat）と「投げる」で確かめる
const { test, expect } = require('@playwright/test');
const { openGame, startSolo, setBasket, tapTiles, press, state, expectClean } = require('../helpers');

test.beforeEach(async ({ page }, info) => { info.ctx = await openGame(page); await startSolo(page); });
test.afterEach(async ({}, info) => expectClean(info.ctx));

async function pick(page, letters) {
  await setBasket(page, letters);
  await tapTiles(page, letters.map((_, i) => i));
  return state(page);
}

test('2字から：1字では投げられない', async ({ page }) => {
  expect((await pick(page, ['は'])).msg).toBe('1字では投げられない');
  await press(page, '#aThrow');
  expect((await state(page)).mine).toBe('は'); // 投げられていない
});

test('2字の言葉は投げられる（いし）', async ({ page }) => {
  expect((await pick(page, ['い', 'し'])).msg).toBe('投げられる');
});

test('のばす音（一）は頭に置けない。中なら使える（こーち）', async ({ page }) => {
  expect((await pick(page, ['一', 'こ', 'ち'])).msg).toBe('のばす音は頭に置けない');
  expect((await pick(page, ['こ', '一', 'ち'])).msg).toBe('投げられる');
});

test('部品（十・｜・゜）は言葉に使えない', async ({ page }) => {
  expect((await pick(page, ['十', 'い', 'し'])).msg).toBe('「十」は部品。言葉には使えない');
  expect((await pick(page, ['い', '｜', 'し'])).msg).toBe('「｜」は部品。言葉には使えない');
  expect((await pick(page, ['∘', 'ち'])).msg).toBe('「゜」は部品。言葉には使えない');
});

test('記号は最後だけ：「ち。」（ち＋゜）は投げられる、゜ が前だと部品', async ({ page }) => {
  // 記号（？！）は D-011 でなくなった。いま残っている「最後に付ける」形は ち∘（D-017）だけ
  expect((await pick(page, ['ち', '∘'])).msg).toBe('投げられる');
  expect((await pick(page, ['∘', 'ち'])).msg).toBe('「゜」は部品。言葉には使えない');
});

test('ことばの表にない並びははじく。extra_words（テストの固定語）の めつ は通る', async ({ page }) => {
  expect((await pick(page, ['ろ', 'ち'])).msg).toBe('ことばの表にない');
  expect((await pick(page, ['め', 'つ'])).msg).toBe('投げられる');
});

test('一度きり：投げた言葉は二度と投げられない（D-013）', async ({ page }) => {
  await pick(page, ['い', 'し', 'こ']);
  await setBasket(page, ['い', 'し', 'こ']);
  await tapTiles(page, [0, 1]);
  await press(page, '#aThrow');
  const after = await page.evaluate(() => ({ used: [...window.HB_TEST.S().used], log: window.HB_TEST.S().log.map(r => r.word) }));
  expect(after.used).toContain('いし');
  expect(after.log).toEqual(['いし']);
  const s = await pick(page, ['い', 'し']);
  expect(s.msg).toBe('もうリストに出た言葉（リストで光っている）');
  await press(page, '#aThrow');
  expect((await state(page)).mine).toBe('いし'); // 札は手元に残る
  expect(await page.evaluate(() => window.HB_TEST.S().log.length)).toBe(1);
});

test('向きの違う札（字にならない向き）がまじると投げられない', async ({ page }) => {
  await setBasket(page, ['は', 'し']);
  await tapTiles(page, [0]);
  await press(page, '#aRot'); // は を回すと字にならない
  expect((await state(page)).msg).toBe('向きが違う。まだ字になっていない');
  await tapTiles(page, [1]);
  expect((await state(page)).msg).toBe('向きの違う札がまじっている');
});

test('小さい字の言葉は大きい字で通る（ちよこ。D-043）', async ({ page }) => {
  expect((await pick(page, ['ち', 'よ', 'こ'])).msg).toBe('投げられる');
});

test('はじかれた並びは rejects に送る（テストでは止めて記録だけ。本物の表には書かない）', async ({ page }) => {
  await pick(page, ['ろ', 'ち']);
  const sent = await page.evaluate(() => window.__hbSent);
  expect(sent.filter(x => x.table === 'rejects').map(x => x.row.word)).toContain('ろち');
});
