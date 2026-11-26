// 特別攻撃ワード（HB-075・D-101）。操作の言葉（割る・回す・裏返す。attack-words.js）を投げると、受けた側のカゴの札にランダムでその操作が効く。
// 語・枚数は作者が決めた表。札の選び方・★の扱い・エフェクトの中身は編集の仮置き
const { test, expect } = require('@playwright/test');
const { openGame, startSolo, tapTiles, press, expectClean } = require('../helpers');

test.beforeEach(async ({ page }, info) => { info.ctx = await openGame(page, { extraWords: ['めつ', 'よしよし', 'すのー', 'うら', 'おもて', 'たたみかえし', 'かなかなころころ'] }); await startSolo(page); });
test.afterEach(async ({}, info) => expectClean(info.ctx));

// 自分→CPU：自分の札 mine を選んで word を投げる。CPU のカゴは opp。投げる前の CPU の札の id・投げたあとの CPU の札の字を返す
const throwAt = (page, { mine, opp, prefer }) => page.evaluate(({ mine, opp, prefer }) => {
  const T = window.HB_TEST, S = T.S(); if (prefer) Object.assign(T.ATK.prefer, prefer);
  S.used.clear(); S.mine = mine.map(l => T.mk(l)); S.opp = opp.map(l => T.mk(l)); S.sel = S.mine.map(p => p.id);
  const before = S.opp.map(p => p.id); T.doThrow();
  return { before, now: S.opp.map(T.letterOf), gone: before.filter(id => !S.opp.some(p => p.id === id)).length, log: T.logText() };
}, { mine, opp, prefer });
// CPU→自分：CPU が word を投げる。自分のカゴは mine。投げたあとの自分の札
const cpuThrows = (page, { mine, word, opp }) => page.evaluate(({ mine, word, opp }) => {
  const T = window.HB_TEST, S = T.S(); S.used.clear(); S.mine = mine.map(l => T.mk(l)); S.opp = (opp || [...word]).map(l => T.mk(l)); S.sel = [];
  const ids = S.mine.map(p => p.id), r0 = S.mine.map(p => [p.r, p.f]); T.cpuThrow(word);
  return { ids, now: S.mine.map(T.letterOf), changed: ids.filter((id, i) => { const p = S.mine.find(q => q.id === id); return !p || p.r !== r0[i][0] || p.f !== r0[i][1]; }).length,
    tiles: S.mine.map(p => ({ id: p.id, L: T.letterOf(p), d: p.d })), log: T.logText(), over: S.over || (S.ending ? 'ending' : null) };
}, { mine, word, opp });
const sorted = a => a.slice().sort().join('');

test('語の表と枚数（作者が決めた。attack-words.js）', async ({ page }) => {
  const r = await page.evaluate(() => { const T = window.HB_TEST, by = k => [...T.ATK.map].filter(([, v]) => v === k).map(([w]) => w);
    return { split: by('split'), turn: by('turn'), flip: by('flip'), count: T.ATK.count, prefer: T.ATK.prefer,
      n: { きる: T.atkN('split', 'きる'), きりさく: T.atkN('split', 'きりさく'), まわる: T.atkN('turn', 'まわる'), ころころ: T.atkN('turn', 'ころころ'), うら: T.atkN('flip', 'うら'), うらがえし: T.atkN('flip', 'うらがえし') } }; });
  expect(r.split).toEqual('きる わる さく きざむ きりさく きりきざむ きりつける きりふせる きりまくる きりかかる ぶつたぎる ちよんぎる たちきる たちわる まつぷたつ りようだん いつとうりようだん せつだん'.split(' '));
  expect(r.turn).toEqual('ころころ くるくる ぐるぐる かいてん だいかいてん せんかい まわる まわす ころがる ころがす ころぶ ころげる'.split(' '));
  expect(r.flip).toEqual('うらがえし うらがえす はんてん どんでんがえし でんぐりがえし つばめがえし かえし うら おもて たたみかえし'.split(' '));
  expect(r.count).toEqual({ split: [1, 1], turn: [1, 2], flip: [1, 2] }); // 割るはいつも1枚。回す・裏返すは3字まで1枚、4字以上2枚
  expect(r.prefer).toEqual({ split: 'はい', turn: 'はい', flip: 'はい' });
  expect(r.n).toEqual({ きる: 1, きりさく: 1, まわる: 1, ころころ: 2, うら: 1, うらがえし: 2 });
});

