// 画面のテストの共通（HB-035）
// - ページは http://hb.test/ として、リポジトリのファイルをそのまま返す（サーバーは立てない）
// - Supabase（supabase-js の CDN と *.supabase.co）はテストの中で止めて、決まった返事を返す。本物の表には書き込まない
// - extra_words は EXTRA_WORDS の固定の数語
// - それ以外の外への通信（フォントなど）は止める。止めたものは blocked に残る
const fs = require('fs');
const path = require('path');
const { expect } = require('@playwright/test');

const ROOT = path.join(__dirname, '..');
const ORIGIN = 'http://hb.test/';
// 固定の extra_words（めつ・よしよし は D-068・D-069 で本物の表に入れた語。すのー も D-068）
const EXTRA_WORDS = ['めつ', 'よしよし', 'すのー'];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };

// supabase-js の代わり。from(表).select().limit() と from(表).insert() と channel() だけ持つ
const STUB_SUPABASE = `
window.__hbSent=[];
(function(){
  const done=v=>Promise.resolve(v);
  function table(name){
    const q={
      select(){ return q; },
      limit(){ return done({data: name==='extra_words' ? (window.__HB_EXTRA||[]).map(w=>({word:w})) : [], error:null}); },
      insert(row){ window.__hbSent.push({table:name,row}); return done({data:null,error:null}); },
    };
    return q;
  }
  // channel：送ったもの（__hbCh）・消した channel の名前（__hbRemoved）を残す。在室は __hbPresence で差し替える（HB-061。ふだんは空）
  window.__hbCh=[]; window.__hbRemoved=[]; window.__hbPresence={};
  function channel(name){ const ch={ name, on(){ return ch; }, subscribe(cb){ return ch; }, track(){ return done('ok'); }, send(m){ window.__hbCh.push({ch:name,msg:m}); return done('ok'); }, presenceState(){ return window.__hbPresence; }, unsubscribe(){ return done('ok'); } }; return ch; }
  window.supabase={ createClient(){ return { from:table, channel, removeChannel(ch){ window.__hbRemoved.push(ch&&ch.name); return done('ok'); } }; } };
})();`;

/**
 * ページを開く。返す errors はページのエラーとコンソールのエラー（テストの最後に空であることを見る）
 * opts.guide：false なら最初の1戦の案内を見た扱いにする（初めの手で CPU が止まらないように）
 * opts.tutorial：false なら最初の一戦のチュートリアルを済んだ扱いにする（HB-059。tutorial.spec.js だけ true）
 * opts.rulesJs：文字列を渡すと rules.js の中身をそれにする（HB-068。上限の数を変えて開くテスト）
 * opts.soundJs：{status, body} を渡すと sound.js の返事をそれにする（HB-073。sound.spec.js）
 * opts.dictMeirei：{status, body} を渡すと dict-meirei.js の返事をそれにする（HB-070。meirei.spec.js）
 * opts.dictRenyo：{status, body} を渡すと dict-renyo.js の返事をそれにする（HB-052。renyo.spec.js）
 */
async function openGame(page, opts = {}) {
  const { guide = false, tutorial = false, extraWords = EXTRA_WORDS, dictRenyo = null, dictMeirei = null, rulesJs = null, soundJs = null } = opts;
  const errors = [];
  const blocked = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.route('**/*', async route => {
    const url = route.request().url();
    if (soundJs && url === ORIGIN + 'sound.js') return route.fulfill({ status: soundJs.status, contentType: 'text/javascript', body: soundJs.body });
    if (rulesJs != null && url === ORIGIN + 'rules.js') return route.fulfill({ status: 200, contentType: 'text/javascript', body: rulesJs });
    if (dictRenyo && url === ORIGIN + 'dict-renyo.js') return route.fulfill({ status: dictRenyo.status, contentType: 'text/javascript', body: dictRenyo.body });
    if (dictMeirei && url === ORIGIN + 'dict-meirei.js') return route.fulfill({ status: dictMeirei.status, contentType: 'text/javascript', body: dictMeirei.body });
    if (url.startsWith(ORIGIN)) {
      let rel = decodeURIComponent(new URL(url).pathname).replace(/^\/+/, '') || 'index.html';
      const file = path.join(ROOT, rel);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return route.fulfill({ status: 404, body: '' });
      return route.fulfill({ status: 200, contentType: (TYPES[path.extname(file)] || 'application/octet-stream') + '; charset=utf-8', body: fs.readFileSync(file) });
    }
    if (/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js/.test(url)) return route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB_SUPABASE });
    if (/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(url)) return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
    blocked.push(url);
    return route.fulfill({ status: 503, body: '' }); // 外へは出さない（abort だとコンソールにエラーが出るので、空の返事にする）
  });
  await page.addInitScript(({ guide, tutorial, extraWords }) => {
    window.HB_TEST = {};            // index.html の「自動テストの窓」を開ける
    window.__HB_EXTRA = extraWords;
    try { if (!guide) localStorage.setItem('hb.guide', 'done'); if (!tutorial) localStorage.setItem('hb.tutorial', 'done'); } catch (e) {}
  }, { guide, tutorial, extraWords });
  await page.goto(ORIGIN);
  await page.waitForFunction(() => window.HB_TEST && window.HB_TEST.S && window.HB_TEST.S());
  // extra_words の読み込み（Promise の後）を待つ
  await page.waitForFunction(ws => ws.every(w => window.HB_TEST.DICT.has(w)), extraWords);
  return { errors, blocked };
}

