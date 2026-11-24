// 辞書の語数の記録（HB-035）。辞書を作り直して語数が変わったら、ここを直して PR に理由を書く。
// MIN_RATIO を下回る（大きく減った）とテストが落ちる。増えたときは落ちない（記録だけ直せばよい）
module.exports = {
  DICT_WORDS_NOW: 35336,  // dict-ipadic.js（3字以上。HB-055 で む を足した作り直しのあと。前は 34028）
  PAGE_WORDS_NOW: 18193,  // ページの WORDS（手選び＋dict-ipadic.js＋テストの固定 extra_words）
  MEANINGS_NOW: 11151,    // meanings.js の意味のある語
  RENYO_WORDS_NOW: 0,     // dict-renyo.js（HB-052）の語数。JMdict を取れる毎日の更新が最初に埋めるまでは 0。埋まったら記録を直す（0 のあいだは減りの見張りをしない）
  MEIREI_WORDS_NOW: 2785, // dict-meirei.js（HB-070）の語数（HB-071 で作者が4語を外した。2789→2785）。tools/build_dict.js の4つ目の引数で作る（IPADIC の命令ｅ・命令ｒｏ・命令ｉ。基本形が辞書にあるもの）
  MIN_RATIO: 0.9,
};
