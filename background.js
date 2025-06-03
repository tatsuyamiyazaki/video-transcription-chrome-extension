class TranscriptionBackground {
  constructor() {
    this.isRecording = false;
    this.mediaRecorder = null;
    this.stream = null;
    this.recognition = null;
    this.audioChunks = [];
    this.currentTabId = null;
    
    this.initializeMessageListeners();
  }

  initializeMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep the message channel open for async responses
    });
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'START_TRANSCRIPTION':
          const startResult = await this.startTranscription(message.tabId, message.language);
          sendResponse(startResult);
          break;
        
        case 'STOP_TRANSCRIPTION':
          const stopResult = await this.stopTranscription();
          sendResponse(stopResult);
          break;
        
        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async startTranscription(tabId, language = 'ja-JP') {
    if (this.isRecording) {
      return { success: false, error: 'Already recording' };
    }

    try {
      // Check if tab capture is available
      if (!chrome.tabCapture) {
        throw new Error('Tab capture API not available');
      }

      this.currentTabId = tabId;

      // Start tab audio capture
      this.stream = await this.captureTabAudio();
      
      // Initialize speech recognition
      await this.initializeSpeechRecognition(language);
      
      // Start recording
      this.startAudioRecording();
      
      this.isRecording = true;
      console.log('Transcription started for tab:', tabId);
      
      return { success: true };
    } catch (error) {
      console.error('Failed to start transcription:', error);
      await this.cleanup();
      return { success: false, error: error.message };
    }
  }

  async stopTranscription() {
    if (!this.isRecording) {
      return { success: false, error: 'Not currently recording' };
    }

    try {
      await this.cleanup();
      this.isRecording = false;
      
      console.log('Transcription stopped');
      return { success: true };
    } catch (error) {
      console.error('Failed to stop transcription:', error);
      return { success: false, error: error.message };
    }
  }

  async captureTabAudio() {
    return new Promise((resolve, reject) => {
      chrome.tabCapture.capture(
        {
          audio: true,
          video: false
        },
        (stream) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (!stream) {
            reject(new Error('Failed to capture tab audio'));
          } else {
            resolve(stream);
          }
        }
      );
    });
  }

  async initializeSpeechRecognition(language) {
    // Speech recognition will be handled in the popup
    // Just store the language preference
    this.language = language;
    console.log('Speech recognition language set to:', language);
  }

  startAudioRecording() {
    if (!this.stream) {
      throw new Error('No audio stream available');
    }

    try {
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onerror = (error) => {
        console.error('MediaRecorder error:', error);
        this.sendMessageToPopup('TRANSCRIPTION_ERROR', {
          error: 'Audio recording error'
        });
      };

      // Start recording with 1-second intervals
      this.mediaRecorder.start(1000);
      console.log('Audio recording started');
    } catch (error) {
      console.error('Failed to start audio recording:', error);
      throw error;
    }
  }

  async cleanup() {
    try {
      // Stop media recorder
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
      this.mediaRecorder = null;

      // Stop and release audio stream
      if (this.stream) {
        this.stream.getTracks().forEach(track => {
          track.stop();
        });
        this.stream = null;
      }

      // Clear audio chunks
      this.audioChunks = [];
      this.currentTabId = null;

      console.log('Cleanup completed');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  sendMessageToPopup(type, data = {}) {
    chrome.runtime.sendMessage({
      type: type,
      ...data
    }).catch(error => {
      // Popup might be closed, which is fine
      console.log('Could not send message to popup:', error.message);
    });
  }
}

// Initialize background service
const transcriptionBackground = new TranscriptionBackground();

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);
});

// Handle tab updates to stop recording if tab changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (transcriptionBackground.isRecording && 
      transcriptionBackground.currentTabId === tabId && 
      changeInfo.url) {
    console.log('Tab URL changed, stopping transcription');
    transcriptionBackground.stopTranscription();
  }
});

// Handle tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
  if (transcriptionBackground.isRecording && 
      transcriptionBackground.currentTabId === tabId) {
    console.log('Tab closed, stopping transcription');
    transcriptionBackground.stopTranscription();
  }
});