test('CPU に きる を投げると、CPU のカゴの札が1枚割れて1枚増える。届いた字（き・る）は割れない', async ({ page }) => {
  const r = await throwAt(page, { mine: ['き', 'る'], opp: ['は', 'し', 'し'] });
  expect(r.gone).toBe(1);
  expect(sorted(r.now)).toBe(sorted(['し', 'し', 'き', 'る', '｜', 'よ'])); // は が ｜＋よ に。3＋届いた2＋割れて1枚増える＝6
  expect(r.log).toContain('自分の「きる」で CPU の は が割れた（｜＋よ）');
});

test('割れる札と割れない札が混ざっているとき、割れる札が割れる（何度でも空振りしない）', async ({ page }) => {
  const r = await page.evaluate(() => { const T = window.HB_TEST, S = T.S(); const out = [];
    for (let i = 0; i < 40; i++) { S.used.clear(); S.mine = ['き', 'る'].map(l => T.mk(l)); S.opp = ['し', 'よ', 'は', 'ろ'].map(l => T.mk(l)); S.sel = S.mine.map(p => p.id); T.doThrow(); out.push(S.opp.map(T.letterOf).sort().join('')); }
    return out; });
  expect(new Set(r).size).toBe(1);
  expect(r[0]).toBe(['し', 'よ', 'ろ', 'き', 'る', '｜', 'よ'].sort().join(''));
});

test('割れる札が1枚も無いときだけ空振り（ログに出す）。札は変わらない', async ({ page }) => {
  const r = await throwAt(page, { mine: ['き', 'る'], opp: ['し', 'よ', 'ろ'] });
  expect(r.gone).toBe(0);
  expect(sorted(r.now)).toBe(sorted(['し', 'よ', 'ろ', 'き', 'る']));
  expect(r.log).toContain('自分の「きる」は空振り');
});

test('優先の切り替え：いいえ にすると全部の札から選び、割れなければ空振り（9枚のうち割れるのは1枚）', async ({ page }) => {
  const r = await page.evaluate(() => { const T = window.HB_TEST, S = T.S(); const hit = [], miss = []; T.ATK.prefer.split = 'いいえ';
    for (let i = 0; i < 250; i++) { S.used.clear(); S.mine = ['き', 'る'].map(l => T.mk(l)); S.opp = ['は', ...Array(8).fill('し')].map(l => T.mk(l)); S.sel = S.mine.map(p => p.id); T.doThrow();
      (S.opp.length === 12 ? hit : miss).push(1); }
    T.ATK.prefer.split = 'はい'; return { hit: hit.length, miss: miss.length }; });
  expect(r.hit).toBeGreaterThan(0); expect(r.miss).toBeGreaterThan(0); expect(r.hit + r.miss).toBe(250);
});

test('回す：まわる（3字）で1枚、ころころ（4字）で2枚。見た目が変わる札から選ぶ', async ({ page }) => {
  const a = await throwAt(page, { mine: ['ま', 'わ', 'る'], opp: ['い', 'い', 'い', 'い'] });
  expect(a.gone).toBe(1); expect(a.now.filter(l => l === 'こ').length).toBe(1); expect(a.log).toContain('自分の「まわる」で CPU の い が回った（い→こ）');
  const b = await throwAt(page, { mine: ['こ', 'ろ', 'こ', 'ろ'], opp: ['い', 'い', 'い', 'い'] });
  expect(b.gone).toBe(2);
});

