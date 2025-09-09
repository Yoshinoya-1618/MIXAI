// Supabaseメール送信テストスクリプト
const { createClient } = require('@supabase/supabase-js')

// 環境変数から読み込み（.env.localファイルに設定）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testEmailSignup() {
  const testEmail = 'test@example.com' // テスト用メールアドレス
  const testPassword = 'TestPassword123!'
  
  try {
    // サインアップテスト
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        emailRedirectTo: 'http://localhost:3000/auth/callback',
      }
    })
    
    if (error) {
      console.error('エラー:', error.message)
    } else {
      console.log('成功！確認メールを送信しました。')
      console.log('ユーザー:', data.user?.email)
      console.log('メールを確認してください。')
    }
  } catch (err) {
    console.error('予期しないエラー:', err)
  }
}

// パスワードリセットテスト
async function testPasswordReset() {
  const testEmail = 'test@example.com'
  
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(
      testEmail,
      {
        redirectTo: 'http://localhost:3000/auth/reset-password',
      }
    )
    
    if (error) {
      console.error('エラー:', error.message)
    } else {
      console.log('パスワードリセットメールを送信しました。')
    }
  } catch (err) {
    console.error('予期しないエラー:', err)
  }
}

// テスト実行
console.log('=== Supabaseメール送信テスト ===')
console.log('1. サインアップメールテスト')
testEmailSignup()

// 5秒後にパスワードリセットテスト
setTimeout(() => {
  console.log('\n2. パスワードリセットメールテスト')
  testPasswordReset()
}, 5000)