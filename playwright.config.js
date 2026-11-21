// 画面のテスト（HB-035）。ページはサーバーを立てずに、tests/helpers.js がリポジトリのファイルをそのまま渡す。
// ネットにはつながない（Supabase・フォント・CDN はテストの中で止めて、決まった返事を返す）
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    browserName: 'chromium',
    locale: 'ja-JP',                       // 画面の言葉の初期値は端末の言語（D-091）。いまのテストは日本語にそろえる
    viewport: { width: 390, height: 844 }, // これまでの確かめと同じ 390px
    reducedMotion: 'reduce',               // 動きを減らす設定：割る・回すの待ちが 0 になり、テストが速く安定する
    trace: 'off',
  },
});
