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

document.addEventListener("DOMContentLoaded", () => {
  const themesTab = document.getElementById("themes");
  if (themesTab) {
    loadHTML("themes", themesTab);
  }
});

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
    case "reader":
      htmlFile = "popup/tabs/reader.html";
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
          initializeThemeModes();
        }else if (tabName === "customies") {
          initializeCustmizeOptions();
        }})
      .catch(error => {
        console.error("Error loading HTML:", error);
        container.innerHTML = `<p>Error loading content.</p>`;
      });
  }



  function saveModeState(mode,state){
    const modeState = JSON.parse(localStorage.getItem("modeState")) || {};
    modeState[mode] = state;
    localStorage.setItem("modeState",JSON.stringify(modeState));
  }








  /**
   * theme mode initialization
   * including three modes:immersive mode, proofReading mode, reader mode
   * 
   * 
   * 
   * 
   */

  function initializeThemeModes() {
    // get mode state from local storage
    const modeState = JSON.parse(localStorage.getItem("modeState")) || {};



    
    // Immersive Mode initialization
    const immersiveModeToggle = document.getElementById("immersiveModeToggle");
  
    if (immersiveModeToggle) {
      immersiveModeToggle.checked = modeState.immersiveMode || false;

      immersiveModeToggle.addEventListener("change", async () => {
        try {
          // get current active tab and check if it is valid
          const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
          
          if (!await isValidTab(tab)) {
            // if not valid, set the toggle to false and alert the user
            console.warn('Cannot inject scripts into this type of page');
            immersiveModeToggle.checked = false;
            alert('This feature is not available on browser system pages.');
            return;
          }

          // if valid，inject the content script
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              function: () => {
                // check if the page is fully loaded
                if (document.readyState === 'complete') {
                  return window.hasOwnProperty('immersiveMode');
                }
                return false;
              }
            }).then(async (results) => {
              // 
              if (!results[0].result) {
                await chrome.scripting.executeScript({
                  target: { tabId: tab.id },
                  files: ['content/content.js']
                });
              }
              
              // send the toggle message to the content script
              chrome.tabs.sendMessage(tab.id, {
                action: "toggleImmersiveMode",
                enabled: immersiveModeToggle.checked
              }, (response) => {
                // if there is an error, set the toggle to false and alert the user
                if (chrome.runtime.lastError) {
                  console.error('Error:', chrome.runtime.lastError);
                  immersiveModeToggle.checked = false;
                  return;
                }
                saveModeState("immersiveMode", immersiveModeToggle.checked);
              });
            });
          } catch (error) {
            // if there is an error, set the toggle to false and alert the user
            console.error('Script injection error:', error);
            immersiveModeToggle.checked = false;
            alert('Unable to activate this feature on the current page.');
          }
        } catch (error) {
          console.error('Error:', error);
          immersiveModeToggle.checked = false;
        }
      });
    }
  




    // Reader Mode initialization
    const readerModeToggle = document.getElementById("readerModeToggle");
    const readerModeOptions = document.getElementById("readerModeOptions");
    
    if (readerModeToggle) {
      readerModeToggle.checked = modeState.readerMode || false;
      
      // toggle the options visibility
      toggleOptionsVisibility(readerModeToggle, "readerModeOptions");

      readerModeToggle.addEventListener("change", async () => {
        try {
          const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
/**
 * interface Tab {
 *  id?: number;           // 标签页的唯一标识符
 *  url?: string;          // 标签页的 URL
  * title?: string;        // 标签页的标题
  * active: boolean;       // 是否是当前活动的标签页
  * status?: string;       // 加载状态 ("loading" 或 "complete")
  * windowId: number;      // 所属窗口的 ID
}
*/

          if (!await isValidTab(tab)) {
            console.warn('Cannot inject scripts into this type of page');
            readerModeToggle.checked = false;
            alert('This feature is not available on browser system pages.');
            return;
          }

          // toggle the options visibility
          toggleOptionsVisibility(readerModeToggle, "readerModeOptions");

          chrome.tabs.sendMessage(tab.id, {
            action: "toggleReaderMode",
            enabled: readerModeToggle.checked
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('Error:', chrome.runtime.lastError);
              readerModeToggle.checked = false;
              return;
            }
            saveModeState("readerMode", readerModeToggle.checked);
          });
        } catch (error) {
          console.error('Error:', error);
          readerModeToggle.checked = false;
        }
      });

      // 初始化工具按钮
      const downloadBtn = document.getElementById("downloadPage");
      const copyLinkBtn = document.getElementById("copyLink");
      const annotationTools = document.querySelectorAll(".annotation-tool");

      if (downloadBtn) {
        downloadBtn.addEventListener("click", () => {
          chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {action: "downloadPage"});
          });
        });
      }

      if (copyLinkBtn) {
        copyLinkBtn.addEventListener("click", () => {
          chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {action: "copyLink"});
          });
        });
      }

      annotationTools.forEach(tool => {
        tool.addEventListener("click", () => {
          const type = tool.dataset.type;
          chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: "annotation",
              annotationType: type
            });
          });
        });
      });
    }
  






    // Proofreading Mode initialization
    // const proofReadingOptions = document.getElementById("proofReadingOptions");
    const proofReadingToggle = document.getElementById("proofReadingToggle");
    const focusHighlightToggle = document.getElementById("focusHighlightToggle");
    const gradientFlowToggle = document.getElementById("gradientFlowToggle");


    if (proofReadingToggle) {
      proofReadingToggle.addEventListener("change", () => {
        toggleOptionsVisibility(proofReadingToggle, "proofReadingOptions");
        saveModeState("proofReading", proofReadingToggle.checked);
      });
  
      // Initialize sub-features
      const features = ['focusHighlight', 'gradientFlow', 'smartKeywords'];
      features.forEach(feature => {
        const toggle = document.getElementById(`${feature}Toggle`);
        if (toggle) {
          toggle.addEventListener("change", () => {
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
              chrome.tabs.sendMessage(tabs[0].id, {
                action: "toggleProofreadingFeature",
                feature: feature,
                enabled: toggle.checked
              });
            });
            saveModeState(feature, toggle.checked);
          });
        }
      });
    } else {
      console.warn("Proofreading Toggle not found!");
    }
  
    // 初始化子功能区域 (仅当 Proofreading 打开时)
    if (proofReadingToggle && proofReadingToggle.checked) {
      if (focusHighlightToggle) {
        focusHighlightToggle.checked = modeState.focusHighlight || false;
        toggleOptionsVisibility(focusHighlightToggle, "focusHighLightOptions");
        focusHighlightToggle.addEventListener("change", () => {
          saveModeState("focusHighlight", focusHighlightToggle.checked);
          toggleOptionsVisibility(focusHighlightToggle, "focusHighLightOptions");
        });
      } else {
        console.warn("Focus Highlight Toggle not found!");
      }
  
      if (gradientFlowToggle) {
        gradientFlowToggle.checked = modeState.gradientFlow || false;
        toggleOptionsVisibility(gradientFlowToggle, "gradientFlowOptions");
        gradientFlowToggle.addEventListener("change", () => {
          saveModeState("gradientFlow", gradientFlowToggle.checked);
          toggleOptionsVisibility(gradientFlowToggle, "gradientFlowOptions");
        });
      } else {
        console.warn("Gradient Flow Toggle not found!");
      }
    }
  }
  



