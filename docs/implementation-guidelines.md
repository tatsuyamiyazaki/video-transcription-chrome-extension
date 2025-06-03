# Chrome拡張機能「動画音声文字起こしツール」実装ガイドライン

## 📋 目次

1. [プロジェクト構成](#プロジェクト構成)
2. [開発環境セットアップ](#開発環境セットアップ)
3. [コーディング規約](#コーディング規約)
4. [コンポーネント実装ガイド](#コンポーネント実装ガイド)
5. [API実装ガイド](#api実装ガイド)
6. [テスト実装ガイド](#テスト実装ガイド)
7. [デバッグ・トラブルシューティング](#デバッグトラブルシューティング)
8. [パフォーマンス最適化](#パフォーマンス最適化)
9. [セキュリティ実装](#セキュリティ実装)
10. [配布・リリース](#配布リリース)

---

## 🏗️ プロジェクト構成

### ディレクトリ構造

```
video-transcription-chrome-extension/
├── manifest.json                    # 拡張機能マニフェスト
├── src/
│   ├── background/                  # バックグラウンドスクリプト
│   │   ├── background.js
│   │   ├── audio-recorder.js
│   │   ├── transcription-engine.js
│   │   └── file-manager.js
│   ├── content/                     # コンテンツスクリプト
│   │   ├── content.js
│   │   └── page-analyzer.js
│   ├── popup/                       # ポップアップUI
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   ├── options/                     # 設定画面
│   │   ├── options.html
│   │   ├── options.js
│   │   └── options.css
│   ├── libs/                        # 共通ライブラリ
│   │   ├── storage-manager.js
│   │   ├── auth-manager.js
│   │   ├── logger.js
│   │   └── utils.js
│   ├── apis/                        # API クライアント
│   │   ├── google-stt-client.js
│   │   ├── whisper-client.js
│   │   └── google-drive-client.js
│   └── assets/                      # 静的リソース
│       ├── icons/
│       ├── styles/
│       └── fonts/
├── tests/                           # テストファイル
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── build/                           # ビルド出力
├── docs/                            # ドキュメント
└── tools/                           # 開発ツール
    ├── build.js
    └── package.js
```

### 主要ファイルの役割

| ファイル | 役割 | 実装優先度 |
|---------|------|-----------|
| `manifest.json` | 拡張機能設定 | 高 |
| `background.js` | メインロジック制御 | 高 |
| `audio-recorder.js` | 音声録音機能 | 高 |
| `transcription-engine.js` | 文字起こしエンジン | 高 |
| `popup.js` | UI制御 | 中 |
| `options.js` | 設定管理 | 中 |
| `auth-manager.js` | 認証管理 | 高 |
| `file-manager.js` | ファイル管理 | 中 |

---

## 🛠️ 開発環境セットアップ

### 必要なツール

```bash
# Node.js (v18以上)
node --version

# npm or yarn
npm --version

# Git
git --version
```

### プロジェクト初期化

```bash
# プロジェクトクローン
git clone <repository-url>
cd video-transcription-chrome-extension

# 依存関係インストール
npm install

# 開発用ビルド
npm run build:dev

# Chrome拡張機能として読み込み
# Chrome -> その他のツール -> 拡張機能 -> 開発者モード -> パッケージ化されていない拡張機能を読み込む
```

### 開発ツール設定

#### package.json
```json
{
  "name": "video-transcription-extension",
  "version": "1.0.0",
  "scripts": {
    "build": "webpack --mode=production",
    "build:dev": "webpack --mode=development",
    "watch": "webpack --mode=development --watch",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src/**/*.js",
    "format": "prettier --write src/**/*.js"
  },
  "devDependencies": {
    "webpack": "^5.0.0",
    "webpack-cli": "^4.0.0",
    "eslint": "^8.0.0",
    "prettier": "^2.0.0",
    "jest": "^29.0.0"
  }
}
```

---

## 📝 コーディング規約

### JavaScript/ES6+ 規約

#### 1. 命名規則
```javascript
// ✅ 推奨
const audioRecorder = new AudioRecorder();
const MAX_RECORDING_TIME = 7200000; // 2時間
const API_ENDPOINTS = {
  GOOGLE_STT: 'https://speech.googleapis.com/v1/speech:recognize',
  WHISPER: 'https://api.openai.com/v1/audio/transcriptions'
};

// ❌ 非推奨
const ar = new AudioRecorder();
const maxtime = 7200000;
```

#### 2. 関数定義
```javascript
// ✅ 非同期関数の推奨形式
async function transcribeAudio(audioData, options = {}) {
  try {
    const result = await transcriptionEngine.process(audioData, options);
    return result;
  } catch (error) {
    logger.error('Transcription failed:', error);
    throw new TranscriptionError(error.message);
  }
}

// ✅ アロー関数の使用場面
const processAudioChunk = (chunk) => {
  return audioProcessor.normalize(chunk);
};
```

#### 3. エラーハンドリング
```javascript
// ✅ カスタムエラークラス
class TranscriptionError extends Error {
  constructor(message, code = 'TRANSCRIPTION_ERROR') {
    super(message);
    this.name = 'TranscriptionError';
    this.code = code;
  }
}

// ✅ 統一されたエラーハンドリング
try {
  await performTranscription();
} catch (error) {
  if (error instanceof TranscriptionError) {
    notificationManager.showError(error.message);
  } else {
    logger.error('Unexpected error:', error);
    notificationManager.showError('予期しないエラーが発生しました');
  }
}
```

### Chrome拡張機能特有の規約

#### 1. メッセージパッシング
```javascript
// ✅ メッセージタイプの定数定義
const MESSAGE_TYPES = {
  START_RECORDING: 'START_RECORDING',
  STOP_RECORDING: 'STOP_RECORDING',
  TRANSCRIPTION_COMPLETE: 'TRANSCRIPTION_COMPLETE',
  ERROR_OCCURRED: 'ERROR_OCCURRED'
};

// ✅ メッセージ送信
chrome.runtime.sendMessage({
  type: MESSAGE_TYPES.START_RECORDING,
  payload: { tabId: activeTabId }
});

// ✅ メッセージ受信
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case MESSAGE_TYPES.START_RECORDING:
      handleStartRecording(message.payload);
      break;
    default:
      logger.warn('Unknown message type:', message.type);
  }
});
```

---

## 🧩 コンポーネント実装ガイド

### 1. Audio Recorder 実装

#### audio-recorder.js
```javascript
class AudioRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.stream = null;
  }

  async startRecording(tabId) {
    try {
      // Chrome Tab Capture API を使用
      this.stream = await new Promise((resolve, reject) => {
        chrome.tabCapture.capture({
          audio: true,
          video: false
        }, (stream) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(stream);
          }
        });
      });

      // MediaRecorder セットアップ
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          this.processAudioChunk(event.data);
        }
      };

      this.mediaRecorder.start(1000); // 1秒間隔でチャンク生成
      this.isRecording = true;
      
      logger.info('Recording started for tab:', tabId);
    } catch (error) {
      throw new RecordingError('Failed to start recording: ' + error.message);
    }
  }

  async stopRecording() {
    if (!this.isRecording) {
      throw new RecordingError('Recording is not active');
    }

    return new Promise((resolve) => {
      this.mediaRecorder.onstop = () => {
        this.cleanup();
        resolve(this.audioChunks);
      };
      
      this.mediaRecorder.stop();
      this.isRecording = false;
    });
  }

  async processAudioChunk(chunk) {
    // リアルタイム処理のためのチャンク送信
    const audioData = await this.convertChunkToAudioData(chunk);
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.AUDIO_CHUNK_READY,
      payload: { audioData }
    });
  }

  cleanup() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.audioChunks = [];
  }
}
```

### 2. Transcription Engine 実装

#### transcription-engine.js
```javascript
class TranscriptionEngine {
  constructor() {
    this.currentEngine = null;
    this.adapters = {
      'google': new GoogleSTTAdapter(),
      'whisper': new WhisperAdapter()
    };
  }

  async initialize() {
    const settings = await storageManager.getSettings();
    this.currentEngine = settings.transcription.engine || 'google';
    
    await this.adapters[this.currentEngine].initialize();
  }

  async transcribe(audioData, options = {}) {
    if (!this.currentEngine) {
      throw new TranscriptionError('Engine not initialized');
    }

    const adapter = this.adapters[this.currentEngine];
    const result = await adapter.transcribe(audioData, options);
    
    return this.processResult(result);
  }

  processResult(result) {
    return {
      text: result.text,
      confidence: result.confidence || 0,
      alternatives: result.alternatives || [],
      language: result.language,
      timestamp: Date.now()
    };
  }

  switchEngine(engineName) {
    if (!this.adapters[engineName]) {
      throw new TranscriptionError(`Unknown engine: ${engineName}`);
    }
    this.currentEngine = engineName;
  }
}

// Google STT Adapter
class GoogleSTTAdapter {
  constructor() {
    this.apiKey = null;
    this.config = {
      encoding: 'WEBM_OPUS',
      sampleRateHertz: 16000,
      languageCode: 'ja-JP',
      enableAutomaticPunctuation: true
    };
  }

  async initialize() {
    const settings = await storageManager.getSettings();
    this.apiKey = settings.transcription.googleApiKey;
    
    if (!this.apiKey) {
      throw new TranscriptionError('Google API key not configured');
    }
  }

  async transcribe(audioData, options = {}) {
    const requestBody = {
      config: { ...this.config, ...options },
      audio: {
        content: this.encodeAudioData(audioData)
      }
    };

    const response = await fetch(`${API_ENDPOINTS.GOOGLE_STT}?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new TranscriptionError(`Google STT API error: ${response.status}`);
    }

    const result = await response.json();
    return this.parseGoogleResponse(result);
  }

  parseGoogleResponse(response) {
    if (!response.results || response.results.length === 0) {
      return { text: '', confidence: 0 };
    }

    const result = response.results[0];
    return {
      text: result.alternatives[0].transcript,
      confidence: result.alternatives[0].confidence,
      alternatives: result.alternatives.slice(1).map(alt => alt.transcript)
    };
  }

  encodeAudioData(audioData) {
    // Audio data を Base64 エンコード
    return btoa(String.fromCharCode(...new Uint8Array(audioData)));
  }
}
```

### 3. File Manager 実装

#### file-manager.js
```javascript
class FileManager {
  constructor() {
    this.driveClient = new GoogleDriveClient();
    this.defaultFolder = null;
  }

  async initialize() {
    const settings = await storageManager.getSettings();
    this.defaultFolder = settings.googleDrive.folderId;
    
    await this.driveClient.initialize();
  }

  generateFileName(videoTitle, timestamp = Date.now()) {
    const date = new Date(timestamp);
    const dateStr = date.toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const sanitizedTitle = this.sanitizeFileName(videoTitle);
    
    return `${dateStr}_${sanitizedTitle}_transcript.txt`;
  }

  sanitizeFileName(title) {
    // Windows/Chrome のファイル名制限に対応
    return title
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 100); // 長さ制限
  }

  async saveTranscription(transcriptionData, videoInfo) {
    const fileName = this.generateFileName(videoInfo.title);
    const content = this.formatTranscriptionContent(transcriptionData, videoInfo);
    
    try {
      const fileId = await this.driveClient.uploadFile({
        name: fileName,
        content: content,
        mimeType: 'text/plain',
        parents: [this.defaultFolder]
      });

      logger.info('Transcription saved:', fileName);
      return { fileId, fileName };
    } catch (error) {
      throw new FileError('Failed to save transcription: ' + error.message);
    }
  }

  formatTranscriptionContent(transcriptionData, videoInfo) {
    const header = [
      `# 動画文字起こし結果`,
      ``,
      `**動画タイトル**: ${videoInfo.title}`,
      `**URL**: ${videoInfo.url}`,
      `**録音日時**: ${new Date().toLocaleString('ja-JP')}`,
      `**言語**: ${transcriptionData.language || '自動検出'}`,
      `**処理エンジン**: ${transcriptionData.engine}`,
      ``,
      `---`,
      ``
    ].join('\n');

    const content = transcriptionData.segments
      .map(segment => segment.text)
      .join('\n\n');

    return header + content;
  }
}
```

---

## 🔌 API実装ガイド

### Google Drive API クライアント

#### google-drive-client.js
```javascript
class GoogleDriveClient {
  constructor() {
    this.accessToken = null;
    this.baseUrl = 'https://www.googleapis.com/drive/v3';
    this.uploadUrl = 'https://www.googleapis.com/upload/drive/v3';
  }

  async initialize() {
    this.accessToken = await authManager.getValidToken();
    if (!this.accessToken) {
      throw new AuthError('Google Drive access token not available');
    }
  }

  async uploadFile({ name, content, mimeType, parents = [] }) {
    // メタデータ作成
    const metadata = {
      name: name,
      parents: parents.length > 0 ? parents : undefined
    };

    // マルチパート形式でアップロード
    const delimiter = '-------314159265358979323846';
    const body = [
      `--${delimiter}`,
      'Content-Type: application/json',
      '',
      JSON.stringify(metadata),
      `--${delimiter}`,
      `Content-Type: ${mimeType}`,
      '',
      content,
      `--${delimiter}--`
    ].join('\r\n');

    const response = await fetch(`${this.uploadUrl}/files?uploadType=multipart`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': `multipart/related; boundary="${delimiter}"`
      },
      body: body
    });

    if (!response.ok) {
      throw new FileError(`Drive upload failed: ${response.status}`);
    }

    const result = await response.json();
    return result.id;
  }

  async createFolder(name, parentId = null) {
    const metadata = {
      name: name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined
    };

    const response = await fetch(`${this.baseUrl}/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metadata)
    });

    if (!response.ok) {
      throw new FileError(`Folder creation failed: ${response.status}`);
    }

    const result = await response.json();
    return result.id;
  }

  async listFiles(folderId = null, maxResults = 100) {
    let query = "trashed=false";
    if (folderId) {
      query += ` and '${folderId}' in parents`;
    }

    const response = await fetch(
      `${this.baseUrl}/files?q=${encodeURIComponent(query)}&pageSize=${maxResults}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      }
    );

    if (!response.ok) {
      throw new FileError(`File list failed: ${response.status}`);
    }

    return await response.json();
  }
}
```

### 認証管理実装

#### auth-manager.js
```javascript
class AuthManager {
  constructor() {
    this.clientId = 'YOUR_GOOGLE_CLIENT_ID';
    this.redirectUri = chrome.identity.getRedirectURL();
    this.scopes = [
      'https://www.googleapis.com/auth/drive.file'
    ];
  }

  async authenticate() {
    try {
      const authUrl = this.buildAuthUrl();
      
      const redirectUrl = await new Promise((resolve, reject) => {
        chrome.identity.launchWebAuthFlow({
          url: authUrl,
          interactive: true
        }, (responseUrl) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(responseUrl);
          }
        });
      });

      const authCode = this.extractAuthCode(redirectUrl);
      const tokens = await this.exchangeCodeForTokens(authCode);
      
      await this.storeTokens(tokens);
      return tokens.access_token;
    } catch (error) {
      throw new AuthError('Authentication failed: ' + error.message);
    }
  }

  buildAuthUrl() {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scopes.join(' '),
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  extractAuthCode(url) {
    const urlParams = new URLSearchParams(new URL(url).search);
    const code = urlParams.get('code');
    
    if (!code) {
      throw new AuthError('Authorization code not found');
    }
    
    return code;
  }

  async exchangeCodeForTokens(authCode) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: 'YOUR_CLIENT_SECRET', // 本番では安全な方法で管理
        code: authCode,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri
      })
    });

    if (!response.ok) {
      throw new AuthError('Token exchange failed');
    }

    return await response.json();
  }

  async getValidToken() {
    const tokens = await storageManager.getTokens();
    
    if (!tokens || !tokens.access_token) {
      return null;
    }

    // トークンの有効性チェック
    if (this.isTokenExpired(tokens)) {
      if (tokens.refresh_token) {
        return await this.refreshAccessToken(tokens.refresh_token);
      } else {
        return null;
      }
    }

    return tokens.access_token;
  }

  async refreshAccessToken(refreshToken) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: 'YOUR_CLIENT_SECRET',
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });

    if (!response.ok) {
      throw new AuthError('Token refresh failed');
    }

    const newTokens = await response.json();
    await this.storeTokens({
      ...newTokens,
      refresh_token: refreshToken // リフレッシュトークンは保持
    });

    return newTokens.access_token;
  }

  async storeTokens(tokens) {
    await storageManager.setTokens({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + (tokens.expires_in * 1000)
    });
  }

  isTokenExpired(tokens) {
    return Date.now() >= (tokens.expires_at - 300000); // 5分前にリフレッシュ
  }

  async logout() {
    await storageManager.clearTokens();
  }
}
```

---

## 🧪 テスト実装ガイド

### ユニットテスト例

#### tests/unit/audio-recorder.test.js
```javascript
describe('AudioRecorder', () => {
  let audioRecorder;
  let mockStream;
  let mockMediaRecorder;

  beforeEach(() => {
    // Mock setup
    mockStream = {
      getTracks: jest.fn(() => [{ stop: jest.fn() }])
    };
    
    mockMediaRecorder = {
      start: jest.fn(),
      stop: jest.fn(),
      ondataavailable: null,
      onstop: null
    };

    global.MediaRecorder = jest.fn(() => mockMediaRecorder);
    global.chrome = {
      tabCapture: {
        capture: jest.fn((options, callback) => {
          callback(mockStream);
        })
      },
      runtime: {
        sendMessage: jest.fn(),
        lastError: null
      }
    };

    audioRecorder = new AudioRecorder();
  });

  test('should start recording successfully', async () => {
    await audioRecorder.startRecording(123);

    expect(chrome.tabCapture.capture).toHaveBeenCalledWith({
      audio: true,
      video: false
    }, expect.any(Function));

    expect(mockMediaRecorder.start).toHaveBeenCalledWith(1000);
    expect(audioRecorder.isRecording).toBe(true);
  });

  test('should handle recording errors', async () => {
    chrome.runtime.lastError = new Error('Permission denied');

    await expect(audioRecorder.startRecording(123))
      .rejects.toThrow('Failed to start recording');
  });

  test('should stop recording and cleanup', async () => {
    // Start recording first
    await audioRecorder.startRecording(123);
    
    // Mock the stop event
    setTimeout(() => {
      mockMediaRecorder.onstop();
    }, 0);

    const chunks = await audioRecorder.stopRecording();

    expect(mockMediaRecorder.stop).toHaveBeenCalled();
    expect(audioRecorder.isRecording).toBe(false);
    expect(mockStream.getTracks()[0].stop).toHaveBeenCalled();
  });
});
```

### インテグレーションテスト例

#### tests/integration/transcription-flow.test.js
```javascript
describe('Transcription Flow Integration', () => {
  let transcriptionEngine;
  let fileManager;
  let mockAudioData;

  beforeEach(async () => {
    // Test data setup
    mockAudioData = new ArrayBuffer(1024);
    
    // Mock API responses
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          results: [{
            alternatives: [{
              transcript: 'テスト音声です',
              confidence: 0.95
            }]
          }]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'file-123'
        })
      });

    transcriptionEngine = new TranscriptionEngine();
    fileManager = new FileManager();
    
    await transcriptionEngine.initialize();
    await fileManager.initialize();
  });

  test('should complete full transcription and save flow', async () => {
    // Transcribe audio
    const result = await transcriptionEngine.transcribe(mockAudioData);
    
    expect(result.text).toBe('テスト音声です');
    expect(result.confidence).toBe(0.95);

    // Save transcription
    const saveResult = await fileManager.saveTranscription(
      { segments: [{ text: result.text }], language: 'ja-JP' },
      { title: 'テスト動画', url: 'https://example.com/video' }
    );

    expect(saveResult.fileId).toBe('file-123');
    expect(saveResult.fileName).toMatch(/\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_テスト動画_transcript\.txt/);
  });
});
```

---

## 🐛 デバッグ・トラブルシューティング

### デバッグツール設定

#### logger.js
```javascript
class Logger {
  constructor() {
    this.levels = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3
    };
    this.currentLevel = this.levels.INFO;
  }

  debug(message, ...args) {
    if (this.currentLevel <= this.levels.DEBUG) {
      console.log(`[DEBUG] ${new Date().toISOString()} ${message}`, ...args);
    }
  }

  info(message, ...args) {
    if (this.currentLevel <= this.levels.INFO) {
      console.info(`[INFO] ${new Date().toISOString()} ${message}`, ...args);
    }
  }

  warn(message, ...args) {
    if (this.currentLevel <= this.levels.WARN) {
      console.warn(`[WARN] ${new Date().toISOString()} ${message}`, ...args);
    }
  }

  error(message, ...args) {
    if (this.currentLevel <= this.levels.ERROR) {
      console.error(`[ERROR] ${new Date().toISOString()} ${message}`, ...args);
    }
  }

  setLevel(level) {
    this.currentLevel = this.levels[level] || this.levels.INFO;
  }
}

