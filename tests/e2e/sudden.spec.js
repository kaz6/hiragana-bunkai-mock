// サドンデス（HB-082, D-107）。一戦が始まって 300秒（rules.js の suddenAt）たつと、二人のカゴに「ふだん落ちてこない字」が1字ずつ落ちてくる。間は 6→5.5→…→2 秒
const { test, expect } = require('@playwright/test');
const { openGame, startSolo, setBasket, expectClean } = require('../helpers');

test.afterEach(async ({}, info) => expectClean(info.ctx));

const RARE13 = [...'ふとせりかてそんえらむおみ'];
const T = fn => (page, ...a) => page.evaluate(fn, ...a);

test.describe('ふつうの一戦', () => {
  test.beforeEach(async ({ page }, info) => { info.ctx = await openGame(page); await startSolo(page); });

  test('落ちる字の一覧は13字（KANA にあり、BAG に無く、濁音・半濁音でない字から作られる）', async ({ page }) => {
    const r = await page.evaluate(() => { const T = window.HB_TEST;
      const daku = c => /[゙゚]/.test(c.normalize('NFD'));
      return { rare: [...T.RARE], viaRules: [...T.KANA].filter(l => !T.BAG.includes(l) && !daku(l)) }; });
    expect([...r.rare].sort()).toEqual([...RARE13].sort());
    expect([...r.viaRules].sort()).toEqual([...r.rare].sort());
  });

  test('時刻：300秒に1字め、あとの間は 6→5.5→5→…→2 で止まる（rules.js の既定の数）', async ({ page }) => {
    const r = await page.evaluate(() => { const T = window.HB_TEST; const w = Array.from({ length: 14 }, (_, n) => T.suddenWhen(n));
      return { cfg: T.SUDDEN, w, gaps: w.slice(1).map((x, i) => +(x - w[i]).toFixed(3)) }; });
    expect(r.cfg).toEqual({ at: 300, every: 6, step: 0.5, min: 2 });
    expect(r.w[0]).toBe(300);
    expect(r.gaps).toEqual([6, 5.5, 5, 4.5, 4, 3.5, 3, 2.5, 2, 2, 2, 2, 2]);
  });

  test('300秒より前は落ちない。過ぎると二人に同じ字が落ちる（一覧の字）。そのあとも続く', async ({ page }) => {
    const before = await page.evaluate(() => { const T = window.HB_TEST, S = T.S(); return { m: S.mine.length, o: S.opp.length }; });
    await page.evaluate(() => window.HB_TEST.suddenSkip(299));
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.HB_TEST.suddenCount())).toBe(0);
    expect(await page.evaluate(() => { const S = window.HB_TEST.S(); return [S.mine.length, S.opp.length]; })).toEqual([before.m, before.o]);
    await page.evaluate(() => window.HB_TEST.suddenSkip(1)); // ちょうど 300秒
    await page.waitForFunction(() => window.HB_TEST.suddenCount() === 1);
    const r = await page.evaluate(() => { const T = window.HB_TEST, S = T.S(); const a = T.letterOf(S.mine[S.mine.length - 1]), b = T.letterOf(S.opp[S.opp.length - 1]);
      return { a, b, m: S.mine.length, o: S.opp.length, rare: T.RARE.includes(a), log: T.logText() }; });
    expect(r.a).toBe(r.b);
    expect(r.rare).toBe(true);
    expect(r.m).toBe(before.m + 1); expect(r.o).toBe(before.o + 1);
    expect(r.log).toContain('サドンデス');
    await page.evaluate(() => window.HB_TEST.suddenSkip(6)); // 2字めの時刻（300+6）
    await page.waitForFunction(() => window.HB_TEST.suddenCount() === 2);
  });

  test('上限14で落ちて15になると負け（カゴの上限の扱いは変えない）', async ({ page }) => {
    await setBasket(page, Array.from({ length: 14 }, () => 'よ'));
    await page.evaluate(() => window.HB_TEST.suddenSkip(300));
    await expect(page.locator('#resBig')).toContainText('カゴがあふれた。負け');
    expect(await page.evaluate(() => window.HB_TEST.S().over)).toBe('lose');
  });

  test('14こ（ちょうど）まではまだ負けない', async ({ page }) => {
    await setBasket(page, Array.from({ length: 13 }, () => 'よ'));
    await page.evaluate(() => window.HB_TEST.suddenSkip(300));
    await page.waitForFunction(() => window.HB_TEST.suddenCount() === 1);
    const s = await page.evaluate(() => { const S = window.HB_TEST.S(); return { n: S.mine.length, over: S.over || S.ending }; });
    expect(s.n).toBe(14); expect(s.over).toBeFalsy();
  });

  test('相手（CPU）のカゴが上限をこえたら勝ち', async ({ page }) => {
    await page.evaluate(() => { const T = window.HB_TEST; T.S().opp = Array.from({ length: 14 }, () => T.mk('よ')); T.render(); });
    await page.evaluate(() => window.HB_TEST.suddenSkip(300));
    await expect(page.locator('#resBig')).toContainText('相手のカゴがあふれた。勝ち');
  });

  test('負けが決まったあとは落ちない', async ({ page }) => {
    await setBasket(page, Array.from({ length: 14 }, () => 'よ'));
    await page.evaluate(() => window.HB_TEST.suddenSkip(300));
    await expect(page.locator('#resBig')).toContainText('負け');
    const n = await page.evaluate(() => window.HB_TEST.suddenCount());
    await page.evaluate(() => window.HB_TEST.suddenSkip(20));
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.HB_TEST.suddenCount())).toBe(n);
  });

  test('ふたりで：自分のカゴにだけ落とす。字は matchId から決まり、二人の画面で同じ並びになる', async ({ page }) => {
    const r = await page.evaluate(async () => { const T = window.HB_TEST;
      T.NET.mode = 'online'; T.NET.matchId = 'room1-abc'; T.newGame();
      const S = T.S(), o0 = S.opp.length, m0 = S.mine.length; T.suddenSkip(300);
      await new Promise(r => setTimeout(r, 100));
      const S2 = T.S(); return { m: S2.mine.length - m0, o: S2.opp.length - o0, ch: T.letterOf(S2.mine[S2.mine.length - 1]), want: T.suddenChars('room1-abc', 1)[0],
        a: T.suddenChars('room1-abc', 12).join(''), b: T.suddenChars('room1-abc', 12).join(''), c: T.suddenChars('room2-xyz', 12).join('') }; });
    expect(r.m).toBe(1); expect(r.o).toBe(0);
    expect(r.ch).toBe(r.want);
    expect(r.a).toBe(r.b);       // 同じ matchId なら同じ並び（二人の画面で同じ）
    expect(r.a).not.toBe(r.c);   // 部屋がちがえば別の並び
  });
});

