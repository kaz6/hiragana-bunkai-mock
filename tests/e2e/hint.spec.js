// ヒント：押すたびに一段ずつ（① 札が明滅 ② ボタンも明滅 ③ 言葉を出す）（HB-062, D-095）
const { test, expect } = require('@playwright/test');
const { openGame, startSolo, setBasket, expectClean } = require('../helpers');

test.afterEach(async ({}, info) => expectClean(info.ctx));

// 明滅している札の字（並びは問わない）
const glowLetters = page => page.evaluate(() => [...document.querySelectorAll('#basket .tile.hintGlow')].map(el => el.querySelector('.g').textContent).sort());
const glowBtns = page => page.evaluate(() => [...document.querySelectorAll('.act.hintGlow')].map(b => b.id));
const msg = page => page.evaluate(() => { const m = document.getElementById('hintMsg'); return m.hidden ? '' : m.textContent.trim(); });
const logHas = (page, s) => page.evaluate(s => window.HB_TEST.logText().includes(s), s);

test('すぐ投げられる字のカゴ：1回目に札、2回目に「投げる」、3回目に言葉。ログに3行', async ({ page }, info) => {
  info.ctx = await openGame(page);
  await startSolo(page);
  await setBasket(page, ['ち', 'こ', 'く']);
  await expect(page.locator('#btnHint')).toBeVisible();
  expect(await glowLetters(page)).toEqual([]);
  await page.click('#btnHint');
  expect(await glowLetters(page)).toEqual(['く', 'こ', 'ち']);
  expect(await glowBtns(page)).toEqual([]);
  expect(await msg(page)).toBe('');
  await page.click('#btnHint');
  expect(await glowBtns(page)).toEqual(['aThrow']);
  expect(await msg(page)).toBe('');
  await page.click('#btnHint');
  const w = await msg(page);
  expect([...w].sort().join('')).toBe(['ち', 'こ', 'く'].sort().join(''));
  await page.click('#btnHint'); // 3回目のあとはそのまま（ログも増えない）
  expect(await msg(page)).toBe(w);
  const log = await page.evaluate(() => window.HB_TEST.logText());
  expect(log).toContain('ヒント① ');
  expect(log).toContain('ヒント② 投げる');
  expect(log).toContain('ヒント③ ' + w);
  expect((log.match(/ヒント③/g) || []).length).toBe(1);
});

test('1手のカゴ（つ・十・さ）：触る札は さ、ボタンは「裏返す」、言葉は つち。札は動かさない', async ({ page }, info) => {
  info.ctx = await openGame(page);
  await startSolo(page);
  await setBasket(page, ['つ', '十', 'さ']);
  const before = await page.evaluate(() => window.HB_TEST.S().mine.map(p => p.id).join());
  const plan = await page.evaluate(() => { const p = window.HB_TEST.hintFind(); return p && { hands: p.hands, btn: p.btn, word: p.word, tiles: p.tiles }; });
  expect(plan).toEqual({ hands: 1, btn: 'flip', word: 'つち', tiles: [2] });
  await page.click('#btnHint');
  expect(await glowLetters(page)).toEqual(['さ']);
  expect(await glowBtns(page)).toEqual([]);
  await page.click('#btnHint');
  expect(await glowBtns(page)).toEqual(['aFlip']);
  await page.click('#btnHint');
  expect(await msg(page)).toBe('つち');
  expect(await page.evaluate(() => window.HB_TEST.S().mine.map(p => p.id).join())).toBe(before); // 勝手に動かさない
  expect(await page.evaluate(() => window.HB_TEST.S().sel.length)).toBe(0);
});