const logger = new Logger();
```

### よくある問題と解決方法

#### 1. 音声録音の問題

```javascript
// 問題: マイク音声が録音される
// 解決: tabCapture.capture の設定を確認

// ❌ 間違った設定
chrome.tabCapture.capture({
  audio: true,
  video: false,
  audioConstraints: {
    mandatory: {
      chromeMediaSource: 'desktop' // これだとデスクトップ音声
    }
  }
}, callback);

// ✅ 正しい設定
chrome.tabCapture.capture({
  audio: true,
  video: false
  // audioConstraints は指定しない（タブ音声を録音）
}, callback);
```

#### 2. 権限エラー

```javascript
// manifest.json の permissions 設定確認
{
  "permissions": [
    "tabCapture",    // 音声録音に必要
    "activeTab",     // アクティブタブアクセス
    "storage",       // ローカルストレージアクセス
    "identity"       // OAuth認証
  ],
  "host_permissions": [
    "https://www.googleapis.com/*",  // Google API アクセス
    "https://api.openai.com/*"       // OpenAI API アクセス
  ]
}
```

#### 3. メモリリーク対策

```javascript
class MemoryManager {
  static cleanup() {
    // Audio chunks のクリアップ
    if (audioRecorder.audioChunks) {
      audioRecorder.audioChunks.length = 0;
    }

    // Stream tracks の停止
    if (audioRecorder.stream) {
      audioRecorder.stream.getTracks().forEach(track => {
        track.stop();
      });
    }

    // MediaRecorder の破棄
    if (audioRecorder.mediaRecorder) {
      audioRecorder.mediaRecorder = null;
    }

    // 強制ガベージコレクション（開発環境のみ）
    if (typeof gc === 'function') {
      gc();
    }
  }
}

