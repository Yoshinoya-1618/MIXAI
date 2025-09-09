#!/bin/bash

# ========================================
# Vercel ローカルビルド検証スクリプト
# ========================================
# Vercelの本番環境と同じ条件でローカルビルドを実行します

echo "🚀 Vercel ローカルビルド検証を開始します"
echo "================================"

# 1. Vercel CLIの確認
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLIがインストールされていません"
    echo "インストール: npm i -g vercel"
    exit 1
fi

# 2. プロジェクトをVercelに紐付け（初回のみ）
echo "📎 Vercelプロジェクトとの紐付けを確認中..."
if [ ! -f ".vercel/project.json" ]; then
    echo "→ 初回セットアップを実行します"
    npx vercel link --yes
else
    echo "✓ すでに紐付け済みです"
fi

# 3. 環境を選択
echo ""
echo "どの環境でビルドしますか？"
echo "1) production (本番環境)"
echo "2) preview (プレビュー環境)"
echo "3) development (開発環境)"
read -p "選択 (1-3): " env_choice

case $env_choice in
    1)
        ENV_TYPE="production"
        ;;
    2)
        ENV_TYPE="preview"
        ;;
    3)
        ENV_TYPE="development"
        ;;
    *)
        echo "❌ 無効な選択です"
        exit 1
        ;;
esac

echo ""
echo "📥 $ENV_TYPE 環境の設定を取得中..."

# 4. Vercel環境変数をローカルに反映
npx vercel pull --environment=$ENV_TYPE --yes

# 5. 既存のnode_modulesとビルドキャッシュをクリア
echo ""
echo "🧹 既存のキャッシュをクリア中..."
rm -rf node_modules .next .vercel/output

# 6. パッケージマネージャーの検出と依存関係のインストール
echo ""
echo "📦 依存関係をインストール中..."

if [ -f "package-lock.json" ]; then
    echo "→ npmを使用"
    npm ci
elif [ -f "pnpm-lock.yaml" ]; then
    echo "→ pnpmを使用"
    pnpm install --frozen-lockfile
elif [ -f "yarn.lock" ]; then
    echo "→ yarnを使用"
    yarn install --frozen-lockfile
else
    echo "⚠️ ロックファイルが見つかりません。npm installを実行します"
    npm install
fi

# 7. TypeScriptの型チェック（オプション）
echo ""
read -p "TypeScriptの型チェックを実行しますか？ (y/n): " type_check
if [ "$type_check" = "y" ]; then
    echo "🔍 型チェック中..."
    npx tsc --noEmit || {
        echo "⚠️ 型エラーがありますが、ビルドを続行します"
    }
fi

# 8. Vercelビルドの実行
echo ""
echo "🔨 Vercelビルドを実行中..."
echo "================================"

# ビルド時間の計測開始
START_TIME=$(date +%s)

# Vercelビルドを実行
npx vercel build

# ビルド結果の確認
BUILD_RESULT=$?

# ビルド時間の計測終了
END_TIME=$(date +%s)
BUILD_TIME=$((END_TIME - START_TIME))

echo ""
echo "================================"

if [ $BUILD_RESULT -eq 0 ]; then
    echo "✅ ビルド成功！"
    echo "所要時間: ${BUILD_TIME}秒"
    echo ""
    echo "📁 ビルド成果物:"
    echo "  .vercel/output/ - Vercelビルド出力"
    echo "  .next/ - Next.jsビルド出力"
    echo ""
    echo "🎯 次のステップ:"
    echo "  1. ローカルでプレビュー: npx vercel dev"
    echo "  2. デプロイ: npx vercel --prod"
else
    echo "❌ ビルド失敗"
    echo "所要時間: ${BUILD_TIME}秒"
    echo ""
    echo "🔧 トラブルシューティング:"
    echo "  1. エラーメッセージを確認"
    echo "  2. 環境変数が正しく設定されているか確認"
    echo "  3. 依存関係の問題を確認"
    exit 1
fi

# 9. ビルドサイズの分析（オプション）
echo ""
read -p "ビルドサイズを分析しますか？ (y/n): " analyze
if [ "$analyze" = "y" ]; then
    echo "📊 ビルドサイズ分析中..."
    
    if [ -d ".next" ]; then
        echo ""
        echo "📦 .next ディレクトリサイズ:"
        du -sh .next
        echo ""
        echo "📦 主要ファイルサイズ:"
        find .next -type f -name "*.js" -exec ls -lh {} \; | head -10
    fi
    
    if [ -d ".vercel/output" ]; then
        echo ""
        echo "📦 Vercel出力サイズ:"
        du -sh .vercel/output
    fi
fi

echo ""
echo "🎉 Vercelローカルビルド検証完了！"