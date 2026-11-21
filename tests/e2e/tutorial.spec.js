// 最初の一戦のチュートリアル（HB-059, D-092）：したく が届く → た を割る → し を回す → ⊂ を裏返す → つ＋十→ち → ちこく を投げる → 空になって濁音が1つ落ちる
const { test, expect } = require('@playwright/test');
const { openGame, expectClean } = require('../helpers');

test.afterEach(async ({}, info) => expectClean(info.ctx));
const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

// 自分のカゴの字（札の並び）
const basket = page => page.evaluate(() => { const T = window.HB_TEST; return T.S().mine.map(T.letterOf).join(''); });
// 字 l の札をタップ（tapTile を直に呼ぶ。札のボタンの click と同じ。ほかの札・ボタンが効かないことは、この関数が選ばせないことで確かめる）
const tapLetter = (page, l) => page.evaluate(l => { const T = window.HB_TEST, S = T.S(); const p = S.mine.find(q => !S.sel.includes(q.id) && T.letterOf(q) === l); return !!p && (T.tapTile(p.id), true); }, l);
const step = page => page.evaluate(() => window.HB_TEST.TUT.step);
const glow = page => page.evaluate(() => ({ tile: [...document.querySelectorAll('#basket .tile.tutGlow')].length, btn: [...document.querySelectorAll('.act.tutGlow')].map(b => b.id) }));
const enabled = page => page.evaluate(() => ['aSplit', 'aRot', 'aFlip', 'aMerge', 'aThrow'].filter(id => !document.getElementById(id).disabled));
async function toSplit(page) { await page.click('#btnSolo'); await page.click('.lv[data-n="ふつう"]'); await page.waitForFunction(() => window.HB_TEST.TUT.step === 'split'); }

test('はじめての「ひとりで」でチュートリアル。カゴは空から、したく が届く。字は落ちてこない', async ({ page }, info) => {
  info.ctx = await openGame(page, { tutorial: true });
  await page.click('#btnSolo'); await page.click('.lv[data-n="ふつう"]');
  await page.waitForFunction(() => window.HB_TEST.TUT.on);
  await page.waitForFunction(() => window.HB_TEST.TUT.step === 'split');
  expect(await basket(page)).toBe('したく');
  expect(await page.evaluate(() => window.HB_TEST.S().opp.length)).toBe(0);
  await expect(page.locator('#tutBox')).toBeVisible();
  await expect(page.locator('#tutBox')).toContainText('相手から「したく」が届いた');
  await expect(page.locator('#tutBox')).toContainText('た を選んで【割る】');
  await expect(page.locator('#today')).toBeHidden();
  expect(await noOverflow(page)).toBe(true);
  // 5秒以上待っても落ちてこない・CPU も動かない（待ちを短くして見る：REFILL は 5秒なので、時間を進めて確かめる）
  await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
  expect(await basket(page)).toBe('したく');
});

test('決まった手順で最後まで進み、カゴが空になって濁音が1つ落ちる。途中で札・ボタンは決まった分だけ押せる', async ({ page }, info) => {
  info.ctx = await openGame(page, { tutorial: true });
  await toSplit(page);
  const T = (fn, ...a) => page.evaluate(fn, ...a);
  // 割る：た だけ選べる。ほかの札・ボタンは効かない
  expect(await enabled(page)).toEqual([]);
  expect(await glow(page)).toEqual({ tile: 1, btn: [] });
  await tapLetter(page, 'し'); await tapLetter(page, 'く');
  expect(await T(() => window.HB_TEST.S().sel.length)).toBe(0);
  await tapLetter(page, 'た');
  expect(await enabled(page)).toEqual(['aSplit']);
  expect(await glow(page)).toEqual({ tile: 0, btn: ['aSplit'] });
  await page.click('#aSplit'); await page.waitForFunction(() => window.HB_TEST.TUT.step === 'turn');
  expect((await basket(page)).split('').sort().join('')).toBe(['し', 'く', '十', 'こ'].sort().join(''));
  // 回す：し
  await tapLetter(page, 'こ'); expect(await T(() => window.HB_TEST.S().sel.length)).toBe(0);
  await tapLetter(page, 'し'); expect(await enabled(page)).toEqual(['aRot']);
  await page.click('#aRot'); await page.waitForFunction(() => window.HB_TEST.TUT.step === 'flip');
  expect(await basket(page)).toContain('⊂');
  // 裏返す：⊂（選びは残っている）
  expect(await enabled(page)).toEqual(['aFlip']);
  await page.click('#aFlip'); await page.waitForFunction(() => window.HB_TEST.TUT.step === 'merge');
  expect(await basket(page)).toContain('つ');
  // くっつける：つ（選び済み）と 十
  expect(await enabled(page)).toEqual([]);
  await tapLetter(page, 'こ'); expect(await T(() => window.HB_TEST.S().sel.length)).toBe(1);
  await tapLetter(page, '十'); expect(await enabled(page)).toEqual(['aMerge']);
  await page.click('#aMerge'); await page.waitForFunction(() => window.HB_TEST.TUT.step === 'throw');
  expect((await basket(page)).split('').sort().join('')).toBe(['ち', 'こ', 'く'].sort().join(''));
  // 投げる：ち（選び済み）・こ・く の順
  await tapLetter(page, 'く'); expect(await T(() => window.HB_TEST.S().sel.length)).toBe(1);
  await tapLetter(page, 'こ'); await tapLetter(page, 'く');
  expect(await enabled(page)).toEqual(['aThrow']);
  await page.click('#aThrow'); await page.waitForFunction(() => window.HB_TEST.TUT.step === 'end');
  // カゴが空になり、濁音が1つだけ落ちてくる
  const after = await basket(page);
  expect(after.length).toBe(1);
  expect(await T(() => window.HB_TEST.S().mine.every(p => /[゙]/.test(window.HB_TEST.letterOf(p).normalize('NFD')) ))).toBe(true);
  await page.waitForTimeout(300);
  expect((await basket(page)).length).toBe(1);
  await expect(page.locator('#tutBox')).toContainText('カゴが空になると、濁音が落ちてくる');
  await expect(page.locator('#tutBox .tutGo')).toHaveText('ひとりで遊ぶ');
  expect(await enabled(page)).toEqual([]);
  // 済んだ印・案内も済み。★・辞書の記録・rejects に入っていない
  expect(await T(() => localStorage.getItem('hb.tutorial'))).toBe('done');
  expect(await T(() => localStorage.getItem('hb.guide'))).toBe('done');
  expect(await T(() => JSON.parse(localStorage.getItem('hb.zukan') || '{"words":{}}').words['ちこく'])).toBeUndefined();
  expect(await T(() => window.__hbSent.filter(x => x.table === 'rejects').length)).toBe(0);
  expect(await noOverflow(page)).toBe(true);
  // 「ひとりで遊ぶ」でふつうの一戦（チュートリアルではない）
  await page.click('#tutBox .tutGo');
  expect(await T(() => window.HB_TEST.TUT.on)).toBe(false);
  expect(await T(() => window.HB_TEST.S().mine.length)).toBe(5);
  await expect(page.locator('#tutBox')).toBeHidden();
});

