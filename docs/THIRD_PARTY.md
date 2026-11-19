# 第三者のデータとその条件

## mecab-ipadic-2.7.0-20070801（辞書データ）

- 対象ファイル：`dict-ipadic.js`（3字以上の言葉。mecab-ipadic-2.7.0-20070801 の読みから、いまのモックの字で書けるものを抜き出したもの）
- 著作権表示と条件は、`dict-ipadic.js` の冒頭コメントと、ゲーム内の「しくみ」の末尾（「著作権表示と条件（原文）」）に原文のまま載せてある
- 配布・利用の条件は、その原文の表示に従う

## JMdict（意味データ：漢字の書き方・英語）

- 対象ファイル：`meanings.js`（辞書の語ごとに、読みが一致する JMdict の項目から漢字の書き方3つまで・英語3つまでを抜き出したもの）。作ったスクリプトは `tools/build_meanings.py`
- 出典：JMdict（The Electronic Dictionary Research and Development Group, EDRDG）https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project 。使ったのは JMdict_e（EDRDG の原本の XML）
- 条件：Creative Commons Attribution-ShareAlike 4.0（CC BY-SA 4.0）https://creativecommons.org/licenses/by-sa/4.0/ 。名前の表示と、改変物を同じ条件で公開すること
- `meanings.js` も CC BY-SA 4.0 で提供する（ファイルの冒頭に明記）。ゲーム内の「しくみ」の末尾にも出典を出している
