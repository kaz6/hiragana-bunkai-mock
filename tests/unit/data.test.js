// データのファイル（ネットにつながずに Node だけで読む）。HB-035
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { DICT_WORDS_NOW, MEANINGS_NOW, RENYO_WORDS_NOW, MIN_RATIO } = require('../counts');

const ROOT = path.join(__dirname, '..', '..');
// ブラウザ用の data ファイルを読み、window に入ったものを返す
function load(file) { const window = {}; vm.runInNewContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), { window }); return window; }
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const KANA = new Set(html.match(/const KANA=new Set\(\[\.\.\.'([^']+)'\]\)/)[1]);

test('辞書（dict-ipadic.js）の語数が大きく減っていない', () => {
  const w = load('dict-ipadic.js');
  const words = String(w.HB_IPADIC).split(/\s+/).filter(Boolean);
  assert.ok(words.length >= Math.floor(DICT_WORDS_NOW * MIN_RATIO), `語数 ${words.length}（記録 ${DICT_WORDS_NOW}）`);
  assert.strictEqual(new Set(words).size, words.length, '同じ語が2回入っていない');
});

test('辞書の語は、いまの字（KANA）と ー だけで書け、3字以上12字以下', () => {
  const words = String(load('dict-ipadic.js').HB_IPADIC).split(/\s+/).filter(Boolean);
  const bad = words.filter(x => { const cs = [...x]; return cs.length < 3 || cs.length > 12 || cs[0] === 'ー' || !cs.every(c => c === 'ー' || KANA.has(c)); });
  assert.deepStrictEqual(bad.slice(0, 10), []);
});

test('辞書を作る道具の字（tools/build_dict.js の LETTERS）と、ページの字（KANA）がそろっている（R-004）', () => {
  const src = fs.readFileSync(path.join(ROOT, 'tools', 'build_dict.js'), 'utf8');
  const m = src.match(/const LETTERS=(.+?);/)[1];
  const letters = new Set([...m.match(/'([^']*)'/g).map(s => s.slice(1, -1)).join('')]);
  letters.delete('ー');
  assert.deepStrictEqual([...KANA].filter(c => !letters.has(c)), [], 'KANA にあって LETTERS にない字');
  assert.deepStrictEqual([...letters].filter(c => !KANA.has(c)), [], 'LETTERS にあって KANA にない字');
});

test('意味のデータ（meanings.js）の語数が大きく減っていない', () => {
  const m = load('meanings.js').HB_MEANINGS;
  const n = Object.keys(m).length;
  assert.ok(n >= Math.floor(MEANINGS_NOW * MIN_RATIO), `意味のある語 ${n}（記録 ${MEANINGS_NOW}）`);
});

test('作者の意味の表（meanings-author.js）：こいけ＝ラーメン大好き、英語の行は空、形が合っている（HB-046）', () => {
  const a = load('meanings-author.js').HB_MEANINGS_AUTHOR;
  assert.strictEqual(JSON.stringify(a['こいけ']), JSON.stringify(['ラーメン大好き', '']));
  assert.ok(Object.values(a).every(v => Array.isArray(v) && v.length === 2 && v.every(x => typeof x === 'string')));
  assert.ok(html.includes('<script src="meanings-author.js"></script>'));
});

test('cpu-ng.js・nice-words.js・scenes.js が読める', () => {
  const ng = load('cpu-ng.js').HB_CPU_NG;
  assert.ok(Array.isArray(ng) && ng.length > 0 && ng.every(x => typeof x === 'string' && x));
  const nice = load('nice-words.js').HB_NICE;
  assert.ok(Object.values(nice).every(k => k === 'heart' || k === 'petals' || k === 'rainbow' || (k && typeof k === 'object' && typeof k.color === 'string'))) // 色の言葉（HB-053）は {color:…};
  const sc = load('scenes.js').HB_SCENES;
  assert.ok(Object.keys(sc).length > 0);
  const g = load('scene-groups.js'); // 場面の組（HB-039）
  assert.ok(Object.keys(g.HB_SCENE_GROUPS).length > 0 && Object.values(g.HB_SCENE_GROUPS).every(ws => Array.isArray(ws) && ws.length > 0));
  assert.deepEqual(g.HB_SCENE_GROUPS['挨拶'], ['よろしく', 'よろしこ', 'どうも', 'はろー', 'はーい', 'へい', 'へーい', 'ちーす']); // ちーす は作者 2026-11-23 18:54（HB-067）
});

test('config.js には公開キー（publishable）だけ', () => {
  const c = load('config.js').HB_SUPABASE;
  assert.match(c.key, /^sb_publishable_/);
});

test('動詞から作る名詞の形（HB-052）：候補に さまよい・きこし がある／dict-renyo.js の語は候補の中で、辞書に無く、字で書け、語数が減っていない', () => {
  const cands = fs.readFileSync(path.join(ROOT, 'tools', 'renyo_candidates.txt'), 'utf8').split(/\s+/).filter(Boolean);
  assert.ok(cands.includes('さまよい') && cands.includes('きこし'));
  assert.ok(!cands.includes('あそび'), 'あそび は 字（び）が作れないので候補に出ない');
  const dict = new Set(String(load('dict-ipadic.js').HB_IPADIC).split(/\s+/));
  assert.deepStrictEqual(cands.filter(w => dict.has(w)).slice(0, 5), [], '候補は辞書に無い語だけ');
  assert.ok(cands.every(w => { const cs = [...w]; return cs.length >= 3 && cs.length <= 12 && cs[0] !== 'ー' && cs.every(c => c === 'ー' || KANA.has(c)); }));
  const r = String(load('dict-renyo.js').HB_RENYO).split(/\s+/).filter(Boolean);
  const cs = new Set(cands);
  assert.deepStrictEqual(r.filter(w => !cs.has(w)).slice(0, 5), [], 'dict-renyo.js の語は候補の中だけ');
  assert.strictEqual(new Set(r).size, r.length);
  assert.ok(r.length >= Math.floor(RENYO_WORDS_NOW * MIN_RATIO), `語数 ${r.length}（記録 ${RENYO_WORDS_NOW}）`);
  assert.ok(html.includes('<script src="dict-renyo.js"></script>'));
});

test('韓国語の表（lang-ko.js。HB-058）：読める・index.html が読み込む・英語の表（EN_FIX・案内・はじめの3行）の文は全部ある', () => {
  const ko = load('lang-ko.js').HB_KO;
  assert.ok(ko && ko.FIX && Array.isArray(ko.PAT) && Array.isArray(ko.DG));
  assert.ok(Object.values(ko.FIX).every(v => typeof v === 'string' && v));
  assert.ok(html.includes('<script src="lang-ko.js"></script>'));
  const grab = re => vm.runInNewContext('(' + html.match(re)[0].replace(/^const \w+=/, '').replace(/;$/, '') + ')');
  const missing = [...Object.keys(grab(/const EN_FIX=\{[\s\S]*?\};/)), ...Object.values(grab(/const GUIDE_TEXT=\{[\s\S]*?\};/)), ...grab(/const RULES3=\[[\s\S]*?\]\];/).map(r => r[0])]
    .filter(jp => !ko.FIX[jp] && !ko.FIX['↑' + jp]);
  assert.deepStrictEqual(missing, []);
});
