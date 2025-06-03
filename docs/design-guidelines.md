# Chrome拡張機能「動画音声文字起こしツール」デザインガイドライン

## 📋 概要
本文書では、Chrome拡張機能「動画音声文字起こしツール」のデザインシステム、UI/UXガイドライン、および実装における統一性を保つためのルールを定義します。

## 🎨 デザインシステム

### 1. カラーパレット

#### プライマリカラー
```
メインブルー:     #2196F3 (ツールのアイデンティティカラー)
アクセントブルー: #1976D2 (ボタンのホバー状態)
ライトブルー:     #E3F2FD (背景アクセント)
```

#### セカンダリカラー
```
成功グリーン:     #4CAF50 (完了状態、成功メッセージ)
警告オレンジ:     #FF9800 (注意、警告メッセージ)
エラーレッド:     #F44336 (エラー、削除アクション)
情報ブルー:       #2196F3 (情報メッセージ)
```

#### ニュートラルカラー
```
ダークグレー:     #212121 (メインテキスト)
ミディアムグレー: #757575 (セカンダリテキスト)
ライトグレー:     #BDBDBD (ボーダー、区切り線)
背景グレー:       #F5F5F5 (背景色)
ホワイト:         #FFFFFF (カード背景、入力フィールド)
```

#### 状態別カラー
```
録音中:           #F44336 (赤) - 🔴
処理中:           #FF9800 (オレンジ) - 🟡
準備完了:         #4CAF50 (緑) - 🟢
完了:             #4CAF50 (緑) - ✅
```

### 2. タイポグラフィ

#### フォントファミリー
```css
/* プライマリフォント */
font-family: 'Noto Sans JP', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif;

/* モノスペースフォント（コード表示用） */
font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
```

#### フォントサイズ・階層
```css
/* 見出し */
h1: 24px / 1.5    /* ページタイトル */
h2: 20px / 1.4    /* セクションタイトル */
h3: 18px / 1.4    /* サブセクション */
h4: 16px / 1.3    /* カテゴリータイトル */

/* 本文 */
body: 14px / 1.5     /* 標準テキスト */
small: 12px / 1.4    /* キャプション、補足 */
large: 16px / 1.5    /* 重要なメッセージ */

/* UI要素 */
button: 14px / 1.3   /* ボタンテキスト */
input: 14px / 1.3    /* 入力フィールド */
label: 13px / 1.3    /* ラベル */
```

#### フォントウェイト
```css
thin: 300      /* キャプション */
normal: 400    /* 標準テキスト */
medium: 500    /* ラベル、ナビゲーション */
semibold: 600  /* 小見出し */
bold: 700      /* 見出し、重要な情報 */
```

### 3. アイコンシステム

#### アイコンライブラリ
- **Material Design Icons**を基本とする
- サイズ: 16px, 20px, 24px, 32px
- ストロークウィズ: 1.5px

#### 機能別アイコン定義
```
🎙️ マイク関連:     mic, mic_off, volume_up
📹 動画関連:       play_circle, videocam, video_library
⚙️ 設定関連:       settings, tune, build
📁 ファイル関連:   folder, file_copy, cloud_upload
🔔 通知関連:       notifications, info, warning, error
🔄 状態関連:       refresh, sync, check_circle, cancel
```

#### アイコン使用ルール
- **統一性**: 同じ意味の機能には同じアイコンを使用
- **サイズ統一**: 同階層の機能は同サイズのアイコンを使用
- **コントラスト**: 背景とのコントラスト比4.5:1以上を確保

## 📐 レイアウト・スペーシング

### 1. グリッドシステム

#### ポップアップ画面（320px幅基準）
```
コンテナ:        320px × 480px
左右マージン:    16px
上下マージン:    20px
コンテンツ幅:    288px
```

#### 設定画面（800px幅基準）
```
コンテナ:        800px × 600px
左右マージン:    32px
上下マージン:    24px
コンテンツ幅:    736px
```

### 2. スペーシングシステム

#### 基本単位（8pxベース）
```
xs: 4px      /* 最小スペース */
sm: 8px      /* 小スペース */
md: 16px     /* 標準スペース */
lg: 24px     /* 大スペース */
xl: 32px     /* 最大スペース */
xxl: 48px    /* セクション間 */
```

#### 要素間スペーシング
```
要素内パディング:    12px 16px
ボタン間マージン:    8px
セクション間:        24px
カード間:            16px
フォーム要素間:      12px
```

### 3. ボーダー・角丸

#### ボーダー仕様
```css
/* 標準ボーダー */
border: 1px solid #E0E0E0;

/* フォーカス時 */
border: 2px solid #2196F3;

/* エラー時 */
border: 2px solid #F44336;
```

#### 角丸設定
```css
button: 8px      /* ボタン */
card: 12px       /* カード */
input: 6px       /* 入力フィールド */
modal: 16px      /* モーダル */
```

## 🎯 コンポーネント設計

### 1. ボタンコンポーネント

