// 今日の字の「レア」（HB-083, D-108）。一戦の始めに「ふだん落ちてこない字」（HB-082 の13字）から1字と、どちらの最初の手に入れるか（二人のどちらか）を選ぶ。
// 当たった側の最初の手は袋から引く4枚のうち1枚がレアの字（5枚・｜1枚のまま）。外れた側はいまのまま。袋には足さない。チュートリアルでは出さない
const { test, expect } = require('@playwright/test');
const { openGame, startSolo, expectClean } = require('../helpers');

test.afterEach(async ({}, info) => expectClean(info.ctx));
const RARE13 = [...'ふとせりかてそんえらむおみ'];
const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

test.describe('ひとりで', () => {
  test.beforeEach(async ({ page }, info) => { info.ctx = await openGame(page); await startSolo(page); });

  test('レアの字は13字の一覧のどれか。選び方は同じ種なら同じ字・同じ側。選び直すと変わる', async ({ page }) => {
    const r = await page.evaluate(() => { const T = window.HB_TEST;
      const a = T.makeRare(T.seedRng('rare-x1'), 0), b = T.makeRare(T.seedRng('rare-x1'), 0), c = T.makeRare(T.seedRng('rare-x1'), 1);
      const many = Array.from({ length: 300 }, (_, i) => T.makeRare(T.seedRng('rare-m' + i), 0));
      return { a, b, c, letters: [...new Set(many.map(x => x.letter))], toMe: many.filter(x => x.toMe).length, rare: [...T.RARE] }; });
    expect(r.a).toEqual(r.b);
    expect(r.c.letter).toBe(r.a.letter);
    expect(r.c.toMe).toBe(!r.a.toMe); // 同じ種でも、在室の並びの 0 番目と 1 番目の人では、当たりが逆（ちょうど片方だけ当たる）
    expect([...r.rare].sort()).toEqual([...RARE13].sort());
    for (const l of r.letters) expect(RARE13).toContain(l);
    expect(r.letters.length).toBeGreaterThan(8); // 一覧の中でばらける
    expect(r.toMe).toBeGreaterThan(90); expect(r.toMe).toBeLessThan(210); // 自分／相手がほぼ半々
  });

  test('当たった側の最初の手にレアの字がちょうど1枚。外れた側には無い。どちらも5枚で｜が1枚。袋には足さない', async ({ page }) => {
    const r = await page.evaluate(() => { const T = window.HB_TEST, out = { me: 0, op: 0, bad: [] };
      for (let i = 0; i < 200; i++) { T.newGame(); const S = T.S(), R = T.RARE_TODAY(), t = T.TODAY();
        const letters = ps => ps.map(p => p.orig), cnt = (ps, l) => letters(ps).filter(x => x === l).length;
        const hit = R.toMe ? S.mine : S.opp, miss = R.toMe ? S.opp : S.mine; R.toMe ? out.me++ : out.op++;
        if (S.mine.length !== 5 || S.opp.length !== 5) out.bad.push('枚数');
        if (cnt(S.mine, '｜') !== 1 || cnt(S.opp, '｜') !== 1) out.bad.push('｜');
        if (cnt(hit, R.letter) !== 1) out.bad.push('当たり側のレア');
        if (cnt(miss, R.letter) !== 0) out.bad.push('外れ側のレア');
        if (miss.some(p => p.orig !== '｜' && !t.bag.includes(p.orig))) out.bad.push('外れ側が袋の外');
        if (hit.filter(p => p.orig !== '｜' && !t.bag.includes(p.orig)).length !== 1) out.bad.push('当たり側の袋の外が1枚でない');
        if (t.bag.includes(R.letter)) out.bad.push('袋に入っている'); }
      return out; });
    expect(r.bad).toEqual([]); expect(r.me).toBeGreaterThan(60); expect(r.op).toBeGreaterThan(60);
  });

  test('今日の字の行の終わりに「　レア：字」。ログの頭の行・「今日の字」の行にも。誰に入ったかは書かない。390px ではみ出さない', async ({ page }) => {
    const R = await page.evaluate(() => window.HB_TEST.RARE_TODAY());
    await expect(page.locator('#today')).toContainText(`今日の字　多め：`);
    const t = await page.locator('#today').innerText();
    expect(t).toMatch(new RegExp(`今日の字\\s+多め：.+\\s+少なめ：.+\\s+レア：${R.letter}`));
    expect(t).not.toMatch(/あなた|あいて|自分|相手/);
    const log = await page.evaluate(() => window.HB_TEST.logText());
    expect(log).toContain(` レア:${R.letter}　`);
    expect(await page.evaluate(() => document.getElementById('today').scrollWidth <= document.getElementById('today').clientWidth + 1)).toBe(true);
    expect(await noOverflow(page)).toBe(true);
  });

  test('CPU（相手）の手にレアが入る一戦がある。CPU の選び方（cpu.js 側）には手を入れていない', async ({ page }) => {
    const r = await page.evaluate(() => { const T = window.HB_TEST; let n = 0, ok = true;
      for (let i = 0; i < 100; i++) { T.newGame(); const R = T.RARE_TODAY(); if (R.toMe) continue; n++; const S = T.S(); ok = ok && S.opp.some(p => p.orig === R.letter); }
      return { n, ok }; });
    expect(r.n).toBeGreaterThan(20); expect(r.ok).toBe(true);
  });
});

