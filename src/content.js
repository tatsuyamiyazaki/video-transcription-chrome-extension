class TranscriptionContentScript {
  constructor() {
    this.isActive = false;
    this.videoElements = [];
    this.observer = null;
    this.extensionContextValid = true;
    
    this.init();
  }

  init() {
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupContentScript());
    } else {
      this.setupContentScript();
    }
  }

  setupContentScript() {
    // Find video elements on the page
    this.findVideoElements();
    
    // Set up mutation observer to watch for new video elements
    this.setupMutationObserver();
    
    // Listen for messages from background script
    this.setupMessageListener();
    
    console.log('Content script initialized for video transcription');
  }

  findVideoElements() {
    this.videoElements = Array.from(document.querySelectorAll('video'));
    console.log(`Found ${this.videoElements.length} video elements`);
    
    // Add event listeners to video elements
    this.videoElements.forEach((video, index) => {
      this.setupVideoEventListeners(video, index);
    });
  }

  setupVideoEventListeners(video, index) {
    // Monitor video play/pause state
    video.addEventListener('play', () => {
      console.log(`Video ${index} started playing`);
      this.notifyVideoStateChange('play', index);
    });

    video.addEventListener('pause', () => {
      console.log(`Video ${index} paused`);
      this.notifyVideoStateChange('pause', index);
    });

    video.addEventListener('ended', () => {
      console.log(`Video ${index} ended`);
      this.notifyVideoStateChange('ended', index);
    });

    video.addEventListener('loadstart', () => {
      console.log(`Video ${index} loading started`);
      this.notifyVideoStateChange('loadstart', index);
    });
  }

  setupMutationObserver() {
    this.observer = new MutationObserver((mutations) => {
      let newVideosFound = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if the added node is a video or contains videos
              const videos = node.tagName === 'VIDEO' ? [node] : node.querySelectorAll?.('video') || [];
              
              videos.forEach((video) => {
                if (!this.videoElements.includes(video)) {
                  this.videoElements.push(video);
                  this.setupVideoEventListeners(video, this.videoElements.length - 1);
                  newVideosFound = true;
                }
              });
            }
          });
        }
      });
      
      if (newVideosFound) {
        console.log(`New videos found. Total: ${this.videoElements.length}`);
      }
    });

    // Start observing
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  setupMessageListener() {
    // Check if extension context is valid before setting up listener
    if (!this.isExtensionContextValid()) {
      console.warn('Extension context invalid, skipping message listener setup');
      return;
    }

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // Validate context before handling message
      if (!this.isExtensionContextValid()) {
        console.warn('Extension context invalid, cannot handle message');
        sendResponse({ success: false, error: 'Extension context invalidated' });
        return false;
      }
      
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open
    });
  }

  handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'GET_PAGE_INFO':
        sendResponse(this.getPageInfo());
        break;
      
      case 'GET_VIDEO_INFO':
        sendResponse(this.getVideoInfo());
        break;
      
      case 'HIGHLIGHT_RECORDING':
        this.showRecordingIndicator(message.show);
        sendResponse({ success: true });
        break;
      
      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  }

  getPageInfo() {
    return {
      title: document.title,
      url: window.location.href,
      domain: window.location.hostname,
      videoCount: this.videoElements.length
    };
  }

  getVideoInfo() {
    return this.videoElements.map((video, index) => ({
      index: index,
      src: video.src || video.currentSrc || '',
      duration: video.duration || 0,
      currentTime: video.currentTime || 0,
      paused: video.paused,
      muted: video.muted,
      volume: video.volume,
      width: video.videoWidth || video.clientWidth,
      height: video.videoHeight || video.clientHeight
    }));
  }

  notifyVideoStateChange(event, videoIndex) {
    // Check if extension context is valid before sending message
    if (!this.isExtensionContextValid()) {
      console.warn('Extension context invalid, cannot send video state change');
      return;
    }

    // Send video state change to background script
    chrome.runtime.sendMessage({
      type: 'VIDEO_STATE_CHANGE',
      event: event,
      videoIndex: videoIndex,
      pageInfo: this.getPageInfo(),
      videoInfo: this.getVideoInfo()[videoIndex]
    }).catch(error => {
      // Handle context invalidation specifically
      if (error.message.includes('Extension context invalidated')) {
        console.warn('Extension context invalidated during message sending');
        // Mark extension as invalid to prevent future attempts
        this.extensionContextValid = false;
      } else {
        // Background script might not be listening, which is fine
        console.log('Could not send video state change:', error.message);
      }
    });
  }

  showRecordingIndicator(show) {
    const indicatorId = 'transcription-recording-indicator';
    
    if (show) {
      // Create recording indicator if it doesn't exist
      if (!document.getElementById(indicatorId)) {
        const indicator = document.createElement('div');
        indicator.id = indicatorId;
        indicator.innerHTML = `
          <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: #d32f2f;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            font-weight: 500;
            z-index: 10000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            <div style="
              width: 8px;
              height: 8px;
              background: white;
              border-radius: 50%;
              animation: pulse 1.5s ease-in-out infinite;
            "></div>
            音声認識中
          </div>
          <style>
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          </style>
        `;
        document.body.appendChild(indicator);
      }
    } else {
      // Remove recording indicator
      const indicator = document.getElementById(indicatorId);
      if (indicator) {
        indicator.remove();
      }
    }
  }

  isExtensionContextValid() {
    // If we already know it's invalid, return false
    if (!this.extensionContextValid) {
      return false;
    }

    try {
      // Try to access chrome.runtime.id - this will throw if context is invalid
      if (!chrome.runtime || !chrome.runtime.id) {
        this.extensionContextValid = false;
        return false;
      }
      return true;
    } catch (error) {
      // Context is invalid
      this.extensionContextValid = false;
      console.warn('Extension context validation failed:', error.message);
      return false;
    }
  }

  destroy() {
    // Clean up when content script is destroyed
    if (this.observer) {
      this.observer.disconnect();
    }
    
    // Remove recording indicator
    this.showRecordingIndicator(false);
  }
}

// Initialize content script
let transcriptionContentScript;

try {
  // Check if chrome APIs are available before initializing
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
    transcriptionContentScript = new TranscriptionContentScript();
  } else {
    console.warn('Chrome extension APIs not available, skipping content script initialization');
  }
} catch (error) {
  if (error.message.includes('Extension context invalidated')) {
    console.warn('Extension context already invalidated during initialization');
  } else {
    console.error('Failed to initialize transcription content script:', error);
  }
}

// Clean up on beforeunload
window.addEventListener('beforeunload', () => {
  if (transcriptionContentScript) {
    transcriptionContentScript.destroy();
  }
});