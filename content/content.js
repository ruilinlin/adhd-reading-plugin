(function() {
  'use strict';

  // 检查是否已初始化
  if (window.ADHDReaderInitialized) {
    console.log('ADHD Reader already initialized, skipping...');
    return;
  }

  window.ADHDReaderInitialized = true;

  // 等待所有模块加载完成
  const initializeReader = () => {
    if (!window.ProofreadingMode || !window.ImmersiveMode || !window.ReaderMode || !window.ADHDUtils) {
      setTimeout(initializeReader, 100);
      return;
    }

    // 创建 ADHDReader 实例
    window.ADHDReader = {
      proofreadingMode: window.ProofreadingMode,
      immersiveMode: window.ImmersiveMode,
      readerMode: window.ReaderMode,

      init() {
        this.proofreadingMode.init();
        this.immersiveMode.init();
        this.readerMode.init();
      }
    };

    // 初始化
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => window.ADHDReader.init());
    } else {
      window.ADHDReader.init();
    }

    // 消息监听
    if (window.top === window) {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        try {
          switch (request.action) {
            case 'toggleImmersiveMode':
              window.ADHDReader.immersiveMode.toggle(request.enabled);
              sendResponse({ success: true });
              break;
            case 'toggleReaderMode':
              window.ADHDReader.readerMode.toggle(request.enabled);
              sendResponse({ success: true });
              break;
            case 'toggleProofreadingMode':
              window.ADHDReader.proofreadingMode.toggle(request.enabled);
              sendResponse({ success: true });
              break;
            default:
              sendResponse({ success: false, error: 'Unknown action' });
          }
        } catch (error) {
          console.error('Error:', error);
          sendResponse({ success: false, error: error.message });
        }
        return true;
      });
    }
  };

  initializeReader();
})();