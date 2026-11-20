// 字の表（RECIPE・MERGE）。画面のボタン（割る・くっつける）で確かめる
const { test, expect } = require('@playwright/test');
const { openGame, startSolo, setBasket, tapTiles, press, state, expectClean } = require('../helpers');

test.beforeEach(async ({ page }, info) => { info.ctx = await openGame(page); await startSolo(page); });
test.afterEach(async ({}, info) => expectClean(info.ctx));

// 画面に出す形（∘ は ゜ で見せる）
const show = s => s.replace(/∘/g, '゜');

async function mergeTo(page, res) {
  await press(page, '#aMerge');
  if (await page.locator('#trayPick').isVisible()) await press(page, `#trayPick button[data-r="${res}"]`);
}

test('RECIPE の全部の字：割ると表どおりの2枚、その2枚をくっつけると元の字に戻る', async ({ page }) => {
  const recipe = await page.evaluate(() => window.HB_TEST.RECIPE);
  const keys = Object.keys(recipe);
  expect(keys.length).toBeGreaterThan(40);
  const bad = [];
  for (const k of keys) {
    if (k === 'り') continue; // り は割るだけ（くっつけて作らない。下の「り」のテスト。D-072）
    await setBasket(page, [k]);
    await tapTiles(page, [0]);
    if (!(await state(page)).canSplit) { bad.push(`${k}: 割るが押せない`); continue; }
    await press(page, '#aSplit');
    const a = await state(page);
    if (a.mine !== recipe[k].join('')) { bad.push(`${k}: 割ると ${a.mine}（表は ${recipe[k].join('')}）`); continue; }
    await tapTiles(page, [0, 1]);
    if (!(await state(page)).canMerge) { bad.push(`${k}: ${a.mine} をくっつけられない`); continue; }
    await mergeTo(page, k);
    const b = await state(page);
    if (b.mine !== k) bad.push(`${k}: くっつけ直すと ${b.mine}`);
  }
  expect(bad).toEqual([]);
});

// くっつけ方だけの別ルート（割ると RECIPE の割り方）。D-066 の前例の一覧と同じ
const ALT = [['し', '｜', 'い'], ['｜', 'く', 'い'], ['一', 'め', 'あ'], ['わ', '∘', 'ね'], ['｜', 'ま', 'ほ'], ['に', '一', 'た'], ['り', '一', 'け']];
for (const [a, b, r] of ALT) {
  test(`くっつけ方だけの別ルート：${show(a)}＋${show(b)}→${r}（どちらの順でも）`, async ({ page }) => {
    for (const order of [[a, b], [b, a]]) {
      await setBasket(page, order);
      await tapTiles(page, [0, 1]);
      expect((await state(page)).canMerge).toBe(true);
      await mergeTo(page, r);
      expect((await state(page)).mine).toBe(r);
    }
  });
}

test('｜＋へ は何にもならない（D-066。く の向きだけ）', async ({ page }) => {
  await setBasket(page, ['｜', 'へ']);
  await tapTiles(page, [0, 1]);
  expect((await state(page)).canMerge).toBe(false);
});

test('結果が2つあるくっつけ方は「どっち」が出て、選んだ字になる', async ({ page }) => {
  const multi = await page.evaluate(() => {
    const T = window.HB_TEST, out = [];
    for (const [k, rs] of Object.entries(T.MERGE)) if (rs.length > 1) out.push({ parts: [...k], rs });
    return out;
  });
  // い＋一 を せ だけにしたので、いまは結果が2つのくっつけ方はない（D-072。前は せ・け の「どっち」）。出るようになったら、下で字ごとに確かめる
  expect(multi).toEqual([]);
  for (const { parts, rs } of multi) {
    for (const r of rs) {
      await setBasket(page, parts);
      await tapTiles(page, [0, 1]);
      await page.click('#aMerge');
      const pick = page.locator('#trayPick');
      await expect(pick).toBeVisible();
      await expect(pick.locator('button')).toHaveText(rs);
      await page.click(`#trayPick button[data-r="${r}"]`);
      expect((await state(page)).mine).toBe(r);
    }
  }
});

