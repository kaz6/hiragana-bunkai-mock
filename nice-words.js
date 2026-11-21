/* 素敵な言葉の演出（D-065）。作者が足し引きする
   ここにある言葉が投げられたら（自分・CPU・ふたりでの相手のどれでも）、画面に演出を出す。
   'heart'＝ハートがふわっと浮かんで消える／'petals'＝花吹雪が上から舞い落ちる／'rainbow'＝花吹雪に加えて、言葉の文字（真ん中に出る言葉とリストの言葉）が虹色になる（D-077）。
   言葉は辞書と同じ形で比べる（小さい字は大きい字に直す。D-043）ので、「あいじよう」でも「あいじょう」でもよい。
   色の言葉（D-087）：'言葉':{color:'#RRGGBB'} と書くと、その言葉の字だけがその色になる（演出は出さない）。edge:true で白い縁（暗い地で見えにくい色）、edge:'#色' でその色の縁（白い字は明るい地で見えないので灰色の縁）。color に 'rainbow'＝虹色、'linear-gradient(90deg,…)'＝グラデーションも書ける。
   一覧は編集の仮置き（2026-11-20）。語を足す・消すときは、下の { } の中に '言葉':'heart', か '言葉':'petals', （虹色は 'rainbow'）を足し引きするだけ（index.html は触らない） */
window.HB_NICE={
  // ハート
  'すき':'heart', 'だいすき':'heart', 'あい':'heart', 'あいじよう':'heart',
  // 花吹雪＋虹色の文字
  'うんこ':'rainbow', 'うんち':'rainbow',
  // 色の言葉（字の色だけ。HB-053）
  'しろ':{color:'#FFFFFF',edge:'#6B7A80'}, 'しろいろ':{color:'#FFFFFF',edge:'#6B7A80'}, 'ほわいと':{color:'#FFFFFF',edge:'#6B7A80'},
  'くろ':{color:'#111111',edge:true},
  'しろくろ':{color:'linear-gradient(90deg,#FFFFFF 50%,#111111 50%)',edge:true},
  'はいいろ':{color:'#9AA0A6'}, 'ぎんいろ':{color:'#C0C6CE'},
  'あかいろ':{color:'#E5484D'}, 'あか':{color:'#E5484D'},
  'ももいろ':{color:'#F4A6C0'}, 'はだいろ':{color:'#F5C6A5'}, 'くりいろ':{color:'#A0663A'},
  'きいろ':{color:'#F2D21B'}, 'いえろー':{color:'#F2D21B'}, 'だいだいいろ':{color:'#F2994A'}, 'きんいろ':{color:'#D4AF37'},
  'あいいろ':{color:'#1F3A93',edge:true}, 'こんいろ':{color:'#14204F',edge:true},
  'ぶるー':{color:'#3B8FD9'}, 'あお':{color:'#3B8FD9'},
  'うぐいすいろ':{color:'#9BA32E'},
  'ぐりーん':{color:'#3FA66B'}, 'みどり':{color:'#3FA66B'}, 'むらさき':{color:'#7A5AD6'},
  'いろ':{color:'rainbow'}, 'いろいろ':{color:'rainbow'},
  // 花吹雪
  'よろしく':'petals', 'よろしこ':'petals', 'たのしい':'petals', 'たのしく':'petals', 'いいね':'petals',
  'すごい':'petals', 'さいこう':'petals', 'きぼう':'petals', 'きずな':'petals', 'こころ':'petals',
  'まごころ':'petals', 'うつくしい':'petals', 'わくわく':'petals', 'にこにこ':'petals', 'ふわふわ':'petals',
  'よろこぶ':'petals', 'いわい':'petals', 'いわう':'petals', 'へいわ':'petals', 'こうふく':'petals',
  'さいわい':'petals', 'たすける':'petals', 'はげます':'petals', 'いたわる':'petals', 'ただいま':'petals',
  'いいこ':'petals', 'よいこ':'petals',
};