test('裏返す：うらがえし（5字）で2枚、うら（2字）で1枚', async ({ page }) => {
  const a = await throwAt(page, { mine: ['う', 'ら', 'が', 'え', 'し'], opp: ['い', 'い', 'い', 'い'] });
  expect(a.gone).toBe(2); expect(a.now.filter(l => l === 'り').length).toBe(2);
  const b = await throwAt(page, { mine: ['う', 'ら'], opp: ['い', 'い', 'い', 'い'] });
  expect(b.gone).toBe(1); expect(b.now.filter(l => l === 'り').length).toBe(1);
});

test('CPU が投げた技が自分のカゴに効く：きる で は が ｜＋よ に割れる', async ({ page }) => {
  const r = await cpuThrows(page, { mine: ['は', 'し', 'よ'], word: 'きる' });
  expect(sorted(r.now)).toBe(sorted(['し', 'よ', 'き', 'る', '｜', 'よ']));
  expect(r.log).toContain('相手の「きる」で は が割れた（｜＋よ）');
});

test('こ・こ・し に うら を届けると、何度でも し が裏返る（こ は裏返しても同じ形）', async ({ page }) => {
  const r = await page.evaluate(() => { const T = window.HB_TEST, S = T.S(); const out = [];
    for (let i = 0; i < 30; i++) { S.used.clear(); S.mine = ['こ', 'こ', 'し'].map(l => T.mk(l)); S.opp = ['う', 'ら'].map(l => T.mk(l)); T.cpuThrow('うら');
      out.push(S.mine.slice(0, 3).map(p => `${p.r}${p.f}`).join('/')); } return out; });
  expect(new Set(r).size).toBe(1);
  expect(r[0]).toBe('10/10/01'); // こ・こ はそのまま、し（0,0）が裏返って（0,1）
});

test('変わる札が足りないときは、変わらない札も選ばれる（し1枚だけ変わる。うらがえし＝2枚）', async ({ page }) => {
  const r = await cpuThrows(page, { mine: ['し', 'こ', 'こ'], word: 'うらがえし' });
  expect(r.changed).toBe(1); // 変わった（見た目が違う）のは し だけ
  expect(r.log).toMatch(/相手の「うらがえし」で .+・.+ が裏返った/); // 2枚に効いた（1枚は変わらず）
});

test('表に無い語では何も起きない（ログに空振りも出ない）', async ({ page }) => {
  const r = await cpuThrows(page, { mine: ['は', 'し', 'い'], word: 'いし' });
  expect(sorted(r.now)).toBe(sorted(['は', 'し', 'い', 'い', 'し']));
  expect(r.changed).toBe(0); expect(r.log).not.toContain('空振り');
  expect(await page.evaluate(() => window.HB_TEST.atkKind('したく'))).toBe(null);
});

test('チュートリアルでは効かない', async ({ page }) => {
  const r = await page.evaluate(() => { const T = window.HB_TEST, S = T.S(); T.TUT.on = true; S.mine = ['は', 'し', 'よ'].map(l => T.mk(l)); S.opp = ['き', 'る'].map(l => T.mk(l)); T.cpuThrow('きる'); T.TUT.on = false; return S.mine.map(T.letterOf).join(''); });
  expect(r).toBe('はしよきる');
});

test('技で変わった札で作った言葉の★は増えない（自分で回せば1）', async ({ page }) => {
  // 技で い→こ になった札と し で「こし」＝★0。自分で回して こ にした札なら★1（ふつうの工夫）
  const viaAttack = await page.evaluate(() => { const T = window.HB_TEST, S = T.S();
    for (let i = 0; i < 80; i++) { S.used.clear(); S.mine = ['い', 'し'].map(l => T.mk(l)); S.opp = ['ま', 'わ', 'る'].map(l => T.mk(l)); T.cpuThrow('まわる');
      if (T.letterOf(S.mine[0]) === 'こ' && T.letterOf(S.mine[1]) === 'し') { S.sel = [S.mine[0].id, S.mine[1].id]; return T.comboOf([S.mine[0], S.mine[1]]); } }
    return -1; });
  expect(viaAttack).toBe(0);
  const byHand = await page.evaluate(() => { const T = window.HB_TEST, S = T.S(); S.mine = ['い', 'し'].map(l => T.mk(l)); S.sel = [S.mine[0].id]; T.doTurn('回す'); return T.comboOf([S.mine[0], S.mine[1]]); });
  expect(byHand).toBe(1);
});