// helper functions set up

function initializeCustmizeOptions() {
  const modeState = JSON.parse(localStorage.getItem("modeState")) || {};

  if (modeState.focusHighlight) {
      focusHighLightOptions.classList.remove("hidden");
    } else {
      focusHighLightOptions.classList.add("hidden");
    }
  

  if (modeState.gradientFlow) {
      gradientFlowOptions.classList.remove("hidden");
    } else {
      gradientFlowOptions.classList.add("hidden");
  }
}

function toggleOptionsVisibility(toggle, optionsId) {
  const options = document.getElementById(optionsId);
  if (options) {
    if (toggle.checked) {
      options.classList.remove("hidden");
    } else {
      options.classList.add("hidden");
    }
  } else {
    console.warn(`Options element with ID "${optionsId}" not found!`);
  }
}
}

//
async function isValidTab(tab) {
// 1. 未找到标签页
if (!tab) {
  console.warn('No active tab found');
  return false;
}

// 2. 标签页 URL 不可访问
if (!tab.url) {
  console.warn('Cannot access tab URL');
  return false;
}

// 3. 特殊协议页面
if (tab.url.startsWith('chrome:')) {
  console.warn('Cannot modify browser internal pages');
  return false;
}
  
  // check if the tab is a special page
  const invalidProtocols = [
    'chrome:',  // chrome://  Chrome 浏览器内部页面
    'chrome-extension:',  // chrome-extension://  Chrome 扩展程序页面
    'edge:',  // edge://  Edge 浏览器内部页面
    'about:',  // about://  Chrome 浏览器内部页面
    'data:'  // data://  Chrome 浏览器内部页面  
  ];
  return !invalidProtocols.some(protocol => tab.url.startsWith(protocol));
}