test('2手のカゴ（一・⊂・ろ）：手数2で、1手目の札とボタンを出す（ろう＝⊂を裏返す か、とろ＝一を回す。ヒントは意味の出る語だけを案内するので、とろ の意味が入るかで変わる。HB-101・HB-102）', async ({ page }, info) => {
  info.ctx = await openGame(page);
  await startSolo(page);
  await setBasket(page, ['一', '⊂', 'ろ']);
  const plan = await page.evaluate(() => { const p = window.HB_TEST.hintFind(); return p && { hands: p.hands, btn: p.btn, word: p.word, tiles: p.tiles }; });
  expect([{ hands: 2, btn: 'flip', word: 'ろう', tiles: [1] }, { hands: 2, btn: 'turn', word: 'とろ', tiles: [0] }]).toContainEqual(plan);
  await page.click('#btnHint');
  expect((await glowLetters(page)).length).toBe(1); // 札の見た目の字は向きで変わる。1枚だけ光る
  await page.click('#btnHint');
  expect(await glowBtns(page)).toEqual([plan.btn === 'flip' ? 'aFlip' : 'aRot']);
});

test('すぐ投げられる言葉があれば、手数の多い言葉より先に出す（つ・十・こ → こつ）', async ({ page }, info) => {
  info.ctx = await openGame(page);
  await startSolo(page);
  await setBasket(page, ['つ', '十', 'こ']);
  expect(await page.evaluate(() => { const p = window.HB_TEST.hintFind(); return p && [p.hands, p.btn]; })).toEqual([0, 'throw']);
});

test('回す・裏返すで札の向きが変わったら消えて1回目に戻る（字になったあとの案内を出し直す）', async ({ page }, info) => {
  info.ctx = await openGame(page);
  await startSolo(page);
  await setBasket(page, ['つ', '十', 'さ']);
  await page.click('#btnHint'); await page.click('#btnHint');
  expect(await glowBtns(page)).toEqual(['aFlip']);
  await page.evaluate(() => { const T = window.HB_TEST, S = T.S(); T.tapTile(S.mine[2].id); }); // さ を選んで 裏返す（ヒントどおり）
  await page.click('#aFlip');
  await page.waitForFunction(() => !window.HB_TEST.S().busy);
  expect(await glowBtns(page)).toEqual([]);
  expect(await glowLetters(page)).toEqual([]);
  expect(await page.evaluate(() => window.HB_TEST.HINT())).toBe(null);
});

test('字にならない向きの札からも手が出る：つ・ぜ・ろ（回す→裏返す の2手で し。HB-101 で へん が入ったのでカゴを替えた）。1手目のあとは2手目', async ({ page }, info) => {
  info.ctx = await openGame(page);
  await startSolo(page);
  await setBasket(page, ['つ', 'ぜ', 'ろ']);
  const p1 = await page.evaluate(() => { const p = window.HB_TEST.hintFind(); return p && { hands: p.hands, btn: p.btn, tiles: p.tiles }; });
  expect(p1).toEqual({ hands: 2, btn: 'turn', tiles: [0] });
  await page.evaluate(() => { const T = window.HB_TEST, S = T.S(); T.tapTile(S.mine[0].id); });
  await page.click('#aRot'); await page.waitForFunction(() => !window.HB_TEST.S().busy);
  const p2 = await page.evaluate(() => { const p = window.HB_TEST.hintFind(); return p && { hands: p.hands, btn: p.btn, tiles: p.tiles }; });
  expect(p2).toEqual({ hands: 1, btn: 'flip', tiles: [0] }); // 字にならない札（つ を回した向き）から、裏返して し
});

test('へ・な・の：へ を回して ＞ になったあとも続く（＞ を裏返して く。HB-101 で なん が入ったのでカゴを替えた）', async ({ page }, info) => {
  info.ctx = await openGame(page);
  await startSolo(page);
  await setBasket(page, ['へ', 'な', 'の']);
  const f = () => page.evaluate(() => { const p = window.HB_TEST.hintFind(); return p && { hands: p.hands, btn: p.btn, tiles: p.tiles }; });
  expect(await f()).toEqual({ hands: 2, btn: 'turn', tiles: [0] });
  await page.evaluate(() => { const T = window.HB_TEST, S = T.S(); T.tapTile(S.mine[0].id); });
  await page.click('#aRot'); await page.waitForFunction(() => !window.HB_TEST.S().busy);
  expect(await page.evaluate(() => window.HB_TEST.letterOf(window.HB_TEST.S().mine[0]))).toBe('＞');
  expect(await f()).toEqual({ hands: 1, btn: 'flip', tiles: [0] });
});

