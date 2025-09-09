# MIXAI｜サブスク（プラン）要件定義 v1.0
日付: 2025-09-06 / 作成: MIXAI ペアプロ

---

## 0. 決定事項（ヒアリング確定）
- ① 決済事業者: **Stripe**
- ② 表示価格: **税込**（日本国内 10% 内税）
- ③ 請求書/領収書: **Stripeのホスト請求書リンク**を提示（PDF保存は任意）
- ④ **7日間無料トライアル**: 初回は**全部盛り（ハモリ等 Creator同等機能）**を**0円**で提供
- ⑤ プラン変更: **アップグレード=即時反映**／**ダウングレード=次回更新から**
- ⑥ 与信失敗（past_due）: **猶予7日**、**DLのみ可**（新規MIX/再MIX/追加C購入は不可）
- ⑦ 請求先情報: **個人/事業者切替**、**会社名・部署・請求書宛名**の収集
- ⑧ 解約: **期間末解約（即時解約・日割りなし）**
- ⑨ 対象エリア: **国内のみ想定**（Stripe Tax 追加不要）
- ⑩ 管理: **Stripe Billing Portal** を利用（プラン変更/支払方法管理/請求履歴）

> 備考: 既存の「単発（1曲）体験」導線は別枠で維持可。運用上の重複は要注意（本要件ではサブスク主導）。

---

## 1. プラン定義
### 1.1 プラン一覧（例：既存仕様準拠／数値は現行運用値に合わせて調整可能）
- **Lite**: 月額¥1,280 / 月次付与 **3.0C** / 保存期限7日
- **Standard**: 月額¥2,980 / 月次付与 **6.0C** / 保存期限15日
- **Creator**: 月額¥5,980 / 月次付与 **10.0C** / 保存期限30日
- **追加クレジット**: ¥300 / 1C（都度課金）

> ※C=クレジット（1ジョブ=1.0C 基準、実装上の係数はジョブ種別で上書き可）

### 1.2 機能差分（抜粋）
- Lite: 基本MIX/マスタリング、微調整ノブ少数
- Standard: ピッチ/タイミング補正の強化、ノブ拡張
- Creator: **ハモリ等の全部盛り**、解析上限↑、高度微調整

### 1.3 無料トライアル（7日・全部盛り）
- 対象: **初回**サブスク登録ユーザー
- Stripeの `trial_end=+7d` を使用。**カード登録必須**（不正/多重回避）
- トライアル中の課金: **¥0**（期間中に解約すれば請求なし）
- トライアル中のクレジット: **2.0C**
- トライアル中の利用範囲:
  - 機能: **Creator同等**（ハモリ等を含む）
  - ジョブ制限（推奨・運用保護のため）: **上限 5ジョブ / 7日**、1ジョブ最大60秒。※上限は環境変数で可変
  - クレジット扱い: **Trialバケット**（別枠）を優先消費 → 試用上限到達で停止
  - トライアル中のMIX済データはダッシュボードへ格納。トライアルのタグ表記。再MIX等は **0C**

---

## 2. 利用フロー（UI/UX）
### 2.1 新規サブスク（トライアル含む）
1. **/pricing**（プラン選択）
   - 3カード（Lite/Standard/Creator）。税込価格・付与C・主な差分・保存期限を明示。
   - CTA: 「このプランで続ける」
   - 未ログイン→**/auth/login?callbackUrl=/subscribe/review?plan=...**
2. **/subscribe/review**（最終確認）
   - 表示: 選択プラン、**月額（税込）**、**初回: 7日間無料**、**次回請求日**、**自動更新**
   - 支払方法: Stripe Payment Element（未登録時）
   - 請求先情報: 個人/事業者切替 + 会社名/部署/宛名/郵便番号/住所/電話
   - 同意チェック（必須）:
     - [ ] 自動更新に同意
     - [ ] 利用規約 / プライバシー / 特商法の確認
   - CTA: 「**確定して登録（無料トライアル開始）**」
3. **/subscribe/processing**（処理中）
4. 成功→ **/subscribe/success**（完了）
   - 文言例: 「**7日間無料トライアルを開始しました**。次回請求日: YYYY-MM-DD」
   - 次アクション: 「今すぐアップロード」/「ダッシュボード」/「請求書を見る」/「サブスクの管理」
5. 失敗→ **/subscribe/failure**（理由と再試行）

### 2.2 既存ユーザーのプラン変更
- /pricing で「現在のプラン」バッジ表示
- アップグレード: 即時、差額請求（Stripe proration=on）、**差分クレジット即付与**
- ダウングレード: 次回更新から。UIに反映タイミングを明示

