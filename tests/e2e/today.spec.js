// 今日の字（HB-038, D-073）。一戦ごとに袋の配合を変える：多め2〜3字が＋2枚、少なめ1〜2字が1枚、ほかはいまのまま
const { test, expect } = require('@playwright/test');
const { openGame, startSolo, expectClean } = require('../helpers');

test.beforeEach(async ({ page }, info) => { info.ctx = await openGame(page); await startSolo(page); });
test.afterEach(async ({}, info) => expectClean(info.ctx));

test('多めが＋2・少なめが1枚・ほかはいまのまま。作るしかない字は入らない', async ({ page }) => {
  const r = await page.evaluate(() => {
    const T = window.HB_TEST, bad = [];
    const count = a => a.reduce((m, l) => (m[l] = (m[l] || 0) + 1, m), {});
    const base = count(T.BAG);
    for (let i = 0; i < 200; i++) {
      const t = T.makeToday(), c = count(t.bag);
      if (t.more.length < 2 || t.more.length > 3 || t.less.length < 1 || t.less.length > 2) bad.push('数 ' + t.more + '/' + t.less);
      t.more.forEach(l => { if (c[l] !== base[l] + 2) bad.push('多め ' + l); });
      t.less.forEach(l => { if (c[l] !== 1 || base[l] < 2) bad.push('少なめ ' + l); });
      Object.keys(base).filter(l => !t.more.includes(l) && !t.less.includes(l)).forEach(l => { if (c[l] !== base[l]) bad.push('ほか ' + l); });
      ['ふ', 'と', 'せ', 'ば', 'ぱ'].forEach(l => { if (c[l]) bad.push('入った ' + l); });
    }
    return bad;
  });
  expect(r).toEqual([]);
});

test('同じ種（matchId）なら同じ今日の字。ひとりでは戦ごとに決まる', async ({ page }) => {
  const r = await page.evaluate(() => {
    const T = window.HB_TEST;
    const a = T.makeToday(T.seedRng('today-x1')), b = T.makeToday(T.seedRng('today-x1'));
    const diff = new Set(Array.from({ length: 30 }, (_, i) => T.makeToday(T.seedRng('today-m' + i)).more.join('')));
    T.newGame(); const t1 = T.TODAY();
    return { same: JSON.stringify(a) === JSON.stringify(b), varied: diff.size > 5, bagIsToday: t1.bag.length > 0 };
  });
  expect(r.same).toBe(true); expect(r.varied).toBe(true);
});

test('はじめの手・CPU・落ちてくる字は、その戦の袋から引く', async ({ page }) => {
  const r = await page.evaluate(() => {
    const T = window.HB_TEST; T.newGame(); const t = T.TODAY(), S = T.S(); const inBag = new Set(t.bag);
    const hands = [...S.mine, ...S.opp].map(p => p.orig).filter(l => l !== '｜');
    return { ok: hands.every(l => inBag.has(l)), n: hands.length };
  });
  expect(r.ok).toBe(true); expect(r.n).toBe(8);
});

test('画面に今日の字が出て、ログの頭にも書かれる', async ({ page }) => {
  const t = await page.locator('#today').innerText();
  expect(t).toMatch(/今日の字\s+多め：.+\s+少なめ：.+/);
  const log = await page.evaluate(() => window.HB_TEST.logText());
  expect(log).toMatch(/今日の字 多め:.+ 少なめ:.+/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
