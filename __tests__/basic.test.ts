describe('基本テスト', () => {
  test('テスト環境が正しく動作する', () => {
    expect(1 + 1).toBe(2)
  })

  test('環境変数が設定されている', () => {
    expect(process.env.SUPABASE_URL).toBeDefined()
    expect(process.env.STRIPE_SECRET_KEY).toBeDefined()
  })
})