// 録音停止時に必ずクリーンアップ
audioRecorder.stopRecording().finally(() => {
  MemoryManager.cleanup();
});
```

---

## ⚡ パフォーマンス最適化

### 1. 音声データ処理の最適化

```javascript
class AudioOptimizer {
  static compressAudioData(audioData, compressionRatio = 0.7) {
    // WebM Opus は既に圧縮されているため、必要な場合のみ再圧縮
    const targetSize = audioData.byteLength * compressionRatio;
    
    if (audioData.byteLength <= targetSize) {
      return audioData;
    }

    // 簡易的なダウンサンプリング
    return this.downsample(audioData, compressionRatio);
  }

  static async chunkedProcessing(audioData, chunkSize = 64 * 1024) {
    const chunks = [];
    
    for (let i = 0; i < audioData.byteLength; i += chunkSize) {
      const chunk = audioData.slice(i, i + chunkSize);
      chunks.push(chunk);
      
      // 非同期処理で UI をブロックしない
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    return chunks;
  }
}
```

### 2. API リクエスト最適化

```javascript
class APIOptimizer {
  constructor() {
    this.requestQueue = [];
    this.processingQueue = false;
    this.rateLimiter = new RateLimiter(10, 60000); // 1分間に10リクエスト
  }

  async queueTranscriptionRequest(audioData, priority = 'normal') {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        audioData,
        priority,
        resolve,
        reject,
        timestamp: Date.now()
      });

