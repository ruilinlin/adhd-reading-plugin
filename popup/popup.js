// let isScriptInjected = false;

// document.getElementById('enableHighlight').addEventListener('click', async () => {
//   try {
//     const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
//     if (tabs.length > 0) {
//       const tab = tabs[0]; // Get the first tab in the array

//       // Inject the content script
//       chrome.scripting.executeScript({
//         target: { tabId: tab.id },
//         files: ['content/content.js'],
//       }, () => {
//         if (chrome.runtime.lastError) {
//           console.error(chrome.runtime.lastError.message);
//         } else {
//           console.log("Content script executed successfully");
//           isHighlightEnabled = true; // Prevent repeated execution
//         }
//       });
//     } else {
//       console.error("No active tab found");
//     }
//   } catch (error) {
//     console.error('Error querying tabs: ', error);
//   }
// });


/** tab 功能切换逻辑 */
document.addEventListener("DOMContentLoaded", () => {
  // Tab 切换逻辑
  const tabs = document.querySelectorAll(".tab-link");
  const panels = document.querySelectorAll(".tab-panel");


  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      // 移除所有 active 样式
      tabs.forEach(t => t.classList.remove("active"));
      panels.forEach(panel => panel.classList.remove("active"));

      // 激活当前 Tab 和 Panel
      tab.classList.add("active");
      const activePanel = document.getElementById(tab.dataset.tab);
      activePanel.classList.add("active");

      // 根据需要加载对应的 HTML 文件
      loadHTML(tab.dataset.tab, activePanel);
    });
  });

  // 初始加载 themes.html
  loadHTML("themes", document.getElementById("themes"));
});

// 动态加载 HTML 文件的函数
function loadHTML(tabName, container) {
  let htmlFile = "";
  switch (tabName) {
    case "themes":
      htmlFile = "popup/tabs/themes.html";
      break;
    case "settings":
      htmlFile = "popup/tabs/settings.html";
      break;
    case "customies":
      htmlFile = "popup/tabs/customies.html";
      break;
  }

  // 使用 fetch API 获取 HTML 文件内容
  if (htmlFile) {
    const fileURL = chrome.runtime.getURL(htmlFile); // 获取内部路径
    fetch(fileURL)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load ${htmlFile}`);
        }
        return response.text();
      })
      .then(data => {
        container.innerHTML = data;
        // 在内容加载完成后调用 proofReadingToggle
        if (tabName === "themes") {
          proofReadingToggle();
        }
      })
      .catch(error => {
        console.error("Error loading HTML:", error);
        container.innerHTML = `<p>Error loading content.</p>`;
      });
  }

  // proofReadingToggle 逻辑
  function proofReadingToggle (){
    const proofReadingToggle = document.getElementById("proofReadingToggle");
    const proofReadingOptions = document.getElementById("proofReadingOptions");

    if (proofReadingToggle) {
      proofReadingToggle.addEventListener("change", () => {
        if (proofReadingToggle.checked) {
          proofReadingOptions.classList.remove("hidden");
        } else {
          proofReadingOptions.classList.add("hidden");
        }
      });
    } else {
      console.error("Proofreading toggle not found!");
    }
  }

}

