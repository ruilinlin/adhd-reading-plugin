const ADHDUtils = {
  saveToStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  loadFromStorage(key, defaultValue = null) {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  },

  createElementWithStyles(tag, styles) {
    const element = document.createElement(tag);
    Object.assign(element.style, styles);
    return element;
  }
};

window.ADHDUtils = ADHDUtils; 