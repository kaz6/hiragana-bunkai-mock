// データのファイル（ネットにつながずに Node だけで読む）。HB-035
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { DICT_WORDS_NOW, MEANINGS_NOW, MIN_RATIO } = require('../counts');

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

test('cpu-ng.js・nice-words.js・scenes.js が読める', () => {
  const ng = load('cpu-ng.js').HB_CPU_NG;
  assert.ok(Array.isArray(ng) && ng.length > 0 && ng.every(x => typeof x === 'string' && x));
  const nice = load('nice-words.js').HB_NICE;
  assert.ok(Object.values(nice).every(k => k === 'heart' || k === 'petals' || k === 'rainbow'));
  const sc = load('scenes.js').HB_SCENES;
  assert.ok(Object.keys(sc).length > 0);
  const g = load('scene-groups.js'); // 場面の組（HB-039）
  assert.ok(Object.keys(g.HB_SCENE_GROUPS).length > 0 && Object.values(g.HB_SCENE_GROUPS).every(ws => Array.isArray(ws) && ws.length > 0));
  assert.deepEqual(g.HB_SCENE_GROUPS['挨拶'], ['よろしく', 'よろしこ', 'どうも', 'はろー', 'はーい', 'へい', 'へーい']);
});

test('config.js には公開キー（publishable）だけ', () => {
  const c = load('config.js').HB_SUPABASE;
  assert.match(c.key, /^sb_publishable_/);
});