// function toogleOptionsVisiblityForMode(mode, toggle, optionsId) {
//   const modeState = JSON.parse(localStorage.getItem("modeState")) || {};
//   if (modeState[mode]) {
//     const options = document.getElementById(optionsId);
//     if (options) {
//       options.classList.remove("hidden");
//     } else {
//       console.warn(`Options element with ID "${optionsId}" not found!`);
//     }
//   }
// }




//   function focusHighLightToggle(){
//     const focusHighLightToggle = document.getElementById("focusHighLightToggle");
//     const focusHighLightOptions = document.getElementById("focusHighLightOptions");

//     if (focusHighLightToggle) {
//       focusHighLightToggle.addEventListener("change", () => {
//         if (focusHighLightToggle.checked) {
//           focusHighLightOptions.classList.remove("hidden");
//         } else {
//           focusHighLightOptions.classList.add("hidden");
//         }
//       });
//     } else {
//       console.error("Focus highlight toggle not found!");
//   }
// }

  // function focusHighLightToggle() {
  //   const focusHighLightToggle = document.getElementById("focusHighlightToggle");
  //   if (focusHighLightToggle) {
  //     focusHighLightToggle.addEventListener("change", () => {
  //       focusHighlightState.enabled = focusHighLightToggle.checked;
  //       console.log("Focus Highlight State:", focusHighlightState.enabled);
  //     });
  //   } else {
  //     console.error("Focus highlight toggle not found!");
  //   }
  // }

//   function gradientFlowToggle(){
//     const gradientFlowToggle = document.getElementById("gradientFlowToggle");
//     const gradientFlowOptions = document.getElementById("gradientFlowOptions");

//     if (gradientFlowToggle) {
//       gradientFlowToggle.addEventListener("change", () => {
//         if (gradientFlowToggle.checked) {
//           gradientFlowOptions.classList.remove("hidden");
//         } else {
//           gradientFlowOptions.classList.add("hidden");
//         }
//       });
//     } else {
//       console.error("Gradient flow toggle not found!");
//   }
// }

// function gradientFlowToggle() {
//   const gradientFlowToggle = document.getElementById("gradientFlowToggle");
//   if (gradientFlowToggle) {
//     gradientFlowToggle.addEventListener("change", () => {
//       gradientFlowState.enabled = gradientFlowToggle.checked;
//       console.log("Gradient Flow State:", gradientFlowState.enabled);
//     });
//   } else {
//     console.error("Gradient flow toggle not found!");
//   }
// }

  // // proofReadingToggle 逻辑
  // function proofReadingToggle (){
  //   const proofReadingToggle = document.getElementById("proofReadingToggle");
  //   const proofReadingOptions = document.getElementById("proofReadingOptions");

  //   if (proofReadingToggle) {
  //     proofReadingToggle.addEventListener("change", () => {
  //       if (proofReadingToggle.checked) {
  //         proofReadingOptions.classList.remove("hidden");
  //       } else {
  //         proofReadingOptions.classList.add("hidden");
  //       }
  //     });
  //   } else {
  //     console.error("Proofreading toggle not found!");
  //   }
  // }

