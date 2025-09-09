# MIXAI｜サブスク（Stripeホスト完結）要件定義 v1.2
日付: 2025-09-06 / 作成: MIXAI ペアプロ

> 目的: **個人情報（氏名・住所・電話）とクレジットカード情報を自社ドメインで扱わず、Stripeホスト画面で完結**させる。PCI負荷は **SAQ A 相当**、当社DBは**最小限の非特定情報のみ**を保持する。

---

## 0. 決定事項（更新点）
- 決済は **Stripe Checkout（ホスト）** と **Billing Portal** のみを使用。
- 自社ページでの **Payment Element / Address Element は使用しない**。
- 請求先（会社名・部署・宛名・住所・電話）は **Checkout の組み込みフィールド/Custom Fields** と **Billing Portal** で収集・更新。
- 7日間無料トライアル（Creator相当・2.0C）は **Checkoutの `subscription_data.trial_period_days=7`** で付与。

---

## 1. データ方針（プライバシー/PCI）
- **保持するDB情報**：`stripe_customer_id`, `subscription_id`, `plan_code`, `status`, `current_period_start/end`, `monthly_credits`、課金金額の数値、`hosted_invoice_url`。
- **保持しない（保存禁止）**：氏名、住所、電話、カード情報（PAN/有効期限/CVC/指紋/トークン）、カード末尾4桁・ブランドを含むあらゆるカード固有情報。
- **ログ**：Webhookペイロードは **event.id と type, created_at のみ**保存。全文・PI/PMのrawは**保存しない**。
- **表示**：請求書・支払方法は **StripeのHostedページ/Portal** へリンクで提示。自社UI上で個人情報やカード情報を表示しない。

---

## 2. 画面/遷移フロー（Stripeホスト完結）

### 2.1 Public URL
- `/pricing` …… プラン選択
- `/subscribe/checkout` …… サーバが Checkout Session を作成し **Stripe にリダイレクト**（直遷移。レビュー画面は任意）
- `/subscribe/success` …… 成功戻り先（`?session_id=cs_...`）
- `/subscribe/cancel` …… キャンセル戻り先
- `/billing/return` …… Billing Portal 戻り先

### 2.2 API（App Router）
- `POST /api/checkout/session` …… **サブスク用 Checkout Session 作成**（trial/plan/顧客設定）
- `POST /api/checkout/addon` …… **追加クレジット購入用 Checkout Session**
- `POST /api/billing/portal` …… Billing Portal セッションURL作成（`return_url=/billing/return`）
- `GET  /api/billing/status` …… 現契約/残C/更新日/トライアル残
- `POST /api/webhooks/stripe` …… Webhook受信（冪等）

### 2.3 新規サブスク（トライアル）
1) `/pricing` でプラン選択 → フロントが `POST /api/checkout/session { plan_code }`
2) サーバが **Checkout Session (mode='subscription')** を作成：
   - `line_items=[{ price: PRICE_ID, quantity:1 }]`
   - `subscription_data.trial_period_days=7`
   - `billing_address_collection='required'`
   - `phone_number_collection.enabled=true`
   - `customer_creation='always'`（新規顧客を常に作成）
   - `custom_fields`：`company`（会社名）, `department`（部署）, `bill_to`（請求書宛名）
   - `success_url=https://<domain>/subscribe/success?session_id={CHECKOUT_SESSION_ID}`
   - `cancel_url=https://<domain>/subscribe/cancel`
   - （必要に応じ）`consent_collection.terms_of_service='required'`、`custom_text` で特商法/規約リンク文言
3) フロントは返却された `checkout_url` に **リダイレクト**。
4) Stripe側で **氏名/住所/電話/カード** を入力→確定。3DSも Stripe 側で実施。
5) 完了後、`/subscribe/success` に戻る（`session_id` をクエリ受領）。
6) サーバは Webhook `checkout.session.completed`/`customer.subscription.created|updated`/`invoice.paid` を処理し、`subscriptions` と `credit_ledger(trial)` を更新。

### 2.4 既存ユーザーのプラン変更
- 自社UIの「プラン変更」は **Billing Portal** に遷移して操作（UP/DOWN/支払方法更新/解約）。
- 戻り先は `/billing/return?event=updated|cancelled`。
- Webhook `customer.subscription.updated` でDB同期（UP即時の差分C付与、DOWNは次期）

### 2.5 追加クレジット購入（都度）
- 「追加Cを購入」→ `POST /api/checkout/addon { credits }`
- サーバが **Checkout (mode='payment')** を作成：`price=ADDON_PRICE_ID` or `amount=credits*300`
- `success_url=/wallet/success?session_id={CHECKOUT_SESSION_ID}` / `cancel_url=/wallet`
- Webhook `checkout.session.completed` or `invoice.paid` で `credit_ledger(addon)` を + 記帳

