/* 最初の一戦のチュートリアルの一言（HB-059, D-092）。作者が足し引きする表。
   ★★ 日本語の文は相談チャットのカードのとおり（仮の文）。English・한국어 は係の仮の訳。直すのはこのファイルだけ ★★
   手順（作者が決めた。変えない）：はじめカゴは空 → 相手が「したく」を投げてきて届く（arrive）→ た を割る（split）→ し を回す（turn）→ ⊂ を裏返す（flip）
   → つ と 十 をくっつけて ち（merge）→ ち・こ・く の順に選んで投げる（throw）→ カゴが空になって濁音が1つ落ちる（end）。
   steps[手の名前][言葉の名前]：ja 日本語／en English／ko 한국어。表に無い言葉は English → 日本語の順で出す。
   button：いちばん最後の一言に付く「ひとりで遊ぶ」ボタンの文。
   「しくみ」の中の、もう一度やる入口のボタンの文は index.html（日本語・English の添え）と lang-ko.js（한국어）にある */
window.HB_TUTORIAL={
  steps:{
    arrive:{ja:'相手から「したく」が届いた。届いた言葉は、そのままは投げ返せない。作り替えよう',
            en:'“したく” arrived from your opponent. You can’t throw it back as it is. Let’s change it',
            ko:'상대에게서 “したく”가 왔어요. 온 단어는 그대로 되던질 수 없어요. 바꿔 봐요'},
    split:{ja:'た を選んで【割る】',
           en:'Pick た and tap [Split]',
           ko:'た를 고르고 [쪼개기]를 눌러요'},
    turn:{ja:'し を選んで【回す】。字じゃない形になった',
          en:'Pick し and tap [Rotate]. It turned into a shape that isn’t a letter',
          ko:'し를 고르고 [돌리기]를 눌러요. 글자가 아닌 모양이 됐어요'},
    flip:{ja:'⊂ を選んで【裏返す】。つ になった',
          en:'Pick ⊂ and tap [Flip]. It became つ',
          ko:'⊂를 고르고 [뒤집기]를 눌러요. つ가 됐어요'},
    merge:{ja:'つ と 十 を選んで【くっつける】。ち になった',
           en:'Pick つ and 十, then tap [Join]. It became ち',
           ko:'つ와 十를 고르고 [붙이기]를 눌러요. ち가 됐어요'},
    throw:{ja:'ち・こ・く の順に選んで【投げる】',
           en:'Pick ち, こ, く in that order and tap [Throw]',
           ko:'ち, こ, く 순서로 고르고 [던지기]를 눌러요'},
    end:{ja:'カゴが空になると、濁音が落ちてくる。これで全部！',
         en:'When your basket is empty, a voiced letter drops in. That’s everything!',
         ko:'바구니가 비면 탁음 글자가 떨어져요. 이게 전부예요!'}},
  button:{ja:'ひとりで遊ぶ',en:'Play solo',ko:'혼자서 하기'}
};
