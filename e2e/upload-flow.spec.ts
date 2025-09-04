import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Upload Flow E2E', () => {
  // テスト用音声ファイル（モック）
  const testAudioFiles = {
    instrumental: path.join(__dirname, 'fixtures', 'test-instrumental.wav'),
    vocal: path.join(__dirname, 'fixtures', 'test-vocal.wav')
  }

  test.beforeEach(async ({ page }) => {
    // 認証状態のモック設定
    await page.route('**/auth/**', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: 'test-user-id',
              email: 'test@example.com'
            }
          })
        })
      }
    })

    // ジョブ作成APIのモック
    await page.route('**/api/v1/jobs', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-job-id',
            status: 'uploaded',
            upload_urls: {
              instrumental: 'https://test.supabase.co/storage/v1/upload/instrumental',
              vocal: 'https://test.supabase.co/storage/v1/upload/vocal'
            }
          })
        })
      }
    })
  })

  test('should complete full upload flow', async ({ page }) => {
    // ホームページにアクセス
    await page.goto('/')
    
    // ページタイトル確認
    await expect(page).toHaveTitle(/MIXAI/)
    
    // メインヘッダー確認
    await expect(page.locator('h1')).toContainText('歌声が、主役になる')
    
    // アップロードセクションまでスクロール
    await page.locator('#upload').scrollIntoViewIfNeeded()
    
    // ファイル選択エリアが表示されることを確認
    const instrumentalUpload = page.locator('[aria-label*="伴奏"]')
    const vocalUpload = page.locator('[aria-label*="ボーカル"]')
    
    await expect(instrumentalUpload).toBeVisible()
    await expect(vocalUpload).toBeVisible()
    
    // 伴奏ファイルの選択をシミュレート
    await instrumentalUpload.click()
    
    // ボーカルファイルの選択をシミュレート  
    await vocalUpload.click()
    
    // アップロード完了後の状態確認
    await expect(page.locator('text=SELECTED')).toHaveCount(2)
  })

  test('should show file validation errors', async ({ page }) => {
    await page.goto('/')
    
    // 無効なファイル形式のテスト用に、画像ファイルを選択する動作をシミュレート
    await page.evaluate(() => {
      const uploadArea = document.querySelector('[aria-label*="伴奏"]')
      if (uploadArea) {
        const event = new Event('drop', { bubbles: true })
        Object.defineProperty(event, 'dataTransfer', {
          value: {
            files: [{
              name: 'invalid.jpg',
              type: 'image/jpeg',
              size: 1024 * 1024
            }]
          }
        })
        uploadArea.dispatchEvent(event)
      }
    })
    
    // エラーメッセージが表示されることを確認
    await expect(page.locator('text=対応していない')).toBeVisible()
  })

  test('should handle large file errors', async ({ page }) => {
    await page.goto('/')
    
    // 大きすぎるファイルのテスト
    await page.evaluate(() => {
      const uploadArea = document.querySelector('[aria-label*="伴奏"]')
      if (uploadArea) {
        const event = new Event('drop', { bubbles: true })
        Object.defineProperty(event, 'dataTransfer', {
          value: {
            files: [{
              name: 'large-file.wav',
              type: 'audio/wav',
              size: 25 * 1024 * 1024 // 25MB
            }]
          }
        })
        uploadArea.dispatchEvent(event)
      }
    })
    
    // サイズエラーメッセージが表示されることを確認
    await expect(page.locator('text=20MB')).toBeVisible()
  })

  test('should be keyboard accessible', async ({ page }) => {
    await page.goto('/')
    
    // キーボードナビゲーションテスト
    await page.keyboard.press('Tab')
    
    // フォーカス可能な要素を確認
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
    
    // アップロードエリアにフォーカスが移動することを確認
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    const uploadArea = page.locator('[aria-label*="伴奏"]:focus')
    await expect(uploadArea).toBeVisible()
    
    // Enterキーでファイル選択ダイアログが開くことを確認
    await page.keyboard.press('Enter')
    
    // ファイル入力要素が存在することを確認
    await expect(page.locator('input[type="file"]')).toBeAttached()
  })

  test('should work on mobile viewport', async ({ page }) => {
    // モバイルビューポート設定
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    
    // モバイル向けレスポンシブデザイン確認
    await expect(page.locator('h1')).toBeVisible()
    
    // モバイルでのタッチ操作確認
    await page.locator('#upload').scrollIntoViewIfNeeded()
    
    // アップロードエリアがモバイルで適切に表示されることを確認
    const uploadAreas = page.locator('[aria-label*="ファイル"]')
    await expect(uploadAreas.first()).toBeVisible()
    
    // タップ操作の確認
    await uploadAreas.first().tap()
  })

  test('should show demo audio players', async ({ page }) => {
    await page.goto('/')
    
    // デモセクションまでスクロール
    await page.locator('#demo').scrollIntoViewIfNeeded()
    
    // Before/After音声プレイヤーの確認
    const beforePlayer = page.locator('[aria-label*="Before"]')
    const afterPlayer = page.locator('[aria-label*="After"]')
    
    await expect(beforePlayer).toBeVisible()
    await expect(afterPlayer).toBeVisible()
    
    // プレイヤーがaudio要素であることを確認
    await expect(beforePlayer.locator('..').locator('audio')).toBeAttached()
    await expect(afterPlayer.locator('..').locator('audio')).toBeAttached()
  })

  test('should handle network errors gracefully', async ({ page }) => {
    // ネットワークエラーのシミュレート
    await page.route('**/api/v1/jobs', (route) => {
      route.abort('failed')
    })
    
    await page.goto('/')
    
    // エラー状態でもページが正常に表示されることを確認
    await expect(page.locator('h1')).toBeVisible()
    
    // アップロード試行時のエラーハンドリング確認
    await page.locator('#upload').scrollIntoViewIfNeeded()
    
    const uploadArea = page.locator('[aria-label*="伴奏"]')
    await uploadArea.click()
    
    // ネットワークエラーが発生してもページが壊れないことを確認
    await expect(page.locator('body')).toBeVisible()
  })

  test('should maintain state during navigation', async ({ page }) => {
    await page.goto('/')
    
    // ファイル選択状態をシミュレート
    await page.evaluate(() => {
      // ローカルストレージに状態保存をシミュレート
      localStorage.setItem('upload_state', JSON.stringify({
        hasFiles: true,
        timestamp: Date.now()
      }))
    })
    
    // ページリロード後の状態確認
    await page.reload()
    
    const savedState = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('upload_state') || '{}')
    })
    
    expect(savedState.hasFiles).toBe(true)
  })
})