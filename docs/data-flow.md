# Chrome拡張機能「動画音声文字起こしツール」データフロー図

## 📊 概要
本文書では、Chrome拡張機能「動画音声文字起こしツール」のデータフローを図解し、システム内でのデータの流れと処理過程を明確化します。

## 🔄 全体データフロー図

```mermaid
graph TD
    A[ユーザー] --> B[Chrome拡張機能UI]
    B --> C[Background Script]
    C --> D[Content Script]
    D --> E[Tab Audio Stream]
    E --> F[Audio Capture API]
    F --> G[Audio Data Buffer]    G --> H{文字起こしエンジン選択}
    H -->|Google| I[Google Speech-to-Text API]
    H -->|Web Speech| J[Web Speech API]
    H -->|OpenAI| K[OpenAI Whisper API]    I --> L[Text Response]
    J --> L
    K --> L
    L --> M[Text Processing]
    M --> N[File Generation]
    M --> N[Google Drive API]
    N --> O[Google Drive Storage]
    
    C --> P[Settings Storage]
    P --> Q[Chrome Storage API]
    
    B --> R[Notification System]
    R --> S[Chrome Notifications API]
```

## 🎯 詳細データフロー

### 1. 初期化・設定フロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant UI as 拡張機能UI
    participant BG as Background Script
    participant Storage as Chrome Storage
    participant GDrive as Google Drive API
    
    User->>UI: 拡張機能起動
    UI->>BG: 初期化要求
    BG->>Storage: 設定データ読み込み
    Storage-->>BG: 設定データ返却
    BG->>GDrive: 認証状態確認
    GDrive-->>BG: 認証結果
    BG-->>UI: 初期化完了
    UI-->>User: UI表示
```

### 2. 録音・文字起こしフロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant UI as 拡張機能UI
    participant BG as Background Script
    participant Content as Content Script
    participant Tab as アクティブタブ
    participant API as 文字起こしAPI
    participant GDrive as Google Drive
    
    User->>UI: 録音開始ボタンクリック
    UI->>BG: 録音開始要求
    BG->>Content: タブキャプチャ開始
    Content->>Tab: 音声ストリーム取得
    Tab-->>Content: オーディオデータ
    Content-->>BG: オーディオデータ送信
    
    alt Web Speech API使用時
        loop リアルタイム連続処理
            BG->>API: 音声ストリーム接続
            API-->>BG: 中間文字起こし結果
            BG->>UI: リアルタイム更新
        end
    else 外部API使用時
        loop バッチ処理
            BG->>API: 音声データ送信
            API-->>BG: 文字起こし結果
            BG->>UI: 進捗更新
        end
    end
    
    User->>UI: 録音停止ボタンクリック
    UI->>BG: 録音停止要求
    BG->>BG: 最終テキスト生成
    BG->>GDrive: ファイル保存
    GDrive-->>BG: 保存完了
    BG->>UI: 完了通知
    UI-->>User: 処理完了表示
```

### 3. 設定管理フロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant Options as 設定画面
    participant Storage as Chrome Storage
    participant GDrive as Google Drive API
    participant STT as 文字起こしAPI
    
    User->>Options: 設定画面を開く
    Options->>Storage: 現在の設定取得
    Storage-->>Options: 設定データ
    Options-->>User: 設定画面表示
    
    User->>Options: 設定変更
    Options->>GDrive: Google Drive認証
    GDrive-->>Options: 認証トークン
    
    alt 外部API選択時
        Options->>STT: APIキー検証
        STT-->>Options: 検証結果
    else Web Speech API選択時
        Note over Options: APIキー不要（ブラウザ標準）
        Options->>Options: ブラウザ対応確認
    end
    
    Options->>Storage: 設定保存
    Storage-->>Options: 保存完了
    Options-->>User: 設定保存完了
```

## 📋 データ要素定義

### 音声データ
```
AudioStreamData {
    format: "webm" | "wav",
    sampleRate: 16000, // Hz
    channels: 1, // モノラル
    bitRate: 128000, // bps
    duration: number, // 秒
    data: ArrayBuffer
}
```

### 文字起こし結果
```
TranscriptionResult {
    text: string,
    confidence: number, // 0.0-1.0
    language: string, // "ja", "en", etc.
    timestamp: number, // Unix timestamp
    alternatives?: string[]
}
```

### 設定データ
```
SettingsData {
    googleDrive: {
        accessToken: string,
        refreshToken: string,
        folderId: string,
        folderName: string
    },
    transcription: {
        engine: "google" | "webspeech" | "openai",
        apiKey?: string, // Web Speech APIでは不要
        language: string,
        quality: "standard" | "enhanced"
    },
    ui: {
        notifications: boolean,
        autoSave: boolean
    }
}
```

### ファイル情報
```
TranscriptFile {
    filename: string, // YYYY-MM-DD_HH-MM-SS_[title]_transcript.txt
    content: string,
    videoTitle: string,
    duration: number,
    language: string,
    createdAt: Date,
    fileId?: string // Google Drive file ID
}
```

## 🔍 データ処理詳細

### 1. 音声キャプチャ処理

```mermaid
flowchart TD
    A[タブオーディオストリーム] --> B[MediaRecorder API]
    B --> C[音声データチャンク]
    C --> D{バッファサイズチェック}
    D -->|適切なサイズ| E[文字起こしAPI送信]
    D -->|小さすぎ| F[バッファに蓄積]
    F --> C
    E --> G[API レスポンス受信]
    G --> H[テキスト結合]
    H --> I[UI更新]
