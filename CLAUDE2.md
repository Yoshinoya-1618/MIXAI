0) 原則（全プラン共通）

ページ到達時に 未解析なら解析→AI MIX適用（冪等）

画面内で AB比較（A=AI適用直後 / B=ユーザー編集）、-14 LUFS正規化

スナップショット：AI_BASE / USER_EDIT / LAST_EXPORT

クレジット消費：0（解析・プレビュー・書き出し・参照曲解析）

1ページ完結：/mix/<plan>/<jobId>

1) 機能マトリクス（差別化）
項目	Lite	Standard	Creator
目標品質	〜80%	80–90%	+90%（参照マッチ）
ノブ数	5軸	6軸（+Clarity）	7軸（+Presence/Exciter）
ノブ軸	Air / Body / Punch / Width / Vocal	Air / Body / Punch / Width / Vocal / Clarity	Air / Body / Punch / Width / Vocal / Clarity / Presence
ジャンルターゲット	—	あり（J-Pop/ROCK/EDM/Ballad）	あり＋参照曲自動マッチ
参照曲	—	手動AB再生のみ（比較視聴）	解析＋自動マッチ（トーナル/PLR/ステレオ）
ダイナミクス	MBコンプ3バンド	4バンド	5バンド（可変クロス）
De-esser	単帯域	マルチ帯域	マルチ帯域＋sibilant検出強化
Ducking	固定（在時1dB）	解析連動（在時1–2dB）	文節/母音連動（0.5–2.5dB）
ステレオ	<120Hz Mono, 軽いSide制限	Side帯域制御＋アパーチャ微調整	自動アパーチャ最適
OS(オーバーサンプル)	4x	8x	16x
loudnorm	2パス（-14/-11/-9）	2パス＋TP管理強化	2パス＋マージン最適化
書き出し	WAV/MP3	+FLAC	+32float / Stem任意（将来枠）
詳細編集	—	一部（閾値/タイム定数）	専門パネル（MB/DynEQ/De-esser/Ducking帯域）
局所最適化	—	—	サビ/ブレイク微調整
2) UI 詳細仕様（ページ単位）
2.1 Lite：/mix/lite/[jobId]

ヘッダー：曲長/LUFS/TP、バッジ「AI解析済み」

プレビュー：波形、ABトグル、Loop、前後比較再生

ノブ（5軸）：Air / Body / Punch / Width / Vocal

ステップ：0.1、範囲：-2.0〜+2.0（Widthは±10%）

フェーダー：Fade In/Out（0–10s）、Output Gain（-3〜+3 dB）

アクション：プレビュー30s生成／書き出し（WAV16/24, MP3）

ログ：LUFS/TP/過大GR警告（自動補正）

復元：AI適用値に戻す／最後の書き出しに戻す

2.2 Standard：/mix/standard/[jobId]（今回追記）

目的：80–90%を安定確保。ジャンル別ターゲットとClarityで“濁り・抜け”を詰める。

レイアウト（1ページ完結）

Header：メタ（曲長/LUFS/TP）、バッジ「AI解析済み」、ジャンルターゲット セレクタ

ジャンル：J-Pop / ROCK / EDM / Ballad（デフォ＝AI推定）

変更時：AI_BASEを再計算せず、USER_EDITに対して補正差分を加算（即時試聴）

Preview Pane：波形、A/Bトグル、Loop範囲、前後比較再生、-14 LUFS正規化

Control Panel（6軸）

Air：8–12kHzシェルフ（±0–2.5dB）＋Exciter微量

Body：200–350Hz Bell（±0–2dB）＋80–120Hz MB比率 0–10%

Punch：低域MBのAttack/Releaseプリセット切替＋GR上限±1.5dB

Width：中高域Sideゲイン（±10%）、<120Hz Mono固定

Vocal：2–4kHz Bell（±1.5dB）＋在時Ducking 0–2dB

Clarity（新）：0.6–2kHz の濁り抑制（DynEQ）0–2dB、s成分優先

入力：ドラッグ＋数値、単体リセット＝AI_BASEへ

