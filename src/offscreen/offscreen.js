class SpeechRecognitionManager {
  constructor() {
    this.recognition = null;
    this.isActive = false;
    this.language = 'ja-JP'; // Default language
    // Callbacks will be handled by messages, so these can be removed or repurposed
    // for internal state if needed, but direct callback props are not used.
  }

  isSupported() {
    return ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window);
  }

  initialize(options = {}) {
    if (!this.isSupported()) {
      // This error should be caught and messaged back
      console.error('Speech recognition not supported in this browser');
      throw new Error('Speech recognition not supported in this browser');
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    this.recognition.continuous = options.continuous !== undefined ? options.continuous : true;
    this.recognition.interimResults = options.interimResults !== undefined ? options.interimResults : true;
    this.recognition.lang = options.language || this.language;
    this.recognition.maxAlternatives = options.maxAlternatives || 1;

    this.recognition.onstart = () => {
      console.log('Offscreen: Speech recognition started');
      this.isActive = true;
      // Optional: Send a message if the background script needs to know about the 'start' event
      // chrome.runtime.sendMessage({ type: 'OFFSCREEN_SPEECH_STARTED' });
    };

    this.recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      let lastConfidence = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        lastConfidence = event.results[i][0].confidence;

        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      chrome.runtime.sendMessage({
        type: 'OFFSCREEN_SPEECH_RESULT',
        data: {
          finalTranscript,
          interimTranscript,
          confidence: lastConfidence
        }
      });
    };

    this.recognition.onerror = (event) => {
      console.error('Offscreen: Speech recognition error:', event.error);
      let errorToSend = event.error;
      if (typeof event.error === 'object' && event.error !== null) {
        errorToSend = event.error.message || JSON.stringify(event.error);
      } else if (event.error === undefined && event.type === 'error') {
        // Handle cases like 'no-speech' which might not have an error object
        errorToSend = 'Speech recognition error occurred (no specific error object). Common causes: no speech detected, network error, or microphone issue.';
      }
      chrome.runtime.sendMessage({
        type: 'OFFSCREEN_SPEECH_ERROR',
        error: errorToSend
      });
    };

    this.recognition.onend = () => {
      console.log('Offscreen: Speech recognition ended');
      this.isActive = false;
      chrome.runtime.sendMessage({ type: 'OFFSCREEN_SPEECH_END' });
    };
  }

  start(options = {}) { // Options might include language if not set during initialize
    if (!this.recognition) {
      console.error('Offscreen: Recognition not initialized. Call initialize first.');
      // Send error message back
      chrome.runtime.sendMessage({
        type: 'OFFSCREEN_SPEECH_ERROR',
        error: 'Recognition not initialized. Call initialize first.'
      });
      return;
    }
    if (options.language) {
        this.setLanguage(options.language);
    }

    if (this.isActive) {
      console.log('Offscreen: Speech recognition already active');
      return;
    }

    try {
      this.recognition.start();
    } catch (error) {
      console.error('Offscreen: Failed to start speech recognition:', error);
      chrome.runtime.sendMessage({
        type: 'OFFSCREEN_SPEECH_ERROR',
        error: `Failed to start speech recognition: ${error.message}`
      });
    }
  }

  stop() {
    if (this.recognition && this.isActive) {
      this.recognition.stop();
    } else {
      console.log('Offscreen: Recognition not active or not initialized.');
    }
  }

  setLanguage(language) {
    this.language = language;
    if (this.recognition) {
      this.recognition.lang = language;
      console.log(`Offscreen: Language set to ${language}`);
    }
  }

  // setCallbacks method is removed as per requirements.

  destroy() {
    this.stop();
    if (this.recognition) {
        // Remove all listeners to prevent memory leaks
        this.recognition.onstart = null;
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition = null;
    }
    this.isActive = false;
    console.log('Offscreen: SpeechRecognitionManager destroyed');
  }
}

const speechManager = new SpeechRecognitionManager();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Offscreen document received message:', message);

  if (message.type === 'INITIALIZE_SPEECH_RECOGNITION') {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => {
        console.log('Offscreen: Microphone access granted');
        try {
          speechManager.initialize(message.options || {});
          sendResponse({ success: true });
        } catch (e) {
          console.error('Offscreen: Error initializing speech manager after mic grant:', e);
          sendResponse({ success: false, error: e.message || 'Initialization failed' });
        }
      })
      .catch((error) => {
        console.error('Offscreen: Microphone access denied:', error);
        sendResponse({ success: false, error: `Microphone access denied: ${error.message}` });
      });
    return true; // Indicates that the response is sent asynchronously
  }

  if (message.type === 'START_SPEECH_RECOGNITION') {
    try {
      speechManager.start(message.options || {});
      sendResponse({ success: true });
    } catch (e) {
      console.error('Offscreen: Error starting speech recognition:', e);
      sendResponse({ success: false, error: e.message || 'Failed to start' });
    }
    return true; // Keep true if any path is async, though start is mostly sync here
  }

  if (message.type === 'STOP_SPEECH_RECOGNITION') {
    try {
      speechManager.stop();
      sendResponse({ success: true });
    } catch (e) {
      console.error('Offscreen: Error stopping speech recognition:', e);
      sendResponse({ success: false, error: e.message || 'Failed to stop' });
    }
    return true;
  }

  if (message.type === 'SET_LANGUAGE') {
    if (message.language) {
      try {
        speechManager.setLanguage(message.language);
        sendResponse({ success: true });
      } catch (e) {
        console.error('Offscreen: Error setting language:', e);
        sendResponse({ success: false, error: e.message || 'Failed to set language' });
      }
    } else {
      sendResponse({ success: false, error: 'Language not provided' });
    }
    return true;
  }

  // Optional: Add a handler for destroying/cleaning up the speech manager
  if (message.type === 'DESTROY_SPEECH_RECOGNITION') {
    try {
      speechManager.destroy();
      sendResponse({ success: true });
    } catch (e) {
      console.error('Offscreen: Error destroying speech manager:', e);
      sendResponse({ success: false, error: e.message || 'Failed to destroy' });
    }
    return true;
  }

  // Default response for unhandled messages
  // sendResponse({ success: false, error: 'Unknown message type' });
  // return false; // Or true if you expect some other listener to handle it.
});

console.log('Offscreen script loaded and message listener added.');

chrome.runtime.sendMessage({ type: 'OFFSCREEN_DOCUMENT_READY', target: 'background' });
