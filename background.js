//后台脚本用于处理插件事件，例如安装、激活等。

chrome.runtime.onInstalled.addListener(() => {
  console.log("ADHD Reading Assistant installed!");
});