test('い＋一 は せ だけ。「どっち」は出ない（D-072）', async ({ page }) => {
  await setBasket(page, ['い', '一']);
  await tapTiles(page, [0, 1]);
  await page.click('#aMerge');
  await expect(page.locator('#trayPick')).toBeHidden();
  expect((await state(page)).mine).toBe('せ');
});

test('う＋｜→か、か を割ると う＋｜、か＋゛→が、が を割ると か＋゛。う＋い→ふ はいまのまま（D-075）', async ({ page }) => {
  await setBasket(page, ['う', '｜']);
  await tapTiles(page, [0, 1]);
  await mergeTo(page, 'か');
  expect((await state(page)).mine).toBe('か');
  await press(page, '#aSplit');
  expect((await state(page)).mine).toBe('う｜');
  await setBasket(page, ['か', '゛']);
  await tapTiles(page, [0, 1]);
  await mergeTo(page, 'が');
  expect((await state(page)).mine).toBe('が');
  await press(page, '#aSplit');
  expect((await state(page)).mine).toBe('か゛');
  await setBasket(page, ['う', 'い']);
  await tapTiles(page, [0, 1]);
  await mergeTo(page, 'ふ');
  expect((await state(page)).mine).toBe('ふ');
  const t = await page.evaluate(() => ({ k: window.HB_TEST.BAG.includes('か') || window.HB_TEST.BAG.includes('が') }));
  expect(t.k).toBe(false); // 袋に入れない（作るしかない字）
});

async function turnOnce(page, letter, btn) {
  await setBasket(page, [letter]);
  await tapTiles(page, [0]);
  await press(page, btn);
  return (await state(page)).mine;
}

test('い を裏返すと り、り を裏返すと い。回すと い⇄こ はいまのまま（D-072）', async ({ page }) => {
  expect(await turnOnce(page, 'い', '#aFlip')).toBe('り');
  expect(await turnOnce(page, 'り', '#aFlip')).toBe('い');
  expect(await turnOnce(page, 'い', '#aRot')).toBe('こ');
  expect(await turnOnce(page, 'こ', '#aRot')).toBe('い');
  // 裏返してから回す・回してから裏返すも、字の形どおり
  expect(await turnOnce(page, 'り', '#aRot')).toBe('こ'); // り を回した形＝こ（仮置き）
});

test('こ は裏返しても こ（D-072）', async ({ page }) => {
  expect(await turnOnce(page, 'こ', '#aFlip')).toBe('こ');
  // 裏返したあとに回しても い（り にはならない）
  await press(page, '#aRot');
  expect((await state(page)).mine).toBe('い');
});

test('り を割ると ｜＋｜（い と同じ）。｜＋｜ をくっつけると い だけ（D-072）', async ({ page }) => {
  await setBasket(page, ['り']);
  await tapTiles(page, [0]);
  await press(page, '#aSplit');
  expect((await state(page)).mine).toBe('｜｜');
  await tapTiles(page, [0, 1]);
  await page.click('#aMerge');
  await expect(page.locator('#trayPick')).toBeHidden();
  expect((await state(page)).mine).toBe('い');
});

test('り＋一→け（どちらの順でも）。割ると ｜＋十（D-072）', async ({ page }) => {
  for (const order of [['り', '一'], ['一', 'り']]) {
    await setBasket(page, order);
    await tapTiles(page, [0, 1]);
    await mergeTo(page, 'け');
    expect((await state(page)).mine).toBe('け'); // できた字は選ばれたまま（D-070）
    await press(page, '#aSplit');
    expect((await state(page)).mine).toBe('｜十');
  }
});

test('り は字の一覧（KANA）と回す・裏返す表（TURN）にあり、袋（BAG）にはない（D-072）', async ({ page }) => {
  const r = await page.evaluate(() => { const T = window.HB_TEST; return { kana: T.KANA.has('り'), bag: T.BAG.includes('り'),
    turnI: T.TURN['い'].map(x => x.join(':')), turnRi: T.TURN['り'].map(x => x.join(':')), turnKo: T.TURN['こ'].map(x => x.join(':')) }; });
  expect(r.kana).toBe(true);
  expect(r.bag).toBe(false);
  expect(r.turnI).toEqual(['こ:回した', 'り:裏返した']);
  expect(r.turnRi).toEqual(['い:裏返した', 'こ:回した']);
  expect(r.turnKo).toEqual(['い:回した']);
});

