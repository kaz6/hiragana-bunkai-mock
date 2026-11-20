// CPU：禁止用語（cpu-ng.js）を投げない（D-064）。ゆっくり・ふつう・つよい を短く回してエラーが出ない
const { test, expect } = require('@playwright/test');
const { openGame, startSolo, expectClean } = require('../helpers');

test.beforeEach(async ({ page }, info) => { info.ctx = await openGame(page); });
test.afterEach(async ({}, info) => expectClean(info.ctx));

const LEVELS = ['ゆるゆる', 'のんびり', 'ゆっくり', 'ふつう', 'つよい'];

for (const lv of LEVELS) {
  test(`${lv}：cpu-ng.js の語を投げない（その語しか作れないカゴでも）`, async ({ page }) => {
    await startSolo(page, lv);
    const r = await page.evaluate(() => {
      const T = window.HB_TEST, NG = window.HB_CPU_NG || [];
      const thrown = [];
      for (const w of NG) {
        for (let i = 0; i < 12; i++) {
          const S = T.S(); if (S.over || S.ending) T.newGame();
          const S2 = T.S(); S2.started = true; S2.used = new Set();
          S2.opp = [...w].map(c => T.mk(c === 'ー' ? '一' : c));
          S2.mine = Array.from({ length: 3 }, () => T.mk('よ'));
          const before = S2.log.length;
          T.cpuAct();
          T.S().log.slice(before).filter(x => x.who === 'op').forEach(x => thrown.push(x.word));
        }
      }
      return { ng: NG, thrown, bad: thrown.filter(x => !T.cpuOk(x)) };
    });
    expect(r.ng.length).toBeGreaterThan(0);
    expect(r.bad).toEqual([]);
  });
}

for (const lv of ['ゆっくり', 'ふつう', 'つよい']) {
  test(`${lv}：短く回してエラーが出ない（3戦×120手）`, async ({ page }, info) => {
    await startSolo(page, lv);
    const r = await page.evaluate(() => {
      const T = window.HB_TEST; let throws = 0, acts = 0, maxMs = 0;
      for (let g = 0; g < 3; g++) {
        T.newGame(); T.S().started = true;
        for (let i = 0; i < 120; i++) {
          const S = T.S(); if (S.over || S.ending) break;
          // 落ちてくる字（5秒待ち）の代わりに、2手ごとに袋から1こ足す。自分のカゴは負けないように減らす
          if (i % 2 === 0 && S.opp.length < 10) S.opp.push(T.mk(T.BAG[(g * 7 + i) % T.BAG.length]));
          if (S.mine.length > 8) S.mine.splice(0, S.mine.length - 4);
          const before = S.log.length, t = performance.now();
          T.cpuAct(); acts++;
          maxMs = Math.max(maxMs, performance.now() - t);
          throws += T.S().log.slice(before).filter(x => x.who === 'op').length;
        }
      }
      return { throws, acts, maxMs };
    });
    info.annotations.push({ type: 'cpu', description: JSON.stringify(r) });
    expect(r.acts).toBeGreaterThan(100);
    expect(r.throws).toBeGreaterThan(0);
  });
}
