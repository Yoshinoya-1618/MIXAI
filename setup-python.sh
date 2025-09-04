#!/bin/bash
# Python環境セットアップスクリプト

echo "🐍 Setting up Python environment for advanced audio analysis..."

# Python 3.8+ 確認
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is not installed. Please install Python 3.8 or later."
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
echo "✅ Found Python $PYTHON_VERSION"

# 仮想環境作成
echo "📦 Creating virtual environment..."
cd worker
python3 -m venv venv

# 仮想環境アクティベート
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    source venv/Scripts/activate
else
    source venv/bin/activate
fi

echo "✅ Virtual environment activated"

# 依存関係インストール
echo "📚 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "🎉 Python environment setup complete!"
echo "To activate manually:"
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    echo "  cd worker && source venv/Scripts/activate"
else
    echo "  cd worker && source venv/bin/activate"
fi

# 動作テスト
echo "🧪 Testing advanced offset detection..."
python3 advanced-offset.py --help 2>/dev/null || echo "⚠️  Test files needed for full testing"

echo "✅ Setup complete!"