      if (!this.processingQueue) {
        this.processQueue();
      }
    });
  }

  async processQueue() {
    this.processingQueue = true;

    while (this.requestQueue.length > 0) {
      // 優先度でソート
      this.requestQueue.sort((a, b) => {
        const priorities = { 'high': 0, 'normal': 1, 'low': 2 };
        return priorities[a.priority] - priorities[b.priority];
      });

      const request = this.requestQueue.shift();

      try {
        await this.rateLimiter.waitForCapacity();
        const result = await this.performTranscription(request.audioData);
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
    }

    this.processingQueue = false;
  }
}

class RateLimiter {
  constructor(maxRequests, timeWindow) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.requests = [];
  }

  async waitForCapacity() {
    this.cleanupOldRequests();

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.timeWindow - (Date.now() - oldestRequest);
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    this.requests.push(Date.now());
  }

  cleanupOldRequests() {
    const cutoff = Date.now() - this.timeWindow;
    this.requests = this.requests.filter(time => time > cutoff);
  }
}
```

---

## 🔒 セキュリティ実装

### 1. API キー管理

```javascript
class SecureStorage {
  static async storeApiKey(key, value) {
    // Chrome storage.local は暗号化されているが、追加の難読化を実施
    const obfuscated = this.obfuscate(value);
    
    await chrome.storage.local.set({
      [this.getKeyName(key)]: obfuscated
    });
  }