test('CPU の札は ＞・⊂ にならない（CPU の TURN と同じ変わり方だけ）。い→こ・く→へ は効く', async ({ page }) => {
  const r = await page.evaluate(() => { const T = window.HB_TEST, S = T.S(), seen = new Set();
    for (let i = 0; i < 60; i++) { for (const w of ['まわる', 'うら']) { S.used.clear(); S.mine = [...w].map(l => T.mk(l)); S.opp = ['く', 'し', 'つ', 'へ', 'い'].map(l => T.mk(l)); S.sel = S.mine.map(p => p.id); T.doThrow(); S.opp.slice(0, 5).forEach(p => seen.add(T.letterOf(p))); } }
    return [...seen]; });
  expect(r).not.toContain('＞'); expect(r).not.toContain('⊂'); expect(r).not.toContain(null);
});

test('「どっち」を開いたまま技を食らったら、候補を閉じる', async ({ page }) => {
  const r = await page.evaluate(() => { const T = window.HB_TEST, S = T.S(); S.mine = ['は', 'こ'].map(l => T.mk(l)); S.opp = ['き', 'る'].map(l => T.mk(l)); S.sel = S.mine.map(p => p.id); S.choose = ['x']; T.cpuThrow('きる'); return S.choose; });
  expect(r).toBe(null);
});

test('技で割れた2枚をくっつけ直すと元の札に戻る（往復は数えない）', async ({ page }) => {
  const r = await page.evaluate(() => { const T = window.HB_TEST, S = T.S(); S.mine = ['は', 'し'].map(l => T.mk(l)); S.opp = ['き', 'る'].map(l => T.mk(l)); T.cpuThrow('きる');
    const parts = S.mine.filter(p => ['｜', 'よ'].includes(T.letterOf(p))); const ids = S.mine.map(p => p.d);
    const n = T.mergeMade(parts.find(p => T.letterOf(p) === '｜'), parts.find(p => T.letterOf(p) === 'よ'), 'は', {});
    return { before: ids, back: n.d, k: T.comboOf([n]) }; });
  expect(r.back).toBe('は'); expect(r.k).toBe(0);
});

test('上限を超えたら負け：割ってカゴが1枚増えて超えたとき（いまの決まりどおり）', async ({ page }) => {
  const r = await page.evaluate(() => { const T = window.HB_TEST, S = T.S(); S.mine = ['は', ...Array(10).fill('し')].map(l => T.mk(l)); S.opp = ['き', 'る'].map(l => T.mk(l)); // 11＋届く2＝13 → 割れて14（まだ負けない）
    T.cpuThrow('きる'); const a = S.mine.length + ':' + (S.over || (S.ending ? 'ending' : '')); // 14 は負けない
    S.ending = false; S.over = null; S.mine = ['は', ...Array(11).fill('し')].map(l => T.mk(l)); S.opp = ['き', 'る'].map(l => T.mk(l)); // 12＋2＝14 → 割れて15＝負け
    T.cpuThrow('きる'); return { a, b: S.mine.length + ':' + (S.over || (S.ending ? 'ending' : '')) }; });
  expect(r.a).toBe('14:'); expect(r.b).toBe('15:ending');
});