test.describe('チュートリアル', () => {
  test('チュートリアルの一戦ではレアは出ない（今日の字の行も隠れている）', async ({ page }, info) => {
    info.ctx = await openGame(page); await startSolo(page);
    const r = await page.evaluate(() => { const T = window.HB_TEST; T.newGame(true); return { R: T.RARE_TODAY(), hidden: document.getElementById('today').hidden, mine: T.S().mine.length }; });
    expect(r.R).toBeNull(); expect(r.hidden).toBe(true); expect(r.mine).toBe(0);
    expect(await page.evaluate(() => window.HB_TEST.logText())).not.toContain('レア');
  });
});

test.describe('ふたりで（在室の並びで「どちらか」をそろえる）', () => {
  async function online(page, me, matchId) {
    return page.evaluate(([me, matchId]) => {
      const T = window.HB_TEST, N = T.NET, c = window.supabase.createClient();
      window.__hbPresence = { a: [{}], b: [{}] };
      N.client = c; N.playerId = me; N.roomKey = 'rk'; N.lobby = c.channel('hb-lobby-rk'); N.match = c.channel('hb-match-' + matchId);
      N.mode = 'online'; N.matchId = matchId; N.starting = true; N.cap = 14; N.partnerGone = false; N.cd = 0; N.again = { me: false, op: false };
      document.getElementById('menu').hidden = true; T.newGame(); const R = T.RARE_TODAY(), S = T.S();
      return { R, mine: S.mine.map(p => p.orig), today: document.getElementById('today').innerText }; }, [me, matchId]);
  }
  test('同じ matchId なら、二人の画面で同じ字。当たるのはちょうどどちらか1人。当たった側の手にだけレアがある', async ({ page }, info) => {
    info.ctx = await openGame(page);
    let both = 0;
    for (let i = 0; i < 30; i++) { const m = 'rk-m' + i;
      const a = await online(page, 'a', m), b = await online(page, 'b', m);
      expect(a.R.letter).toBe(b.R.letter); expect(a.R.toMe).toBe(!b.R.toMe);
      expect(a.mine.includes(a.R.letter)).toBe(a.R.toMe); expect(b.mine.includes(b.R.letter)).toBe(b.R.toMe);
      expect(a.today).toContain('レア：' + a.R.letter); expect(a.today).toBe(b.today);
      if (a.R.toMe) both++; }
    expect(both).toBeGreaterThan(5); expect(both).toBeLessThan(25); // 先頭の人にも後ろの人にも当たる
  });
  test('在室の並びが読めないとき（自分の playerId が在室に無い）は、レアを出さない（二人でそろえられないため）', async ({ page }, info) => {
    info.ctx = await openGame(page);
    const r = await online(page, 'zzz', 'rk-m1');
    expect(r.R).toBeNull(); expect(r.today).not.toContain('レア');
  });
});

test.describe('English / 한국어', () => {
  test.describe('English', () => {
    test.use({ locale: 'en-US' });
    test('今日の字の行に rare とその字。390px ではみ出さない', async ({ page }, info) => {
      info.ctx = await openGame(page); await startSolo(page);
      const R = await page.evaluate(() => window.HB_TEST.RARE_TODAY());
      expect((await page.locator('#today').innerText()).replace(/\s+/g, ' ')).toContain('rare ' + R.letter);
      expect(await noOverflow(page)).toBe(true);
    });
  });
  test.describe('한국어', () => {
    test.use({ locale: 'ko-KR' });
    test('今日の字の行に 레어: とその字。390px ではみ出さない', async ({ page }, info) => {
      info.ctx = await openGame(page); await startSolo(page);
      const R = await page.evaluate(() => window.HB_TEST.RARE_TODAY());
      expect((await page.locator('#today').innerText()).replace(/\s+/g, ' ')).toContain('레어: ' + R.letter);
      expect(await noOverflow(page)).toBe(true);
    });
  });
});
