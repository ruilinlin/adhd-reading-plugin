window.ReaderMode = {
  container: null,
  isActive: false,
  annotations: [],
  selectedAnnotation: null,
  annotationColors: [
    { name: 'yellow', value: 'rgba(255, 255, 0, 0.3)' },
    { name: 'green', value: 'rgba(0, 255, 0, 0.3)' },
    { name: 'blue', value: 'rgba(0, 191, 255, 0.3)' },
    { name: 'pink', value: 'rgba(255, 192, 203, 0.3)' },
    { name: 'purple', value: 'rgba(147, 112, 219, 0.3)' }
  ],
  currentColor: 'yellow',

  init() {
    if (!this.container) {
      this.createReaderContainer();
      this.loadAnnotations();
    }
  },

  createReaderContainer() {
    this.container = createElementWithStyles('div', {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: '#fff',
      zIndex: '2147483646',
      overflowY: 'auto',
      display: 'none',
      opacity: '0',
      transition: 'opacity 0.3s ease',
      padding: '2rem',
      boxSizing: 'border-box'
    });

    const toolbar = this.createToolbar();
    this.container.appendChild(toolbar);

    const content = createElementWithStyles('div', {
      maxWidth: '800px',
      margin: '0 auto',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      lineHeight: '1.6',
      fontSize: '18px',
      color: '#333'
    });
    content.id = 'adhd-reader-content';
    this.container.appendChild(content);

    document.body.appendChild(this.container);
  },

  createToolbar() {
    const toolbar = createElementWithStyles('div', {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      height: '50px',
      backgroundColor: '#f5f5f5',
      borderBottom: '1px solid #ddd',
      display: 'flex',
      alignItems: 'center',
      padding: '0 1rem',
      gap: '1rem',
      zIndex: '2147483647'
    });

    const buttons = [
      { icon: '↩', action: this.close.bind(this), title: 'Exit Reader Mode' },
      { icon: '💾', action: this.savePage.bind(this), title: 'Save Page' },
      { icon: '🔗', action: this.copyLink.bind(this), title: 'Copy Link' },
      { icon: '📝', action: this.toggleAnnotationPanel.bind(this), title: 'Show Annotations' }
    ];

    buttons.forEach(btn => {
      const button = this.createToolbarButton(btn);
      toolbar.appendChild(button);
    });

    const colorPicker = this.createColorPicker();
    toolbar.appendChild(colorPicker);

    return toolbar;
  },

  createToolbarButton({ icon, action, title }) {
    const button = createElementWithStyles('button', {
      padding: '5px 10px',
      border: 'none',
      borderRadius: '4px',
      backgroundColor: '#fff',
      cursor: 'pointer',
      fontSize: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '5px'
    });
    button.title = title;
    button.textContent = icon;
    button.addEventListener('click', action);
    return button;
  },

  createColorPicker() {
    const container = createElementWithStyles('div', {
      display: 'flex',
      gap: '5px',
      padding: '5px',
      borderRadius: '4px',
      backgroundColor: '#fff'
    });

    this.annotationColors.forEach(color => {
      const colorBtn = createElementWithStyles('button', {
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        border: `2px solid ${color.value}`,
        backgroundColor: color.value,
        cursor: 'pointer',
        transition: 'transform 0.2s'
      });
      colorBtn.title = `Highlight in ${color.name}`;
      colorBtn.addEventListener('click', () => {
        this.currentColor = color.name;
        this.updateColorPickerUI();
      });
      container.appendChild(colorBtn);
    });

    return container;
  },

  extractContent() {
    const content = document.getElementById('adhd-reader-content');
    if (!content) return;

    content.innerHTML = '';

    // 使用 Readability 解析页面
    const documentClone = document.cloneNode(true);
    const article = new Readability(documentClone).parse();

    if (article) {
      const articleContent = this.cleanContent(article.content);
      content.innerHTML = articleContent;

      // 添加标题
      if (article.title) {
        const title = document.createElement('h1');
        title.textContent = article.title;
        content.insertBefore(title, content.firstChild);
      }
    }
  },

  cleanContent(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // 移除不需要的元素
    const selectorsToRemove = [
      'script', 'style', 'iframe', 'form', 'button', 'input', 'textarea',
      '[class*="ads"]', '[id*="ads"]', '[class*="social"]', '[id*="social"]'
    ];
    selectorsToRemove.forEach(selector => {
      tempDiv.querySelectorAll(selector).forEach(el => el.remove());
    });

    // 清理链接
    tempDiv.querySelectorAll('a').forEach(a => {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    });

    // 优化图片
    tempDiv.querySelectorAll('img').forEach(img => {
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.loading = 'lazy';
    });

    return tempDiv.innerHTML;
  },

  toggle(enabled) {
    this.isActive = enabled;
    
    if (!this.container) {
      this.init();
    }

    if (enabled) {
      this.extractContent();
      this.container.style.display = 'block';
      requestAnimationFrame(() => {
        this.container.style.opacity = '1';
      });
    } else {
      this.container.style.opacity = '0';
      setTimeout(() => {
        this.container.style.display = 'none';
      }, 300);
    }
  },

  close() {
    this.toggle(false);
  },

  savePage() {
    const content = document.getElementById('adhd-reader-content');
    if (!content) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${document.title}</title>
          <style>
            body {
              max-width: 800px;
              margin: 0 auto;
              padding: 2rem;
              font-family: system-ui, -apple-system, sans-serif;
              line-height: 1.6;
              font-size: 18px;
              color: #333;
            }
            img {
              max-width: 100%;
              height: auto;
            }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${document.title.replace(/[^a-z0-9]/gi, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  },

  copyLink() {
    navigator.clipboard.writeText(window.location.href)
      .then(() => {
        // 可以添加一个提示
        console.log('Link copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy link:', err);
      });
  },

  addAnnotation(type, text, note = '', color = 'yellow') {
    const annotation = {
      id: Date.now().toString(),
      type,
      text,
      note,
      color,
      timestamp: new Date().toISOString(),
      tags: []
    };

    this.annotations.push(annotation);
    this.saveAnnotations();
    this.updateAnnotationPanel();
    return annotation;
  },

  saveAnnotations() {
    saveToStorage(`annotations-${window.location.href}`, this.annotations);
  },

  loadAnnotations() {
    const saved = loadFromStorage(`annotations-${window.location.href}`);
    if (saved) {
      this.annotations = saved;
      this.updateAnnotationPanel();
    }
  },

  cleanup() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.isActive = false;
  }
}; 