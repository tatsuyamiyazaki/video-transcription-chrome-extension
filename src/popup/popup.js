class TranscriptionPopup {
  constructor() {
    this.isRecording = false;
    this.transcriptionText = '';
    // this.speechRecognition = new SpeechRecognitionManager(); // Removed
    this.initializeElements();
    this.attachEventListeners();
    this.loadSettings();
    // this.setupSpeechRecognition(); // Removed
  }

  initializeElements() {
    this.startBtn = document.getElementById('startBtn');
    this.stopBtn = document.getElementById('stopBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.saveBtn = document.getElementById('saveBtn');
    this.languageSelect = document.getElementById('language');
    this.statusDiv = document.getElementById('status');
    this.transcriptionDiv = document.getElementById('transcription');
  }

  attachEventListeners() {
    this.startBtn.addEventListener('click', () => this.startTranscription());
    this.stopBtn.addEventListener('click', () => this.stopTranscription());
    this.clearBtn.addEventListener('click', () => this.clearTranscription());
    this.saveBtn.addEventListener('click', () => this.saveTranscription());
    this.languageSelect.addEventListener('change', () => this.saveSettings());

    // Listen for messages from background script (or offscreen via background)
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleBackgroundMessage(message);
      // It's good practice to return true if you plan to send a response asynchronously,
      // but for most of these popup messages, it's acting on the message.
    });
  }

  // setupSpeechRecognition() removed

  // handleSpeechResult(result) removed (logic moved to message handler)

  // handleSpeechError(error) removed (logic moved to message handler)

  // handleSpeechEnd() removed (logic moved to message handler)

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['language']);
      if (result.language) {
        this.languageSelect.value = result.language;
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.sync.set({
        language: this.languageSelect.value
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  async startTranscription() {
    this.updateStatus('starting', '音声認識を初期化中...');
    chrome.runtime.sendMessage({
      type: 'POPUP_REQUEST_START_RECOGNITION',
      language: this.languageSelect.value
    }, response => {
      if (chrome.runtime.lastError) {
        console.error('Error sending start message:', chrome.runtime.lastError);
        this.updateStatus('error', `開始リクエスト失敗: ${chrome.runtime.lastError.message}`);
        this.isRecording = false; // Ensure state is correct
        this.updateButtons();
        return;
      }
      if (response && response.success) {
        // this.isRecording = true; // This will be set by BACKGROUND_FORWARD_RECOGNITION_STARTED
        // this.updateButtons(); // This will be updated by BACKGROUND_FORWARD_RECOGNITION_STARTED
        this.updateStatus('starting', '音声認識を開始しています...'); // Waiting for confirmation from background
      } else {
        this.updateStatus('error', `初期化失敗: ${response ? response.error : '不明なエラー'}`);
        this.isRecording = false;
        this.updateButtons();
      }
    });

    // Show recording indicator (optimistically, or wait for confirmation)
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'HIGHLIGHT_RECORDING', show: true });
      }
    } catch (error) {
      console.log('Could not show recording indicator:', error.message);
    }
  }

  async stopTranscription() {
    this.updateStatus('stopping', '音声認識を停止しています...');
    chrome.runtime.sendMessage({ type: 'POPUP_REQUEST_STOP_RECOGNITION' }, response => {
      if (chrome.runtime.lastError) {
        console.error('Error sending stop message:', chrome.runtime.lastError);
        this.updateStatus('error', `停止リクエスト失敗: ${chrome.runtime.lastError.message}`);
        // Consider current state for UI update
        return;
      }
      if (response && response.success) {
        // this.isRecording = false; // This will be set by BACKGROUND_FORWARD_SPEECH_END
        // this.updateButtons(); // This will be updated by BACKGROUND_FORWARD_SPEECH_END
        this.updateStatus('stopping', '音声認識を停止処理中...');
      } else {
        this.updateStatus('error', `停止失敗: ${response ? response.error : '不明なエラー'}`);
      }
    });

    // Hide recording indicator
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
       if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'HIGHLIGHT_RECORDING', show: false });
      }
    } catch (error) {
      console.log('Could not hide recording indicator:', error.message);
    }
  }

  clearTranscription() {
    this.transcriptionText = '';
    this.transcriptionDiv.textContent = '';
    this.saveBtn.disabled = true;
  }

  async saveTranscription() {
    if (!this.transcriptionText.trim()) {
      this.updateStatus('error', '保存するテキストがありません');
      return;
    }

    try {
      // Get current tab info for filename
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const title = tab.title ? tab.title.replace(/[<>:"/\\|?*]/g, '') : 'transcription';
      const filename = `${timestamp}_${title}_transcript.txt`;

      // Use Chrome downloads API to save file
      const blob = new Blob([this.transcriptionText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      await chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: true
      });

      this.updateStatus('success', 'ファイルが保存されました');
      
      // Clean up the blob URL
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Failed to save transcription:', error);
      this.updateStatus('error', `保存エラー: ${error.message}`);
    }
  }

  handleBackgroundMessage(message) {
    console.log("Popup received message:", message);
    switch (message.type) {
      case 'BACKGROUND_FORWARD_SPEECH_RESULT':
        if (message.data.finalTranscript) {
          this.appendTranscription(message.data.finalTranscript);
        }
        // Optionally display interim results:
        // if (message.data.interimTranscript) {
        //   this.updateStatus('recording', `認識中: ${message.data.interimTranscript}`);
        // }
        break;
      case 'BACKGROUND_FORWARD_SPEECH_ERROR':
        this.updateStatus('error', `音声認識エラー: ${message.error}`);
        this.isRecording = false;
        this.updateButtons();
        break;
      case 'BACKGROUND_FORWARD_SPEECH_END':
        this.isRecording = false;
        this.updateButtons();
        this.updateStatus('stopped', '音声認識が終了しました。');
        // If continuous mode is desired, and this.isRecording was true before this message,
        // you might want to automatically send a start request again.
        // For now, we stop and require user to click start.
        break;
      case 'BACKGROUND_FORWARD_RECOGNITION_STARTED':
        this.isRecording = true;
        this.updateButtons();
        this.updateStatus('recording', '音声認識中...');
        break;
      case 'BACKGROUND_FORWARD_RECOGNITION_INIT_FAILED':
        this.isRecording = false;
        this.updateButtons();
        this.updateStatus('error', `初期化失敗: ${message.error}`);
        break;
      default:
        console.log('Popup: Unknown message type received:', message.type);
    }
  }

  appendTranscription(text) {
    this.transcriptionText += text + ' ';
    this.transcriptionDiv.textContent = this.transcriptionText;
    this.transcriptionDiv.scrollTop = this.transcriptionDiv.scrollHeight;
    this.saveBtn.disabled = false;
  }

  updateButtons() {
    this.startBtn.disabled = this.isRecording;
    this.stopBtn.disabled = !this.isRecording;
    this.languageSelect.disabled = this.isRecording;
  }

  updateStatus(type, message) {
    this.statusDiv.className = `status ${type}`;
    this.statusDiv.textContent = message;
    this.statusDiv.classList.remove('hidden');
    
      // Auto-hide success, info, starting, stopping messages after some time
    if (type === 'success' || type === 'starting' || type === 'stopping' || type === 'info') {
      setTimeout(() => {
        // Only hide if the status hasn't changed to something more permanent like 'error' or 'recording'
        if (this.statusDiv.textContent === message) {
            this.statusDiv.classList.add('hidden');
        }
      }, 3000);
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new TranscriptionPopup();
});