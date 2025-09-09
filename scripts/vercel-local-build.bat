@echo off
setlocal enabledelayedexpansion

REM ========================================
REM Vercel ローカルビルド検証スクリプト (Windows版)
REM ========================================
REM Vercelの本番環境と同じ条件でローカルビルドを実行します

echo ========================================
echo Vercel ローカルビルド検証を開始します
echo ========================================
echo.

REM 1. Vercel CLIの確認
where vercel >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Vercel CLIがインストールされていません
    echo インストール: npm i -g vercel
    exit /b 1
)

REM 2. プロジェクトをVercelに紐付け（初回のみ）
echo プロジェクトとの紐付けを確認中...
if not exist ".vercel\project.json" (
    echo 初回セットアップを実行します
    call npx vercel link --yes
) else (
    echo すでに紐付け済みです
)

REM 3. 環境を選択
echo.
echo どの環境でビルドしますか？
echo 1) production (本番環境)
echo 2) preview (プレビュー環境)
echo 3) development (開発環境)
set /p env_choice="選択 (1-3): "

if "%env_choice%"=="1" (
    set ENV_TYPE=production
) else if "%env_choice%"=="2" (
    set ENV_TYPE=preview
) else if "%env_choice%"=="3" (
    set ENV_TYPE=development
) else (
    echo [ERROR] 無効な選択です
    exit /b 1
)

echo.
echo %ENV_TYPE% 環境の設定を取得中...

REM 4. Vercel環境変数をローカルに反映
call npx vercel pull --environment=%ENV_TYPE% --yes

REM 5. 既存のnode_modulesとビルドキャッシュをクリア
echo.
echo 既存のキャッシュをクリア中...
if exist node_modules rmdir /s /q node_modules
if exist .next rmdir /s /q .next
if exist .vercel\output rmdir /s /q .vercel\output

REM 6. パッケージマネージャーの検出と依存関係のインストール
echo.
echo 依存関係をインストール中...

if exist "package-lock.json" (
    echo npmを使用
    call npm ci
) else if exist "pnpm-lock.yaml" (
    echo pnpmを使用
    call pnpm install --frozen-lockfile
) else if exist "yarn.lock" (
    echo yarnを使用
    call yarn install --frozen-lockfile
) else (
    echo [WARNING] ロックファイルが見つかりません。npm installを実行します
    call npm install
)

REM 7. TypeScriptの型チェック（オプション）
echo.
set /p type_check="TypeScriptの型チェックを実行しますか？ (y/n): "
if /i "%type_check%"=="y" (
    echo 型チェック中...
    call npx tsc --noEmit
    if errorlevel 1 (
        echo [WARNING] 型エラーがありますが、ビルドを続行します
    )
)

REM 8. Vercelビルドの実行
echo.
echo Vercelビルドを実行中...
echo ========================================

REM ビルド時間の計測開始
set start_time=%time%

REM Vercelビルドを実行
call npx vercel build

REM ビルド結果の確認
set build_result=%errorlevel%

REM ビルド時間の計測終了
set end_time=%time%

echo.
echo ========================================

if %build_result% equ 0 (
    echo [SUCCESS] ビルド成功！
    echo 開始時刻: %start_time%
    echo 終了時刻: %end_time%
    echo.
    echo ビルド成果物:
    echo   .vercel\output\ - Vercelビルド出力
    echo   .next\ - Next.jsビルド出力
    echo.
    echo 次のステップ:
    echo   1. ローカルでプレビュー: npx vercel dev
    echo   2. デプロイ: npx vercel --prod
) else (
    echo [ERROR] ビルド失敗
    echo 開始時刻: %start_time%
    echo 終了時刻: %end_time%
    echo.
    echo トラブルシューティング:
    echo   1. エラーメッセージを確認
    echo   2. 環境変数が正しく設定されているか確認
    echo   3. 依存関係の問題を確認
    exit /b 1
)

REM 9. ビルドサイズの分析（オプション）
echo.
set /p analyze="ビルドサイズを分析しますか？ (y/n): "
if /i "%analyze%"=="y" (
    echo ビルドサイズ分析中...
    
    if exist ".next" (
        echo.
        echo .next ディレクトリサイズ:
        dir /s .next | findstr "File(s)"
    )
    
    if exist ".vercel\output" (
        echo.
        echo Vercel出力サイズ:
        dir /s .vercel\output | findstr "File(s)"
    )
)

echo.
echo ========================================
echo Vercelローカルビルド検証完了！
echo ========================================

endlocal