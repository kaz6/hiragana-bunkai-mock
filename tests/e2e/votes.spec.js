// 結果の画面の「やりとり」の候補といい／いまいち（HB-047, D-081）
const { test, expect } = require('@playwright/test');
const { openGame, startSolo, expectClean } = require('../helpers');

test.afterEach(async ({}, info) => expectClean(info.ctx));

const cands = (page, pairs) => page.evaluate(ps => window.HB_TEST.exchangeCands(ps.map(([who, word]) => ({ who, word }))), pairs);

test('候補：3字以上を並びのまま含む組だけ。いちもうさく→にもうさく はなる', async ({ page }, info) => {
  info.ctx = await openGame(page);
  let c = await cands(page, [['op', 'いちもうさく'], ['me', 'にもうさく']]);
  expect(c.map(x => [x.prev, x.reply, x.who])).toEqual([['いちもうさく', 'にもうさく', 'me']]);
  expect(await cands(page, [['op', 'けいつい'], ['me', 'いつけい']])).toEqual([]);   // 2字ずつ同じでも並びで3字ではない
  expect(await cands(page, [['op', 'あいうえ'], ['me', 'おいうか']])).toEqual([]);   // 2字だけ同じ
  expect(await cands(page, [['op', 'ほしよう'], ['me', 'ほしよう']])).toEqual([]);   // 同じ言葉どうし
  expect((await cands(page, [['op', 'あーいう'], ['me', 'さーいう']])).length).toBe(1); // ー も1字
  expect(await cands(page, [['me', 'いちもうさく'], ['me', 'にもうさく']])).toEqual([]); // 直前の相手の言葉がない
  c = await cands(page, [['op', 'いちもうさく'], ['me', 'にもうさく'], ['op', 'さにもうさくら']]); // 相手の返しも候補
  expect(c.map(x => x.who)).toEqual(['op', 'me']);   // 長い順（7字→5字）
});

test('候補は最大3組。0組なら何も出ない。出すのは結果の画面だけ', async ({ page }, info) => {
  info.ctx = await openGame(page);
  await startSolo(page);
  await page.evaluate(() => { const S = window.HB_TEST.S(); S.log = [{ who: 'op', word: 'あいうえお' }, { who: 'me', word: 'かいうえお' }, { who: 'op', word: 'かいうえおき' }, { who: 'me', word: 'さいうえおき' }, { who: 'op', word: 'さいうえおきく' }]; });
  await expect(page.locator('#resVotes')).toBeHidden();
  await page.evaluate(() => { const T = window.HB_TEST; T.S().over = 'win'; T.render(); });
  await expect(page.locator('#resVotes .ex')).toHaveCount(3);
  await page.evaluate(() => { const T = window.HB_TEST, S = T.S(); S.cands = null; S.votes = null; S.log = [{ who: 'op', word: 'あいう' }, { who: 'me', word: 'かきく' }]; T.render(); });
  await expect(page.locator('#resVotes')).toBeHidden();
});

test('いい を押すと insert が1回、中身が合う。2回押しても1回。押したあとは押せない', async ({ page }, info) => {
  info.ctx = await openGame(page);
  await startSolo(page);
  await page.evaluate(() => { const T = window.HB_TEST, S = T.S(); S.log = [{ who: 'op', word: 'ほしよう' }, { who: 'me', word: 'ぶしよう' }]; S.over = 'win'; T.render(); });
  const ex = page.locator('#resVotes .ex');
  await expect(ex).toHaveCount(1);
  await expect(ex).toContainText('ほしょう → ぶしょう');
  await ex.locator('button[data-v="good"]').click();
  await ex.locator('button[data-v="meh"]').click({ force: true }).catch(() => {}); // もう押せない
  await ex.locator('button[data-v="good"]').click({ force: true }).catch(() => {});
  const sent = await page.evaluate(() => window.__hbSent.filter(x => x.table === 'exchange_votes'));
  expect(sent).toEqual([{ table: 'exchange_votes', row: { prev_word: 'ほしょう', reply_word: 'ぶしょう', who: 'me', vote: 'good', mode: 'cpu' } }]);
  await expect(ex.locator('button[data-v="meh"]')).toBeDisabled();
  await expect(ex.locator('button[data-v="good"]')).toHaveAttribute('aria-pressed', 'true');
});

test('結果の画面が390pxではみ出さない。★・カゴの数は変わらない', async ({ page }, info) => {
  info.ctx = await openGame(page);
  await startSolo(page);
  const before = await page.evaluate(() => window.HB_TEST.S().mine.length);
  await page.evaluate(() => { const T = window.HB_TEST, S = T.S(); S.log = [{ who: 'op', word: 'ほしようびょういん', k: 0 }, { who: 'me', word: 'ぶしようびょういんか', k: 2 }]; S.over = 'win'; T.render(); });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.evaluate(() => window.HB_TEST.S().mine.length)).toBe(before);
  await page.screenshot({ path: 'docs/reports/img/hb-047-votes-390.png', fullPage: true });
});
