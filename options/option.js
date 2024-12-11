document.getElementById("saveSettings").addEventListener("click", () => {
  const fontSize = document.getElementById("fontSize").value;
  const lineSpacing = document.getElementById("lineSpacing").value;

  chrome.storage.sync.set({ fontSize, lineSpacing }, () => {
    alert("Settings saved!");
  });
});