  static async getApiKey(key) {
    const result = await chrome.storage.local.get(this.getKeyName(key));
    const obfuscated = result[this.getKeyName(key)];
    
    return obfuscated ? this.deobfuscate(obfuscated) : null;
  }

  static obfuscate(value) {
    // 簡易的な難読化（Base64 + XOR）
    const xorKey = 0xAA;
    const bytes = new TextEncoder().encode(value);
    const xored = bytes.map(byte => byte ^ xorKey);
    return btoa(String.fromCharCode(...xored));
  }

  static deobfuscate(obfuscated) {
    try {
      const xorKey = 0xAA;
      const decoded = atob(obfuscated);
      const bytes = new Uint8Array(decoded.split('').map(c => c.charCodeAt(0)));
      const xored = bytes.map(byte => byte ^ xorKey);
      return new TextDecoder().decode(xored);
    } catch (error) {
      logger.error('Failed to deobfuscate API key:', error);
      return null;
    }
  }

  static getKeyName(key) {
    return `sec_${key}_key`;
  }
}
```

### 2. 音声データの安全な処理

```javascript
class SecureAudioHandler {
  static async processAudioSecurely(audioData) {
    try {
      // 音声データの検証
      this.validateAudioData(audioData);
      
      // 処理実行
      const result = await this.performProcessing(audioData);
      
      return result;
    } finally {
      // 音声データの安全な削除
      this.secureWipeAudioData(audioData);
    }
  }