test('音：自分の札に効くとき（CPU の技）も、CPU の札に効かせたとき（自分の技）も、その動きの音を鳴らす', async ({ page }) => {
  const r = await page.evaluate(() => { const T = window.HB_TEST, S = T.S(), played = []; window.HB_SE.play = k => played.push(k);
    S.mine = ['は', 'し', 'よ'].map(l => T.mk(l)); S.opp = ['ま', 'わ', 'る'].map(l => T.mk(l)); T.cpuThrow('まわる'); const a = played.splice(0);
    S.used.clear(); S.mine = ['う', 'ら'].map(l => T.mk(l)); S.opp = ['い', 'い', 'い'].map(l => T.mk(l)); S.sel = S.mine.map(p => p.id); T.doThrow(); const b = played.splice(0);
    S.mine = ['は', 'し'].map(l => T.mk(l)); S.opp = ['い', 'し'].map(l => T.mk(l)); T.cpuThrow('いし'); const c = played.splice(0); return { a, b, c }; });
  expect(r.a).toEqual(['turn']); expect(r.b).toEqual(['throw', 'flip', 'drop']); /* うら を投げてカゴが空になり、すぐ濁音が落ちてきて鳴る（HB-086） */ expect(r.c).toEqual([]); // 表に無い語（いし）では鳴らさない
});

test('ふたりで：相手の技が届いたら、受けた側の端末で札を選んで効かせる。投げた側は変わった札を見る', async ({ page }) => {
  const r = await page.evaluate(() => { const T = window.HB_TEST, S = T.S(); T.NET.mode = 'online'; S.used.clear(); S.mine = ['は', 'し', 'よ'].map(l => T.mk(l));
    T.onOpponentThrow({ player: 'x', word: 'きる', stars: 0, trail: '' });
    const mine = S.mine.map(T.letterOf).sort().join('');
    // 投げた側：まわる を投げたあと、相手のカゴ（届いたもの）の い が こ になったら、その場所に動きの印が付く（動きを減らす設定では付かない＝待ちだけ確かめる）
    S.oppL = ['い', 'し', 'よ']; S.oppO = [0, 0, 0]; T.atkThrowOnline('まわる'); const w0 = !!S.atkWait; T.onOppBasket({ l: ['こ', 'し', 'よ', 'ま', 'わ', 'る'], o: [0, 0, 0, 0, 0, 0] }); const w1 = !!S.atkWait;
    T.NET.mode = 'cpu'; return { mine, w0, w1 }; });
  expect(r.mine).toBe(['し', 'よ', 'き', 'る', '｜', 'よ'].sort().join(''));
  expect(r.w0).toBe(true); expect(r.w1).toBe(false); // 変わった札が見つかったので待ちを外した
});

