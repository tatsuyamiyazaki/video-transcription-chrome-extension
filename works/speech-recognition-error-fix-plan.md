# 🔧 Speech Recognition "not-allowed" エラー修正計画

## 📋 問題概要

### エラー詳細
- **エラーメッセージ**: `Offscreen: Speech recognition error: not-allowed`
- **発生箇所**: Offscreenドキュメント内でのWeb Speech API実行時
- **症状**: マイクアクセス許可が拒否され、音声認識が開始できない

### 現在の実装状況
- Offscreenドキュメントで`SpeechRecognitionManager`を使用
- `getUserMedia()`でマイクアクセスを要求
- Chrome拡張機能のManifest V3を使用

## 🔍 根本原因分析

### 1. Offscreenドキュメントの制限
- Offscreenドキュメントは独立したコンテキストで実行される
- メインページのマイク許可とは別に許可が必要
- Chrome拡張機能の権限モデルとの競合

### 2. Manifest V3の制約
- Service Workerベースの背景処理
- Content ScriptとOffscreenドキュメント間の権限の違い
- Web Speech APIの使用制限

### 3. Chrome拡張機能の権限設定
- 現在の`manifest.json`の権限が不十分な可能性
- `tabCapture`権限だけでは不十分
- Offscreenドキュメント用の特別な設定が必要

## 🛠️ 修正計画

### Phase 1: 権限設定の見直し
#### 1.1 Manifest.jsonの修正
- [ ] `microphone`権限の追加
- [ ] `offscreen`権限の明示的な追加
- [ ] `host_permissions`の確認

```json
{
  "permissions": [
    "tabs",
    "activeTab",
    "tabCapture",
    "storage",
    "downloads",
    "offscreen"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

#### 1.2 Offscreenドキュメントの権限要求方法の変更
- [ ] `getUserMedia()`の呼び出し方法を変更
- [ ] エラーハンドリングの強化
- [ ] 権限状態の事前チェック

### Phase 2: 実装アプローチの変更
#### 2.1 Content Scriptでの音声認識実装
- [ ] Offscreenドキュメントではなく、Content Scriptで直接実装
- [ ] ページコンテキストでのマイクアクセス
- [ ] タブ音声キャプチャとの統合

#### 2.2 Background Scriptでの権限管理
- [ ] Background Scriptで権限要求を管理
- [ ] Content ScriptとBackground Script間のメッセージング
- [ ] 権限状態の一元管理

### Phase 3: 代替実装方式
#### 3.1 TabCapture + AudioContextアプローチ
- [ ] `chrome.tabCapture`でオーディオストリームを取得
- [ ] `AudioContext`でオーディオ処理
- [ ] Web Speech APIに直接ストリームを渡す

#### 3.2 Content Script Injectionアプローチ
- [ ] Content Scriptをページに注入
- [ ] ページコンテキストでの音声認識実行
- [ ] `window.postMessage`での通信

## 📝 詳細修正手順

### Step 1: Manifest.json修正
```json
{
  "manifest_version": 3,
  "name": "Video Transcription Tool",
  "version": "1.0.0",
  "permissions": [
    "tabs",
    "activeTab",
    "tabCapture",
    "storage",
    "downloads",
    "offscreen"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

### Step 2: Offscreen.js の権限チェック強化
```javascript
// 権限状態の事前チェック
async function checkMicrophonePermission() {
  try {
    const permissionStatus = await navigator.permissions.query({name: 'microphone'});
    console.log('Microphone permission status:', permissionStatus.state);
    return permissionStatus.state === 'granted';
  } catch (error) {
    console.error('Permission check failed:', error);
    return false;
  }
}

// 修正されたinitialize関数
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'INITIALIZE_SPEECH_RECOGNITION') {
    // 権限の事前チェック
    const hasPermission = await checkMicrophonePermission();
    
    if (!hasPermission) {
      // ユーザーに明示的に権限を要求
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        
        // ストリームを一旦停止（権限確認のためだけ）
        stream.getTracks().forEach(track => track.stop());
        
        console.log('Offscreen: Microphone access granted');
        speechManager.initialize(message.options || {});
        sendResponse({ success: true });
      } catch (error) {
        console.error('Offscreen: Microphone access denied:', error);
        sendResponse({ success: false, error: `Microphone access denied: ${error.name} - ${error.message}` });
      }
    } else {
      try {
        speechManager.initialize(message.options || {});
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    }
    return true;
  }
});
```

### Step 3: エラーハンドリングの改善
```javascript
this.recognition.onerror = (event) => {
  console.error('Offscreen: Speech recognition error:', event.error);
  
  let errorMessage = '';
  let shouldRetry = false;
  
  switch (event.error) {
    case 'not-allowed':
      errorMessage = 'マイクアクセスが拒否されました。ブラウザの設定を確認してください。';
      break;
    case 'no-speech':
      errorMessage = '音声が検出されませんでした。';
      shouldRetry = true;
      break;
    case 'audio-capture':
      errorMessage = 'オーディオキャプチャに失敗しました。';
      break;
    case 'network':
      errorMessage = 'ネットワークエラーが発生しました。';
      shouldRetry = true;
      break;
    case 'not-supported':
      errorMessage = 'この機能はサポートされていません。';
      break;
    case 'service-not-allowed':
      errorMessage = 'サービスアクセスが拒否されました。';
      break;
    default:
      errorMessage = `不明なエラー: ${event.error}`;
  }
  
  chrome.runtime.sendMessage({
    type: 'OFFSCREEN_SPEECH_ERROR',
    error: errorMessage,
    shouldRetry: shouldRetry,
    originalError: event.error
  });
};
```

### Step 4: Content Script代替案の実装
```javascript
// content-speech.js (新規作成)
class ContentSpeechRecognition {
  constructor() {
    this.recognition = null;
    this.isActive = false;
  }
  
  async initialize() {
    // ページコンテキストで実行
    const script = document.createElement('script');
    script.textContent = `
      (function() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
          window.speechRecognitionAvailable = true;
          window.startSpeechRecognition = function(options) {
            // 音声認識の実装
          };
        }
      })();
    `;
    document.documentElement.appendChild(script);
    script.remove();
  }
}
```

