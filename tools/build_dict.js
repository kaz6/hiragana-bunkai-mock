// 辞書（3字以上）を IPADIC から作る。小さい字は大きい字に直して通し、見せる形を HB_SMALL に書く（HB-016）。使い方: node tools/build_dict.js <IPADICのdictフォルダ> <出力 dict-ipadic.js>
// IPADIC は npm の mecab-ipadic-seed（lib/dict に CSV と COPYING）を使う
const fs=require('fs'),path=require('path');
const [dir,out]=process.argv.slice(2);
const LETTERS='はよほにこいくへさちきめぬろるつしうねわたけすなまのあもー'+'ばぱぼぽごぐべぺざぢぎづじだげず'+'ふぶぷ'; // ふぶぷ（HB-027, D-059）
const S=new Set([...LETTERS]);
const famous=new Set(fs.readFileSync(path.join(__dirname,'famous_places.txt'),'utf8').split(/\s+/).filter(Boolean));
const k2h=s=>s.replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));
const POS=['名詞','動詞','形容詞','副詞','感動詞','連体詞','接続詞'];
const NG2=['数','接尾','非自立','特殊','接続詞的','動詞非自立的','引用文字列'];
const info=new Map();
// 小さい字（HB-016, D-043）：ぁぃぅぇぉっゃゅょゎ は大きい字（コードポイント +1）に直して通す。ゕゖ は対象外（その語は入れない）
const SMALL='ぁぃぅぇぉっゃゅょゎ';
const big=s=>[...s].map(ch=>SMALL.includes(ch)?String.fromCharCode(ch.charCodeAt(0)+1):ch).join('');
const fromSmall=new Map(); // 大きい字の形 -> Set(小さい字の形)。小さい字から来た読みだけ
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
    const r0=k2h(c[11]); if(!/^[ぁ-ゔー]+$/.test(r0)||r0[0]==='ー') continue; // ゕゖ を含む読みは除く
    const r=big(r0);
    if(pos==='形容詞'&&form==='連用テ接続'&&!r.endsWith('く')) continue;
    const n=[...r].length; if(n<3||n>12) continue;
    if(![...r].every(ch=>S.has(ch))) continue;
    const p=info.get(r)||{g:false,direct:false}; p.g=p.g||pos2!=='固有名詞'; info.set(r,p);
    if(r0===r){ p.direct=p.direct||pos2!=='固有名詞'||famous.has(r); } // 大きい字のまま辞書にある語（しよう＝使用 など）
    else (fromSmall.get(r)||fromSmall.set(r,new Set()).get(r)).add(r0);
  }
}
const words=[...info.entries()].filter(([w,p])=>p.g||famous.has(w)).map(([w])=>w).sort();
// 見せる形の表：小さい字から来た語で、大きい字の形がそのまま言葉としては無いものだけ。2つ以上あれば並べ替えて先頭
const smallMap={}; const clash=[];
for(const w of words){ const p=info.get(w); if(p.direct||!fromSmall.has(w)) continue; const xs=[...fromSmall.get(w)].sort(); smallMap[w]=xs[0]; if(xs.length>1) clash.push(w+'='+xs.join('/')); }
const notice=fs.readFileSync(path.join(dir,'COPYING'),'utf8').replace(/�/g,'').trim();
const js='/* 辞書データ（3字以上）：mecab-ipadic-2.7.0-20070801 の読みから、モックの字で書けるものを抜き出したもの（tools/build_dict.js で作成）。固有名詞としてしか載っていない語は tools/famous_places.txt にあるもの以外除いた。形容詞の「〜く」の形を含む。\n   以下は mecab-ipadic の著作権表示と条件（原文のまま）。 */\n/*\n'+notice.replace(/\*\//g,'* /')+'\n*/\nwindow.HB_IPADIC_NOTICE='+JSON.stringify(notice)+';\nwindow.HB_IPADIC='+JSON.stringify(words.join(' '))+';\n'
  +'/* 小さい字の言葉の見せる形（HB-016, D-043）。{大きい字の形: 小さい字の形}。辞書（HB_IPADIC）には大きい字の形で入っている */\nwindow.HB_SMALL='+JSON.stringify(smallMap)+';\n';
fs.writeFileSync(out,js); console.log('words',words.length,'small',Object.keys(smallMap).length,'clash',clash.length,clash.slice(0,15).join(' '));