```

### 2. 文字起こしエンジン処理

#### Google Speech-to-Text
```mermaid
flowchart LR
    A[音声データ] --> B[Base64エンコード]
    B --> C[Google Cloud STT API]
    C --> D[JSON レスポンス]
    D --> E[テキスト抽出]
    E --> F[信頼度チェック]
    F --> G[結果返却]
```

#### Web Speech API
```mermaid
flowchart LR
    A[音声ストリーム] --> B[SpeechRecognition初期化]
    B --> C[ブラウザ内処理]
    C --> D[リアルタイム結果]
    D --> E[信頼度チェック]
    E --> F[中間結果/最終結果判定]
    F --> G[結果返却]
```

**Web Speech API の特徴:**
- ✅ **ブラウザ標準**: Chrome内蔵API、外部接続不要
- ✅ **リアルタイム処理**: 連続的な音声認識
- ✅ **無料**: APIキー・課金不要
- ⚠️ **中程度の精度**: 基本的な用途に適用
- ⚠️ **ネットワーク依存**: Googleサーバーとの通信が必要

**データフロー詳細:**
1. 音声ストリームを`SpeechRecognition`オブジェクトに接続
2. `continuous: true`でリアルタイム連続認識
3. `onresult`イベントで中間・最終結果を受信
4. `interim`フラグで中間結果と最終結果を判定
5. テキスト結果をUIにリアルタイム反映

#### OpenAI Whisper
```mermaid
flowchart LR
    A[音声データ] --> B[ファイル形式変換]
    B --> C[OpenAI Whisper API]
    C --> D[JSON レスポンス]
    D --> E[テキスト・言語情報抽出]
    E --> F[結果返却]
```

### 3. ファイル保存処理

```mermaid
flowchart TD
    A[文字起こし完了] --> B[動画タイトル取得]
    B --> C[ファイル名生成]
    C --> D[テキストファイル作成]
    D --> E[Google Drive API認証]
    E --> F[指定フォルダ確認]
    F --> G[ファイルアップロード]
    G --> H[アップロード完了確認]
    H --> I[ユーザー通知]
```

## 🔐 セキュリティ・プライバシーフロー

### 1. データセキュリティ
```mermaid
flowchart TD
    A[音声データ取得] --> B[一時メモリ保存]
    B --> C[暗号化処理]
    C --> D[API送信]
    D --> E[レスポンス受信]
    E --> F[メモリクリア]
    F --> G[一時データ削除]
```

### 2. 認証フロー
```mermaid
sequenceDiagram
    participant Ext as 拡張機能
    participant Google as Google OAuth
    participant GDrive as Google Drive API
    
    Ext->>Google: 認証要求
    Google-->>Ext: 認証コード
    Ext->>Google: アクセストークン要求
    Google-->>Ext: アクセス・リフレッシュトークン
    Ext->>GDrive: API呼び出し
    GDrive-->>Ext: レスポンス
    
    Note over Ext: トークン有効期限チェック
    Ext->>Google: トークンリフレッシュ
    Google-->>Ext: 新しいアクセストークン
```

## ⚠️ エラーハンドリングフロー

### 1. ネットワークエラー
```mermaid
flowchart TD
    A[API呼び出し] --> B{レスポンス確認}
    B -->|成功| C[正常処理続行]
    B -->|タイムアウト| D[リトライ処理]
    B -->|ネットワークエラー| E[オフライン検出]
    D --> F{リトライ回数チェック}
    F -->|上限未満| A
    F -->|上限到達| G[エラー通知]
    E --> H[オフライン通知]
    G --> I[ローカル保存]
    H --> I
```

### 2. API制限エラー
```mermaid
flowchart TD
    A[API呼び出し] --> B{レスポンスコード}
    B -->|200| C[正常処理]
    B -->|429| D[レート制限検出]
    B -->|401| E[認証エラー]
    B -->|403| F[権限エラー]
    D --> G[待機時間計算]
    G --> H[指数バックオフ]
    H --> A
    E --> I[再認証処理]
    I --> A
    F --> J[エラー通知]
```

## 📊 パフォーマンス監視

### 1. メトリクス収集
```mermaid
flowchart LR
    A[各処理段階] --> B[実行時間測定]
    B --> C[メモリ使用量監視]
    C --> D[CPU使用率監視]
    D --> E[ネットワーク使用量監視]
    E --> F[ログ出力]
    F --> G[パフォーマンス分析]
```

### 2. リソース管理
```mermaid
flowchart TD
    A[長時間録音開始] --> B[メモリ監視開始]
    B --> C{メモリ使用量チェック}
    C -->|正常| D[処理続行]
    C -->|高使用量| E[ガベージコレクション実行]
    E --> F[不要データ削除]
    F --> G[メモリ解放]
    G --> D
    D --> H{録音継続?}
    H -->|Yes| C
    H -->|No| I[リソース解放]
```

---

**データフロー図作成日**: 2025年6月3日
**最終更新日**: 2025年6月3日
**作成者**: システム設計チーム
**承認者**: [承認者名]

### 関連文書
- [要件定義書](requirement.md)
- [開発チェックリスト](checklist.md)
- [アーキテクチャ設計書](architecture.md)
