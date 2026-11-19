// 辞書（3字以上）を IPADIC から作る。使い方: node tools/build_dict.js <IPADICのdictフォルダ> <出力 dict-ipadic.js>
// IPADIC は npm の mecab-ipadic-seed（lib/dict に CSV と COPYING）を使う
const fs=require('fs'),path=require('path');
const [dir,out]=process.argv.slice(2);
const LETTERS='はよほにこいくへさちきめぬろるつしうねわたけすなまのあもー'+'ばぱぼぽごぐべぺざぢぎづじだげず';
const S=new Set([...LETTERS]);
const famous=new Set(fs.readFileSync(path.join(__dirname,'famous_places.txt'),'utf8').split(/\s+/).filter(Boolean));
const k2h=s=>s.replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));
const POS=['名詞','動詞','形容詞','副詞','感動詞','連体詞','接続詞'];
const NG2=['数','接尾','非自立','特殊','接続詞的','動詞非自立的','引用文字列'];
const info=new Map();
for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.csv'))){
  for(const line of fs.readFileSync(path.join(dir,f),'utf8').split('\n')){
    const c=line.split(','); if(c.length<12) continue;
    const pos=c[4],pos2=c[5],form=c[9];
    if(!POS.includes(pos)) continue;
    if(pos==='名詞'&&NG2.includes(pos2)) continue;
    if(pos==='動詞'||pos==='形容詞'){
      if(pos2!=='自立') continue;
      const ok=form==='基本形'||(pos==='形容詞'&&form==='連用テ接続');
      if(!ok) continue;
    }
    const r=k2h(c[11]); if(!/^[ぁ-ゖー]+$/.test(r)||r[0]==='ー') continue;
    if(pos==='形容詞'&&form==='連用テ接続'&&!r.endsWith('く')) continue;
    const n=[...r].length; if(n<3||n>12) continue;
    if(![...r].every(ch=>S.has(ch))) continue;
    const p=info.get(r)||{g:false}; p.g=p.g||pos2!=='固有名詞'; info.set(r,p);
  }
}
const words=[...info.entries()].filter(([w,p])=>p.g||famous.has(w)).map(([w])=>w).sort();
const notice=fs.readFileSync(path.join(dir,'COPYING'),'utf8').replace(/�/g,'').trim();
const js='/* 辞書データ（3字以上）：mecab-ipadic-2.7.0-20070801 の読みから、モックの字で書けるものを抜き出したもの（tools/build_dict.js で作成）。固有名詞としてしか載っていない語は tools/famous_places.txt にあるもの以外除いた。形容詞の「〜く」の形を含む。\n   以下は mecab-ipadic の著作権表示と条件（原文のまま）。 */\n/*\n'+notice.replace(/\*\//g,'* /')+'\n*/\nwindow.HB_IPADIC_NOTICE='+JSON.stringify(notice)+';\nwindow.HB_IPADIC='+JSON.stringify(words.join(' '))+';\n';
fs.writeFileSync(out,js); console.log('words',words.length);
