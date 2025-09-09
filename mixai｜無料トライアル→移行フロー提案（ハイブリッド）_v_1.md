# MIXAI｜無料トライアル→移行フロー提案（ハイブリッド） v1.0

> 目的：無料トライアルから有料サブスク（Lite / Standard / Creator）への移行率を最大化しつつ、誤請求・体験ギャップを最小化する。

---

## 1. 推奨方針（ハイブリッド）
- ベース：**提案1（登録時にプラン選択）**
- 追加：開始直後に **Creator Boost（48hだけCreator機能を試せる）** を自動付与
- 安全網：**いつでも解約OK**（Billing Portal）で解約時は **Free/Practice** にダウンシフト（課金なし）
- 通知：トライアル **3日前** と **当日** にメール＋アプリ内バナーで明示（更新日と税込価格）

### この方針の狙い
1. **課金情報を確保** → 更新が滑らか、サポート負荷も軽減
2. **期待値の明確化** → 最初から選んだプラン相当の体験
3. **魅力訴求** → 48h Creator Boostで“差分価値”を触ってもらう

---

## 2. 体験フロー（UX）

### 2.1 新規トライアル開始
1. 「無料トライアルを始める」
2. **プラン選択**（既定＝Standard、Lite/Standard/Creatorから選べる）
3. Stripe Checkout（`trial_period_days=7`、規約同意必須）
4. 成功後、ダッシュボードへ遷移し **Creator Boost（+48h）** 発動

### 2.2 トライアル期間中
- 日数：**7日**
- 権限：**選択プラン相当**が基本。開始から**48hはCreator Boost**で上位機能も体験可
- いつでも：**Billing Portal** で解約/プラン変更

### 2.3 トライアル満了
- 3日前：メール＋バナーで「更新日・金額・解約/変更導線」を通知
- 当日：最終通知→解約されていなければ自動更新（選択プランの金額で課金）
- 途中解約：課金なし→**Free/Practice** プランへ自動ダウンシフト

> **非推奨**：未選択で自動ライト化／無同意での自動課金。誤認要因となるため採用しない。

---

## 3. 画面・文言（そのまま使用可）

### 3.1 プラン選択カード
- ボタン：**「いま無料で開始（7日後 ¥2,980/月・税込）」**
- 補足：**「更新日は 2025/09/14。期間中はいつでも解約可。解約時は料金は発生しません。」**

### 3.2 開始モーダル
- 見出し：**Creator Boost を 48時間お試し**
- 本文：**「開始から48時間はCreator機能も解放されます。48時間後は選択プランの権限に戻ります。」**

### 3.3 リマインド（メール件名・本文）
- 3日前 件名：**【MIXAI】7日間の無料期間がまもなく終了します（9/14開始・税込¥2,980/月）**
- 3日前 本文：
  - 更新日：**9/14 00:00**
  - 更新後プランと金額（内税）
  - **プラン変更**／**解約（料金発生なし）** の導線
- 当日 件名：**【MIXAI】本日からご利用プランが開始します（解約はいつでも可）**

### 3.4 アプリ内バナー
- テキスト：**「9/14にStandard（¥2,980/月・税込）が開始します。今すぐ変更・解約できます。」**
- CTA：**「プラン変更」「解約する」「今は閉じる」**

---

## 4. 機能権限（Feature Flags）

```json
// plans.features（例）
{
  "free": {
    "max_seconds": 60,
    "preview_export_seconds": 20,
    "export_bitrate_kbps": 96,
    "watermark": true,
    "daily_preview_quota": 1,
    "storage_days": 3
  },
  "lite": {
    "ai_pitch_timing": false,
    "harmony_full": false,
    "export_wav": false
  },
  "standard": {
    "ai_pitch_timing": true,
    "harmony_full": false,
    "export_wav": true
  },
  "creator": {
    "ai_pitch_timing": true,
    "harmony_full": true,
    "export_wav": true
  }
}
```

- **Creator Boost**：`features.creator_boost_until` に時刻を保存。現在時刻がこれを超えると自動無効化。
- UI は features を参照してボタンの活性/ロック表示を切替（ロックはアップセル文言付き）。

---

## 5. 通知・イベント連携（Stripe / System）

### 5.1 Stripe Webhook（必須）
- `checkout.session.completed`：導線ログ（購買開始）
- `customer.subscription.created`：`subscriptions` へ upsert（trial開始）
- `customer.subscription.updated`：プラン変更/期日の反映
- `customer.subscription.deleted`：解約→Freeへ降格
- `customer.subscription.trial_will_end`：**3日前通知**トリガ
- `invoice.paid`：月次クレジット付与
- `invoice.payment_failed`：再請求・停止フロー

### 5.2 System Jobs（CRON/キュー）
- **Boost終了ジョブ**：`creator_boost_until < now()` を検出して機能旗をOFF
- **当日通知**：更新当日のAM（JST）にメール＋バナー
- **解約時のダウンシフト**：Freeへ切替＋保存期限カウントダウン

---

## 6. エッジケース運用
- **トライアル中に解約**：課金なし→即Free。作成物は **7日保管**（例）後にアーカイブ/削除
- **決済失敗**：48h猶予→権限ダウングレード→回復で自動復帰
- **複数アカウントで重複トライアル**：`billing_customers` と `auth.users` の紐付で検知。再トライアル不可
- **Boost中エクスポート**：成果物DL/ハモリ全編は **選択プラン権限** に従う（Boostは“体験”用途）

---

## 7. KPI / A/B テスト
- **KPI**：トライアル→有料化率、D2/D7活性、48h内Creator機能使用率、解約率、ダウングレード率
- **A/B**：
  - 既定プラン＝Standard vs Creator
  - リマインド本数＝（3日前+当日） vs （3日前のみ）
  - Boost時間＝24h vs 48h

---

## 8. 実装タスクリスト（Dev）
- [ ] `plans`/`subscriptions`/`billing_customers`/`credit_ledger` DDL 反映
- [ ] Checkout起動 API（`/api/checkout`）に `trial_period_days=7` と `consent_collection` を実装
- [ ] Billing Portal 起動 API（`/api/billing-portal`）
- [ ] Webhook（`/api/webhooks/stripe`）で上記イベントをハンドル（冪等ログ `billing_events`）
- [ ] `features.creator_boost_until` の付与・失効ジョブ
- [ ] バナー/メール通知（3日前・当日）。テンプレ文面の実装
- [ ] UI：ロック表示・アップセルモーダル・価格/更新日の明示

---

## 9. コンプラ/表記
- 価格は**税込**で明示。更新日と自動更新の明記
- **特商法ページ／利用規約／プライバシーポリシー**の整備・リンク掲示
- Checkoutで**規約同意**（`consent_collection.terms_of_service='required'`）

---

## 10. オプション（現在仕様との整合）
- 現在：**7日間 Creator（2曲分）** 体験済みの運用がある場合
  - 互換モード：`TRIAL_MODE = 'creator_full_2tracks'` を `app config` に用意
  - 新運用：`TRIAL_MODE = 'plan_selected_with_boost'` へ段階移行（ABで効果検証）

---

## 11. Done条件（Definition of Done）
- Checkout→Trial→更新/解約の**全ハッピーパス**がE2Eで成功
- 3日前/当日の**通知**が正しい日時・金額で配信
- Boost 48h の付与・失効が正しく反映
- 解約時に**課金が発生しない**ことを実データで確認
- KPIダッシュボードで**トライアル→有料化率**が可視化

---

### 備考
- すべてJST（Asia/Tokyo）基準の日時表記で統一
- 金額は内税（10%）としてUI/メールに**税込**で表示

