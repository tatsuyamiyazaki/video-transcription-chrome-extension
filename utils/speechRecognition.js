class SpeechRecognitionManager {
  constructor() {
    this.recognition = null;
    this.isActive = false;
    this.language = 'ja-JP';
    this.onResultCallback = null;
    this.onErrorCallback = null;
    this.onEndCallback = null;
  }

  isSupported() {
    return ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window);
  }

  initialize(options = {}) {
    if (!this.isSupported()) {
      throw new Error('Speech recognition not supported in this browser');
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    // Configure speech recognition
    this.recognition.continuous = options.continuous || true;
    this.recognition.interimResults = options.interimResults || true;
    this.recognition.lang = options.language || this.language;
    this.recognition.maxAlternatives = options.maxAlternatives || 1;

    // Set up event handlers
    this.recognition.onstart = () => {
      console.log('Speech recognition started');
      this.isActive = true;
    };

    this.recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (this.onResultCallback) {
        this.onResultCallback({
          finalTranscript,
          interimTranscript,
          confidence: event.results[event.results.length - 1][0].confidence || 0
        });
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (this.onErrorCallback) {
        this.onErrorCallback(event.error);
      }
    };

    this.recognition.onend = () => {
      console.log('Speech recognition ended');
      this.isActive = false;
      if (this.onEndCallback) {
        this.onEndCallback();
      }
    };
  }

  start(options = {}) {
    if (!this.recognition) {
      this.initialize(options);
    }

    if (this.isActive) {
      console.log('Speech recognition already active');
      return;
    }

    try {
      this.recognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      throw error;
    }
  }

  stop() {
    if (this.recognition && this.isActive) {
      this.recognition.stop();
    }
  }

  setLanguage(language) {
    this.language = language;
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }

  setCallbacks(onResult, onError, onEnd) {
    this.onResultCallback = onResult;
    this.onErrorCallback = onError;
    this.onEndCallback = onEnd;
  }

  destroy() {
    this.stop();
    this.recognition = null;
    this.isActive = false;
    this.onResultCallback = null;
    this.onErrorCallback = null;
    this.onEndCallback = null;
  }
}