### 2.6 与信失敗/猶予
- Webhook `invoice.payment_failed` → `subscriptions.status='past_due'`、**猶予7日**、UIは **DLのみ可**
- 復帰：支払更新は **Billing Portal** 経由。成功で `active` に戻す。

---

## 3. Checkout 設定詳細（サーバ実装要点）
- `mode='subscription'`
- `customer_creation='always'`
- `billing_address_collection='required'`
- `phone_number_collection.enabled=true`
- `subscription_data`：`trial_period_days=7`, `metadata: { userId, plan_code }`
- `custom_fields`：
  - `company`（text, label: 会社名, optional）
  - `department`（text, label: 部署, optional）
  - `bill_to`（text, label: 請求書宛名, optional）
- `success_url`, `cancel_url` は環境変数で注入。
- （任意）`consent_collection.terms_of_service='required'`、`custom_text` で TOS/特商法リンク

### 3.1 Webhook マッピング（PIIをDBに保存しない）
- `checkout.session.completed`：
  - `customer` と `subscription` を取得
  - **Invoice custom_fields** に `company/department/bill_to` を **Stripeに設定（当社DBには保存しない）**
  - `subscriptions` テーブル更新（plan/status/period）
  - `credit_ledger(+trial 2.0C)` 記帳
- `invoice.paid`：`credit_ledger(+monthly)`、`status='active'` に同期
- `customer.subscription.updated`：UP/DOWN反映、UP時は差分C付与
- **冪等**：`billing_events` で event.id を保存し二重実行防止

---

## 4. 画面仕様（自社UIの最小化）
### 4.1 /pricing
- プラン比較＋CTA「このプランで続ける」→ クリックで `POST /api/checkout/session` → 即 **Stripeへ遷移**。
- コピー：**「お支払いと請求先の入力はStripeの安全なページで行います」**

### 4.2 /subscribe/success
- 表示：
  - 「**登録（または無料トライアル）を開始しました**」
  - プラン名 / 次回請求日 / 自動更新 ON
  - 導線：**アップロード** / **マイページ** / **請求書を見る（Hosted Invoice）** / **サブスク管理（Billing Portal）**
- 注意：保存期限（7/15/30日）

### 4.3 /subscribe/cancel
- 「手続きがキャンセルされました」→ `/pricing` へ誘導

### 4.4 /billing/return
- 「お支払い情報・プランの更新が完了しました」等、結果に応じて案内

---

## 5. バックエンド/データモデル（再掲+制限）
- **保存禁止**：氏名、住所、電話、カード情報、Checkoutの custom_fields 値そのもの
- `subscriptions` / `credit_ledger` / `billing_customers` / `billing_products` / `billing_invoices` / `billing_events` は v1.1 と同様に利用。ただし **PII列は持たない**。

---

## 6. 環境変数
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_LITE|STANDARD|CREATOR|ADDON`
- `CHECKOUT_SUCCESS_URL=https://<domain>/subscribe/success`
- `CHECKOUT_CANCEL_URL=https://<domain>/subscribe/cancel`
- `BILLING_PORTAL_RETURN_URL=https://<domain>/billing/return`

---

## 7. 受け入れ基準（Stripeホスト完結版）
1. 自社ドメインで **カード情報入力UIやAddress/Payment Elementを提供していない**。
2. Checkout で **氏名/住所/電話/カード** を入力し、3DS/決済が完結する。
3. Webhook処理のみで `subscriptions` と `credit_ledger` が更新され、**PIIはDBに保存されない**。
4. プラン変更/支払方法更新/解約は **Billing Portal** のみで実施できる。
5. 成功/キャンセル時に **/subscribe/success|/subscribe/cancel** に戻る。
6. ログ/監査情報に **PII/カード情報が含まれない**（event.id, type のみ保持）。

---

## 8. テスト観点
- **サブスク登録（Checkout→Success）**：session_idでWebhook一連が発火し、`status='trialing'`、`trial 2.0C` が付与される。
- **与信失敗→past_due**：猶予7日間、UIはDLのみ可。
- **アップグレード即時（Portal）**：proration請求→差分C即付与。
- **個人情報非保持**：DB/ログに PII が保存されないことを検証。

---

## 9. 法令/コンプラ
- 特商法/規約/プライバシーは **/pricing** に明示。Checkout 画面にも `custom_text` でリンク表示。
- トランザクション系ページは **noindex**。Cookieは**決済目的に必要な最小**のみ。

---

## 10. UIコピー例
- /pricing：
  - 「**お支払いと請求先の入力はStripeの安全なページで行います。** 当サイトはクレジットカード情報を保持しません。」
- /success：
  - 「**無料トライアルを開始しました。** 次回請求日: YYYY-MM-DD。請求情報の確認・変更は **Stripeのポータル** から行えます。」