/** ひとりで（CPU）を強さ name で始める（画面のボタンを押す） */
async function startSolo(page, name = 'とまる') {
  if (name === 'とまる') { // 強さボタンに「とまる」は無い（D-041）。始めてから右上の速さと同じ値にする
    await page.click('#btnSolo');
    await page.click('.lv[data-n="ゆるゆる"]');
    await page.evaluate(() => { const T = window.HB_TEST; T.setSpeed(T.SPEEDS.findIndex(x => x.name === 'とまる')); });
    return;
  }
  await page.click('#btnSolo');
  await page.click(`.lv[data-n="${name}"]`);
}

/** カゴを字の並び letters にして、選びを空にする（テストの場面づくり）
 *  カゴが2こ以下だと5秒後に字が落ちてくる（D-058）ので、足りない分は後ろに埋め草の「の」を足す（選ばない。state() の mine には出さない） */
async function setBasket(page, letters) {
  await page.evaluate(ls => { const T = window.HB_TEST, S = T.S();
    S.mine = ls.map(l => T.mk(l));
    while (S.mine.length < 3) S.mine.push(T.mk('の', { filler: true }));
    S.sel = []; S.choose = null; T.render(); }, letters);
}

/** ボタンを押して、動き（割るは次の一瞬に効く）が済むまで待つ */
async function press(page, selector) {
  await page.click(selector);
  await settle(page);
}
async function settle(page) {
  await page.evaluate(() => new Promise(r => setTimeout(r, 0)));
  await page.waitForFunction(() => { const S = window.HB_TEST.S(); return !S.busy; });
}

/** カゴの i 番目の札（S.mine の順、0 から）を、並べた順にタップする。
 *  札のボタンの click は tapTile(札の id) を呼ぶだけなので、それを直に呼ぶ（画面の札の並びは DOM の順と違うため） */
async function tapTiles(page, idx) {
  for (const i of idx) await page.evaluate(i => { const T = window.HB_TEST; T.tapTile(T.S().mine[i].id); }, i);
}

/** いまのカゴ・選び・知らせ */
async function state(page) {
  return page.evaluate(() => {
    const T = window.HB_TEST, S = T.S(), L = id => T.letterOf(S.mine.find(p => p.id === id));
    return {
      mine: S.mine.filter(p => !p.filler).map(T.letterOf).join(''),
      sel: S.sel.map(L).join(''),
      msg: document.getElementById('trayStat').innerText.split('\n')[0],
      canMerge: !document.getElementById('aMerge').disabled,
      canSplit: !document.getElementById('aSplit').disabled,
      over: S.over || (S.ending ? 'ending' : null),
    };
  });
}

/** テストの終わりに：エラーが無いこと、外への通信が無いこと */
function expectClean(ctx) {
  expect(ctx.errors, 'ページのエラー').toEqual([]);
  expect(ctx.blocked, '外への通信（止めたもの）').toEqual([]);
}

module.exports = { openGame, startSolo, setBasket, tapTiles, press, settle, state, expectClean, EXTRA_WORDS, ROOT };
