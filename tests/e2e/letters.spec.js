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
const ALT = [['し', '｜', 'い'], ['｜', 'く', 'い'], ['一', 'め', 'あ'], ['わ', '∘', 'ね'], ['｜', 'ま', 'ほ'], ['に', '一', 'た'], ['い', '一', 'け']];
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
  expect(multi.length).toBeGreaterThan(0); // いまは い＋一 → せ・け（D-069）
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

test('い＋一 の「どっち」は せ と け（D-069）', async ({ page }) => {
  await setBasket(page, ['い', '一']);
  await tapTiles(page, [0, 1]);
  await page.click('#aMerge');
  await expect(page.locator('#trayPick button')).toHaveText(['せ', 'け']);
});
