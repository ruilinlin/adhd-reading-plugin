let isScriptInjected = false;

document.getElementById('enableHighlight').addEventListener('click', async () => {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      const tab = tabs[0]; // Get the first tab in the array

      // Inject the content script
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/content.js'],
      }, () => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
        } else {
          console.log("Content script executed successfully");
          isHighlightEnabled = true; // Prevent repeated execution
        }
      });
    } else {
      console.error("No active tab found");
    }
  } catch (error) {
    console.error('Error querying tabs: ', error);
  }
});