test.describe('食らいエフェクト（動きを許した設定）', () => {
  test.use({ reducedMotion: 'no-preference' });
  test('割る：カゴの真ん中に斜めの線が一閃し、選ばれた札が割れる。動いている間は自分の手を止める', async ({ page }) => {
    await page.evaluate(() => { const T = window.HB_TEST, S = T.S(); T.ATK_FX.lineMs = 1200; T.FX.splitMs = 1500; /* 線・割れる動きが見える間を長くして、負荷で見落とさない */ S.mine = ['は', 'し', 'よ'].map(l => T.mk(l)); S.opp = ['き', 'る'].map(l => T.mk(l)); S.sel = []; T.cpuThrow('きる'); T.render(); });
    await expect(page.locator('#basket .atkline')).toHaveCount(1);
    expect(await page.evaluate(() => window.HB_TEST.S().busy)).toBe(true);
    await expect(page.locator('.tile.cut .half')).toHaveCount(2);
    await page.waitForFunction(() => !window.HB_TEST.S().busy);
    await expect(page.locator('#basket .atkline, .tile .half')).toHaveCount(0);
    expect(await page.evaluate(() => window.HB_TEST.S().mine.map(window.HB_TEST.letterOf).sort().join(''))).toBe(['し', 'よ', 'き', 'る', '｜', 'よ'].sort().join(''));
  });
  test('回す・裏返す：選ばれた札が回る・裏返る動きのあと、新しい向きになる', async ({ page }) => {
    await page.evaluate(() => { const T = window.HB_TEST, S = T.S(); S.mine = ['い', '十', '十'].map(l => T.mk(l)); S.opp = ['ま', 'わ', 'る'].map(l => T.mk(l)); S.sel = []; T.cpuThrow('まわる'); T.render(); });
    await expect.poll(() => page.evaluate(() => window.HB_TEST.S().busy)).toBe(true);
    await expect.poll(() => page.evaluate(() => document.querySelectorAll('.tile .face').length && document.getAnimations().some(a => a.effect && a.effect.target && a.effect.target.classList && a.effect.target.classList.contains('face')))).toBe(true);
    await page.waitForFunction(() => !window.HB_TEST.S().busy);
    expect(await page.evaluate(() => window.HB_TEST.S().mine.slice(0, 3).map(window.HB_TEST.letterOf).join(''))).toBe('こ十十');
  });
  test('投げた側：あいての行にも同じ動き（斬撃は線、回す・裏返すは札が回る・裏返る）', async ({ page }) => {
    await page.evaluate(() => { const T = window.HB_TEST, S = T.S(); T.ATK_FX.lineMs = 1500; S.used.clear(); S.mine = ['き', 'る'].map(l => T.mk(l)); S.opp = ['は', 'し', 'し'].map(l => T.mk(l)); S.sel = S.mine.map(p => p.id); T.doThrow(); });
    await expect(page.locator('#oppSlots .atkline')).toHaveCount(1);
    await expect.poll(() => page.evaluate(() => window.HB_TEST.S().opp.length)).toBe(6);
    await page.waitForFunction(() => !window.HB_TEST.OPPFX());
  });
});

// お・み が字の表に入った（HB-077, D-103）ので、作者が決めた おもて（お）・たたみかえし（み）も言葉として通り、裏返す技として効く
test('おもて・たたみかえし が投げられる。裏返す技で相手の札（い→り）が裏返る（D-103）', async ({ page }) => {
  const a = await throwAt(page, { mine: ['お', 'も', 'て'], opp: ['い', 'し', 'し'] });
  expect(a.log).toContain('おもて');
  expect(sorted(a.now)).toBe(sorted(['り', 'し', 'し', 'お', 'も', 'て']));
  const b = await throwAt(page, { mine: ['た', 'た', 'み', 'か', 'え', 'し'], opp: ['い', 'し', 'し'] });
  expect(b.now.filter(l => l === 'り').length).toBe(1); // 4字以上なので2枚まで。い は1枚だけ
  expect(b.log).toContain('たたみかえし');
});

// 全部のせ「かなかなころころ」（HB-090・D-110）。きる・くるくる・はんてん が同時に。ロゴの字が縁を転がって、当たった札から 切れる → 回る → 裏返る。
// 枚数（きる1・くるくる2・はんてん2）は編集の仮置き（attack-words.js の allCount）。「かなかなころころ」は辞書に無い語なので、公開ページでは作者が extra_words に足すまで投げられない（テストは EXTRA で足して通す）
const ALL_WORD = 'かなかなころころ', ALL_MINE = [...ALL_WORD];
const OPP5 = ['は', 'い', 'い', 'い', 'い']; // 5＋届いた8字＋割れて1枚＝14（上限14をこえない）

test('全部のせ：語の表（all）と枚数。ほかの技の表は変わらない', async ({ page }) => {
  const r = await page.evaluate(() => { const T = window.HB_TEST; return { all: [...T.ATK.map].filter(([, v]) => v === 'all').map(([w]) => w), kind: T.atkKind('かなかなころころ'), n: T.ATK.all,
    kinds: T.atkAllKinds(), count: T.ATK.count, rollMs: T.ATK_FX.rollMs, others: [T.atkKind('きる'), T.atkKind('ころころ'), T.atkKind('はんてん'), T.atkKind('かなかな')] }; });
  expect(r.all).toEqual(['かなかなころころ']); expect(r.kind).toBe('all');
  expect(r.n).toEqual({ split: 1, turn: 2, flip: 2 }); expect(r.kinds).toEqual(['split', 'turn', 'turn', 'flip', 'flip']);
  expect(r.count).toEqual({ split: [1, 1], turn: [1, 2], flip: [1, 2] }); // 既存の枚数は変えていない
  expect(r.rollMs).toBe(1800); expect(r.others).toEqual(['split', 'turn', 'flip', null]);
});

