# CREDITS（ひらがな分解（仮））

音・絵・データの出どころ。入れたら足し、外したら消す。仮のものは「仮」と書く。

## 音

| Asset | 作者・置き場 | ライセンス | 何に使ったか |
|---|---|---|---|
| 積み木の音（A・B・C × 割る・回す・裏返す・くっつける・投げる）（仮） | 自前（Web Audio でページの中で作る。sound.js の HB_SOUND。試聴は docs/reports/audio/hb-072-tsumiki.html） | 自前のため制限なし | 割る・回す・裏返す・くっつける・投げる の音（sound.js。HB-073、D-100）と試聴ページ（HB-072）。値は仮 |

## データ

| Asset | 作者・置き場 | ライセンス | 何に使ったか |
|---|---|---|---|
| 意味（meanings.js） | JMdict（EDRDG）https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project | CC BY-SA 4.0 https://creativecommons.org/licenses/by-sa/4.0/ 。EDRDG の決まり https://www.edrdg.org/edrdg/licence.html | 投げた言葉の意味（D-028・D-035）。画面の表示：「？ 遊び方」の「つかったもの」と、はじめの画面・遊ぶ画面の一番下の一行（HB-081） |
| 辞書（dict-ipadic.js・dict-renyo.js・dict-meirei.js） | IPADIC（mecab-ipadic-2.7.0-20070801） | IPADIC のライセンス（全文：licenses/mecab-ipadic-LICENSE.txt） | ことばの表（R-004・D-099）。画面の表示：同じ「つかったもの」（原文は折りたたみ） |

## 字体

| Asset | 作者・置き場 | ライセンス | 何に使ったか |
|---|---|---|---|
| Klee One（600） | Google Fonts https://fonts.google.com/specimen/Klee+One | SIL Open Font License 1.1（係の見込み。頁では確かめていない） | 札の字（index.html の --f-kana） |
| Zen Kaku Gothic New（400・500・700） | Google Fonts https://fonts.google.com/specimen/Zen+Kaku+Gothic+New | SIL Open Font License 1.1（係の見込み。頁では確かめていない） | 画面の文（index.html の --f-ui）。ページが Google Fonts から読む（リポジトリには入れていない） |

## 画面の表示（HB-081）

- JMdict：EDRDG の見本の文（https://www.edrdg.org/edrdg/sample.html）の型。「This game uses the JMdict dictionary files. These files are the property of the Electronic Dictionary Research and Development Group, and are used in conformance with the Group's licence.」を meanings.js の HB_MEANINGS_NOTICE に置き、画面は JMdict・Electronic Dictionary Research and Development Group・Group's licence にリンクを付けて出す。この文は変えない（tools/build_meanings.py も同じ文を書く）
- 決まりには「データを新しく保つ（Web の辞書は月に1度以上）」ともある（相談チャットが読んだ。.github/workflows/meanings.yml で足りるかは HB-081 の報告の「提案」）
