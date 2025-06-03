class TranscriptionPopup {
  constructor() {
    this.isRecording = false;
    this.transcriptionText = '';
    this.speechRecognition = new SpeechRecognitionManager();
    this.initializeElements();
    this.attachEventListeners();
    this.loadSettings();
    this.setupSpeechRecognition();
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

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleBackgroundMessage(message);
    });
  }

  setupSpeechRecognition() {
    if (!this.speechRecognition.isSupported()) {
      this.updateStatus('error', 'このブラウザは音声認識をサポートしていません');
      this.startBtn.disabled = true;
      return;
    }

    this.speechRecognition.setCallbacks(
      (result) => this.handleSpeechResult(result),
      (error) => this.handleSpeechError(error),
      () => this.handleSpeechEnd()
    );
  }

  handleSpeechResult(result) {
    if (result.finalTranscript) {
      this.appendTranscription(result.finalTranscript);
    }
  }

  handleSpeechError(error) {
    console.error('Speech recognition error:', error);
    this.updateStatus('error', `音声認識エラー: ${error}`);
    this.isRecording = false;
    this.updateButtons();
  }

  handleSpeechEnd() {
    if (this.isRecording) {
      // Restart recognition if we're still recording
      try {
        setTimeout(() => {
          if (this.isRecording) {
            this.speechRecognition.start({
              language: this.languageSelect.value
            });
          }
        }, 100);
      } catch (error) {
        console.error('Failed to restart speech recognition:', error);
        this.handleSpeechError('音声認識が予期せず停止しました');
      }
    }
  }

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
    try {
      this.updateStatus('starting', 'マイクアクセスを要求しています...');
      
      // Start speech recognition directly (will use system microphone)
      this.speechRecognition.start({
        language: this.languageSelect.value,
        continuous: true,
        interimResults: true
      });
      
      this.isRecording = true;
      this.updateButtons();
      this.updateStatus('recording', '音声認識中... (スピーカーの音声を認識中)');
      
      // Show recording indicator on the page
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.tabs.sendMessage(tab.id, {
          type: 'HIGHLIGHT_RECORDING',
          show: true
        });
      } catch (error) {
        console.log('Could not show recording indicator:', error.message);
      }
      
    } catch (error) {
      console.error('Failed to start transcription:', error);
      this.updateStatus('error', `エラー: ${error.message}`);
    }
  }

  async stopTranscription() {
    try {
      this.updateStatus('stopping', '音声認識を停止しています...');
      
      // Stop speech recognition
      this.speechRecognition.stop();
      
      this.isRecording = false;
      this.updateButtons();
      this.updateStatus('stopped', '音声認識が停止されました');
      
      // Hide recording indicator on the page
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.tabs.sendMessage(tab.id, {
          type: 'HIGHLIGHT_RECORDING',
          show: false
        });
      } catch (error) {
        console.log('Could not hide recording indicator:', error.message);
      }
      
    } catch (error) {
      console.error('Failed to stop transcription:', error);
      this.updateStatus('error', `エラー: ${error.message}`);
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
    switch (message.type) {
      case 'TRANSCRIPTION_RESULT':
        this.appendTranscription(message.text);
        break;
      case 'TRANSCRIPTION_ERROR':
        this.updateStatus('error', `音声認識エラー: ${message.error}`);
        this.isRecording = false;
        this.updateButtons();
        break;
      case 'TRANSCRIPTION_ENDED':
        this.isRecording = false;
        this.updateButtons();
        this.updateStatus('stopped', '音声認識が終了しました');
        break;
      default:
        console.log('Unknown message type:', message.type);
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
    
    // Auto-hide success and info messages after 3 seconds
    if (type === 'success' || type === 'starting' || type === 'stopping') {
      setTimeout(() => {
        if (this.statusDiv.className.includes(type)) {
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