test('う＋｜でできる か は自分では向きがずれて出る（2手に収まらない）ので、その手は案内しない', async ({ page }, info) => {
  info.ctx = await openGame(page);
  await startSolo(page);
  await setBasket(page, ['う', '｜', 'は', 'げ']);
  const p = await page.evaluate(() => window.HB_TEST.hintFind());
  expect(p === null || p.btn !== 'merge').toBe(true); // う＋｜ の くっつけ（か。MERGE_TURN）は案内しない
});

test('同じ手数なら字数の多い言葉を出す（よ・ろ・い・は・つ・め・い → はつめい）', async ({ page }, info) => {
  info.ctx = await openGame(page);
  await startSolo(page);
  await setBasket(page, ['よ', 'ろ', 'い', 'は', 'つ', 'め', 'い']);
  expect(await page.evaluate(() => { const p = window.HB_TEST.hintFind(); return p && [p.hands, [...p.word].length]; })).toEqual([0, 4]);
});

test('カゴの札が変わると消えて1回目に戻る', async ({ page }, info) => {
  info.ctx = await openGame(page);
  await startSolo(page);
  await setBasket(page, ['ち', 'こ', 'く']);
  await page.click('#btnHint'); await page.click('#btnHint');
  expect(await glowBtns(page)).toEqual(['aThrow']);
  await page.evaluate(() => { const T = window.HB_TEST; T.S().mine.push(T.mk('の')); T.render(); }); // 落ちてきた・届いたのと同じ（カゴの札が増える）
  expect(await glowLetters(page)).toEqual([]);
  expect(await glowBtns(page)).toEqual([]);
  expect(await page.evaluate(() => window.HB_TEST.HINT())).toBe(null);
  await page.click('#btnHint');
  expect((await glowLetters(page)).length).toBeGreaterThan(0);
  expect(await glowBtns(page)).toEqual([]);
});

test('作れる言葉が無いときは一言。次に押しても同じ', async ({ page }, info) => {
  info.ctx = await openGame(page);
  await startSolo(page);
  await setBasket(page, ['の', 'の', 'の']);
  await page.click('#btnHint');
  await expect(page.locator('#hintMsg')).toContainText('いまは見つからない');
  expect(await glowLetters(page)).toEqual([]);
  await page.click('#btnHint');
  await expect(page.locator('#hintMsg')).toContainText('いまは見つからない');
  expect(await logHas(page, 'ヒント なし')).toBe(true);
});

test('禁止用語（cpu-ng.js）・もうリストに出た語は選ばない', async ({ page }, info) => {
  info.ctx = await openGame(page);
  await startSolo(page);
  await setBasket(page, ['し', 'に', 'た', 'い']);
  const w1 = await page.evaluate(() => { const p = window.HB_TEST.hintFind(); return p && p.word; });
  expect(w1).not.toBe('しにたい');
  await setBasket(page, ['ち', 'こ', 'く']);
  expect(await page.evaluate(() => window.HB_TEST.hintFind().word)).toBe('ちこく');
  await page.evaluate(() => window.HB_TEST.S().used.add('ちこく'));
  expect(await page.evaluate(() => { const p = window.HB_TEST.hintFind(); return p && p.word; })).not.toBe('ちこく');
});

test('ヒントはカゴの数・選び・★・ログの言葉に効かない', async ({ page }, info) => {
  info.ctx = await openGame(page);
  await startSolo(page);
  await setBasket(page, ['ち', 'こ', 'く']);
  await page.click('#btnHint'); await page.click('#btnHint'); await page.click('#btnHint');
  expect(await page.evaluate(() => { const S = window.HB_TEST.S(); return [S.mine.length, S.sel.length, S.log.length]; })).toEqual([3, 0, 0]);
});

