const OFFSCREEN_DOCUMENT_PATH = 'offscreen/offscreen.html';

class TranscriptionBackground {
  constructor() {
    this.isRecording = false; // For tab capture feature
    this.mediaRecorder = null; // For tab capture feature
    this.stream = null; // For tab capture feature
    // this.recognition = null; // Removed, offscreen document handles speech recognition
    this.audioChunks = []; // For tab capture feature
    this.currentTabId = null; // For tab capture feature
    
    this.isOffscreenRecognitionActive = false; // Tracks state of offscreen speech recognition
    this.pendingOffscreenTasks = []; // Queue for tasks waiting for offscreen doc to be ready

    this.initializeMessageListeners();
  }

  initializeMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // Check if the message is from our offscreen document
      if (sender.url && sender.url.endsWith(OFFSCREEN_DOCUMENT_PATH)) {
        this.handleOffscreenMessage(message, sender, sendResponse);
      } else {
        this.handlePopupOrContentScriptMessage(message, sender, sendResponse);
      }
      return true; // Keep the message channel open for async responses
    });
  }

  async hasOffscreenDocument() {
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)]
    });
    return existingContexts.length > 0;
  }

  async createOffscreenDocument(path = OFFSCREEN_DOCUMENT_PATH) {
    // Check if the document already exists.
    if (await this.hasOffscreenDocument(path)) {
      console.log("Offscreen document already exists.");
      // If it exists, we assume it's ready or will soon send its READY message.
      // If it had crashed and restarted, it should send READY again.
      return true; // Indicates it exists or was presumably created successfully before.
    }

    console.log("Attempting to create offscreen document...");
    try {
      await chrome.offscreen.createDocument({
        url: path,
        reasons: ['USER_MEDIA'],
        justification: 'User media access for speech recognition.',
      });
      console.log("Offscreen document creation initiated successfully.");
      return true; // Creation process started
    } catch (error) {
      console.error("Error creating offscreen document:", error);
      // Propagate the error to be handled by the caller
      // This allows the caller to inform the popup of the failure.
      throw error;
    }
  }

    // Optional: Placeholder for closing the offscreen document
  async closeOffscreenDocument() {
    if (await this.hasOffscreenDocument()) {
      // This might be too aggressive if recognition could restart soon.
      // Consider a timeout or specific conditions.
      // await chrome.offscreen.closeDocument();
      console.log("Offscreen document close function called (currently placeholder).");
    }
  }

  handleOffscreenMessage(message, sender, sendResponse) {
    console.log("Background received message from Offscreen:", message);
    switch (message.type) {
      case 'OFFSCREEN_SPEECH_RESULT':
        this.sendMessageToPopup('BACKGROUND_FORWARD_SPEECH_RESULT', { data: message.data });
        break;
      case 'OFFSCREEN_SPEECH_ERROR':
        this.isOffscreenRecognitionActive = false;
        this.sendMessageToPopup('BACKGROUND_FORWARD_SPEECH_ERROR', { error: message.error });
        break;
      case 'OFFSCREEN_SPEECH_END':
        this.isOffscreenRecognitionActive = false;
        this.sendMessageToPopup('BACKGROUND_FORWARD_SPEECH_END');
        break;
      case 'OFFSCREEN_DOCUMENT_READY':
        console.log("Background: Offscreen document reported READY.");
        if (sender.url === chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)) {
          this.processPendingOffscreenTasks();
        }
        break;
      default:
        console.warn("Background: Unknown message type from offscreen document:", message.type);
    }
  }

  processPendingOffscreenTasks() {
    console.log(`Processing ${this.pendingOffscreenTasks.length} pending offscreen tasks.`);
    while (this.pendingOffscreenTasks.length > 0) {
      const task = this.pendingOffscreenTasks.shift();
      console.log("Processing task:", task.type, task.originalMessage);
      // Re-trigger the handling logic for the start request, but this time
      // the offscreen document is known to be ready.
      // We call a more direct processing function to avoid re-queueing.
      this._executeRecognitionTask(task);
    }
  }

  // Helper to execute the core logic of initializing and starting recognition
  // This is called when the offscreen document is confirmed to be ready.
  _executeRecognitionTask(task) {
    const { originalMessage, originalSendResponse } = task;
    const language = originalMessage.language;

    // 1. Initialize speech recognition in offscreen
    chrome.runtime.sendMessage({
      target: 'offscreen',
      type: 'INITIALIZE_SPEECH_RECOGNITION',
      options: { language: language }
    }, (initResponse) => {
      if (chrome.runtime.lastError) {
        console.error("Error initializing offscreen speech recognition (pending task):", chrome.runtime.lastError.message);
        this.sendMessageToPopup('BACKGROUND_FORWARD_RECOGNITION_INIT_FAILED', { error: chrome.runtime.lastError.message });
        originalSendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }

      if (initResponse && initResponse.success) {
        // 2. Start speech recognition in offscreen
        chrome.runtime.sendMessage({
          target: 'offscreen',
          type: 'START_SPEECH_RECOGNITION',
          options: { language: language }
        }, (startCmdResponse) => {
          if (chrome.runtime.lastError) {
            console.error("Error starting offscreen speech recognition command (pending task):", chrome.runtime.lastError.message);
            this.sendMessageToPopup('BACKGROUND_FORWARD_SPEECH_ERROR', { error: `Failed to send start command: ${chrome.runtime.lastError.message}` });
            originalSendResponse({ success: false, error: `Failed to send start command: ${chrome.runtime.lastError.message}` });
            return;
          }

          if (startCmdResponse && startCmdResponse.success) {
            this.isOffscreenRecognitionActive = true;
            this.sendMessageToPopup('BACKGROUND_FORWARD_RECOGNITION_STARTED');
            originalSendResponse({ success: true });
          } else {
            const errorMsg = startCmdResponse ? startCmdResponse.error : "Unknown error starting recognition";
            console.error("Offscreen failed to start recognition (pending task):", errorMsg);
            this.sendMessageToPopup('BACKGROUND_FORWARD_SPEECH_ERROR', { error: errorMsg });
            originalSendResponse({ success: false, error: errorMsg });
          }
        });
      } else {
        const errorMsg = initResponse ? initResponse.error : "Unknown error initializing recognition";
        console.error("Offscreen failed to initialize speech recognition (pending task):", errorMsg);
        this.sendMessageToPopup('BACKGROUND_FORWARD_RECOGNITION_INIT_FAILED', { error: errorMsg });
        originalSendResponse({ success: false, error: errorMsg });
      }
    });
  }

  async handlePopupOrContentScriptMessage(message, sender, sendResponse) {
    console.log("Background received message from Popup/Content:", message);
    try {
      switch (message.type) {
        // --- Tab Capture Specific Messages (largely unchanged) ---
        case 'START_TRANSCRIPTION': // This is for TAB AUDIO
          const startResult = await this.startTabAudioTranscription(message.tabId, message.language);
          sendResponse(startResult);
          break;
        
        case 'STOP_TRANSCRIPTION': // This is for TAB AUDIO
          const stopResult = await this.stopTabAudioTranscription();
          sendResponse(stopResult);
          break;

        // --- New Messages for Offscreen Speech Recognition (Microphone) ---
        case 'POPUP_REQUEST_START_RECOGNITION':
          this.handlePopupStartRecognition(message, sender, sendResponse);
          return true; // Indicates async response

        case 'POPUP_REQUEST_STOP_RECOGNITION':
          this.handlePopupStopRecognition(message, sender, sendResponse);
          return true; // Indicates async response
        
        default:
          console.warn("Background: Unknown message type from popup/content:", message.type);
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling popup/content script message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handlePopupStartRecognition(message, sender, sendResponse) {
    try {
      // Check if recognition is already active
      if (this.isOffscreenRecognitionActive) {
        console.log("Speech recognition is already active");
        sendResponse({ success: false, error: "音声認識は既にアクティブです" });
        return;
      }

      const offscreenDocumentExists = await this.hasOffscreenDocument();

      if (!offscreenDocumentExists) {
        console.log("Creating offscreen document for speech recognition...");
        this.sendMessageToPopup('BACKGROUND_FORWARD_RECOGNITION_INIT_STATUS', { 
          status: 'Offscreenドキュメントを作成中...' 
        });
        
        await this.createOffscreenDocument(); // Attempt to create
        // Add the task to the queue. It will be processed when OFFSCREEN_DOCUMENT_READY is received.
        this.pendingOffscreenTasks.push({
          type: 'START_RECOGNITION_SEQUENCE', // Internal type for the task
          originalMessage: message,
          originalSendResponse: sendResponse,
        });
        console.log("Offscreen document creation initiated, task queued.");
        // sendResponse will be called by _executeRecognitionTask later.
        return; // Important to return here as the response is now async via the queue
      }

      // If offscreen document already exists, proceed to execute the task directly
      console.log("Offscreen document exists, proceeding with recognition task directly.");
      this._executeRecognitionTask({
        originalMessage: message,
        originalSendResponse: sendResponse,
      });

    } catch (error) { // Catch errors primarily from createOffscreenDocument if it throws
      console.error("Failed to setup or ensure offscreen document for recognition:", error);
      let userFriendlyError;
      
      // Provide more specific error messages
      if (error.message.includes('Permission denied')) {
        userFriendlyError = 'Offscreenドキュメントの作成が拒否されました。拡張機能の権限を確認してください。';
      } else if (error.message.includes('Extension context invalidated')) {
        userFriendlyError = '拡張機能コンテキストが無効になりました。拡張機能を再読み込みしてください。';
      } else {
        userFriendlyError = `Offscreen設定エラー: ${error.message}`;
      }
      
      this.sendMessageToPopup('BACKGROUND_FORWARD_RECOGNITION_INIT_FAILED', { error: userFriendlyError });
      sendResponse({ success: false, error: userFriendlyError });
    }
  }

  async handlePopupStopRecognition(message, sender, sendResponse) {
    if (!await this.hasOffscreenDocument()) {
      console.log("Stop request received, but no offscreen document exists.");
      // Still inform popup that it's "stopped" from its perspective
      this.isOffscreenRecognitionActive = false; // Ensure state consistency
      this.sendMessageToPopup('BACKGROUND_FORWARD_SPEECH_END');
      sendResponse({ success: true, message: "Offscreen document not active." });
      return;
    }

    chrome.runtime.sendMessage({
      target: 'offscreen',
      type: 'STOP_SPEECH_RECOGNITION'
    }, (stopCmdResponse) => {
      if (chrome.runtime.lastError) {
        console.error("Error sending stop command to offscreen:", chrome.runtime.lastError.message);
        // We don't send an error to popup here as speech might have already ended or offscreen closed.
        // The OFFSCREEN_SPEECH_END message will handle UI.
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      if (stopCmdResponse && stopCmdResponse.success) {
        // Actual confirmation of stop will come via OFFSCREEN_SPEECH_END
        // this.isOffscreenRecognitionActive = false; // Set by OFFSCREEN_SPEECH_END
        console.log("Stop command sent to offscreen successfully.");
        sendResponse({ success: true });
      } else {
        const errorMsg = stopCmdResponse ? stopCmdResponse.error : "Unknown error stopping recognition";
        console.error("Offscreen failed to process stop command:", errorMsg);
        sendResponse({ success: false, error: errorMsg });
      }
    });
  }


  // --- Tab Audio Transcription Methods (Renamed for clarity) ---
  async startTabAudioTranscription(tabId, language = 'ja-JP') {
    // This method is for the tab capture feature
    if (this.isRecording) { // this.isRecording refers to tab capture recording state
      return { success: false, error: 'Already recording tab audio' };
    }

    try {
      if (!chrome.tabCapture) {
        throw new Error('Tab capture API not available');
      }
      this.currentTabId = tabId;
      this.stream = await this.captureTabAudioStream(); // Renamed for clarity
      // await this.initializeSpeechRecognition(language); // This was a placeholder, not used for tab audio actual speech-to-text
      this.startTabAudioMediaRecording(); // Renamed for clarity
      
      this.isRecording = true; // Tab audio recording active
      console.log('Tab audio transcription started for tab:', tabId);
      return { success: true };
    } catch (error) {
      console.error('Failed to start tab audio transcription:', error);
      await this.cleanupTabAudio(); // Renamed for clarity
      return { success: false, error: error.message };
    }
  }

  async stopTabAudioTranscription() {
    // This method is for the tab capture feature
    if (!this.isRecording) { // this.isRecording refers to tab capture recording state
      return { success: false, error: 'Not currently recording tab audio' };
    }

    try {
      await this.cleanupTabAudio(); // Renamed for clarity
      this.isRecording = false; // Tab audio recording stopped
      console.log('Tab audio transcription stopped');
      return { success: true };
    } catch (error) {
      console.error('Failed to stop tab audio transcription:', error);
      return { success: false, error: error.message };
    }
  }

  async captureTabAudioStream() {
    return new Promise((resolve, reject) => {
      chrome.tabCapture.capture({ audio: true, video: false }, (stream) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!stream) {
          reject(new Error('Failed to capture tab audio stream'));
        } else {
          resolve(stream);
        }
      });
    });
  }

  // initializeSpeechRecognition(language) {
    // This was a placeholder. Actual speech recognition for microphone is in offscreen.
    // For tab audio, if speech-to-text was implemented here, it would be different.
  // }

  startTabAudioMediaRecording() {
    // For tab audio capture feature
    if (!this.stream) {
      throw new Error('No audio stream available for tab audio recording');
    }
    try {
      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: 'audio/webm;codecs=opus' });
      this.audioChunks = [];
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) this.audioChunks.push(event.data);
      };
      this.mediaRecorder.onerror = (error) => {
        console.error('Tab Audio MediaRecorder error:', error);
        // If tab audio feature had its own popup messages, it would send one here.
        // For now, assuming it's a distinct feature.
      };
      this.mediaRecorder.start(1000);
      console.log('Tab audio media recording started');
    } catch (error) {
      console.error('Failed to start tab audio media recording:', error);
      throw error;
    }
  }

  async cleanupTabAudio() {
    // For tab audio capture feature
    try {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') this.mediaRecorder.stop();
      this.mediaRecorder = null;
      if (this.stream) this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
      this.audioChunks = [];
      this.currentTabId = null; // Reset tab ID for tab capture
      console.log('Tab audio cleanup completed');
    } catch (error) {
      console.error('Error during tab audio cleanup:', error);
    }
  }

  sendMessageToPopup(type, data = {}) {
    // This now primarily forwards messages related to offscreen (microphone) recognition
    chrome.runtime.sendMessage({ type: type, ...data })
      .catch(error => {
        if (error.message.includes("Could not establish connection") || error.message.includes("Receiving end does not exist")) {
          console.log('Popup is not open or listening:', error.message);
        } else {
          console.warn('Could not send message to popup:', error.message);
        }
      });
  }
}