微調整（開閉）：

De-esser帯域（S/SH 切替）・スレッショルド、MBタイム定数（粗めに3段）

Reference（任意）：手動AB視聴のみ（ファイル/URLドロップ→正規化AB）※解析は行わない

Fades/Gain：Fade In/Out（0–10s）、Output Gain（-3〜+3 dB）

Actions：プレビュー30s／書き出し（WAV16/24, FLAC, MP3、目標LUFS選択）

Logs：LUFS/TP測定、過大GRの自動クランプ履歴

Snapshots：AI適用値に戻す／最後の書き出しに戻す／現在値を保存

DSP差分（Lite対比）

MB 4バンド、OS 8x、De-esserマルチ帯域

ジャンルターゲットで Tilt傾き・MB比率・Side安全枠を一括係数補正

Duckingはボーカル在時1–2dB（解析量に連動）

制約/ガード

合計GR > 6dB で赤警告→Punch/Clarity/De-esserを自動 5–10% 戻す

TruePeak > -1.0dBTP 検知で Limiter2閾値を-0.2dB刻みで最大3回自動再適用

完了条件

書き出し後に LAST_EXPORT を更新、測定値と適用パラメータJSONを保存

2.3 Creator：/mix/creator/[jobId]

Standard全機能＋以下

参照曲解析パネル：トーナル/PLR/ステレオの差分プロット、追従率スライダー

Presence/Exciter ノブ（倍音比率 0–5%）

詳細編集：MBクロス周波数、DynEQノード、Ducking帯域と量

局所最適化：サビ/ブレイクの±0.5–1.0dB微オートメーションUI

ABXブラインド：-14 LUFS正規化で3試行

3) ルーティング / API / 状態

ルート：/mix/lite|standard|creator/[jobId]

API：

POST /api/v1/mix/analyze → { meta, aiParams(AI_BASE) }

POST /api/v1/mix/preview → { previewUrl, measured }

POST /api/v1/mix/export → { fileUrl, measured, appliedParams, logs }

POST /api/v1/mix/reference/analyze（Creatorのみ）

状態：ai_params（AI_BASE）/ user_params（現在）/ last_export_params

冪等：同jobId再訪は再解析せず（音源差分時のみ解析）

4) ノブ定義（共通レンジ）

Air：±0–2.5 dB（8–12kHz shelf, step 0.1）

Body：±0–2.0 dB（200–350Hz bell, step 0.1）

Punch：-1.5〜+1.5 dB（低域MB GR上限相当, step 0.1）＋Attack/Releaseプリセット

Width：-10%〜+10%（中高域Side、<120Hz Mono固定）

Vocal：±0–1.5 dB（2–4kHz bell）＋Ducking 0–2 dB

Clarity（Std/Cr）：0–2 dB（0.6–2kHz DynEQ）

Presence（Cr）：0–5%（倍音比率）

5) 品質ゲート（共通）

目標LUFS ±0.3、TP ≤ -1.0 dBTP → 未達は自動補正ループ（最大3回）

過大GR段があれば自動クランプ＋トースト表示

測定・適用パラメータはジョブに保存（再現性確保）

6) 受け入れ基準（DoD）

各プランページで AI適用後のノブ実値 が初期表示

Standardページで：

ジャンルターゲット変更が即時に差分反映

Clarityノブが濁り帯域（0.6–2kHz）にダイナミックで効く

手動参照AB（視聴のみ）が動作

書き出し後に LAST_EXPORT 更新／ログ保存

解析・プレビュー・書き出し・参照曲解析：すべて消費0で完了

7) Claude Code 実装タスク（1ファイル全量）

app/mix/standard/[id]/page.tsx：上記UIをStrict UI Parityで実装（DOM/クラス崩さない）

app/api/v1/mix/*/route.ts：冪等解析／プレビュー生成／書き出し／参照曲（Creator）

スナップショット管理：AI_BASE / USER_EDIT / LAST_EXPORT 切替API

ガード処理：GR閾値・TP超過の自動補正とトースト