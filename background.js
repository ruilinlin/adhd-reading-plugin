//后台脚本用于处理插件事件，例如安装、激活等。

chrome.runtime.onInstalled.addListener(() => {
  console.log("ADHD Reading Assistant installed!");
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    // 检查是否是有效的标签页
    if (!await isValidTab(tab)) {
      return;
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: () => window.hasOwnProperty('immersiveMode')
      }).then(async (results) => {
        if (!results[0].result) {
          await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content/content.js']
          });
        }
      });
    } catch (error) {
      console.error('Error injecting content script:', error);
    }
  }
});

async function isValidTab(tab) {
  if (!tab || !tab.url) return false;
  
  const invalidProtocols = ['chrome:', 'chrome-extension:', 'edge:', 'about:', 'data:'];
  return !invalidProtocols.some(protocol => tab.url.startsWith(protocol));
}