## 🧪 テスト計画

### Test Case 1: 権限チェック
- [ ] 新しいマニフェスト設定での拡張機能読み込み
- [ ] マイク権限の状態確認
- [ ] 権限要求ダイアログの動作確認

### Test Case 2: エラーハンドリング
- [ ] 各種エラーケースの動作確認
- [ ] エラーメッセージの適切性
- [ ] リトライ機能の動作

### Test Case 3: 代替実装
- [ ] Content Scriptでの音声認識動作
- [ ] TabCaptureとの統合テスト
- [ ] 長時間動作での安定性確認

## 🔄 代替案

### 案1: Web Audio API + Speech Recognition
```javascript
// TabCaptureで取得したストリームをWeb Speech APIに渡す
async function initializeWithTabCapture() {
  const stream = await chrome.tabCapture.capture({audio: true});
  const recognition = new webkitSpeechRecognition();
  // ストリームを直接認識エンジンに接続
}
```

### 案2: External API使用
- Google Speech-to-Text APIの使用
- OpenAI Whisper APIの使用
- ローカル音声ファイル保存 + バッチ処理

### 案3: Popup-based Implementation
- ポップアップウィンドウでの音声認識実行
- 独立したコンテキストでの権限取得
- ユーザーの明示的な操作による権限取得

## 📊 実装優先度

| 優先度 | 修正案 | 実装難易度 | 成功確率 | 実装時間 |
|--------|--------|------------|----------|----------|
| 🔴 高 | Manifest権限修正 | 低 | 高 | 1時間 |
| 🟡 中 | エラーハンドリング強化 | 中 | 高 | 3時間 |
| 🟡 中 | Content Script実装 | 高 | 中 | 8時間 |
| 🟢 低 | TabCapture統合 | 高 | 低 | 12時間 |

## 📅 実装スケジュール

### Day 1: 緊急修正
- [ ] Manifest.json権限追加
- [ ] 基本的なエラーハンドリング修正
- [ ] 権限チェック機能追加

### Day 2: 機能強化
- [ ] 詳細なエラーハンドリング実装
- [ ] リトライ機能追加
- [ ] ユーザーフィードバック改善

### Day 3: 代替案実装
- [ ] Content Script版の実装開始
- [ ] TabCapture統合の検証
- [ ] 統合テスト実施

## ✅ 成功指標

- [ ] `not-allowed`エラーの解消
- [ ] 安定した音声認識の開始
- [ ] 適切なエラーメッセージの表示
- [ ] ユーザーエクスペリエンスの向上
- [ ] 10分以上の連続動作可能

---

**作成日**: 2025年6月4日  
**作成者**: 開発チーム  
**レビュー対象**: POC実装チーム
