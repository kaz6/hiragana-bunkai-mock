// 場面の組（HB-039, D-074）：挨拶を挨拶で返したら「あいさつ！」。ほめるだけで、★・カゴの数には効かない
const { test, expect } = require('@playwright/test');
const { openGame, startSolo, expectClean } = require('../helpers');

test.beforeEach(async ({ page }, info) => { info.ctx = await openGame(page); await startSolo(page); });
test.afterEach(async ({}, info) => expectClean(info.ctx));

// 相手→自分の順に、言葉が投げられた体で showMeaning を呼ぶ。声（#combo）の文とログの一行を返す
const run = (page, seq) => page.evaluate(seq => {
  const T = window.HB_TEST; T.newGame();
  const out = [];
  for (const [who, w] of seq) {
    const before = T.S().log.length, mine = T.S().mine.length, opp = T.S().opp.length;
    document.getElementById('combo').classList.remove('on'); document.getElementById('combo').textContent = '';
    T.showMeaning(w, who);
    out.push({ voice: document.getElementById('combo').innerText, logged: T.logText ? T.logText() : '', same: T.S().log.length === before && T.S().mine.length === mine && T.S().opp.length === opp });
  }
  return out;
}, seq);

test('よろしく→よろしこ で声が出て、ログに一行。カゴ・記録は変わらない', async ({ page }) => {
  const r = await run(page, [['op', 'よろしく'], ['me', 'よろしこ']]);
  expect(r[0].voice).toBe('');
  expect(r[1].voice).toContain('あいさつ！');
  expect(r[1].voice).not.toContain('Greeting!'); // 日本語のときは英語の添えを出さない（D-091）。English のときは lang.spec.js
  expect(r[1].logged).toContain('挨拶返し（よろしく→よろしこ）');
  expect(r[1].same).toBe(true);
});

test('相手の返しでも出る（自分→相手）。へーい（ー入り）も組', async ({ page }) => {
  const r = await run(page, [['me', 'はーい'], ['op', 'へーい']]);
  expect(r[1].voice).toContain('あいさつ！');
});

test('組に無い語では出ない。組の語でも、前が組に無ければ出ない', async ({ page }) => {
  const r = await run(page, [['op', 'よろしく'], ['me', 'いちご'], ['op', 'どうも']]);
  expect(r[1].voice).not.toContain('あいさつ！');
  expect(r[2].voice).not.toContain('あいさつ！'); // 前（自分のいちご）は組に無い
});

test('自分の投げが続いたときは出ない', async ({ page }) => {
  const r = await run(page, [['op', 'よろしく'], ['me', 'どうも'], ['me', 'よろしこ']]);
  expect(r[1].voice).toContain('あいさつ！');
  expect(r[2].voice).not.toContain('あいさつ！');
});

test('新しい一戦では前の投げを覚えていない', async ({ page }) => {
  const r = await page.evaluate(() => {
    const T = window.HB_TEST; T.newGame(); T.showMeaning('よろしく', 'op'); T.newGame();
    document.getElementById('combo').textContent = ''; T.showMeaning('よろしこ', 'me');
    return document.getElementById('combo').innerText;
  });
  expect(r).not.toContain('あいさつ！');
});

test('表の8語はどれも組に入っている', async ({ page }) => {
  const r = await page.evaluate(() => { const T = window.HB_TEST; return ['よろしく', 'よろしこ', 'どうも', 'はろー', 'はーい', 'へい', 'へーい', 'ちーす'].filter(w => !(T.SCENE_OF[w] || []).includes('挨拶')); });
  expect(r).toEqual([]);
});
