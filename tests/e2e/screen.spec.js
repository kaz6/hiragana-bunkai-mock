// 画面：390px で開いてエラーがない。遊び方が開く。ひとりでが始まる。辞書の語数
const { test, expect } = require('@playwright/test');
const { openGame, startSolo, setBasket, tapTiles, expectClean, EXTRA_WORDS } = require('../helpers');
const { DICT_WORDS_NOW, PAGE_WORDS_NOW, MIN_RATIO } = require('../counts');

test.afterEach(async ({}, info) => expectClean(info.ctx));

const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

test('390px で開いてエラーがない。はじめの画面に ひとりで・ふたりで', async ({ page }, info) => {
  info.ctx = await openGame(page);
  await expect(page.locator('#btnSolo')).toBeVisible();
  await expect(page.locator('#btnDuo')).toBeVisible();
  await page.click('#btnDuo'); // 合言葉・入室は ふたりで を押してから出る（HB-076, D-102）
  await expect(page.locator('#btnJoin')).toBeVisible();
  expect(page.viewportSize().width).toBe(390);
  expect(await noOverflow(page)).toBe(true);
});

test('はじめの画面の ひとりで・入室 は var(--me) の塗り。▶ が付く（HB-056, D-090）', async ({ page }, info) => {
  info.ctx = await openGame(page);
  await page.click('#btnDuo');
  const bg = await page.evaluate(() => {
    const probe = document.createElement('div'); probe.style.background = 'var(--me)'; document.body.appendChild(probe);
    const me = getComputedStyle(probe).backgroundColor; probe.remove();
    return { me, solo: getComputedStyle(document.getElementById('btnSolo')).backgroundColor, duo: getComputedStyle(document.getElementById('btnDuo')).backgroundColor, join: getComputedStyle(document.getElementById('btnJoin')).backgroundColor };
  });
  expect(bg.solo).toBe(bg.me);
  expect(bg.duo).toBe(bg.me);
  expect(bg.join).toBe(bg.me);
  await expect(page.locator('#btnSolo')).toContainText('▶ ひとりで（CPU）');
  expect(await noOverflow(page)).toBe(true);
});

test('「？ 遊び方」が開いて、ルールの3行がある。とじるで閉じる', async ({ page }, info) => {
  info.ctx = await openGame(page);
  await startSolo(page, 'ゆるゆる');
  await page.click('#btnHow');
  await expect(page.locator('#sheet')).toBeVisible();
  await expect(page.locator('#rulesHow li')).toHaveCount(3);
  await expect(page.locator('#rulesHow')).toContainText('相手のカゴが14こをこえたら勝ち');
  await expect(page.locator('#recipes')).toContainText('と ＝ ｜ ＋ ⊂'); // 作り方の一覧は RECIPE から（D-069）
  await page.click('#btnClose');
  await expect(page.locator('#sheet')).toBeHidden();
});

test('ひとりで（ふつう）を押すと始まり、最初の手は5枚で ｜ を含む（D-034）。札をタップで選べる', async ({ page }, info) => {
  info.ctx = await openGame(page);
  await startSolo(page, 'ふつう');
  await expect(page.locator('#menu')).toBeHidden();
  await expect(page.locator('#basket .tile')).toHaveCount(5);
  const mine = await page.evaluate(() => { const T = window.HB_TEST; return T.S().mine.map(T.letterOf); });
  expect(mine).toContain('｜');
  await page.locator('#basket .tile').first().click(); // 本物のタップ
  await expect(page.locator('#basket .tile.sel')).toHaveCount(1);
  expect(await noOverflow(page)).toBe(true);
});

test('最初の1戦の案内（記録を消した状態）でもエラーがない', async ({ page }, info) => {
  info.ctx = await openGame(page, { guide: true });
  await startSolo(page, 'ゆるゆる');
  await expect(page.locator('#basket .tile')).toHaveCount(5);
});

test('辞書の語数：ページの語数が大きく減っていない。extra_words（固定の数語）が足される', async ({ page }, info) => {
  info.ctx = await openGame(page);
  const r = await page.evaluate(ws => ({ n: window.HB_TEST.words().length, has: ws.map(w => window.HB_TEST.DICT.has(w)), dictN: document.getElementById('dictN').textContent }), EXTRA_WORDS);
  expect(r.has).toEqual(EXTRA_WORDS.map(() => true));
  expect(r.n).toBeGreaterThanOrEqual(Math.floor(PAGE_WORDS_NOW * MIN_RATIO));
  expect(Number(r.dictN)).toBe(r.n);
  info.annotations.push({ type: 'words', description: `page ${r.n} (記録 ${PAGE_WORDS_NOW}), dict-ipadic ${DICT_WORDS_NOW}` });
});

