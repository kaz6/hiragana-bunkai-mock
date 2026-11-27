// 通信対戦の部屋の番号と、相手の投げの受け取り（HB-095）。偽の Supabase（tests/helpers.js）で、送ったもの・登録したものを見る。本物には触らない
const { test, expect } = require('@playwright/test');
const crypto = require('crypto');
const { openGame, expectClean } = require('../helpers');

test.beforeEach(async ({ page }, info) => { info.ctx = await openGame(page); });
test.afterEach(async ({}, info) => expectClean(info.ctx));

const sha32 = s => crypto.createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 32);

test('合言葉の番号：SHA-256 の先頭32文字（16進）。合言葉が違えば違う。同じなら同じ', async ({ page }) => {
  const r = await page.evaluate(async () => { const f = window.HB_TEST.roomKeyOf; return [await f('あいことば'), await f('あいことば'), await f('あいことば2'), await f('')]; });
  expect(r[0]).toBe(sha32('あいことば')); expect(r[0]).toMatch(/^[0-9a-f]{32}$/);
  expect(r[1]).toBe(r[0]); expect(r[2]).not.toBe(r[0]); expect(r[3]).toBe(sha32(''));
});

test('入室：lobby の名前は hb-lobby-{32文字}。合言葉が空なら入らない', async ({ page }) => {
  await page.click('#btnDuo');
  await page.click('#btnJoin');
  expect(await page.evaluate(() => window.__hbNames)).toEqual([]);
  await page.fill('#roomInput', 'ねこ');
  await page.click('#btnJoin');
  await expect.poll(() => page.evaluate(() => window.__hbNames)).toEqual(['hb-lobby-' + sha32('ねこ')]);
  expect(await page.evaluate(() => window.HB_TEST.NET.roomKey)).toBe(sha32('ねこ'));
});

/** ふたりでの一戦の途中（自分は me）まで作る。match の channel は openMatchChannel で作る */
async function onlineMatch(page, me, matchId) {
  await page.evaluate(([me, matchId]) => {
    const T = window.HB_TEST, N = T.NET, c = window.supabase.createClient();
    window.__hbPresence = { a: [{}], b: [{}] };
    N.client = c; N.playerId = me; N.roomKey = 'rk'; N.lobby = c.channel('hb-lobby-rk');
    N.mode = 'online'; N.matchId = matchId; N.starting = true; N.cap = 14; N.partnerGone = false; N.cd = 0; N.again = { me: false, op: false };
    document.getElementById('menu').hidden = true; T.newGame(); T.openMatchChannel(matchId);
  }, [me, matchId]);
}

test('対局の channel：投げは broadcast で受ける（表の読み取り postgres_changes は使わない）。届くと相手の言葉がカゴに入る', async ({ page }) => {
  await onlineMatch(page, 'a', 'k-1');
  const on = await page.evaluate(() => window.__hbOn.filter(x => x.ch === 'hb-match-k-1').map(x => x.type + ':' + (x.filter.event || '')));
  expect(on).toContain('broadcast:throw'); expect(on.some(x => x.startsWith('postgres_changes'))).toBe(false);
  expect(await page.evaluate(() => window.__hbOn.some(x => x.type === 'postgres_changes'))).toBe(false);
  const before = await page.evaluate(() => window.HB_TEST.S().mine.length);
  await page.evaluate(() => window.__hbEmit('hb-match-k-1', 'throw', { word: 'ねこ', stars: 2, trail: '', player: 'b' }));
  const r = await page.evaluate(() => { const S = window.HB_TEST.S(); return { n: S.mine.length, used: S.used.has('ねこ'), log: S.log.filter(l => l.who === 'op').map(l => l.word) }; });
  expect(r.n).toBe(before + 2); expect(r.used).toBe(true); expect(r.log).toEqual(['ねこ']);
});