test('全部のせ：札は重ならず、割る1・回す2・裏返す2（40回）。足りない分は空振り', async ({ page }) => {
  const r = await page.evaluate(() => { const T = window.HB_TEST, out = [];
    for (let i = 0; i < 40; i++) { const pool = ['は', 'い', 'い', 'い', 'い'].map(l => T.mk(l)), got = T.atkPickAll(pool, false);
      out.push({ n: got.length, uniq: new Set(got.map(g => g.p.id)).size, kinds: ['split', 'turn', 'flip'].map(k => got.filter(g => g.kind === k).length), splitOk: got.filter(g => g.kind === 'split').every(g => T.atkCanSplit(g.p)) }); }
    const few = T.atkPickAll(['し', 'し', 'し'].map(l => T.mk(l)), false), none = T.atkPickAll([], false);
    return { out, few: ['split', 'turn', 'flip'].map(k => few.filter(g => g.kind === k).length), none: none.length }; });
  r.out.forEach(o => { expect(o.n).toBe(5); expect(o.uniq).toBe(5); expect(o.kinds).toEqual([1, 2, 2]); expect(o.splitOk).toBe(true); });
  expect(r.few).toEqual([0, 2, 1]); // 割れる札が無い→割るは空振り。のこり3枚を 回す2・裏返す1（札が足りない）
  expect(r.none).toBe(0);
});

test('全部のせ：CPU に投げると、割れる・回る・裏返るが同時に効く（動きを減らす設定＝演出なしで、効きはすぐ）', async ({ page }) => {
  const r = await throwAt(page, { mine: ALL_MINE, opp: OPP5 });
  expect(r.log).toContain('自分の「かなかなころころ」で CPU の ');
  expect(r.log).toContain('が割れた'); expect(r.log).toContain('が回った'); expect(r.log).toContain('が裏返った');
  expect(r.now.length).toBe(5 + 8 + 1); // CPU の札5＋届いた8字＋割れて1枚増える
  expect(await page.evaluate(() => document.querySelectorAll('.rollfx').length)).toBe(0); // 転がる演出は出ない
});

test('全部のせ：CPU の札が無いときは空振り（ログに出す）', async ({ page }) => {
  const r = await throwAt(page, { mine: ALL_MINE, opp: [] });
  expect(r.log).toContain('自分の「かなかなころころ」は空振り');
});

test('全部のせ：受けた側（自分のカゴ）にも同じ効き。届いた字は変わらない（動きを減らす設定）', async ({ page }) => {
  const r = await cpuThrows(page, { mine: OPP5, word: ALL_WORD });
  expect(r.log).toContain('「かなかなころころ」で ');
  expect(r.log).toContain('が割れた'); expect(r.log).toContain('が回った'); expect(r.log).toContain('が裏返った');
  expect(r.tiles.length).toBe(5 + 8 + 1);
  expect(r.tiles.filter(t => ALL_MINE.includes(t.L)).length).toBeGreaterThanOrEqual(8); // 届いた8字（か・な・こ・ろ）はそのまま
});

test('全部のせ：ふたりで。相手の投げが届いたら、受けた側の端末で札を選んで効かせる', async ({ page }) => {
  const r = await page.evaluate(() => { const T = window.HB_TEST, S = T.S(); T.NET.mode = 'online'; S.used.clear(); S.mine = ['は', 'い', 'い', 'い', 'い'].map(l => T.mk(l));
    T.onOpponentThrow({ player: 'x', word: 'かなかなころころ', stars: 0, trail: '' }); const n = S.mine.length, log = T.logText(); T.NET.mode = 'cpu'; return { n, log }; });
  expect(r.n).toBe(5 + 8 + 1); expect(r.log).toContain('が割れた'); expect(r.log).toContain('が回った'); expect(r.log).toContain('が裏返った');
});

