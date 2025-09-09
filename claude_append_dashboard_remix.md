# MIXAI ダッシュボード：途中離脱対応／完成品の再MIX 要件定義（CLAUDE.md 追記用）

## 0. スコープ
- 本節は **ダッシュボード上の導線・挙動** に限定。
- 対象機能：
  - 途中離脱プロジェクトの復帰（Resume）
  - 完了済み（DONE）プロジェクトの再MIX（ReMix Session）
- UIトーン：**明るめ**（ホームと統一）。カードは**横長リスト**1本に集約。

---

## 1. ルール（共通）
- **保存期限**：プラン別に *生成時* 起算（Light 7日 / Standard 15日 / Creator 30日）。
  - 期限切れ（EXPIRED）は **自動削除・非表示**（復元機能なし）。
- **クレジット課金**：
  - 「再MIX～マスタリング」を **ひとくくり** とし、どこからやり直しても **0.5 クレジット**。
  - 課金は **再MIXセッション開始時** に 1 回だけ。セッション中の連続操作は追加課金なし。
- **保存ポイント（サーバー保持）**：
  1) 下ごしらえ後（`PREPPED`）
  2) AI MIX OK 判定後（`AI_MIX_OK`）
  3) 最終確認後（`DONE`）
- **通知**：サイレント時間 22:00–08:00（JST）

---

## 2. ステータス
`UPLOADED / PREPPED / AI_MIX_OK / TWEAKING / MASTERING / REVIEW / DONE / ARCHIVED`  
（`EXPIRED` は内部のみ・UI 非表示）

---

## 3. ダッシュボード表示（横長リスト）
- 1 本のリストに全件を表示。フィルタチップ：**すべて / 作業中 / AI OK / 完了 / アーカイブ**。
- 各行（カード）：サムネ、曲名、進捗バー、作成/更新日、**残り日数**（3日以下は警告色）。
- **途中離脱行のCTA**：右側に **「続きから」ボタンのみ** を表示（他のCTAやメニューは非表示）。
- **AI_MIX_OK 行**：
  - 主ボタン：**続きから**
  - 付随メニュー：**AI再MIX → 微調整 → マスタリングへ**（順序固定）
- **DONE/ARCHIVED 行**：
  - 主ボタン：再生 / 共有（閲覧）
  - メニュー：**再MIX**（AI再MIX → 微調整 → マスタリングへ）

---

## 4. 途中離脱の復帰（Resume）
### 対象ステータス
`PREPPED / AI_MIX_OK / TWEAKING / MASTERING / REVIEW`

### 遷移先
- `PREPPED` → **AI MIX 画面**
- `AI_MIX_OK` → **微調整画面**（AI OK 値を初期値）
- `TWEAKING` → **微調整画面**（ユーザー下書き復元）
- `MASTERING` → **マスタリング画面**（前回設定復元）
- `REVIEW` → **最終確認画面**

### 復帰モーダル
- 文言：「前回は〈{ステップ名}〉の途中でした。ここから再開します。」
- 表示：想定所要、保存期限、残クレジット
- アクション：**続ける / キャンセル**
- **課金なし**（再開は無料）

### 実行制御
- 1 プロジェクトにつき **同時実行 1 ジョブ**。実行中は他行をグレーアウト＋「処理中…」バッジ。
- 失敗時：赤バッジ＋「再試行」。サーバー起因は自動返却（返金）対象。

---

## 5. 完成品の再MIX（ReMix Session）
### 対象
- `DONE`（および `ARCHIVED`）

### メニュー（順序固定）
1. **AI再MIX（0.5）**：`PREPPED` から再解析→AI MIX実行→新しい `AI_MIX_OK` を生成
2. **微調整（0.5）**：直近の `AI_MIX_OK` から微調整のみやり直し
3. **マスタリングへ（0.5）**：直近の微調整版から仕上げのみやり直し

> 注：いずれを選んでも **セッション開始時に 0.5 消費**。開始後 24h は追加入金なしで連続操作可能。

### セッション仕様
- エンティティ：`RemixSession { id, projectId, startedAt, charged=true, expiresAt(+24h) }`
- 終了条件：最終確認を完了 / 24h 無操作 / ユーザー明示終了
- ダッシュボード表示：対象行に紫バッジ **「再MIX中」**＋残り時間カウントダウン

### 返金ポリシー
- サーバーエラー／タイムアウト／非対応形式：**全額返金**
- ユーザー都合中断・品質不満：返金なし

---

## 6. 受け入れ基準（Acceptance Criteria）
1. 途中離脱行で **「続きから」以外のCTAが表示されない**。
2. `AI_MIX_OK` の行：主ボタン「続きから」＋メニューが **AI再MIX → 微調整 → マスタリング** の順で表示される。
3. `DONE` の行から再MIXを開始すると、**開始時に 0.5 クレジット**が減算され、以降 24h は追加課金なし。
4. 生成時起算の期限が切れたプロジェクトは、**リロードなし**でも自動的に一覧から消える。
5. サーバー障害で失敗した再MIXは、自動返金され、行に「再試行」CTAが出る。

---

## 7. API / データ（最小）
### Project（抜粋）
```ts
id: string
status: Status
plan: 'Light'|'Standard'|'Creator'
createdAt: ISO
updatedAt: ISO
checkpoints?: { prepped?: ISO; aiOk?: ISO; done?: ISO }
```

### RemixSession（新規）
```ts
id: string
projectId: string
startedAt: ISO
expiresAt: ISO   // startedAt + 24h
charged: boolean // 常に true（開始時に0.5消費）
```

### エンドポイント（案）
- `POST /projects/:id/resume` → 途中復帰（無料）
- `POST /projects/:id/remix`  → 再MIXセッション開始（0.5消費） body: { mode: 'AIMIX'|'TWEAK'|'MASTER' }
- `POST /remix-sessions/:id/end` → セッション終了
- `GET /projects?excludeExpired=true` → 期限切れ除外（既定 true）

---

## 8. イベントログ
- `RESUME_CLICKED {projectId, fromStatus}`
- `REMIX_SESSION_STARTED {projectId, mode, charge:0.5}`
- `REMIX_SESSION_ENDED {projectId, reason}`
- `JOB_STARTED/JOB_SUCCEEDED/JOB_FAILED {projectId, kind}`
- `AUTO_DELETE_EXPIRED {projectId, plan, createdAt, expiredAt}`

---

## 9. エッジケース
- 素材欠損：復帰前チェックで検出 → アップロード誘導。
- 二重セッション：同プロジェクトに既存セッションがある場合、引き継ぐか終了して開始するかを選択。
- クレジット不足：再MIX開始時に不足モーダル → チャージ導線。

---

## 10. 文言（例）
- 復帰モーダル：「前回は〈{step}〉の途中でした。ここから再開します。」
- 再MIX開始：「この操作で 0.5 クレジットを使用します（24時間内の連続操作は追加課金なし）。」
- 期限警告：「保存期限まで残り {n} 日」

---

## 11. QA チェックリスト（抜粋）
- [ ] 途中離脱カードに他CTAが出ない
- [ ] `AI_MIX_OK` のメニュー順が仕様どおり
- [ ] 再MIX開始で 0.5 減算 → 24h 内追加課金なし
- [ ] 期限切れ自動削除
- [ ] 失敗時の自動返金と再試行CTA

