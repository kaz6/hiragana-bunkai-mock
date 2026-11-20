# CLAUDE.md（ひらがな分解（仮）のモック）

このリポジトリで作業する Claude（毎時の係・手で渡されたカード）向けの決まり。HB-035（D-071）で作った。

## このリポジトリは何か

- ひらがなを「割る・回す・裏返す・くっつける」で作り替えて、言葉を相手のカゴに投げ合う対戦ゲームのモック（仮）
- 公開ページ：https://kaz6.github.io/hiragana-bunkai-mock/
- **main にマージすると、GitHub Pages がすぐ（数十秒で）公開ページを変える。** 作者と友人が遊んでいるページなので、壊したまま main に入れない
- ページは `index.html` ひとつ（スクリプトは中の IIFE）。データは `dict-ipadic.js`（辞書 3字以上）・`meanings.js`（意味）・`scenes.js`・`cpu-ng.js`・`nice-words.js`・`scene-groups.js`・`config.js`（Supabase の公開キー）
- 辞書と意味を作る道具：`tools/build_dict.js`（IPADIC から。R-004）・`tools/build_meanings.py`（JMdict から。D-035）。材料は `.work/`（リポジトリに入れない）
- `.github/workflows/meanings.yml` が毎日 main に「自動：足した言葉の意味を更新」をコミットすることがある

## 設計の決まり

- **設計の正本は Notion の DECISION_LOG（ID 41da8a5d-fd45-817e-97e8-fff41083d352）。** `docs/DECISION_LOG.md` はその写し（D-番号は Notion と同じ。リポジトリだけの作業判断は R-番号）
- **カードに書いていない見た目・遊びの中身・言葉（画面の文・辞書に足す語）は決めない。** 迷ったら作らずに報告の「提案」に書く
- 仮に置いたものは `docs/SESSION_STATE.md` の「未確定項目」に「編集の仮置き」として書く
- 作業のたびに `docs/DECISION_LOG.md`（決めたこと・中身・確かめ・却下・作業番号）と `docs/SESSION_STATE.md`（現在の進捗・次にやること・未確定項目）を同じ PR で直す

## テスト

- 回し方：`npm install`（はじめの1回）→ `npm test`。Node のテスト（`tests/unit/`）と Playwright の画面のテスト（`tests/e2e/`）が全部回る。1分かからない
- ネットにつながなくても通る。`tests/helpers.js` がページ（http://hb.test/）をリポジトリのファイルから直に返し、Supabase（supabase-js の CDN）・フォントは止めて決まった返事を返す。extra_words は固定の数語（`EXTRA_WORDS`）。外へ出ようとした通信があるとテストが落ちる
- 画面は 390px、動きを減らす設定（割る・回すの待ちが 0）。設定は `playwright.config.js`
- ページの中の表と関数は「自動テストの窓」（`index.html` の末尾、`window.HB_TEST`）から呼ぶ。テストがページを開く前に `window.HB_TEST={}` を置いたときだけ中身が入る。ふだんの遊びでは何もしない。足すときは渡す名前を足すだけにし、ゲームの挙動は変えない
- 足す場所：

  | ファイル | 中身 |
  |---|---|
  | `tests/e2e/letters.spec.js` | 字の表（RECIPE の割る⇄くっつける、くっつけ方だけの別ルート、「どっち」） |
  | `tests/e2e/words.spec.js` | 言葉の判定（checkSel）、一度きり、はじかれた並びの送り先 |
  | `tests/e2e/stars.spec.js` | ★（工夫の数。D-031・D-067 の往復） |
  | `tests/e2e/tail.spec.js` | 選んでいる途中の割る・くっつける（D-070） |
  | `tests/e2e/scenes.spec.js` | 場面の組（挨拶返し。scene-groups.js） |
| `tests/e2e/votes.spec.js` | 結果の画面の「やりとり」の候補と いい／いまいち（exchange_votes。D-081） |
| `tests/e2e/basket.spec.js` | カゴの上限（12こを超えたら負け） |
  | `tests/e2e/cpu.spec.js` | CPU（禁止用語 cpu-ng.js、各強さを短く回す） |
  | `tests/e2e/screen.spec.js` | 画面（390px、遊び方、ひとりでの開始、ページの語数） |
  | `tests/unit/data.test.js` | データのファイル（辞書・意味の語数、字の一覧のそろい） |
  | `tests/counts.js` | 辞書・意味の語数の記録（大きく減ったら落ちる） |

- **挙動を変えたら、そのテストも同じ PR で直す。** テストの期待を書き換えたときは、PR の説明に「どのテストの何を、なぜ変えたか」を書く
- 辞書を作り直して語数が変わったら `tests/counts.js` を直し、PR に前後の数を書く
- いまの挙動でテストが落ち、カードがその挙動を変えるものでないなら、直さずに報告する（バグらしいものは報告の「提案」に書く）

## PR の流れ（HB-029〜HB-034 でしてきた形）

1. main の最新から始める：`git checkout main && git pull`
2. ブランチ名：`hb-0NN-短い英語`（例：`hb-032-no-roundtrip`、`hb-034-tail-split-merge`）
3. コミット：題は `HB-0NN（D-0xx）: 何をしたか`（日本語）。1カード1〜2コミット
4. `npm test` を手元で通す。カードが求める確かめ（Playwright・390px など）もする
5. push：`git push -u origin <ブランチ名>`
6. PR：題はコミットと同じ形 `HB-0NN（D-0xx）: …`。説明は箇条書きで「変えたファイルと中身」「確かめ：docs/DECISION_LOG.md の D-0xx」。gh の GraphQL は使えないので REST で作る：
   `gh api repos/kaz6/hiragana-bunkai-mock/pulls -f title='…' -f head='<ブランチ名>' -f base=main -f body='…' -F draft=true`
7. Actions の「テスト」が緑になるのを待つ：`gh api repos/kaz6/hiragana-bunkai-mock/commits/<sha>/check-runs`
8. マージ（下の条件がそろったときだけ）。マージコミットで入れる（これまでの「Merge pull request #N from kaz6/…」の形）：
   `gh api -X POST repos/kaz6/hiragana-bunkai-mock/pulls/<N>/ccr/ready_for_review` のあと `gh api -X PUT repos/kaz6/hiragana-bunkai-mock/pulls/<N>/merge -f merge_method=merge`
9. マージのあと、公開ページで開いてエラーがないことを見る（カードが求める確かめがあればそれも）

**マージの条件：`npm test` が全部通る ＋ PR の Actions（テスト）が緑 ＋ カードに書いていない遊びの挙動の差がない。** どれかが欠けたらマージせず、PR を残して報告する

## Supabase

- 接続先と公開キー（publishable）は `config.js`。表は `throws`（通信対戦の投げ）・`rejects`（はじかれた並び）・`extra_words`（作者が OK した足す語）
- **本物の表に書き込むのは、カードがそう言うときだけ。** テストは書き込まない（`tests/helpers.js` で止めている）
- 通信対戦を本物で確かめるときの部屋（合言葉）の名前は `hb0NN-test-<何か>`（例：`hb026-test-…`、2つ目は `hb019b-test-…`）。部屋ごとなので遊びには影響しないが、残した行は `docs/SESSION_STATE.md` に書く
- extra_words に語を足す・rejects を消すのは作者が決めたときだけ

## 資格情報

- API キー・トークン・パスワードの値をリポジトリ・PR・コミット・ログに書かない。`config.js` の publishable キーは公開してよいもの（ページに載る）。それ以外のキーを足さない