test('チュートリアルの間、CPU は動かず、落ちてくる字は止まる（時間を進める）', async ({ page }, info) => {
  info.ctx = await openGame(page, { tutorial: true });
  await page.clock.install();
  await toSplit(page);
  await page.evaluate(() => { const T = window.HB_TEST; T.setSpeed(T.SPEEDS.findIndex(x => x.name === 'のんびり')); });
  await page.clock.runFor(60_000);
  expect(await basket(page)).toBe('したく');
  expect(await page.evaluate(() => window.HB_TEST.S().opp.length)).toBe(0);
});

test('済んだら次の「ひとりで」はふつうの一戦。しくみの「もう一度」で入口から', async ({ page }, info) => {
  info.ctx = await openGame(page);                       // 済んだ状態
  await page.click('#btnSolo'); await page.click('.lv[data-n="ふつう"]');
  expect(await page.evaluate(() => window.HB_TEST.TUT.on)).toBe(false);
  expect(await page.evaluate(() => window.HB_TEST.S().mine.length)).toBe(5);
  await page.click('#btnHelp');
  await expect(page.locator('#btnTutAgain')).toBeVisible();
  await page.click('#btnTutAgain');
  await expect(page.locator('#sheet')).toBeHidden();
  await page.waitForFunction(() => window.HB_TEST.TUT.step === 'split');
  expect(await basket(page)).toBe('したく');
  // やりなおしはチュートリアルをはじめから
  await tapLetter(page, 'た'); await page.click('#aSplit'); await page.waitForFunction(() => window.HB_TEST.TUT.step === 'turn');
  await page.click('#btnReset');
  await page.waitForFunction(() => window.HB_TEST.TUT.step === 'split');
  expect(await basket(page)).toBe('したく');
});

test('ふつうの newGame() はチュートリアルにならない（入口は ひとりで の startSolo だけ。ふたりでは newGame()）', async ({ page }, info) => {
  info.ctx = await openGame(page, { tutorial: true });
  await page.evaluate(() => { const T = window.HB_TEST; T.NET.mode = 'online'; T.newGame(); });
  expect(await page.evaluate(() => window.HB_TEST.TUT.on)).toBe(false);
});

for (const [locale, key, pat] of [['ja-JP', 'ja', /た を選んで【割る】/], ['en-US', 'en', /Pick た and tap \[Split\]/], ['ko-KR', 'ko', /た를 고르고 \[쪼개기\]를 눌러요/]]) {
  test.describe(`${locale}：一言がその言葉で出る。390px ではみ出さない`, () => {
    test.use({ locale });
    test(`${key}`, async ({ page }, info) => {
      info.ctx = await openGame(page, { tutorial: true });
      await toSplit(page);
      await expect(page.locator('#tutBox')).toContainText(pat);
      if (key === 'ja') expect(await page.locator('#tutBox').innerText()).not.toMatch(/Pick|arrived/);
      else expect(await page.locator('#tutBox').innerText()).not.toMatch(/た を選んで/);
      expect(await noOverflow(page)).toBe(true);
      const r = await page.locator('#tutBox').boundingBox(); expect(r.x).toBeGreaterThanOrEqual(0); expect(r.x + r.width).toBeLessThanOrEqual(390);
    });
  });
}
