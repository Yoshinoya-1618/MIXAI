import { test, expect } from '@playwright/test'

test.describe('ホームページ', () => {
  test('ホームページが正しく表示される', async ({ page }) => {
    await page.goto('/')

    // ヘッダーが表示されていることを確認
    await expect(page.locator('text=MIXAI')).toBeVisible()
    
    // メインタイトルが表示されていることを確認
    await expect(page.locator('h1')).toContainText('うた整音')
    
    // 「無料で始める」ボタンが表示されていることを確認
    await expect(page.locator('text=無料で始める')).toBeVisible()
  })

  test('無料で始めるボタンをクリックしてアップロードページに遷移', async ({ page }) => {
    await page.goto('/')
    
    // 「無料で始める」ボタンをクリック
    await page.locator('text=無料で始める').first().click()
    
    // アップロードページに遷移することを確認
    await expect(page).toHaveURL('/upload')
  })

  test('プランセクションが表示される', async ({ page }) => {
    await page.goto('/')
    
    // プランセクションをスクロールして表示
    await page.locator('text=プラン').scrollIntoViewIfNeeded()
    
    // 3つのプランが表示されることを確認
    await expect(page.locator('text=Lite')).toBeVisible()
    await expect(page.locator('text=Standard')).toBeVisible()
    await expect(page.locator('text=Creator')).toBeVisible()
  })

  test('フィーチャーセクションが表示される', async ({ page }) => {
    await page.goto('/')
    
    // 特徴セクションをスクロールして表示
    await page.locator('text=特徴').scrollIntoViewIfNeeded()
    
    // 主要な特徴が表示されることを確認
    await expect(page.locator('text=AI音質調整')).toBeVisible()
    await expect(page.locator('text=リアルタイムプレビュー')).toBeVisible()
  })
})

test.describe('レスポンシブデザイン', () => {
  test('モバイル表示で正しく動作する', async ({ page }) => {
    // モバイルサイズに設定
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    // ヘッダーが表示されていることを確認
    await expect(page.locator('text=MIXAI')).toBeVisible()
    
    // メインコンテンツが表示されることを確認
    await expect(page.locator('h1')).toBeVisible()
    
    // ボタンがクリック可能であることを確認
    await expect(page.locator('text=無料で始める').first()).toBeVisible()
  })

  test('タブレット表示で正しく動作する', async ({ page }) => {
    // タブレットサイズに設定
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')

    // レイアウトが適切に表示されることを確認
    await expect(page.locator('text=MIXAI')).toBeVisible()
    await expect(page.locator('h1')).toBeVisible()
  })
})