#### プライマリボタン
```css
.button-primary {
  background: #2196F3;
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.button-primary:hover {
  background: #1976D2;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(33, 150, 243, 0.3);
}

.button-primary:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(33, 150, 243, 0.3);
}
```

#### セカンダリボタン
```css
.button-secondary {
  background: transparent;
  color: #2196F3;
  border: 1px solid #2196F3;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.button-secondary:hover {
  background: #E3F2FD;
  border-color: #1976D2;
  color: #1976D2;
}
```

#### 状態別ボタン
```css
/* 録音開始ボタン */
.button-record {
  background: #F44336;
  color: #FFFFFF;
  border-radius: 50%;
  width: 64px;
  height: 64px;
  font-size: 24px;
}

/* 録音停止ボタン */
.button-stop {
  background: #757575;
  color: #FFFFFF;
  border-radius: 8px;
  width: 64px;
  height: 64px;
  font-size: 24px;
}
```

### 2. カードコンポーネント

#### 基本カード
```css
.card {
  background: #FFFFFF;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-bottom: 16px;
  transition: box-shadow 0.2s ease;
}

.card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
```

#### ステータスカード
```css
.status-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 12px;
}

.status-card.success {
  background: #E8F5E8;
  color: #2E7D32;
  border-left: 4px solid #4CAF50;
}

.status-card.warning {
  background: #FFF3E0;
  color: #F57C00;
  border-left: 4px solid #FF9800;
}

.status-card.error {
  background: #FFEBEE;
  color: #C62828;
  border-left: 4px solid #F44336;
}
```

### 3. フォームコンポーネント

#### 入力フィールド
```css
.input-field {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #E0E0E0;
  border-radius: 6px;
  font-size: 14px;
  background: #FFFFFF;
  transition: border-color 0.2s ease;
}

.input-field:focus {
  outline: none;
  border-color: #2196F3;
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
}

.input-field.error {
  border-color: #F44336;
}
```

#### ラベル
```css
.label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #424242;
}

.label.required::after {
  content: " *";
  color: #F44336;
}
```

### 4. プログレスコンポーネント

#### プログレスバー
```css
.progress-bar {
  width: 100%;
  height: 8px;
  background: #E0E0E0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #2196F3, #1976D2);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  margin-top: 8px;
  font-size: 12px;
  color: #757575;
  text-align: center;
}
```

#### 音声レベルメーター
```css
.audio-level {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 20px;
}

.level-bar {
  width: 3px;
  background: #E0E0E0;
  border-radius: 2px;
  transition: all 0.1s ease;
}

.level-bar.active {
  background: #4CAF50;
}

.level-bar.high {
  background: #FF9800;
}

.level-bar.peak {
  background: #F44336;
}
```

## 📱 レスポンシブデザイン

### 1. ポップアップサイズ対応

#### 標準サイズ（320px）
```css
.popup-container {
  width: 320px;
  min-height: 480px;
  max-height: 600px;
}
```

#### 小サイズ（280px）
```css
@media (max-width: 300px) {
  .popup-container {
    width: 280px;
    padding: 12px;
  }
  
  .button-primary {
    padding: 10px 20px;
    font-size: 13px;
  }
}
```

### 2. 設定画面対応

#### タブレットサイズ
```css
@media (max-width: 768px) {
  .settings-container {
    width: 100%;
    padding: 16px;
  }
  
  .settings-tabs {
    flex-direction: column;
  }
}
```

## 🎭 アニメーション・トランジション

### 1. 基本アニメーション

#### 標準トランジション
```css
.transition-standard {
  transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
}

.transition-slow {
  transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
}

.transition-fast {
  transition: all 0.1s cubic-bezier(0.4, 0.0, 0.2, 1);
}
```

#### フェードイン・アウト
```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeOut {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(-10px); }
}

.fade-in {
  animation: fadeIn 0.3s ease-out;
}

.fade-out {
  animation: fadeOut 0.2s ease-in;
}
```

#### 録音パルス効果
```css
@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(244, 67, 54, 0); }
  100% { box-shadow: 0 0 0 0 rgba(244, 67, 54, 0); }
}

.recording-pulse {
  animation: pulse 1.5s infinite;
}
```

### 2. 状態変化アニメーション

#### ローディングスピナー
```css
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-spinner {
  border: 3px solid #E0E0E0;
  border-top: 3px solid #2196F3;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  animation: spin 1s linear infinite;
}
```

## ♿ アクセシビリティ

### 1. カラーアクセシビリティ

#### コントラスト比
```
通常テキスト:     4.5:1 以上
大きなテキスト:   3:1 以上
UI要素:          3:1 以上
```

#### カラーブラインド対応
```
赤緑色覚異常:     形状やアイコンでも情報を伝達
青黄色覚異常:     十分なコントラストを確保
全色盲:          明度差のみで情報を区別
```

### 2. キーボードナビゲーション

#### フォーカス表示
```css
.focusable:focus {
  outline: 2px solid #2196F3;
  outline-offset: 2px;
}

.focus-visible:focus-visible {
  box-shadow: 0 0 0 2px #FFFFFF, 0 0 0 4px #2196F3;
}
```