// Initialize background service
const backgroundService = new TranscriptionBackground();

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);
  if (details.reason === 'install') {
    // Perform any first-time setup, like creating an initial offscreen document if needed
    // or setting default storage values.
    // backgroundService.createOffscreenDocument(); // Example: create on install
  }
});


// --- Listeners for Tab Capture Feature ---
// Handle tab updates to stop tab audio recording if tab changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (backgroundService.isRecording && // isRecording here refers to tab audio
      backgroundService.currentTabId === tabId &&
      changeInfo.url) {
    console.log('Tab URL changed, stopping tab audio transcription');
    backgroundService.stopTabAudioTranscription();
  }
});

// Handle tab removal for tab audio recording
chrome.tabs.onRemoved.addListener((tabId) => {
  if (backgroundService.isRecording && // isRecording here refers to tab audio
      backgroundService.currentTabId === tabId) {
    console.log('Tab closed, stopping tab audio transcription');
    backgroundService.stopTabAudioTranscription();
  }
});

// Keep alive for offscreen document communication (experimental)
// This might not be necessary if event-driven offscreen document works reliably.
// let keepAliveInterval;
// chrome.runtime.onStartup.addListener(() => {
//   console.log("Extension started up.");
// });

// chrome.runtime.onSuspend.addListener(() => {
//   console.log("Extension suspending.");
//   if (keepAliveInterval) clearInterval(keepAliveInterval);
// });

// function setupKeepAlive() {
//   if (keepAliveInterval) clearInterval(keepAliveInterval);
//   keepAliveInterval = setInterval(() => {
//     if (chrome.runtime.getManifest().manifest_version === 3) {
//       chrome.runtime.sendMessage({ type: 'ping' }).catch(() => {});
//       console.log("Background keep-alive ping");
//     }
//   }, 20000); // Every 20 seconds
// }
// setupKeepAlive();