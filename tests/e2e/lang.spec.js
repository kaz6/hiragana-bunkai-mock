// 画面の言葉：日本語／English／한국어（HB-057, D-091）。はじめは端末の言語。ボタンで切り替え、端末に覚える
const { test, expect } = require('@playwright/test');
const { openGame, startSolo, expectClean } = require('../helpers');

test.afterEach(async ({}, info) => expectClean(info.ctx));
const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const vis = (page, sel) => page.locator(sel).first().isVisible();

test.describe('ja-JP：日本語だけ（英語の添えは出さない）', () => {
  test.use({ locale: 'ja-JP' });
  test('はじめの画面・遊ぶ画面・しくみに英語が出ない。意味の英語も出ない', async ({ page }, info) => {
    info.ctx = await openGame(page);
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('ja');
    await expect(page.locator('#btnLangMenu')).toHaveText('JP');
    await expect(page.locator('#btnSolo')).toHaveText(/^▶ ひとりで（CPU）/);
    expect(await page.locator('#btnSolo').innerText()).not.toContain('Solo vs CPU');
    expect(await page.locator('#roomInput').getAttribute('placeholder')).toBe('合言葉');
    await startSolo(page, 'ゆるゆる');
    expect(await page.locator('#btnHelp').innerText()).toBe('しくみ');
    expect(await page.locator('#aSplit').innerText()).not.toMatch(/Split/);
    expect(await page.evaluate(() => { const T = window.HB_TEST; T.showMeaning('はし', 'me'); return document.getElementById('meaning').querySelector('.mn') === null; })).toBe(true);
    expect(await noOverflow(page)).toBe(true);
  });
});

test.describe('en-US：English が主。日本語の画面の文は出ない（札・言葉はひらがな）', () => {
  test.use({ locale: 'en-US' });
  test('はじめから English。日本語の文が消えて英語が出る', async ({ page }, info) => {
    info.ctx = await openGame(page);
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('en');
    await expect(page.locator('#btnLangMenu')).toHaveText('EN');
    expect((await page.locator('#btnSolo').innerText()).replace(/\s+/g, ' ')).toBe('Solo vs CPU');
    expect(await page.locator('#roomInput').getAttribute('placeholder')).toBe('Room code');
    await startSolo(page, 'ゆるゆる');
    expect((await page.locator('#btnHelp').innerText()).trim()).toBe('How it works');
    expect((await page.locator('#btnHow').innerText()).trim()).toBe('How to play');
    expect(await page.locator('#aSplit').innerText()).toMatch(/Split/);
    expect(await page.locator('#aSplit').innerText()).not.toMatch(/割る/);
    // 札はひらがなのまま
    expect(await page.locator('#basket .tile').first().innerText()).toMatch(/[ぁ-ん一｜十ー∘゛゜]/);
    // 英語の無い文は日本語のまま（見出し「ひらがな分解（仮）」）
    expect(await page.locator('.top h1').innerText()).toContain('ひらがな分解');
    expect(await noOverflow(page)).toBe(true);
  });
  test('声：あいさつ返しが English で出る（日本語の文は出ない）', async ({ page }, info) => {
    info.ctx = await openGame(page);
    await startSolo(page, 'ゆるゆる');
    await page.evaluate(() => { const T = window.HB_TEST; T.showMeaning('よろしく', 'op'); T.showMeaning('よろしこ', 'me'); });
    const v = await page.evaluate(() => document.getElementById('combo').innerText); // 英語を包む処理は MutationObserver（次の瞬間）
    expect(v).toContain('Greeting back!');
    expect(v).not.toContain('あいさつ返し！');
  });
});

test.describe('ko-KR：한국어の表がまだ空なので English で出る', () => {
  test.use({ locale: 'ko-KR' });
  test('ボタンは KO。表に無い文は English', async ({ page }, info) => {
    info.ctx = await openGame(page);
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('ko');
    await expect(page.locator('#btnLangMenu')).toHaveText('KO');
    expect((await page.locator('#btnSolo').innerText()).replace(/\s+/g, ' ')).toBe('Solo vs CPU');
    expect(await noOverflow(page)).toBe(true);
  });
});

test.describe('切り替え・覚える', () => {
  test.use({ locale: 'en-US' });
  test('ボタンで 日本語・English・한국어 から選べて、すぐ切り替わる。覚えたものが端末の言語より先', async ({ page }, info) => {
    info.ctx = await openGame(page);
    await expect(page.locator('#langSetMenu')).toBeHidden();
    await page.click('#btnLangMenu');
    await expect(page.locator('#langSetMenu button')).toHaveText(['日本語', 'English', '한국어']);
    await page.click('#langSetMenu [data-lang="ja"]');
    await expect(page.locator('#langSetMenu')).toBeHidden();
    await expect(page.locator('#btnLangMenu')).toHaveText('JP');
    expect(await page.locator('#btnSolo').innerText()).toContain('ひとりで');
    expect(await page.locator('#btnSolo').innerText()).not.toContain('Solo');
    expect(await page.evaluate(() => localStorage.getItem('hb.lang'))).toBe('ja');
    // 端末の言語は英語でも、覚えた日本語で開く
    await page.reload();
    await page.waitForFunction(() => window.HB_TEST && window.HB_TEST.S && window.HB_TEST.S());
    await expect(page.locator('#btnLangMenu')).toHaveText('JP');
    // 一戦の途中でも切り替えられて、遊びは止まらない
    await startSolo(page, 'ゆるゆる');
    await page.click('#btnLang');
    await page.click('#langSet [data-lang="en"]');
    expect((await page.locator('#btnHelp').innerText()).trim()).toBe('How it works');
    expect(await page.evaluate(() => !window.HB_TEST.S().over)).toBe(true);
    await page.click('#btnLang');
    await page.click('#langSet [data-lang="ko"]');
    await expect(page.locator('#btnLang')).toHaveText('KO');
    expect(await noOverflow(page)).toBe(true);
  });
  test('English でも 390px ではみ出さない（遊ぶ画面・しくみ・辞書・結果）', async ({ page }, info) => {
    info.ctx = await openGame(page);
    await startSolo(page, 'ゆるゆる');
    expect(await noOverflow(page)).toBe(true);
    for (const [open, sheet, close] of [['btnHow', 'sheet', 'btnClose'], ['btnHelp', 'sheet', 'btnClose'], ['btnZukan', 'zukan', 'btnZukanClose']]) {
      await page.click('#' + open);
      expect(await vis(page, '#' + sheet)).toBe(true);
      expect(await page.evaluate(id => { const e = document.getElementById(id); return e.scrollWidth <= e.clientWidth; }, sheet)).toBe(true);
      await page.click('#' + close);
    }
  });
});