test('ふたりで・チュートリアルの間はボタンを出さない', async ({ page }, info) => {
  info.ctx = await openGame(page, { tutorial: true });
  await page.click('#btnSolo'); await page.click('.lv[data-n="ふつう"]');
  await page.waitForFunction(() => window.HB_TEST.TUT.on);
  await expect(page.locator('#btnHint')).toBeHidden();
  await page.evaluate(() => { const T = window.HB_TEST; T.TUT.on = false; T.TUT.step = ''; T.render(); });
  await expect(page.locator('#btnHint')).toBeVisible();
  await page.evaluate(() => { const T = window.HB_TEST; T.NET.mode = 'online'; T.render(); });
  await expect(page.locator('#btnHint')).toBeHidden();
  await page.evaluate(() => { const T = window.HB_TEST; T.NET.mode = 'cpu'; T.render(); });
  await expect(page.locator('#btnHint')).toBeVisible();
});

test('結果の画面：③まで開いた言葉を開いた順に。投げたかも分かる。開いていなければ出ない', async ({ page }, info) => {
  info.ctx = await openGame(page);
  await startSolo(page);
  await page.evaluate(() => { const T = window.HB_TEST, S = T.S(); S.log = [{ who: 'me', word: 'ちこく' }]; S.over = 'win'; T.render(); });
  await expect(page.locator('#resHints')).toBeHidden();
  await page.evaluate(() => { const T = window.HB_TEST, S = T.S(); S.hintFound = [{ word: 'ちこく' }, { word: 'さくら' }]; T.render(); });
  const rows = page.locator('#resHints .hf');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText('ちこく');
  await expect(rows.nth(0)).toContainText('投げた');
  await expect(rows.nth(1)).toContainText('さくら');
  await expect(rows.nth(1)).toContainText('投げていない');
  await expect(page.locator('#resHints .vh')).toContainText('ヒントで見つけた言葉');
});

test('③まで開くと S.hintFound に入る（同じ言葉は1回）。2回目以降の一戦では空から', async ({ page }, info) => {
  info.ctx = await openGame(page);
  await startSolo(page);
  await setBasket(page, ['ち', 'こ', 'く']);
  await page.click('#btnHint'); await page.click('#btnHint');
  expect(await page.evaluate(() => window.HB_TEST.S().hintFound)).toEqual([]);
  await page.click('#btnHint');
  expect(await page.evaluate(() => window.HB_TEST.S().hintFound.length)).toBe(1);
  await page.evaluate(() => window.HB_TEST.newGame());
  expect(await page.evaluate(() => window.HB_TEST.S().hintFound)).toEqual([]);
});

for (const [loc, lang] of [['ja-JP', 'ja'], ['en-US', 'en'], ['ko-KR', 'ko']]) {
  test.describe(lang, () => {
    test.use({ locale: loc });
    test(`${lang}：ボタン・一言・結果の見出しが出て、390px ではみ出さない`, async ({ page }, info) => {
      info.ctx = await openGame(page);
      await startSolo(page);
      const word = { ja: 'ヒント', en: 'Hint', ko: '힌트' }[lang];
      await expect(page.locator('#btnHint')).toHaveText(new RegExp(word));
      await setBasket(page, ['の', 'の', 'の']);
      await page.click('#btnHint');
      const none = { ja: 'いまは見つからない', en: 'No hint right now', ko: '지금은 찾을 수 없어요' }[lang];
      await expect(page.locator('#hintMsg')).toContainText(none);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.evaluate(() => { const T = window.HB_TEST, S = T.S(); S.log = [{ who: 'me', word: 'ちこく' }]; S.hintFound = [{ word: 'ちこく' }, { word: 'さくら' }]; S.over = 'win'; T.render(); });
      const head = { ja: 'ヒントで見つけた言葉', en: 'Found with hints', ko: '힌트로 찾은 단어' }[lang];
      await expect(page.locator('#resHints .vh')).toContainText(head);
      const th = { ja: '投げた', en: 'Thrown', ko: '던졌어요' }[lang];
      await expect(page.locator('#resHints .hf').first()).toContainText(th);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  });
}