  static validateAudioData(audioData) {
    // ファイルサイズ制限
    const MAX_SIZE = 25 * 1024 * 1024; // 25MB
    if (audioData.byteLength > MAX_SIZE) {
      throw new SecurityError('Audio data exceeds size limit');
    }

    // ファイル形式検証
    const header = new Uint8Array(audioData.slice(0, 4));
    const isValidWebM = this.isValidWebMHeader(header);
    
    if (!isValidWebM) {
      throw new SecurityError('Invalid audio format');
    }
  }

  static secureWipeAudioData(audioData) {
    // ArrayBuffer の内容を0で上書き
    if (audioData instanceof ArrayBuffer) {
      const view = new Uint8Array(audioData);
      view.fill(0);
    }
  }

  static isValidWebMHeader(header) {
    // WebM ファイルのマジックナンバーチェック
    return header[0] === 0x1A && header[1] === 0x45 && 
           header[2] === 0xDF && header[3] === 0xA3;
  }
}
```

---

## 🚀 配布・リリース

### ビルドスクリプト

#### tools/build.js
```javascript
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

class ExtensionBuilder {
  constructor() {
    this.srcDir = path.join(__dirname, '../src');
    this.buildDir = path.join(__dirname, '../build');
    this.distDir = path.join(__dirname, '../dist');
  }

