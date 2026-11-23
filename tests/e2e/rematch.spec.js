// ふたりでの「もう一回」＝同じ部屋での再戦（HB-061, D-094）。Supabase は止め方（tests/helpers.js）の channel で、送ったものを見る。本物には送らない
const { test, expect } = require('@playwright/test');
const { openGame, expectClean } = require('../helpers');

test.beforeEach(async ({ page }, info) => { info.ctx = await openGame(page); });
test.afterEach(async ({}, info) => expectClean(info.ctx));

/** ふたりでの一戦が終わって結果の画面が出ているところまで作る。me＝自分の playerId（'a' が先頭＝合図を出す側、'b' は受ける側） */
async function onlineResult(page, me) {
  await page.evaluate(me => {
    const T = window.HB_TEST, N = T.NET, c = window.supabase.createClient();
    window.__hbPresence = { a: [{}], b: [{}] };
    N.client = c; N.playerId = me; N.roomKey = 'rk'; N.lobby = c.channel('hb-lobby-rk'); N.match = c.channel('hb-match-m1');
    N.mode = 'online'; N.matchId = 'm1'; N.starting = true; N.cap = 14; N.partnerGone = false; N.cd = 0; N.again = { me: false, op: false };
    document.getElementById('menu').hidden = true; T.newGame(); const S = T.S(); S.over = 'win'; T.render();
  }, me);
}
const sent = page => page.evaluate(() => window.__hbCh.filter(x => x.msg.event !== 'basket').map(x => x.msg.event + ':' + JSON.stringify(x.msg.payload))); // basket（自分のカゴの知らせ）は再戦と関係ない
const note = page => page.locator('#resWait');

test('先頭の側：押すと「相手を待っている…」。相手も押したら新しい matchId で合図を出し、3秒数えて新しい一戦。前の match は閉じる', async ({ page }) => {
  await onlineResult(page, 'a');
  await expect(page.locator('#btnLeaveRes')).toBeVisible();
  await expect(note(page)).toBeHidden();
  await page.locator('#btnAgain').click();
  await expect(note(page)).toContainText('相手を待っている');
  await expect(page.locator('#btnAgain')).toBeDisabled();
  expect(await sent(page)).toEqual(['again:{"id":"a","matchId":"m1"}']); // 片方だけでは始まらない
  await page.evaluate(() => window.HB_TEST.onAgainMessage({ id: 'b', matchId: 'm1' }));
  const out = await sent(page);
  expect(out.length).toBe(2);
  const start = JSON.parse(out[1].replace(/^start:/, ''));
  expect(start.matchId).not.toBe('m1'); expect(start.cap).toBe(14);
  await expect(note(page)).toContainText('そろった');
  await expect(page.locator('#result')).toBeHidden({ timeout: 6000 }); // 3秒数えて始まる
  const r = await page.evaluate(() => ({ id: window.HB_TEST.NET.matchId, over: window.HB_TEST.S().over, removed: window.__hbRemoved, again: window.HB_TEST.NET.again }));
  expect(r.id).toBe(start.matchId); expect(r.over).toBe(null); expect(r.removed).toContain('hb-match-m1'); expect(r.again).toEqual({ me: false, op: false });
});

test('受ける側：相手の「もう一回」だけだと一言が出る。自分も押して合図が来たら新しい一戦。押す前の合図・前の一戦の知らせは受けない', async ({ page }) => {
  await onlineResult(page, 'b');
  await page.evaluate(() => window.HB_TEST.onStartMessage({ matchId: 'x9', cap: 14 })); // 押していないので無視
  expect(await page.evaluate(() => window.HB_TEST.NET.matchId)).toBe('m1');
  await page.evaluate(() => window.HB_TEST.onAgainMessage({ id: 'a', matchId: 'old' })); // 前の一戦の知らせ
  await expect(note(page)).toBeHidden();
  await page.evaluate(() => window.HB_TEST.onAgainMessage({ id: 'a', matchId: 'm1' }));
  await expect(note(page)).toContainText('相手はもう一回を待っている');
  await page.locator('#btnAgain').click();
  expect(await sent(page)).toEqual(['again:{"id":"b","matchId":"m1"}']); // 受ける側は合図を出さない
  await page.evaluate(() => window.HB_TEST.onStartMessage({ matchId: 'm2', cap: 14 }));
  await expect(page.locator('#result')).toBeHidden({ timeout: 6000 });
  const r = await page.evaluate(() => ({ id: window.HB_TEST.NET.matchId, cap: window.HB_TEST.NET.cap, removed: window.__hbRemoved }));
  expect(r.id).toBe('m2'); expect(r.cap).toBe(14); expect(r.removed).toContain('hb-match-m1');
});

