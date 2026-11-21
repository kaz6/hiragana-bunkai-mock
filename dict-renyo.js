/* 動詞から作る名詞の形（連用形。あそび・さまよい など）の辞書（HB-052, D-086）。tools/build_meanings.py --repo が毎日作り直す。
   候補は tools/renyo_candidates.txt（IPADIC の五段動詞の連用形で、dict-ipadic.js に無い3字以上）。そのうち JMdict に同じ読みの名詞（pos が n）がある語だけ。
   外すとき：このファイルの HB_RENYO を空にするか、index.html の script 行を消す（無くてもページは動く）。いまは空（JMdict を取れる毎日の更新が最初に埋める） */
window.HB_RENYO='';
