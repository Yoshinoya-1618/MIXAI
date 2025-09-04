import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('アップロードページ', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/upload')
  })

  test('アップロードページが正しく表示される', async ({ page }) => {
    // ページタイトルを確認
    await expect(page.locator('h1')).toContainText('楽曲をアップロード')
    
    // ファイルアップロードエリアが表示されることを確認
    await expect(page.locator('text=インストゥルメンタル')).toBeVisible()
    await expect(page.locator('text=ボーカル')).toBeVisible()
  })

  test('ファイルアップロード機能の UI 動作', async ({ page }) => {
    // インストゥルメンタルのドロップゾーンが表示されることを確認
    const instDropZone = page.locator('[data-testid="instrumental-dropzone"]')
    await expect(instDropZone).toBeVisible()
    
    // ボーカルのドロップゾーンが表示されることを確認
    const vocalDropZone = page.locator('[data-testid="vocal-dropzone"]')
    await expect(vocalDropZone).toBeVisible()
    
    // ハーモニーのドロップゾーンが表示されることを確認（オプション）
    const harmonySection = page.locator('text=ハーモニー')
    if (await harmonySection.isVisible()) {
      await expect(page.locator('[data-testid="harmony-dropzone"]')).toBeVisible()
    }
  })

  test('プリセット選択が表示される', async ({ page }) => {
    // プリセット選択セクションが表示されることを確認
    await expect(page.locator('text=音質プリセット')).toBeVisible()
    
    // 基本プリセットが表示されることを確認（Liteプラン想定）
    await expect(page.locator('text=Clean Light')).toBeVisible()
    await expect(page.locator('text=Warm Basic')).toBeVisible()
    await expect(page.locator('text=Clear Voice')).toBeVisible()
  })

  test('プロセス開始ボタンは初期状態で無効', async ({ page }) => {
    // プロセス開始ボタンが無効状態であることを確認
    const processButton = page.locator('text=処理開始')
    await expect(processButton).toBeVisible()
    await expect(processButton).toBeDisabled()
  })

  test('プラン制限の表示', async ({ page }) => {
    // プラン制限に関する情報が表示されることを確認
    await expect(page.locator('text=Liteプラン')).toBeVisible()
    
    // アップグレードボタンまたはリンクが表示されることを確認
    const upgradeElement = page.locator('text=プランをアップグレード')
    if (await upgradeElement.isVisible()) {
      await expect(upgradeElement).toBeVisible()
    }
  })
})

test.describe('プリセット選択', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/upload')
  })

  test('プリセット選択でカードがアクティブになる', async ({ page }) => {
    // Clean Lightプリセットをクリック
    await page.locator('text=Clean Light').click()
    
    // 選択されたプリセットがアクティブ状態になることを確認
    const cleanLightCard = page.locator('[data-preset="clean_light"]')
    if (await cleanLightCard.isVisible()) {
      await expect(cleanLightCard).toHaveClass(/active|selected/)
    }
  })

  test('プリセット説明が表示される', async ({ page }) => {
    // プリセットをクリックして詳細を表示
    await page.locator('text=Clean Light').click()
    
    // プリセットの説明が表示されることを確認
    await expect(page.locator('text=クリアで自然な音質')).toBeVisible()
  })
})

test.describe('ナビゲーション', () => {
  test('ヘッダーからホームに戻れる', async ({ page }) => {
    await page.goto('/upload')
    
    // ロゴまたはホームリンクをクリック
    await page.locator('text=MIXAI').click()
    
    // ホームページに遷移することを確認
    await expect(page).toHaveURL('/')
  })

  test('プライシングページへのナビゲーション', async ({ page }) => {
    await page.goto('/upload')
    
    // プランリンクがある場合はクリックしてテスト
    const pricingLink = page.locator('text=料金プラン')
    if (await pricingLink.isVisible()) {
      await pricingLink.click()
      await expect(page).toHaveURL('/pricing')
    }
  })
})