test('受け取り：自分の投げ・形の違うものは捨てる', async ({ page }) => {
  await onlineMatch(page, 'a', 'k-2');
  const before = await page.evaluate(() => window.HB_TEST.S().mine.length);
  await page.evaluate(() => { const e = p => window.__hbEmit('hb-match-k-2', 'throw', p); e({ word: 'ねこ', player: 'a' }); e(null); e({}); e({ word: 5, player: 'b' }); e({ word: '', player: 'b' }); e({ word: 'a"><img src=x onerror=window.__pwn=1>', player: 'b' }); e({ word: 'ねこカ', player: 'b' }); });
  expect(await page.evaluate(() => window.HB_TEST.S().mine.length)).toBe(before);
});

test('受け取り：stars・trail は形を整える（stars は0〜9の整数、trail は < > & を除く）', async ({ page }) => {
  await onlineMatch(page, 'a', 'k-4');
  await page.evaluate(() => window.__hbEmit('hb-match-k-4', 'throw', { word: 'ねこ', stars: '9<b>', trail: 'ね→<img src=x onerror=window.__pwn=1>こ', player: 'b' }));
  const l = await page.evaluate(() => window.HB_TEST.S().log.filter(x => x.who === 'op')[0]);
  expect(l.k).toBe(0); expect(l.trail).not.toMatch(/[<>&"']/);
  await page.evaluate(() => window.__hbEmit('hb-match-k-4', 'throw', { word: 'いぬ', stars: 99, trail: 5, player: 'b' }));
  const l2 = await page.evaluate(() => window.HB_TEST.S().log.filter(x => x.who === 'op')[1]);
  expect(l2.k).toBe(9); expect(l2.trail).toBe('');
  expect(await page.evaluate(() => window.__pwn)).toBeUndefined();
});

test('部屋の形：合図を出す側が作る matchId は「32文字の16進-乱数」。表に入れる room もそれ', async ({ page }) => {
  const r = await page.evaluate(async () => { const T = window.HB_TEST, N = T.NET, c = window.supabase.createClient();
    N.client = c; N.playerId = 'a'; N.roomKey = await T.roomKeyOf('ねこ'); N.lobby = c.channel('hb-lobby-x'); N.mode = 'cpu';
    T.startAsLeader(); const m = window.__hbCh.filter(x => x.msg.event === 'start')[0].msg.payload.matchId;
    N.matchId = m; N.mode = 'online'; N.match = c.channel('hb-match-' + m); await T.insertThrow({ core: 'ねこ' }, []);
    return { m, room: window.__hbSent[0].row.room }; });
  expect(r.m).toMatch(/^[0-9a-f]{32}-[a-z0-9]{1,16}$/); expect(r.room).toBe(r.m);
});

test('投げ：表に入ったら（ok）match に {word, stars, trail, player} を broadcast。先着の 23505 では送らない', async ({ page }) => {
  await onlineMatch(page, 'a', 'k-3');
  const r1 = await page.evaluate(async () => { const T = window.HB_TEST; const res = await T.insertThrow({ core: 'ねこ' }, []); return { res, ch: window.__hbCh.filter(x => x.msg.event === 'throw'), sent: window.__hbSent.map(x => x.row) }; });
  expect(r1.res).toBe('ok');
  expect(r1.ch.length).toBe(1); expect(r1.ch[0].ch).toBe('hb-match-k-3'); expect(r1.ch[0].msg.type).toBe('broadcast');
  expect(r1.ch[0].msg.payload).toEqual({ word: 'ねこ', stars: r1.sent[0].stars, trail: r1.sent[0].trail, player: 'a' });
  expect(r1.sent[0].room).toBe('k-3'); // 表に入れる行の形はそのまま
  const r2 = await page.evaluate(async () => { window.__hbInsertError = { code: '23505' }; const res = await window.HB_TEST.insertThrow({ core: 'いぬ' }, []); window.__hbInsertError = { code: '42501' }; const res2 = await window.HB_TEST.insertThrow({ core: 'うし' }, []); return { res, res2, n: window.__hbCh.filter(x => x.msg.event === 'throw').length }; });
  expect(r2.res).toBe('dup'); expect(r2.res2).toBe('error'); expect(r2.n).toBe(1);
});
