// 辞書の語数の記録（HB-035）。辞書を作り直して語数が変わったら、ここを直して PR に理由を書く。
// MIN_RATIO を下回る（大きく減った）とテストが落ちる。増えたときは落ちない（記録だけ直せばよい）
module.exports = {
  DICT_WORDS_NOW: 12105,  // dict-ipadic.js（3字以上。HB-033 の作り直しのあと）
  PAGE_WORDS_NOW: 12774,  // ページの WORDS（手選び＋dict-ipadic.js＋テストの固定 extra_words）
  MEANINGS_NOW: 11151,    // meanings.js の意味のある語
  MIN_RATIO: 0.9,
};
