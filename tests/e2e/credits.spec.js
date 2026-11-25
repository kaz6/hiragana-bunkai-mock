// 出どころの表示（HB-081）：JMdict（EDRDG）・CC BY-SA 4.0・IPADIC・字体・音。しくみの一番下の節と、はじめの画面・遊ぶ画面の一番下の一行
const { test, expect } = require('@playwright/test');
const fs = require('fs'), path = require('path');
const { openGame, startSolo, expectClean, ROOT } = require('../helpers');

test.afterEach(async ({}, info) => expectClean(info.ctx));

const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const sheetFits = page => page.evaluate(() => { const e = document.getElementById('sheet'); return e.scrollWidth <= e.clientWidth; });
// 節の見出しの真ん中に、いちばん上で見えているものが しくみ（#sheet）の中のものか（はじめの画面の後ろに隠れていないか）
const onTop = page => page.evaluate(() => { const h = document.querySelector('#credits h3').getBoundingClientRect(); const el = document.elementFromPoint(h.left + 20, h.top + h.height / 2); return !!(el && el.closest('#sheet')); });
// EDRDG の見本の文（sample.html）。画面にも meanings.js にも、この文のまま入っている（カードの「決まりの文は変えない」）
const EDRDG = "This game uses the JMdict dictionary files. These files are the property of the Electronic Dictionary Research and Development Group, and are used in conformance with the Group's licence.";
const LINKS = {
  JMdict: 'https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project',
  'Electronic Dictionary Research and Development Group': 'https://www.edrdg.org/',
  "Group's licence": 'https://www.edrdg.org/edrdg/licence.html',
  'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
};

test('はじめの画面の一番下の一行から、出どころの節が開く（日本語）', async ({ page }, info) => {
  info.ctx = await openGame(page);
  await expect(page.locator('#btnCreditMenu')).toBeVisible();
  await expect(page.locator('#btnCreditMenu')).toContainText('辞書：JMdict（EDRDG）・IPADIC');
  expect(await noOverflow(page)).toBe(true);
  await page.click('#btnCreditMenu');
  await expect(page.locator('#sheet')).toBeVisible();
  expect(await onTop(page)).toBe(true);
  const t = await page.locator('#credits').innerText();
  for (const w of ['JMdict', 'EDRDG', 'CC BY-SA 4.0', 'IPADIC', 'Klee One', 'Zen Kaku Gothic New', 'SIL Open Font License']) expect(t).toContain(w);
  expect(t).toContain(EDRDG); // 一字も変えずに出ている
  expect(await sheetFits(page)).toBe(true);
  expect(await noOverflow(page)).toBe(true);
  await page.click('#btnClose');
  await expect(page.locator('#sheet')).toBeHidden();
  await expect(page.locator('#menu')).toBeVisible();
  expect(await page.evaluate(() => document.getElementById('sheet').classList.contains('over'))).toBe(false);
});

