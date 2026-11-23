// 画面の文に入る上限の数（HB-068）。rules.js の cap から日本語・English・한국어 の文に入る。12 は残らない
const { test, expect } = require('@playwright/test');
const { openGame, startSolo, expectClean } = require('../helpers');

test.afterEach(async ({}, info) => expectClean(info.ctx));

// 上限の数が入る場所：遊び方の3行（rulesHow）・最初の案内の最初のカード（#guide）・案内の3つめ・遊び方の「きまり」・カゴの線（#rim）
const texts = (page) => page.evaluate(() => {
  const T = window.HB_TEST;
  T.guideShow(3);
  const g3 = document.getElementById('guide').textContent;
  return {
    how: document.getElementById('rulesHow').textContent,
    g3,
    guideJa: T.GUIDE_TEXT[3], guideEn: T.GUIDE_EN[3],
    note: document.getElementById('capNote').parentElement.textContent,
    rim: document.getElementById('rim').textContent,
  };
});

for (const [locale, rx] of [['ja-JP', /相手のカゴが(\d+)こをこえたら勝ち/], ['en-US', /Their basket goes over (\d+):/], ['ko-KR', /상대 바구니가 (\d+)개를 넘으면 승리/]]) {
  test.describe(`${locale}：上限の数が文に入る`, () => {
    test.use({ locale });
    test('いまの上限（14）：14 が出て 12 が出ない', async ({ page }, info) => {
      info.ctx = await openGame(page, { guide: true });
      await startSolo(page, 'ゆるゆる');
      const t = await texts(page);
      const cap = await page.evaluate(() => window.HB_TEST.CAP);
      expect(cap).toBe(14);
      expect(t.how).toMatch(rx); expect(t.how.match(rx)[1]).toBe('14');
      expect(t.guideJa).toContain('14こ'); expect(t.guideEn).toContain('Over 14 in theirs');
      expect(t.note).toContain('14こ のときは割れない');
      expect(t.rim).toContain('14');
      expect(t.g3).toContain('14');
      for (const s of [t.how, t.g3, t.guideJa, t.guideEn, t.note, t.rim]) expect(s).not.toMatch(/(^|\D)12(\D|$)/);
    });
    test('rules.js の cap を 9 にして開くと、全部の文が 9 になる', async ({ page }, info) => {
      info.ctx = await openGame(page, { guide: true, rulesJs: 'window.HB_RULES={ cap:9 };' });
      await startSolo(page, 'ゆるゆる');
      const t = await texts(page);
      expect(await page.evaluate(() => window.HB_TEST.CAP)).toBe(9);
      expect(t.how.match(rx)[1]).toBe('9');
      expect(t.g3).toMatch(/9/); expect(t.g3).not.toMatch(/14/);
      expect(t.guideJa).toContain('9こ'); expect(t.guideEn).toContain('Over 9 in theirs');
      expect(t.note).toContain('9こ のときは割れない');
      expect(t.rim).toContain('9');
      for (const s of [t.how, t.g3, t.guideJa, t.guideEn, t.note, t.rim]) expect(s).not.toMatch(/14/);
    });
  });
}