### 2.3 与信失敗（past_due）
- 発生: `invoice.payment_failed`
- ステータス: **past_due** → 猶予**7日**
- 制限: **DLのみ可**（新規/再MIX/追加C購入不可）
- 猶予終了: 自動解約 or 継続（要再決済）

### 2.4 解約
- ユーザー操作: Billing Portal で「解約」
- 有効期限: **現在の請求期間の末日まで**利用可 → 以降失効（残Cは失効）

---

## 3. 画面仕様・コピー（要点）
### 3.1 /pricing
- 各カード:
  - 価格（税込）/ 月次付与C / 保存期限 / 主機能差分
  - 補助: 「7日間無料トライアル」「解約はいつでも」
- 追記: 追加クレジット ¥300/1C（都度）
- アクセシビリティ: カード全域フォーカス、EnterでCTA

### 3.2 /subscribe/review（最終確認）
- セクション:
  1) プラン要約（無料期間・次回請求日・自動更新）
  2) 請求先情報（個人/事業者切替）
  3) 支払方法（Payment Element）
  4) 同意チェック（規約/特商法/自動更新）
- バリデーション:
  - 必須: 氏名or会社名/郵便番号7桁/都道府県/市区町村/住所/電話（E.164）
  - 事業者時: 会社名・部署・請求書宛名 必須
  - 二重送信防止: CTA disabled + idempotency-key

### 3.3 /subscribe/success
- 見出し: 「ご登録が完了しました」or「無料トライアルを開始しました」
- 情報: プラン名 / 次回請求日 / 自動更新ON / 月次付与C（課金確定後）
- 導線: アップロード / マイページ / 請求書（Stripe）/ サブスク管理（Portal）
- 注意: 保存期限（7/15/30日）を明示

### 3.4 /subscribe/failure
- 失敗理由、再試行、支払方法変更

### 3.5 /subscribe/confirm（3DS戻り先）
- 3DS 認証後の結果判定 → success/failure に遷移

---

## 4. バックエンド/データモデル
### 4.1 主要テーブル
- `plans(code, name, price_jpy, monthly_credits, features, storage_days)`
- `subscriptions(user_id, plan_code, status, current_period_start, current_period_end, auto_renew)`
- `credit_ledger(id, user_id, event, delta_credits, bucket, reason, job_id, created_at)`
  - bucket: `trial` | `monthly` | `carryover` | `addon`
- `billing_customers(user_id, stripe_customer_id, default_payment_method_id)`
- `billing_products(plan_code, stripe_product_id, stripe_price_id_monthly)`
- `billing_invoices(id, user_id, stripe_invoice_id, hosted_url, amount, currency, period_start, period_end)`
- `billing_events(id, type, payload_json, created_at, processed_at)`（**Webhook冪等**）

### 4.2 付与/消費ポリシー
- 付与:
  - `invoice.paid` 時: `monthly` バケットに `plans.monthly_credits` を + 記帳
  - 解約/失効: 残Cは無条件で失効（carryover含む）
- 消費順序（FIFO）: `carryover` → `monthly` → `addon` →（試用期間中は）`trial`
- ブロック条件: `past_due` or `canceled` → 新規/再MIX/追加C購入不可（DL可）