  async build() {
    console.log('🏗️  Building extension...');
    
    // ディレクトリ作成
    this.ensureDirectories();
    
    // ファイルコピー
    await this.copyFiles();
    
    // マニフェスト生成
    this.generateManifest();
    
    // CSS/JS 最適化
    await this.optimizeAssets();
    
    console.log('✅ Build completed!');
  }

  async package() {
    console.log('📦 Packaging extension...');
    
    const output = fs.createWriteStream(path.join(this.distDir, 'extension.zip'));
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
      output.on('close', () => {
        console.log(`✅ Package created: ${archive.pointer()} bytes`);
        resolve();
      });

      archive.on('error', reject);
      archive.pipe(output);
      archive.directory(this.buildDir, false);
      archive.finalize();
    });
  }

  ensureDirectories() {
    [this.buildDir, this.distDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  generateManifest() {
    const manifest = {
      manifest_version: 3,
      name: "動画音声文字起こしツール",
      version: "1.0.0",
      description: "Chrome拡張機能で動画音声をリアルタイム文字起こし",
      
      permissions: [
        "tabCapture",
        "activeTab",
        "storage",
        "notifications",
        "identity"
      ],

      host_permissions: [
        "https://www.googleapis.com/*",
        "https://api.openai.com/*"
      ],

      background: {
        service_worker: "background/background.js"
      },

      content_scripts: [{
        matches: ["<all_urls>"],
        js: ["content/content.js"]
      }],

      action: {
        default_popup: "popup/popup.html",
        default_icon: {
          "16": "assets/icons/icon-16.png",
          "48": "assets/icons/icon-48.png",
          "128": "assets/icons/icon-128.png"
        }
      },

      options_page: "options/options.html",

      icons: {
        "16": "assets/icons/icon-16.png",
        "48": "assets/icons/icon-48.png",
        "128": "assets/icons/icon-128.png"
      },

      oauth2: {
        client_id: "YOUR_GOOGLE_CLIENT_ID",
        scopes: ["https://www.googleapis.com/auth/drive.file"]
      }
    };

    fs.writeFileSync(
      path.join(this.buildDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );
  }
}

// ビルド実行
async function main() {
  const builder = new ExtensionBuilder();
  
  try {
    await builder.build();
    await builder.package();
    console.log('🎉 Release ready!');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
```

### Chrome Web Store 公開準備

#### チェックリスト
- [ ] マニフェスト v3 対応済み
- [ ] 全ての権限が適切に説明されている
- [ ] プライバシーポリシーが用意されている
- [ ] アイコンが全サイズ用意されている (16px, 48px, 128px)
- [ ] スクリーンショットが用意されている
- [ ] 説明文が適切に記載されている
- [ ] テストアカウントでの動作確認済み

---

## 📋 実装チェックリスト

### Phase 1: 基本機能実装
- [ ] Manifest.json 作成
- [ ] Background Service Worker 実装
- [ ] Audio Recording 機能実装
- [ ] Basic UI (Popup) 実装
- [ ] Chrome Tab Capture API 連携

### Phase 2: 文字起こし機能
- [ ] Google STT API 連携
- [ ] Web Speech API 連携
- [ ] Whisper API 連携
- [ ] エンジン切り替え機能
- [ ] リアルタイム処理実装

### Phase 3: ファイル管理
- [ ] Google Drive API 連携
- [ ] OAuth 認証実装
- [ ] ファイル保存機能
- [ ] 設定画面実装

### Phase 4: 最適化・テスト
- [ ] パフォーマンス最適化
- [ ] エラーハンドリング強化
- [ ] ユニットテスト実装
- [ ] インテグレーションテスト実装

### Phase 5: 配布準備
- [ ] ビルドシステム構築
- [ ] ドキュメント整備
- [ ] Chrome Web Store 申請準備

---

**実装ガイドライン作成日**: 2025年6月3日  
**最終更新日**: 2025年6月3日  
**作成者**: 開発チーム  
**承認者**: [承認者名]  
**バージョン**: 1.0

### 関連文書
- [要件定義書](requirement.md)
- [アーキテクチャ設計書](architecture.md)
- [開発チェックリスト](checklist.md)
- [テスト仕様書](※未作成)