test('今日の字は新しい matchId で決まる（二人とも同じ matchId から）', async ({ page }) => {
  const r = await page.evaluate(() => { const T = window.HB_TEST, sig = id => T.makeToday(T.seedRng('today-' + id)).more.join('') + '/' + T.makeToday(T.seedRng('today-' + id)).less.join('');
    return { a: sig('m1'), a2: sig('m1'), diff: new Set(Array.from({ length: 20 }, (_, i) => sig('m' + i))).size > 3 }; });
  expect(r.a).toBe(r.a2); expect(r.diff).toBe(true);
});

test('待っている間に相手が抜けたら「相手がいなくなった」。もう押せず、「退室」ではじめの画面に戻る', async ({ page }) => {
  await onlineResult(page, 'a');
  await page.locator('#btnAgain').click();
  await page.evaluate(() => { window.__hbPresence = { a: [{}] }; window.HB_TEST.onPartnerLeft(); });
  await expect(note(page)).toContainText('相手がいなくなった');
  await expect(page.locator('#btnAgain')).toBeDisabled();
  await page.locator('#btnLeaveRes').click();
  await expect(page.locator('#menu')).toBeVisible();
  const r = await page.evaluate(() => ({ lobby: window.HB_TEST.NET.lobby, mode: window.HB_TEST.NET.mode }));
  expect(r).toEqual({ lobby: null, mode: 'cpu' });
});

test('数えている間に相手が抜けたら、始まらない', async ({ page }) => {
  await onlineResult(page, 'a');
  await page.locator('#btnAgain').click();
  await page.evaluate(() => window.HB_TEST.onAgainMessage({ id: 'b', matchId: 'm1' }));
  await page.evaluate(() => { window.__hbPresence = { a: [{}] }; window.HB_TEST.onPartnerLeft(); });
  await expect(note(page)).toContainText('相手がいなくなった');
  await page.waitForTimeout(3500);
  expect(await page.evaluate(() => ({ id: window.HB_TEST.NET.matchId, over: window.HB_TEST.S().over }))).toEqual({ id: 'm1', over: 'win' });
});

test('English・한국어でも一言と「退室」が出る。ひとりでは出ない', async ({ page }) => {
  for (const [lang, want, leave] of [['en', 'Opponent is waiting for a rematch', 'Leave'], ['ko', '상대가 한 판 더를 기다리고 있어요', '퇴장']]) {
    await page.evaluate(l => { try { localStorage.setItem('hb.lang', l); } catch (e) {} }, lang);
    await page.reload();
    await page.waitForFunction(() => window.HB_TEST && window.HB_TEST.S && window.HB_TEST.S());
    await onlineResult(page, 'b');
    await page.evaluate(() => window.HB_TEST.onAgainMessage({ id: 'a', matchId: 'm1' }));
    await expect(note(page).locator('small.en')).toHaveText(want);
    await expect(note(page).locator('small.en')).toBeVisible();
    await expect(page.locator('#btnLeaveRes small.en')).toHaveText(leave);
  }
  await page.evaluate(() => { window.HB_TEST.leaveOnline(); const S = window.HB_TEST.S(); S.over = 'win'; window.HB_TEST.render(); });
  await expect(page.locator('#btnLeaveRes')).toBeHidden();
  await expect(note(page)).toBeHidden();
});

test('結果の画面で相手が抜けて戻っても、押していない再戦は始まらない。数えている間に抜けて戻っても始まらない（先頭・受ける側とも）', async ({ page }) => {
  const leaveBack = () => page.evaluate(() => { const T = window.HB_TEST, both = { a: [{}], b: [{}] };
    window.__hbPresence = { a: [{}] }; T.onPartnerLeft(); window.__hbPresence = both; T.onLobbyPresence(); }); // 抜ける → 戻る（在室の同期が呼ばれる）
  const same = async () => expect(await page.evaluate(() => ({ id: window.HB_TEST.NET.matchId, over: window.HB_TEST.S().over }))).toEqual({ id: 'm1', over: 'win' });
  for (const me of ['a', 'b']) {
    await onlineResult(page, me);
    await leaveBack();
    await page.evaluate(() => window.HB_TEST.onStartMessage({ matchId: 'm2', cap: 14 })); // 戻った相手の合図も受けない
    await page.waitForTimeout(3500);
    expect(await sent(page)).toEqual([]);
    await same();
  }
  await onlineResult(page, 'a');
  await page.locator('#btnAgain').click();
  await page.evaluate(() => window.HB_TEST.onAgainMessage({ id: 'b', matchId: 'm1' }));
  await leaveBack();
  await page.waitForTimeout(3500);
  await same();
});

test('対局中に相手が抜けて終わった結果では、「もう一回」は押せない（待ち続けない）', async ({ page }) => {
  await onlineResult(page, 'a');
  await page.evaluate(() => { const T = window.HB_TEST; T.newGame(); window.__hbPresence = { a: [{}] }; T.onPartnerLeft(); });
  await expect(page.locator('#result')).toBeVisible();
  await expect(page.locator('#btnAgain')).toBeDisabled();
  await expect(note(page)).toContainText('相手がいなくなった');
  expect(await sent(page)).toEqual([]);
});