test('extra_words が読めなくても遊べる（Supabase が空の返事）', async ({ page }, info) => {
  info.ctx = await openGame(page, { extraWords: [] });
  await startSolo(page, 'ゆるゆる');
  await expect(page.locator('#basket .tile')).toHaveCount(5);
});

// 操作ボタンのアイコン（HB-044, D-078）
test('割る・回す・裏返す・くっつける のボタンにアイコンが出る。押せないときも出て、390px ではみ出さない', async ({ page }, info) => {
  info.ctx = await openGame(page);
  await startSolo(page, 'ゆるゆる');
  for (const id of ['aSplit', 'aRot', 'aFlip', 'aMerge']) {
    const img = page.locator(`#${id} img.ico`);
    await expect(img).toBeVisible();
    expect(await img.evaluate(i => i.complete && i.naturalWidth > 0)).toBe(true); // 画像が読み込めている
    const r = await page.evaluate(id => { const b = document.getElementById(id).getBoundingClientRect(), i = document.querySelector('#' + id + ' img').getBoundingClientRect(); return { l: b.left, r: b.right, il: i.left, ir: i.right }; }, id);
    expect(r.il).toBeGreaterThanOrEqual(r.l - 0.5); expect(r.ir).toBeLessThanOrEqual(r.r + 0.5);
  }
  // 何も選んでいないので 回す・裏返す・くっつける は押せない。それでも出る
  await expect(page.locator('#aRot')).toBeDisabled();
  await expect(page.locator('#aMerge')).toBeDisabled();
  await expect(page.locator('#aRot img.ico')).toBeVisible();
  expect(await noOverflow(page)).toBe(true);
});

// しくみの「向きの近道」（HB-049, D-083）。字の向きのデータから作る
test('しくみの「向きの近道」：⊂→つ は1手、て→ん は2手（最短）、か の戻し方、字のデータから作られている。390px ではみ出さない', async ({ page }, info) => {
  info.ctx = await openGame(page);
  await startSolo(page, 'ゆるゆる');
  const T = await page.evaluate(() => ({ s: window.HB_TEST.turnShortcuts(), m: window.HB_TEST.mergeTurnBacks(), alias: null }));
  const get = (a, b) => T.s.find(x => x.from === a && x.to === b);
  expect(get('⊂', 'つ').ops).toEqual(['裏返す']);
  expect(get('て', 'ん').ops).toEqual(['回す', '裏返す']); // 4手ではない
  expect(get('し', '⊂').ops).toEqual(['回す']);
  expect(get('い', 'こ').ops).toEqual(['回す']);
  expect(get('こ', 'り').ops.length).toBe(2);
  expect(T.s.every(x => x.ops.length >= 1 && x.ops.length <= 3)).toBe(true);
  expect(T.m).toEqual([{ res: 'か', parts: ['う', '｜'], t: [1, 1], ops: ['裏返す', '回す'] }]);
  // 字のデータから作られている：ALIAS の組の数と、画面の行の数（くっつけた字の1行を足す）が合う
  const n = await page.evaluate(() => Object.values(window.HB_TEST.ALIAS).reduce((s, al) => s + (al.length > 1 ? al.length * (al.length - 1) : 0), 0));
  expect(T.s.length).toBe(n);
  await page.click('#btnHow');
  await page.locator('#shortcuts summary').click();
  await expect(page.locator('#scList > [data-sc]')).toHaveCount(n + 1);
  await expect(page.locator('#scList [data-sc="⊂|裏返す|つ"]')).toBeVisible();
  await expect(page.locator('#scList [data-sc="て|回す,裏返す|ん"]')).toBeVisible();
  await expect(page.locator('#scList [data-sc="う＋｜→か|裏返す,回す|か"]')).toBeVisible();
  expect(await noOverflow(page)).toBe(true);
});