test('全部のせ：技が先に札を割ったあとで、自分の割るが終わっても、別の札が消えない（レビューの指摘。doSplit の一行）', async ({ page }) => {
  const r = await page.evaluate(async () => { const T = window.HB_TEST, S = T.S(); S.mine = ['は', 'し', 'よ'].map(l => T.mk(l)); const p = S.mine[0]; S.sel = [p.id]; T.doSplit();
    S.mine.splice(S.mine.indexOf(p), 1, T.mk('｜'), T.mk('よ')); /* 技が先に割った */ const before = S.mine.map(T.letterOf).join(''); await new Promise(r => setTimeout(r, 50)); return { before, after: S.mine.map(T.letterOf).join('') }; });
  expect(r.after).toBe(r.before);
});

test.describe('全部のせの演出（動きを許した設定）', () => {
  test.use({ reducedMotion: 'no-preference' });
  const LOGO = ['ka1', 'ju1', 'yo1', 'ka2', 'ju2', 'yo2', 'ko', 'ro1', 'i', 'ro2'].map(n => 'img/logo/' + n + '.png');
  test('投げた側：ロゴの字10枚（img/logo/）が あいての行を転がり、終わると消える。札は当たった順に変わる', async ({ page }) => {
    await page.evaluate(() => { const T = window.HB_TEST, S = T.S(); T.ATK_FX.rollMs = 2400; S.used.clear(); S.mine = [...'かなかなころころ'].map(l => T.mk(l)); S.opp = ['は', 'い', 'い', 'い', 'い'].map(l => T.mk(l)); S.sel = S.mine.map(p => p.id); T.doThrow(); });
    await expect(page.locator('.rollfx img')).toHaveCount(10);
    expect(await page.evaluate(() => [...document.querySelectorAll('.rollfx img')].map(i => new URL(i.src).pathname.slice(1)))).toEqual(LOGO);
    expect(await page.evaluate(() => window.HB_TEST.S().busy)).toBe(false); // 入力は止めない
    await expect(page.locator('.rollfx')).toHaveCount(0, { timeout: 8000 });
    await expect.poll(() => page.evaluate(() => window.HB_TEST.logText())).toContain('が割れた');
    expect(await page.evaluate(() => window.HB_TEST.S().opp.length)).toBe(5 + 8 + 1);
  });
  test('受けた側：ロゴの字が自分のカゴの上を転がり、入力は止まらない。終わると きる・くるくる・はんてん が効いている', async ({ page }) => {
    await page.evaluate(() => { const T = window.HB_TEST, S = T.S(); T.ATK_FX.rollMs = 2400; S.mine = ['は', 'い', 'い', 'い', 'い'].map(l => T.mk(l)); S.opp = [...'かなかなころころ'].map(l => T.mk(l)); S.sel = []; T.cpuThrow('かなかなころころ'); T.render(); });
    await expect(page.locator('.rollfx img')).toHaveCount(10, { timeout: 8000 });
    expect(await page.evaluate(() => window.HB_TEST.S().busy)).toBe(false);
    await expect(page.locator('.rollfx')).toHaveCount(0, { timeout: 8000 });
    await expect.poll(() => page.evaluate(() => window.HB_TEST.logText()), { timeout: 8000 }).toContain('が裏返った');
    const r = await page.evaluate(() => { const T = window.HB_TEST, S = T.S(); return { n: S.mine.length, log: T.logText() }; });
    expect(r.n).toBe(5 + 8 + 1); expect(r.log).toContain('が割れた'); expect(r.log).toContain('が回った');
  });
});
