# E2E Test Fixtures

このディレクトリには統合テスト用のモックファイルを配置します。

## テスト用音声ファイル

実際のテストでは以下のモックファイルを使用：

- `test-instrumental.wav` - 5秒程度の無音ファイル
- `test-vocal.wav` - 5秒程度の無音ファイル  
- `invalid.jpg` - 無効な形式テスト用画像ファイル
- `large-file.wav` - サイズ制限テスト用大きなファイル

## 生成方法

```bash
# 5秒の無音WAVファイル生成（ffmpegが必要）
ffmpeg -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -t 5 test-instrumental.wav
ffmpeg -f lavfi -i anullsrc=channel_layout=mono:sample_rate=44100 -t 5 test-vocal.wav

# 1x1ピクセルの画像ファイル
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGAhyT6/AAAAABJRU5ErkJggg==" | base64 -d > invalid.jpg
```

**注意**: 実際のCI/CD環境では、これらのファイルをバイナリとしてリポジトリに含めるか、テスト時に動的生成することを推奨します。