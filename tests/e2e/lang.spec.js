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
    // 英語の無い文は日本語のまま（見出し「かなかなころころ」）
    expect(await page.locator('.top h1').innerText()).toContain('かなかなころころ');
    expect(await noOverflow(page)).toBe(true);
  });
  test('声：あいさつ！が English で出る（日本語の文は出ない）', async ({ page }, info) => {
    info.ctx = await openGame(page);
    await startSolo(page, 'ゆるゆる');
    await page.evaluate(() => { const T = window.HB_TEST; T.showMeaning('よろしく', 'op'); T.showMeaning('よろしこ', 'me'); });
    const v = await page.evaluate(() => document.getElementById('combo').innerText); // 英語を包む処理は MutationObserver（次の瞬間）
    expect(v).toContain('Greeting!');
    expect(v).not.toContain('あいさつ！');
  });
});

test.describe('ko-KR：한국어が主。表に無い文は English（HB-058）', () => {
  test.use({ locale: 'ko-KR' });
  test('はじめの画面・遊ぶ画面・しくみが韓国語で出る。日本語の画面の文は出ない（札・言葉はひらがな）', async ({ page }, info) => {
    info.ctx = await openGame(page);
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('ko');
    await expect(page.locator('#btnLangMenu')).toHaveText('KO');
    expect((await page.locator('#btnSolo').innerText()).replace(/\s+/g, ' ')).toBe('혼자서 (CPU)');
    expect(await page.locator('#roomInput').getAttribute('placeholder')).toBe('방 코드');
    await startSolo(page, 'ゆるゆる');
    expect((await page.locator('#btnHelp').innerText()).trim()).toBe('작동 방식');
    expect((await page.locator('#btnHow').innerText()).trim()).toBe('? 게임 방법');
    expect(await page.locator('#aSplit').innerText()).toMatch(/쪼개기/);
    expect(await page.locator('#aSplit').innerText()).not.toMatch(/Split|割る/);
    expect(await page.locator('#aMerge').innerText()).toMatch(/붙이기/);
    expect(await page.locator('#basket .tile').first().innerText()).toMatch(/[ぁ-ん一｜十ー∘゛゜]/);
    expect(await page.locator('#today').innerText()).toMatch(/^오늘의 글자 많이: .+ \/ 적게: .+$/);
    expect(await noOverflow(page)).toBe(true);
  });
  test('声・しくみの図の一言・結果の画面も韓国語。表に無い文は English のまま', async ({ page }, info) => {
    info.ctx = await openGame(page);
    await startSolo(page, 'ゆるゆる');
    await page.evaluate(() => { const T = window.HB_TEST; T.showMeaning('よろしく', 'op'); T.showMeaning('よろしこ', 'me'); });
    expect(await page.evaluate(() => document.getElementById('combo').innerText)).toContain('인사!');
    await page.click('#btnHelp');
    const dg = await page.locator('#diagram .dg-en').allInnerTexts();
    expect(dg).toContain('쪼개기');
    expect(dg.some(t => /^단어를 던져 상대 바구니를 채워요/.test(t))).toBe(true);
    expect(await page.locator('#diagram .dg-en').first().getAttribute('lang')).toBe('ko');
    await page.click('#btnClose');
    await page.evaluate(() => { const T = window.HB_TEST, S = T.S(); S.log = [{ who: 'op', word: 'ほしよう' }, { who: 'me', word: 'ぶしよう', k: 2 }]; S.over = 'win'; T.render(); });
    await expect(page.locator('#resBig')).toContainText('상대 바구니가 넘쳤어요. 승리');
    expect((await page.locator('#resVotes button[data-v="good"]').first().innerText()).trim()).toBe('좋아요'); // 日本語の文は見えない（textContent には残る）
    await expect(page.locator('#resSub')).toContainText('던진 단어: 나 1, 상대 1');
    expect(await noOverflow(page)).toBe(true);
    // 韓国語の表に無い文は English（空にしない）
    expect(await page.evaluate(() => { const e = document.createElement('div'); e.innerHTML = '表に無い文<small class="en" lang="en">Not in the table</small>'; document.body.appendChild(e); return new Promise(r => setTimeout(() => r(e.querySelector('small.en').textContent), 50)); })).toBe('Not in the table');
  });
  test('韓国語の字が出る（□にならない）：ハングルの字の幅が見える', async ({ page }, info) => {
    info.ctx = await openGame(page);
    const w = await page.evaluate(() => { const s = document.createElement('span'); s.style.cssText = 'font:16px var(--f-ui);position:absolute'; s.textContent = '쪼개기 돌리기 뒤집기 붙이기'; document.body.appendChild(s); const r = s.getBoundingClientRect().width; s.remove(); return r; });
    expect(w).toBeGreaterThan(60);
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