test('決まった語に決まったリンクが付く（外へ出る形。開かない）。リンクを押してもしくみは閉じない', async ({ page }, info) => {
  info.ctx = await openGame(page);
  await page.click('#btnCreditMenu');
  for (const [text, href] of Object.entries(LINKS)) {
    const a = page.locator('#credits a', { hasText: text }).first();
    await expect(a).toHaveAttribute('href', href);
    await expect(a).toHaveAttribute('target', '_blank');
    expect(await a.getAttribute('rel')).toContain('noopener');
  }
  expect(await page.locator('#credits a').evaluateAll(as => as.every(a => /^https?:|^licenses\//.test(a.getAttribute('href'))))).toBe(true);
  // 英語の一文のなかで、リンクの語は文の語のまま（文を作り替えていない）
  expect((await page.locator('#meaningsNotice').innerText()).trim()).toBe(EDRDG);
  // リンクの押下は止めて確かめる（外へ出ない）。しくみは閉じない
  await page.evaluate(() => document.querySelectorAll('#credits a').forEach(a => a.addEventListener('click', e => e.preventDefault())));
  await page.locator('#credits a', { hasText: 'JMdict' }).first().click();
  await expect(page.locator('#sheet')).toBeVisible();
});

test('IPADIC の著作権表示と条件（原文）は畳んである。開くと原文が出て、全文のファイルへのリンクがある', async ({ page }, info) => {
  info.ctx = await openGame(page);
  await page.click('#btnCreditMenu');
  const d = page.locator('#credits details');
  expect(await d.evaluate(e => e.open)).toBe(false);
  await d.locator('summary').click();
  await expect(page.locator('#ipadicNotice')).toBeVisible();
  await expect(page.locator('#ipadicNotice')).toContainText('Nara Institute of Science');
  await expect(page.locator('#ipadicNotice')).toContainText('NO WARRANTY');
  const a = d.locator('a');
  await expect(a).toHaveAttribute('href', 'licenses/mecab-ipadic-LICENSE.txt');
  expect(await sheetFits(page)).toBe(true);
});

test('licenses/ のファイルは dict-ipadic.js の原文と同じ。meanings.js の文は EDRDG の見本の文のまま', async ({ page }, info) => {
  info.ctx = await openGame(page);
  const [fromJs, notice] = await page.evaluate(() => [window.HB_IPADIC_NOTICE, window.HB_MEANINGS_NOTICE]);
  expect(notice).toBe(EDRDG);
  const file = fs.readFileSync(path.join(ROOT, 'licenses', 'mecab-ipadic-LICENSE.txt'), 'utf8');
  expect(file.trim()).toBe(fromJs.trim());
  expect(await page.evaluate(async () => (await fetch('licenses/mecab-ipadic-LICENSE.txt')).status)).toBe(200); // リンクが指すファイルが、ページと同じ置き場から取れる形
  // 作る道具（tools/build_meanings.py）も同じ文を書く（毎日の更新で戻らない）
  expect(fs.readFileSync(path.join(ROOT, 'tools', 'build_meanings.py'), 'utf8')).toContain(EDRDG);
});

test('遊ぶ画面の一番下の一行からも開く。とじると遊ぶ画面にもどる。390px ではみ出さない', async ({ page }, info) => {
  info.ctx = await openGame(page);
  await startSolo(page, 'とまる');
  await expect(page.locator('#btnCreditPlay')).toBeVisible();
  await expect(page.locator('#btnCreditPlay')).toContainText('JMdict（EDRDG）・IPADIC');
  expect(await noOverflow(page)).toBe(true);
  await page.click('#btnCreditPlay');
  await expect(page.locator('#sheet')).toBeVisible();
  expect(await onTop(page)).toBe(true);
  await expect(page.locator('#credits')).toContainText('JMdict');
  expect(await sheetFits(page)).toBe(true);
  await page.click('#btnClose');
  await expect(page.locator('#sheet')).toBeHidden();
  expect(await noOverflow(page)).toBe(true);
});

test('English・한국어 でも出る（英語の一文はそのまま）。はみ出さない', async ({ page }, info) => {
  info.ctx = await openGame(page);
  await page.click('#btnLangMenu');
  await page.click('#langSetMenu [data-lang="en"]');
  await expect(page.locator('#btnCreditMenu')).toContainText('Dictionary: JMdict (EDRDG) · IPADIC');
  await page.click('#btnCreditMenu');
  let t = await page.locator('#credits').innerText();
  for (const w of ['Credits', 'JMdict', 'EDRDG', 'CC BY-SA 4.0', 'IPADIC', 'Klee One', 'Zen Kaku Gothic New']) expect(t).toContain(w);
  expect(t).toContain(EDRDG);
  expect(await sheetFits(page)).toBe(true);
  expect(await noOverflow(page)).toBe(true);
  await page.click('#btnClose');
  await page.click('#btnLangMenu');
  await page.click('#langSetMenu [data-lang="ko"]');
  await expect(page.locator('#btnCreditMenu')).toContainText('사전: JMdict (EDRDG) · IPADIC');
  await page.click('#btnCreditMenu');
  t = await page.locator('#credits').innerText();
  for (const w of ['사용한 것', 'JMdict', 'EDRDG', 'CC BY-SA 4.0', 'IPADIC', 'Klee One', 'Zen Kaku Gothic New', 'SIL Open Font License']) expect(t).toContain(w);
  expect(t).toContain(EDRDG);
  expect(await sheetFits(page)).toBe(true);
  expect(await noOverflow(page)).toBe(true);
});
