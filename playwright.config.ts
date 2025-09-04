import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  // テスト対象ディレクトリ
  testDir: './e2e',
  
  // 並列実行数
  fullyParallel: true,
  
  // CI環境でのfail-fast
  forbidOnly: !!process.env.CI,
  
  // リトライ設定
  retries: process.env.CI ? 2 : 0,
  
  // ワーカー数
  workers: process.env.CI ? 1 : undefined,
  
  // レポーター
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }]
  ],
  
  // 共通設定
  use: {
    // ベースURL
    baseURL: 'http://localhost:3000',
    
    // スクリーンショット設定
    screenshot: 'only-on-failure',
    
    // 動画録画
    video: 'retain-on-failure',
    
    // トレース
    trace: 'on-first-retry',
  },

  // プロジェクト設定
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // モバイルテスト
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // 開発サーバー設定
  webServer: {
    command: 'npm run dev',
    port: 3000,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
})