test('合言葉・入室は「▶ ふたりで（対人）」を押すと出る。もう一度押すとしまう（HB-076, D-102。作者 2026-11-25）', async ({ page }, info) => {
  info.ctx = await openGame(page);
  await expect(page.locator('#btnDuo')).toContainText('▶ ふたりで（対人）');
  await expect(page.locator('#roomInput')).toBeHidden();
  await expect(page.locator('#btnJoin')).toBeHidden();
  await page.click('#btnDuo');
  await expect(page.locator('#roomInput')).toBeVisible();
  await expect(page.locator('#btnJoin')).toBeVisible();
  await expect(page.locator('#btnDuo')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#roomInput')).toBeFocused();
  expect(await noOverflow(page)).toBe(true);
  await page.click('#btnDuo');
  await expect(page.locator('#roomInput')).toBeHidden();
  await expect(page.locator('#btnDuo')).toHaveAttribute('aria-expanded', 'false');
});

test('ひとりでの強さ選びの間は ふたりで も隠れ、もどると元の開き方に戻る（HB-076）', async ({ page }, info) => {
  info.ctx = await openGame(page);
  await page.click('#btnDuo');
  await page.click('#btnSolo');
  await expect(page.locator('#btnDuo')).toBeHidden();
  await expect(page.locator('#menuOnline')).toBeHidden();
  await page.click('#btnSoloBack');
  await expect(page.locator('#btnDuo')).toBeVisible();
  await expect(page.locator('#btnJoin')).toBeVisible();
});


test('割る・回す・裏返す・くっつける のボタンに +1・±0・−1 を出さない（HB-078, D-104。作者 2026-11-25）', async ({ page }, info) => {
  info.ctx = await openGame(page); await startSolo(page);
  for (const id of ['aSplit', 'aRot', 'aFlip', 'aMerge']) {
    const t = await page.locator('#' + id).innerText();
    expect(t).not.toMatch(/[+＋−±]\s*[01]/);
  }
});

test('相手のいちばん左の枠は落書きで隠す。字も部品の色も出さない。ほかの枠と相手の札そのものは変わらない（作者 2026-11-26 9:00・HB-088）', async ({ page }, info) => {
  info.ctx = await openGame(page); await startSolo(page);
  const r = await page.evaluate(() => { const T = window.HB_TEST, S = T.S(); S.opp = ['゛', 'に', 'よ', 'こ'].map(l => T.mk(l)); T.render();
    const sp = [...document.querySelectorAll('#oppSlots span')], bg = getComputedStyle(sp[0]).backgroundImage, cls = sp[0].className, txt = sp[0].textContent, rest = sp.slice(1, 4).map(e => e.textContent).join('');
    const online = (() => { T.NET.mode = 'online'; S.oppL = ['ゆ', 'に']; S.oppO = [0, 0]; T.render(); const a = [...document.querySelectorAll('#oppSlots span')].slice(0, 2).map(e => e.className + ':' + e.textContent); T.NET.mode = 'cpu'; T.render(); return a; })();
    return { cls, txt, bg, rest, opp: S.opp.map(T.letterOf).join(''), online }; });
  expect(r.cls).toBe('hid'); expect(r.txt).toBe('');
  expect(r.bg).toContain('img/mask-scribble.png');
  expect(r.rest).toBe('によこ');
  expect(r.opp).toBe('゛によこ');                 // 隠すのは見た目だけ
  expect(r.online).toEqual(['hid:', 'fill:に']);  // ふたりででも同じ
});

test('札は白木の板に木目。部品と選んだ札は木目なし。札ごとに木目の場所が違う。相手の列も白木（作者 2026-11-27 19:26「薄いが好きかも」・HB-098）', async ({ page }, info) => {
  info.ctx = await openGame(page); await startSolo(page);
  await setBasket(page, ['か', 'な', '｜', 'こ']);
  await tapTiles(page, [0]);
  const r = await page.evaluate(() => {
    const faces = [...document.querySelectorAll('#basket .tile')].map(t => ({ sel: t.classList.contains('sel'), off: t.classList.contains('off'), bg: getComputedStyle(t.querySelector('.face')).backgroundImage, pos: getComputedStyle(t.querySelector('.face')).backgroundPosition, color: getComputedStyle(t.querySelector('.face')).backgroundColor }));
    const fill = document.querySelector('#oppSlots span.fill');
    return { faces, opp: fill && getComputedStyle(fill).backgroundImage };
  });
  const plain = r.faces.filter(f => !f.sel && !f.off);
  expect(plain.length).toBeGreaterThan(1);
  for (const f of plain) { expect(f.bg).toContain('img/wood-grain.png'); expect(f.color).toBe('rgb(242, 225, 189)'); }
  expect(new Set(plain.map(f => f.pos)).size).toBeGreaterThan(1);   // 同じ板の繰り返しに見せない
  expect(r.faces.filter(f => f.off).every(f => !f.bg.includes('wood-grain'))).toBe(true);
  expect(r.faces.filter(f => f.sel).every(f => !f.bg.includes('wood-grain'))).toBe(true);
  expect(r.opp).toContain('img/wood-grain.png');
});
