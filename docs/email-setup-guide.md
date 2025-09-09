# Supabase メール設定ガイド

## 問題解決チェックリスト

### メールが届かない場合の確認事項

1. **Supabase Dashboard確認**
   - [ ] Authentication → Logs でエラーを確認
   - [ ] Project Settings → API → Service Role Key が正しく設定されているか
   - [ ] Authentication → Settings → Email Auth が有効になっているか

2. **メールテンプレート確認**
   - [ ] Authentication → Email Templates で各テンプレートが設定されているか
   - [ ] テンプレート内のURLが正しいか（{{ .ConfirmationURL }}）

3. **URL設定確認**
   - [ ] Authentication → URL Configuration で以下が設定されているか：
     - Site URL（本番URL または http://localhost:3000）
     - Redirect URLs にコールバックURLが含まれているか

4. **SMTP設定（カスタムSMTP使用時）**
   - [ ] Authentication → Settings → SMTP Settings で設定確認
   - [ ] ポート番号が正しいか（587 または 465）
   - [ ] 認証情報が正しいか

5. **レート制限確認**
   - [ ] 無料プラン：1時間4通の制限に引っかかっていないか
   - [ ] 最後のメール送信から15分以上経過しているか

## 推奨設定手順

### Step 1: 開発環境での確認
```bash
# .env.local ファイルを確認
NEXT_PUBLIC_SUPABASE_URL=あなたのSupabaseURL
NEXT_PUBLIC_SUPABASE_ANON_KEY=あなたのAnon Key
```

### Step 2: Supabase Dashboardで基本設定
1. Authentication → Settings
2. Email Auth を有効化
3. Confirm email を有効化（推奨）
4. Secure email change を有効化（推奨）

### Step 3: URL Configuration
```
Site URL: http://localhost:3000 (開発時)
         https://yourdomain.com (本番)

Redirect URLs:
- http://localhost:3000/auth/callback
- http://localhost:3000/auth/reset-password
- https://yourdomain.com/auth/callback
- https://yourdomain.com/auth/reset-password
```

### Step 4: カスタムSMTP設定（オプション）

#### SendGrid設定例
1. SendGridアカウント作成
2. API Key生成（Full Access）
3. Supabaseで設定：
   - Host: smtp.sendgrid.net
   - Port: 587
   - Username: apikey
   - Password: SG.xxxxx（APIキー）
   - Sender email: noreply@yourdomain.com

#### Resend設定例（新しいサービス）
1. [Resend](https://resend.com)でアカウント作成（無料枠：月100通）
2. API Key取得
3. Supabaseで設定：
   - Host: smtp.resend.com
   - Port: 465
   - Username: resend
   - Password: re_xxxxx（APIキー）

### Step 5: テスト実行
```bash
# テストスクリプト実行
node test-email.js
```

## よくある問題と解決方法

### 1. 「Rate limit exceeded」エラー
**原因**: 無料プランの送信制限
**解決**: 
- 15分待つ
- カスタムSMTPを設定
- 有料プランにアップグレード

### 2. メールは送信されるが届かない
**原因**: スパムフォルダに振り分けられている
**解決**:
- 迷惑メールフォルダを確認
- SPF/DKIM設定（カスタムドメイン使用時）
- 信頼できるSMTPサービスを使用

### 3. 「Invalid email or password」エラー
**原因**: メール確認が完了していない
**解決**:
- Email confirmation を一時的に無効化（開発時のみ）
- 確認メールのリンクをクリック

### 4. コールバックURLエラー
**原因**: Redirect URLsが設定されていない
**解決**: 
- Supabase Dashboard → Authentication → URL Configuration
- Redirect URLsに必要なURLを追加

## 本番環境チェックリスト

- [ ] カスタムドメインでのSite URL設定
- [ ] カスタムSMTP設定（SendGrid/Resend推奨）
- [ ] SPF/DKIM/DMARCレコード設定（DNS）
- [ ] メールテンプレートのカスタマイズ
- [ ] レート制限の監視設定
- [ ] バウンス/苦情処理の設定

## 参考リンク

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [SendGrid Setup](https://docs.sendgrid.com/for-developers/sending-email/integrating-with-the-smtp-api)
- [Resend Documentation](https://resend.com/docs)
- [Email Deliverability Best Practices](https://supabase.com/docs/guides/auth/auth-email-best-practices)