#### タブオーダー
```
1. メイン機能（録音ボタン）
2. セカンダリ機能（設定、履歴）
3. フォーム要素（設定画面）
4. アクション（保存、キャンセル）
```

### 3. スクリーンリーダー対応

#### ARIA属性
```html
<!-- ボタンの状態 -->
<button aria-pressed="true" aria-label="録音を停止">
  ⏹️ 録音停止
</button>

<!-- プログレス -->
<div role="progressbar" aria-valuenow="75" aria-valuemin="0" aria-valuemax="100">
  75%完了
</div>

<!-- ライブリージョン -->
<div aria-live="polite" aria-atomic="true">
  文字起こしが完了しました
</div>
```

## 🚀 パフォーマンス・最適化

### 1. CSS最適化

#### セレクター効率化
```css
/* Good */
.button-primary { }
.card { }

/* Avoid */
div.container > ul.list li.item { }
```

#### アニメーション最適化
```css
/* GPU加速を利用 */
.animated-element {
  transform: translateZ(0);
  will-change: transform, opacity;
}
```

### 2. 画像・アイコン最適化

#### SVGアイコン使用
```xml
<!-- インライン SVG -->
<svg width="24" height="24" viewBox="0 0 24 24">
  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10"/>
</svg>
```

#### アイコンフォント代替
```css
/* CSS IconsまたはSVGスプライトを使用 */
.icon {
  width: 24px;
  height: 24px;
  background-image: url('sprite.svg#icon-name');
}
```

## 🌙 ダークモード対応

### 1. カラーパレット（ダークモード）

#### ダークモード色定義
```css
:root {
  --bg-primary: #121212;
  --bg-secondary: #1E1E1E;
  --bg-tertiary: #2D2D2D;
  --text-primary: #FFFFFF;
  --text-secondary: #B3B3B3;
  --text-disabled: #666666;
  --accent-blue: #64B5F6;
  --success: #81C784;
  --warning: #FFB74D;
  --error: #E57373;
}
```

#### 自動切り替え
```css
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #121212;
    --text-primary: #FFFFFF;
  }
}
```

### 2. コンポーネント調整

#### カード・ボタン
```css
.card {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--bg-tertiary);
}

.button-primary {
  background: var(--accent-blue);
  color: var(--bg-primary);
}
```

## 📏 実装ガイドライン

### 1. CSS命名規則

#### BEM記法
```css
/* Block */
.popup { }

/* Element */
.popup__header { }
.popup__content { }
.popup__footer { }

/* Modifier */
.popup--recording { }
.popup__button--primary { }
```

#### ユーティリティクラス
```css
/* Spacing */
.mt-8 { margin-top: 8px; }
.mb-16 { margin-bottom: 16px; }
.p-12 { padding: 12px; }

/* Display */
.flex { display: flex; }
.hidden { display: none; }
.block { display: block; }

/* Text */
.text-center { text-align: center; }
.text-bold { font-weight: 700; }
```

### 2. ファイル構成

#### CSS構成
```
styles/
├── base/
│   ├── reset.css
│   ├── typography.css
│   └── variables.css
├── components/
│   ├── buttons.css
│   ├── cards.css
│   ├── forms.css
│   └── progress.css
├── layouts/
│   ├── popup.css
│   └── settings.css
└── utilities/
    ├── spacing.css
    └── display.css
```

### 3. 実装チェックリスト

#### デザイン確認項目
- [ ] カラーパレット準拠
- [ ] タイポグラフィ統一
- [ ] スペーシング一貫性
- [ ] アニメーション適用
- [ ] レスポンシブ対応
- [ ] アクセシビリティ確保
- [ ] ダークモード対応
- [ ] パフォーマンス最適化

## 🎯 ブランドガイドライン

### 1. ロゴ・アイコン使用

#### 拡張機能アイコン
```
主要サイズ: 16px, 48px, 128px
形状: 角丸正方形（20%角丸）
背景: グラデーション（#2196F3 → #1976D2）
シンボル: マイクアイコン（白色）
```

#### 使用禁止事項
- アイコンの変形、回転
- 不適切な背景色の使用
- 低解像度での表示
- 他のアイコンとの組み合わせ

### 2. トーン・マナー

#### UIテキスト
```
フレンドリー:    「録音を開始しましょう」
簡潔:           「録音中」「処理中」「完了」
分かりやすい:    「マイクへのアクセスを許可してください」
```

#### エラーメッセージ
```
具体的:         「ネットワークに接続できませんでした」
解決策提示:     「設定からAPIキーを確認してください」
優しいトーン:   「お手数ですが、もう一度お試しください」
```

---

**デザインガイドライン作成日**: 2025年6月3日
**最終更新日**: 2025年6月3日
**作成者**: UI/UXデザインチーム
**承認者**: [承認者名]

### 関連文書
- [要件定義書](requirement.md)
- [UIフロー図](ui-flow.md)
- [実装ガイド](implementation-guide.md)
- [開発チェックリスト](checklist.md)