### 4.3 環境変数（例）
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_LITE|STANDARD|CREATOR`
- `TRIAL_ENABLED=true`
- `TRIAL_DAYS=7`
- `TRIAL_MAX_JOBS=5`
- `TRIAL_MAX_SECONDS_PER_JOB=60`

---

## 5. Stripe 連携
### 5.1 フロー
- 新規（トライアルあり）: `subscriptions.create({trial_end, items:[{price}] , payment_behavior:'default_incomplete'})` → Payment Element で確定
- アップグレード: `proration_behavior='create_prorations'`
- ダウングレード: `proration_behavior='none'`, `pending_update` 次期反映
- ポータル: Billing Portal セッション生成 → リダイレクト

### 5.2 Webhook（サポートイベント）
- `checkout.session.completed`（必要時）
- `customer.subscription.created|updated|deleted`
- `invoice.paid|payment_failed`
- `payment_intent.succeeded|payment_failed`

### 5.3 Webhook動作
- `invoice.paid`: subscriptions.status=`active`; credit_ledger に monthly 付与; period 更新
- `invoice.payment_failed`: status=`past_due`; 猶予カウント開始; 制限モード適用
- `customer.subscription.updated`:
  - plan変更の反映、差分クレジット（アップ時）を即付与
- 冪等: `billing_events.id` で一度処理した event を再処理しない

---

## 6. API 仕様（App Router Route Handlers）
### 6.1 `POST /api/billing/subscribe`
- 入力:
```json
{
  "plan_code": "lite|standard|creator",
  "billing_profile": {
    "type": "personal|business",
    "company": "株式会社○○",
    "department": "営業部",
    "bill_to": "河内通商株式会社 御中",
    "name": "山田 太郎",
    "postal": "1234567",
    "pref": "東京都",
    "city": "千代田区",
    "addr": "丸の内1-1-1",
    "tel": "+81-3-1234-5678"
  },
  "idempotency_key": "userId:plan:epoch"
}
```
- 出力: `{ status: 'processing' | 'succeeded', next_url?: string }`

### 6.2 `GET /api/billing/status`
- 出力: `plan_code, status, current_period_end, remaining_credits, is_trial, trial_ends_at`

### 6.3 `POST /api/billing/portal`
- 出力: `{ url: string }`（Stripe Billing Portal）

### 6.4 `POST /api/billing/credits/buy`
- 入力: `{ credits: number }`（¥300/1C）
- 出力: 決済セッションURL → 成功後 `addon` 付与

### 6.5 `POST /api/webhooks/stripe`
- 署名検証、冪等、上記イベントの業務反映

---

## 7. 法令/コンプラ（日本）
- 最終確認画面に表示:
  - **自動更新（定期購入）**である旨、**請求サイクル**、**次回請求日**
  - **販売価格（税・手数料の内訳）**
  - **支払方法と時期**（毎月自動課金）
  - **提供時期**（即時。トライアル中は¥0）
  - **解約**（期間末解約/日割りなし）
  - **事業者情報**（特商法ページリンク）
- チェックボックスで明示同意を取得
- トランザクションページは **noindex** 推奨

---

## 8. 通知/メール
- トリガーと件名（例）
  - 登録完了（トライアル開始）: 「無料トライアルを開始しました」
  - 与信失敗: 「お支払いに失敗しました（猶予7日）」
  - プラン変更（UP）: 「プランを即時アップグレードしました」
  - 解約予約: 「解約を受け付けました（期間末まで利用可）」
  - 次回請求リマインド（任意）: 「まもなく次回請求日です」

---

## 9. 計測/KPI
- フロントイベント: `pricing_viewed`, `plan_selected`, `review_confirmed`, `payment_succeeded`, `payment_failed`
- バックイベント: `invoice_paid`, `past_due`, `ledger_granted`, `ledger_consumed`
- 指標: コンバージョン率、3DS発生率、アップグレード率、解約率、クレジット消費率

---

## 10. 受け入れ基準（Acceptance）
1. /pricing → /subscribe/review → /subscribe/success を**3クリック以内**で到達可能
2. /subscribe/review で **自動更新/金額/無料期間/次回請求日**を明示し、**同意必須**
3. `invoice.paid` 時に `subscriptions.status='active'`、`credit_ledger` に `monthly` 付与が記帳
4. `payment_failed` で `past_due`、**DLのみ可**の制限が適用
5. プラン変更は **UP=即時/差分C即付与**、**DOWN=次期反映** が UI/DB で整合
6. トライアル: 7日間 ¥0、**上限2ジョブ/7日**（環境変数で可変）、Creator同等機能

---

## 11. テスト観点（抜粋）
- Gherkin 例:
  - **トライアル登録**
    - Given 新規ユーザー
    - When /pricing→review で Creator を選び登録
    - Then /success に遷移し trial_ends_at=+7d が表示
  - **与信失敗→猶予**
    - Given active ユーザー
    - When invoice.payment_failed を受領
    - Then status=past_due かつ 新規MIX/再MIX/追加C不可、DLのみ可
  - **アップグレード即時**
    - Given Standard
    - When CreatorへUP
    - Then proration請求 & 差分C即付与

---

## 12. 今後の可変パラメータ（Config）
- 価格・付与C・保存期限
- TRIAL_*（有効化/期間/上限ジョブ/秒）
- 猶予日数・制限モード詳細

---

## 13. 付録（UIコピー例）
- /review: 「本登録後、**7日間は¥0**でご利用いただけます（２曲分）。期間終了の**YYYY-MM-DD**から毎月**税込¥X,XXX**を自動でご請求します。**いつでも解約**できます。」
- /success: 「無料トライアルを開始しました。次回請求日: YYYY-MM-DD。トライアル中も Creator 相当の機能をご利用いただけます。」

