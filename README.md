# Video Transcription Chrome Extension - POC

Web Speech APIを使用した動画音声文字起こし機能の技術検証（POC）

## 📋 現在の実装状況

### ✅ 完了済み
- Chrome拡張機能の基本構造（Manifest V3）
- ポップアップUI（HTML/CSS/JavaScript）
- 音声認識ユーティリティクラス
- コンテンツスクリプト（ページ内表示）
- バックグラウンドサービスワーカー基盤

### 🔄 実装中
- Web Speech API統合（システムマイク使用）
- ファイル保存機能
- エラーハンドリング改善

### 📦 ファイル構成
```
video-transcription-chrome-extension/
├── manifest.json              # Chrome拡張機能設定
├── background.js              # バックグラウンドサービスワーカー
├── content.js                 # コンテンツスクリプト
├── popup/
│   ├── popup.html            # ポップアップUI
│   └── popup.js              # ポップアップ制御
├── utils/
│   └── speechRecognition.js  # 音声認識ユーティリティ
└── src/
    ├── icon-16.png           # アイコン（16x16）
    ├── icon-48.png           # アイコン（48x48）
    └── icon-128.png          # アイコン（128x128）
```

## 🚀 使用方法

### インストール
1. Chrome で `chrome://extensions/` を開く
2. 「デベロッパーモード」を有効にする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. このディレクトリを選択

### 使用手順
1. 動画サイト（YouTube等）で動画を再生
2. 拡張機能アイコンをクリック
3. **重要**: スピーカーで音声を再生（ヘッドフォン使用不可）
4. 言語を選択（日本語/英語）
5. 「開始」ボタンをクリック
6. マイクアクセスを許可
7. 音声認識結果がリアルタイムで表示される
8. 「保存」ボタンでテキストファイルとしてダウンロード

## ⚠️ 制限事項・注意点

### 技術的制限
- **音声入力**: システムマイクを使用（タブ音声の直接キャプチャは複雑）
- **音声出力**: スピーカー必須（マイクが音声を拾うため）
- **ブラウザ対応**: Chrome/Chromium系のみ（Web Speech API制限）
- **ネットワーク**: インターネット接続必須（音声認識処理）

### 使用環境
- Google Chrome 最新版推奨
- マイクアクセス権限が必要
- 静かな環境での使用推奨
- 明瞭な音声での動画推奨

## 🧪 テスト方法

### 基本動作テスト
```bash
# 拡張機能構造検証
cd /tmp/test-extension && node validate.js

# 音声認識単体テスト
# /tmp/test-extension/speech-test.html をブラウザで開く
```

### 推奨テストシナリオ
1. **短時間テスト**（1-3分）
   - YouTube教育動画で試用
   - 日本語・英語それぞれでテスト
   
2. **長時間テスト**（10分以上）
   - 連続使用での安定性確認
   - メモリ使用量の監視

## 📊 POC評価基準

### 成功基準
- [x] 基本的な音声認識が動作
- [ ] 5分間の連続認識が可能
- [ ] 日本語・英語での認識精度70%以上
- [ ] ファイル保存機能が動作
- [ ] 重大なエラーが発生しない

### 次ステップ判断
- **継続**: 基本機能が安定動作し、精度が実用レベル
- **改善**: Google Speech-to-Text API等への移行検討
- **中止**: 基本動作が不安定、精度が実用に満たない

## 🔧 開発者向け情報

### デバッグ方法
1. `chrome://extensions/` で「エラー」を確認
2. 拡張機能の「詳細」→「エラーを表示」
3. デベロッパーツール（F12）でコンソール確認

### 主要APIについて
- **Web Speech API**: `SpeechRecognition`（音声→テキスト）
- **Chrome Extensions API**: `chrome.tabs`, `chrome.storage`, `chrome.downloads`
- **Manifest V3**: Service Worker, Permissions

## 📝 開発履歴

- **v0.1.0** (2025-06-03): 基本構造実装、Web Speech API統合
- **次回**: 音声キャプチャ改善、ファイル保存機能

---

📋 関連ドキュメント: `docs/poc-web-speech-api.md`  
🏷️ タグ: `poc`, `web-speech-api`, `chrome-extension`
