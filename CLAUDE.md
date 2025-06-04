# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Video Transcription Chrome Extension - A POC for real-time video audio transcription using Web Speech API. The extension captures system microphone audio to transcribe video content playing in the browser.

## Development Commands

This is a vanilla JavaScript Chrome extension with no build system. Development workflow:

```bash
# Manual installation in Chrome
1. Open chrome://extensions/
2. Enable "Developer mode" 
3. Click "Load unpacked extension"
4. Select project directory

# Reload extension after changes
Click reload button in chrome://extensions/ or Ctrl+R in extension popup

# Debug extension
1. Check chrome://extensions/ for errors
2. Click "Details" → "Inspect views" for component debugging
3. Use F12 DevTools for popup/content script debugging
```

## Architecture Overview

### Core Message Flow Pattern

```
Content Script ←→ Background Service ←→ Popup
                        ↕
                 Offscreen Document
```

**Background Script** (`src/background.js`):
- `TranscriptionBackground` class - Central orchestrator and message router
- Manages offscreen document lifecycle for Web Speech API access (Manifest V3 requirement)
- Handles inter-component communication via `chrome.runtime.onMessage`
- Tracks recording states and manages pending tasks

**Content Script** (`src/content.js`):
- `TranscriptionContentScript` class - Page interaction layer
- Detects video elements using MutationObserver for dynamic content
- Shows recording indicator overlay on active pages
- Extracts video metadata and page information for file naming

**Popup Interface** (`src/popup/`):
- `TranscriptionPopup` class - Main UI controller
- Language selection (Japanese `ja-JP`/English `en-US`)
- Real-time transcription display and text file saving via `chrome.downloads`
- Microphone permission guidance and error handling

**Offscreen Document** (`src/offscreen/`):
- `SpeechRecognitionManager` class - Web Speech API wrapper
- Handles `getUserMedia()` for microphone access (service workers cannot access directly)
- Performs continuous speech recognition with interim results
- Essential for Manifest V3 compliance

### Key Architectural Constraints

**Audio Input Limitation**: Requires speakers (not headphones) as microphone captures system audio playback rather than direct tab audio. This is a deliberate design choice for simplicity over tab audio capture complexity.

**Offscreen Document Pattern**: Chrome's Offscreen API is mandatory for Web Speech API access in Manifest V3, as service workers cannot use `getUserMedia()` directly.

**Message-Based Architecture**: All components communicate via `chrome.runtime.onMessage` for loose coupling and state synchronization.

## Extension Structure & APIs

**Manifest V3 Configuration** (`src/manifest.json`):
- Service worker-based background script
- Content script injection on `<all_urls>`
- Permissions: `tabs`, `activeTab`, `tabCapture`, `storage`, `downloads`, `offscreen`
- Host permissions for cross-origin content script injection

**Chrome Extension APIs Used**:
- `chrome.offscreen` - Speech recognition context management
- `chrome.tabs` - Tab information and cross-context messaging  
- `chrome.storage.sync` - Settings persistence across devices
- `chrome.downloads` - Transcription file saving
- `chrome.runtime.onMessage` - Inter-component communication

## Usage Flow & Testing

**Standard Usage Pattern**:
1. Play video with speakers enabled (microphone dependency)
2. Open extension popup via browser action
3. Select language and click "開始" (Start)
4. Grant microphone permission when prompted
5. Real-time transcription appears in popup interface
6. Use "保存" (Save) to download as text file
7. Click "停止" (Stop) to end recording session

**POC Success Criteria** (from README):
- [x] Basic speech recognition functionality
- [ ] 5-minute continuous recognition capability  
- [ ] 70%+ recognition accuracy for Japanese/English
- [ ] File save functionality working
- [ ] No critical errors during operation

## Implementation Details

**Language Support**: Japanese (`ja-JP`) and English (`en-US`) via Web Speech API with automatic language detection capabilities.

**Real-time Processing**: Continuous recognition with `continuous: true, interimResults: true` settings for streaming transcription updates.

**State Management**: Background script maintains offscreen document readiness state and manages pending task queues to prevent race conditions.

**Error Handling**: Comprehensive microphone permission guidance, network error recovery, and speech recognition timeout handling.