// ---- HB-042（D-076）：て・で・そ・ぞ・ん・え ----
test('一＋⊂→て（どちらの順でも）。て を割ると 一＋⊂。｜＋⊂→と はいまのまま（D-076）', async ({ page }) => {
  for (const order of [['一', '⊂'], ['⊂', '一']]) {
    await setBasket(page, order);
    await tapTiles(page, [0, 1]);
    await mergeTo(page, 'て');
    expect((await state(page)).mine).toBe('て');
    await press(page, '#aSplit');
    expect((await state(page)).mine).toBe('一⊂');
  }
  await setBasket(page, ['｜', '⊂']);
  await tapTiles(page, [0, 1]);
  await mergeTo(page, 'と');
  expect((await state(page)).mine).toBe('と');
});

test('て を裏返して回す（裏返す→回す×3）と ん。ん から同じ向きで て に戻る。ん を割れない（D-076）', async ({ page }) => {
  await setBasket(page, ['て']);
  await tapTiles(page, [0]);
  await press(page, '#aFlip');
  expect((await state(page)).mine).not.toBe('て'); // 裏返しただけでは字にならない
  for (let i = 0; i < 3; i++) await press(page, '#aRot');
  const s = await state(page);
  expect(s.mine).toBe('ん');
  expect(s.canSplit).toBe(false);
  await press(page, '#aFlip');
  for (let i = 0; i < 3; i++) await press(page, '#aRot');
  expect((await state(page)).mine).toBe('て');
});

test('こ＋ん→え（どちらの順でも）。え を割ると こ＋ん（D-076）', async ({ page }) => {
  for (const order of [['こ', 'ん'], ['ん', 'こ']]) {
    await setBasket(page, order);
    await tapTiles(page, [0, 1]);
    await mergeTo(page, 'え');
    expect((await state(page)).mine).toBe('え');
    await press(page, '#aSplit');
    expect((await state(page)).mine).toBe('こん');
  }
});

test('く を裏返した部品（＞）＋て→そ。そ を割ると ＞＋て。く を裏返すと ＞、もう一度で く（D-076）', async ({ page }) => {
  expect(await turnOnce(page, 'く', '#aFlip')).toBe('＞');
  expect(await turnOnce(page, '＞', '#aFlip')).toBe('く');
  for (const order of [['＞', 'て'], ['て', '＞']]) {
    await setBasket(page, order);
    await tapTiles(page, [0, 1]);
    await mergeTo(page, 'そ');
    expect((await state(page)).mine).toBe('そ');
    await press(page, '#aSplit');
    expect((await state(page)).mine).toBe('＞て');
  }
  // く・へ はいまのまま
  expect(await turnOnce(page, 'く', '#aRot')).toBe('へ');
  expect(await turnOnce(page, 'へ', '#aRot')).toBe('＞'); // へ をもう一回回した形＝く を180°回した形＝＞（これまでは字にならない黄色い札だった）
});

test('て＋゛→で、そ＋゛→ぞ。割ると元に戻る（D-076）', async ({ page }) => {
  for (const [a, r] of [['て', 'で'], ['そ', 'ぞ']]) {
    await setBasket(page, [a, '゛']);
    await tapTiles(page, [0, 1]);
    await mergeTo(page, r);
    expect((await state(page)).mine).toBe(r);
    await press(page, '#aSplit');
    expect((await state(page)).mine).toBe(a + '゛');
  }
});

test('て・で・そ・ぞ・ん・え は字の一覧（KANA）にあり、袋（BAG）にはない（D-076）', async ({ page }) => {
  const r = await page.evaluate(() => { const T = window.HB_TEST; return [...'てでそぞんえ'].map(c => [c, T.KANA.has(c), T.BAG.includes(c)]); });
  for (const [c, k, b] of r) { expect(k, c).toBe(true); expect(b, c).toBe(false); }
});