test('メニューが出ている間（ページを開いたとき・退室したあと）は、裏の一戦に落ちない', async ({ page }, info) => {
  info.ctx = await openGame(page);
  await page.evaluate(() => window.HB_TEST.suddenSkip(400)); // 開いたままのメニューの裏
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.HB_TEST.suddenCount())).toBe(0);
  await startSolo(page);
  await page.evaluate(() => { window.HB_TEST.leaveOnline(); window.HB_TEST.suddenSkip(400); }); // 退室でメニューに戻る
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.HB_TEST.suddenCount())).toBe(0);
});

test('チュートリアルの一戦では落ちない', async ({ page }, info) => {
  info.ctx = await openGame(page, { tutorial: true });
  await startSolo(page);
  expect(await page.evaluate(() => window.HB_TEST.TUT.on)).toBe(true);
  await page.evaluate(() => window.HB_TEST.suddenSkip(400));
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.HB_TEST.suddenCount())).toBe(0);
});

test('rules.js の数を変えて開くと、その数で動く（始まり 0.3秒・最初の間 0.2秒・縮み 0.05秒・最短 0.1秒）', async ({ page }, info) => {
  info.ctx = await openGame(page, { rulesJs: 'window.HB_RULES={ cap:14, suddenAt:0.3, suddenEvery:0.2, suddenStep:0.05, suddenMin:0.1 };' });
  await startSolo(page);
  const cfg = await page.evaluate(() => ({ c: window.HB_TEST.SUDDEN, w: [0, 1, 2, 3, 4].map(n => +window.HB_TEST.suddenWhen(n).toFixed(3)) }));
  expect(cfg.c).toEqual({ at: 0.3, every: 0.2, step: 0.05, min: 0.1 });
  expect(cfg.w).toEqual([0.3, 0.5, 0.65, 0.75, 0.85]);
  await page.waitForFunction(() => window.HB_TEST.suddenCount() >= 3, null, { timeout: 5000 }); // 本物の時計で落ちていく
});

test('rules.js が読めない・数でないときは既定の数（300・6・0.5・2）', async ({ page }, info) => {
  info.ctx = await openGame(page, { rulesJs: 'window.HB_RULES={ cap:14, suddenAt:"はやく", suddenEvery:-1, suddenStep:null, suddenMin:0 };' });
  expect(await page.evaluate(() => window.HB_TEST.SUDDEN)).toEqual({ at: 300, every: 6, step: 0.5, min: 2 });
});
