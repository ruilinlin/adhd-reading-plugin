// // 执行保护：确保脚本只运行一次
// if (window.hasADHDReaderRun) return;
// window.hasADHDReaderRun = true;

// 全局检查，确保脚本只执行一次
if (window.ADHDReaderInitialized) {
  console.log('ADHD Reader already initialized, skipping...');
} else {
  // 标记初始化状态
  window.ADHDReaderInitialized = true;

  // 创建一个全局命名空间
  window.ADHDReader = (() => {
    'use strict';

    // ======================= 核心功能模块 =======================
    const TextProcessor = {
      // 文本样式处理
      applyStyleToText(root) {
        const nodes = root.querySelectorAll('*');
        nodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim() !== '') {
            const parent = node.parentNode;
            if (!parent) return;

            try {
              const computedStyle = window.getComputedStyle(parent);
              if (computedStyle.color !== 'rgb(0, 0, 0)') {
                parent.style.color = 'black';
              }
            } catch (e) {
              console.warn('Style processing failed for node:', parent);
            }
          }
        });

        // 处理 Google Docs 等 iframe 内容
        this.processIframes();
      },

      // 处理嵌套 iframe
      processIframes() {
        document.querySelectorAll('iframe').forEach(iframe => {
          try {
            if (iframe.contentDocument && iframe.contentDocument.body) {
              this.applyStyleToText(iframe.contentDocument.body);
            }
          } catch (e) {
            console.warn('Cannot access iframe content:', e);
          }
        });
      },

      // 首字母高亮
      highlightFirstLetters(style) {
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );

        while (walker.nextNode()) {
          const node = walker.currentNode;
          if (!node.nodeValue.trim()) continue;

          const words = node.nodeValue.split(/\s+/);
          const fragment = document.createDocumentFragment();

          words.forEach((word, index) => {
            if (!word) return;

            const container = document.createElement('span');
            
            // 首字母
            const firstLetter = document.createElement('span');
            firstLetter.style.cssText = style;
            firstLetter.textContent = word[0] || '';
            
            // 剩余文字
            const rest = document.createTextNode(word.slice(1));
            
            container.appendChild(firstLetter);
            container.appendChild(rest);
            fragment.appendChild(container);

            // 添加空格
            if (index < words.length - 1) {
              fragment.appendChild(document.createTextNode(' '));
            }
          });

          // 安全替换节点
          if (node.parentNode) {
            node.parentNode.replaceChild(fragment, node);
          }
        }
      }
    };

    // ======================= 沉浸模式模块 =======================
    const ImmersiveMode = {
      overlay: null,
      highlightArea: null,
      isActive: false,
      isResizing: false,
      resizeDirection: null,
      startX: 0,
      startY: 0,
      startWidth: 0,
      startHeight: 0,

      createOverlay() {
        // 移除任何已存在的遮罩
        const existing = document.getElementById('immersive-overlay');
        if (existing) existing.remove();

        // 创建新的遮罩层
        this.overlay = document.createElement('div');
        this.overlay.id = 'immersive-overlay';
        this.overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: linear-gradient(to bottom, 
            rgba(0, 0, 0, 0.85) 0%,
            rgba(0, 0, 0, 0.6) 30%,
            rgba(0, 0, 0, 0.3) 45%,
            rgba(0, 0, 0, 0) 48%,
            rgba(0, 0, 0, 0) 52%,
            rgba(0, 0, 0, 0.3) 55%,
            rgba(0, 0, 0, 0.6) 70%,
            rgba(0, 0, 0, 0.85) 100%
          );
          z-index: 2147483647;
          pointer-events: none;
          display: none;
          backdrop-filter: blur(2px);
          -webkit-backdrop-filter: blur(2px);
          transition: opacity 0.3s ease;
        `;

        // 创建高亮区域
        this.highlightArea = document.createElement('div');
        this.highlightArea.id = 'highlight-area';
        this.highlightArea.style.cssText = `
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          width: min(90%, 800px);
          height: 160px;
          background: radial-gradient(
            ellipse at center,
            rgba(255, 255, 255, 0.1) 0%,
            rgba(255, 255, 255, 0.05) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          box-shadow: 
            0 0 100px 20px rgba(255, 255, 255, 0.15),
            0 0 40px 10px rgba(255, 255, 255, 0.1);
          pointer-events: auto;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 100px;
          cursor: move;
        `;

        this.addResizeHandles();
        this.overlay.appendChild(this.highlightArea);
        document.documentElement.appendChild(this.overlay);
      },

      addResizeHandles() {
        const directions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
        
        directions.forEach(dir => {
          const handle = document.createElement('div');
          handle.className = `resize-handle ${dir}`;
          handle.style.cssText = `
            position: absolute;
            width: 15px;
            height: 15px;
            background: white;
            border-radius: 50%;
            border: 2px solid rgba(0, 0, 0, 0.5);
            cursor: ${dir.includes('top') ? 'n' : 's'}${dir.includes('left') ? 'w' : 'e'}-resize;
            z-index: 1;
          `;

          if (dir.includes('top')) handle.style.top = '-8px';
          if (dir.includes('bottom')) handle.style.bottom = '-8px';
          if (dir.includes('left')) handle.style.left = '-8px';
          if (dir.includes('right')) handle.style.right = '-8px';

          handle.addEventListener('mousedown', (e) => this.startResize(e, dir));
          this.highlightArea.appendChild(handle);
        });

        // 添加拖动功能
        this.highlightArea.addEventListener('mousedown', this.startDrag.bind(this));
      },

      startResize(e, direction) {
        e.preventDefault();
        e.stopPropagation(); // 防止触发拖动
        this.isResizing = true;
        this.resizeDirection = direction;
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.startWidth = this.highlightArea.offsetWidth;
        this.startHeight = this.highlightArea.offsetHeight;

        document.addEventListener('mousemove', this.resize);
        document.addEventListener('mouseup', this.stopResize);
      },

      resize: (e) => {
        if (!ImmersiveMode.isResizing) return;

        const dx = e.clientX - ImmersiveMode.startX;
        const dy = e.clientY - ImmersiveMode.startY;
        const minWidth = 200;
        const minHeight = 100;
        const maxWidth = window.innerWidth * 0.9;
        const maxHeight = window.innerHeight * 0.8;

        let newWidth, newHeight;

        if (ImmersiveMode.resizeDirection.includes('right')) {
          newWidth = Math.min(Math.max(ImmersiveMode.startWidth + dx, minWidth), maxWidth);
          ImmersiveMode.highlightArea.style.width = `${newWidth}px`;
        }
        if (ImmersiveMode.resizeDirection.includes('bottom')) {
          newHeight = Math.min(Math.max(ImmersiveMode.startHeight + dy, minHeight), maxHeight);
          ImmersiveMode.highlightArea.style.height = `${newHeight}px`;
        }
        if (ImmersiveMode.resizeDirection.includes('left')) {
          newWidth = Math.min(Math.max(ImmersiveMode.startWidth - dx, minWidth), maxWidth);
          ImmersiveMode.highlightArea.style.width = `${newWidth}px`;
        }
        if (ImmersiveMode.resizeDirection.includes('top')) {
          newHeight = Math.min(Math.max(ImmersiveMode.startHeight - dy, minHeight), maxHeight);
          ImmersiveMode.highlightArea.style.height = `${newHeight}px`;
        }
      },

      stopResize: () => {
        ImmersiveMode.isResizing = false;
        document.removeEventListener('mousemove', ImmersiveMode.resize);
        document.removeEventListener('mouseup', ImmersiveMode.stopResize);
      },

      startDrag(e) {
        if (e.target !== this.highlightArea) return; // 如果点击的是调整手柄，不启动拖动

        const rect = this.highlightArea.getBoundingClientRect();
        this.startX = e.clientX - rect.left;
        this.startY = e.clientY - rect.top;

        document.addEventListener('mousemove', this.drag.bind(this));
        document.addEventListener('mouseup', this.stopDrag.bind(this));
      },

      drag(e) {
        if (this.isResizing) return;

        const x = e.clientX - this.startX;
        const y = e.clientY - this.startY;

        // 限制拖动范围
        const maxX = window.innerWidth - this.highlightArea.offsetWidth;
        const maxY = window.innerHeight - this.highlightArea.offsetHeight;

        this.highlightArea.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
        this.highlightArea.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
        this.highlightArea.style.transform = 'none'; // 移除默认的居中transform
      },

      stopDrag() {
        document.removeEventListener('mousemove', this.drag.bind(this));
        document.removeEventListener('mouseup', this.stopDrag.bind(this));
      },

      toggle(enabled) {
        console.log('Toggling immersive mode:', enabled);
        this.isActive = enabled;
        
        if (!this.overlay) {
          this.init();
        }
        
        if (this.overlay) {
          this.overlay.style.display = 'block';
          setTimeout(() => {
            this.overlay.style.opacity = enabled ? '1' : '0';
          }, 0);
          
          if (!enabled) {
            setTimeout(() => {
              if (!this.isActive) {
                this.overlay.style.display = 'none';
              }
            }, 300);
          }
        }
      },

      init() {
        if (!this.overlay) {
          this.createOverlay();
        }
      }
    };

    // ======================= 阅读模式模块 =======================
    const ReaderMode = {
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
        }
      },

      createReaderContainer() {
        // 创建隔离的 DOM 容器
        this.container = document.createElement('div');
        this.container.id = 'adhd-reader-container';
        this.container.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: #fff;
          z-index: 2147483646;
          overflow-y: auto;
          display: none;
          opacity: 0;
          transition: opacity 0.3s ease;
          padding: 2rem;
          box-sizing: border-box;
        `;

        const toolbar = this.createToolbar();
        this.container.appendChild(toolbar);

        // 创建内容容器
        const content = document.createElement('div');
        content.id = 'adhd-reader-content';
        content.style.cssText = `
          max-width: 800px;
          margin: 0 auto;
          font-family: system-ui, -apple-system, sans-serif;
          line-height: 1.6;
          font-size: 18px;
          color: #333;
        `;
        this.container.appendChild(content);

        document.body.appendChild(this.container);
      },

      createToolbar() {
        const toolbar = document.createElement('div');
        toolbar.id = 'adhd-reader-toolbar';
        toolbar.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 50px;
          background: #f5f5f5;
          border-bottom: 1px solid #ddd;
          display: flex;
          align-items: center;
          padding: 0 1rem;
          gap: 1rem;
          z-index: 2147483647;
        `;

        // 添加工具栏按钮
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

        // 添加颜色选择器
        const colorPicker = this.createColorPicker();
        toolbar.appendChild(colorPicker);

        return toolbar;
      },

      createToolbarButton(btn) {
        const button = document.createElement('button');
        button.innerHTML = btn.icon;
        button.title = btn.title;
        button.style.cssText = `
          padding: 5px 10px;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 16px;
          border-radius: 4px;
          &:hover {
            background: #e0e0e0;
          }
        `;
        button.addEventListener('click', btn.action);
        return button;
      },

      createColorPicker() {
        const container = document.createElement('div');
        container.className = 'color-picker';
        container.style.cssText = `
          display: flex;
          gap: 5px;
          padding: 5px;
          border-radius: 4px;
          background: #fff;
        `;

        this.annotationColors.forEach(color => {
          const colorBtn = document.createElement('button');
          colorBtn.style.cssText = `
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 2px solid ${color.value};
            background: ${color.value};
            cursor: pointer;
            transition: transform 0.2s;
          `;
          colorBtn.title = `Highlight in ${color.name}`;
          colorBtn.addEventListener('click', () => {
            this.currentColor = color.name;
            this.updateColorPickerUI();
          });
          container.appendChild(colorBtn);
        });

        return container;
      },

      createAnnotationPanel() {
        const panel = document.createElement('div');
        panel.id = 'adhd-annotation-panel';
        panel.style.cssText = `
          position: fixed;
          right: -300px;
          top: 50px;
          bottom: 0;
          width: 300px;
          background: #fff;
          box-shadow: -2px 0 5px rgba(0,0,0,0.1);
          transition: right 0.3s ease;
          padding: 1rem;
          overflow-y: auto;
          z-index: 2147483646;
        `;

        const header = document.createElement('div');
        header.innerHTML = '<h2>Annotations</h2>';
        panel.appendChild(header);

        const annotationList = document.createElement('div');
        annotationList.id = 'annotation-list';
        panel.appendChild(annotationList);

        return panel;
      },

      addAnnotation(type, text, note = '', color = this.currentColor) {
        const annotation = {
          id: Date.now(),
          type,
          text,
          note,
          color,
          timestamp: new Date().toISOString(),
          tags: []
        };
        
        this.annotations.push(annotation);
        this.updateAnnotationPanel();
        this.saveAnnotations();
        return annotation;
      },

      createAnnotationElement(annotation) {
        const el = document.createElement('div');
        el.className = 'annotation-item';
        el.dataset.id = annotation.id;
        el.style.cssText = `
          margin-bottom: 1rem;
          padding: 1rem;
          background: #f5f5f5;
          border-radius: 4px;
          border-left: 4px solid ${this.annotationColors.find(c => c.name === annotation.color)?.value};
        `;

        el.innerHTML = `
          <div class="annotation-text" style="margin-bottom: 0.5rem;">
            "${annotation.text}"
          </div>
          ${annotation.note ? `
            <div class="annotation-note" style="color: #666; font-style: italic;">
              ${annotation.note}
            </div>
          ` : ''}
          <div class="annotation-meta" style="font-size: 0.8em; color: #999; margin-top: 0.5rem;">
            ${new Date(annotation.timestamp).toLocaleString()}
          </div>
          <div class="annotation-actions" style="margin-top: 0.5rem;">
            <button class="edit-btn">Edit</button>
            <button class="delete-btn">Delete</button>
            <button class="tag-btn">Add Tag</button>
          </div>
        `;

        // 添加事件监听器
        el.querySelector('.edit-btn').addEventListener('click', () => this.editAnnotation(annotation.id));
        el.querySelector('.delete-btn').addEventListener('click', () => this.deleteAnnotation(annotation.id));
        el.querySelector('.tag-btn').addEventListener('click', () => this.addTag(annotation.id));

        return el;
      },

      editAnnotation(id) {
        const annotation = this.annotations.find(a => a.id === id);
        if (!annotation) return;

        const note = prompt('Edit note:', annotation.note);
        if (note !== null) {
          annotation.note = note;
          this.updateAnnotationPanel();
          this.saveAnnotations();
        }
      },

      deleteAnnotation(id) {
        if (!confirm('Are you sure you want to delete this annotation?')) return;

        const index = this.annotations.findIndex(a => a.id === id);
        if (index > -1) {
          this.annotations.splice(index, 1);
          this.updateAnnotationPanel();
          this.saveAnnotations();

          // 移除高亮
          const highlight = document.querySelector(`[data-annotation-id="${id}"]`);
          if (highlight) {
            const parent = highlight.parentNode;
            parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
          }
        }
      },

      addTag(id) {
        const annotation = this.annotations.find(a => a.id === id);
        if (!annotation) return;

        const tag = prompt('Add tag:');
        if (tag && tag.trim()) {
          if (!annotation.tags) annotation.tags = [];
          annotation.tags.push(tag.trim());
          this.updateAnnotationPanel();
          this.saveAnnotations();
        }
      },

      toggleAnnotationPanel() {
        const panel = document.getElementById('adhd-annotation-panel');
        if (panel) {
          panel.style.right = panel.style.right === '0px' ? '-300px' : '0px';
        }
      },

      updateAnnotationPanel() {
        const list = document.getElementById('annotation-list');
        if (!list) return;

        list.innerHTML = '';
        this.annotations
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .forEach(annotation => {
            list.appendChild(this.createAnnotationElement(annotation));
          });
      },

      saveAnnotations() {
        localStorage.setItem(`annotations-${window.location.href}`, JSON.stringify(this.annotations));
      },

      loadAnnotations() {
        const saved = localStorage.getItem(`annotations-${window.location.href}`);
        if (saved) {
          this.annotations = JSON.parse(saved);
          this.updateAnnotationPanel();
        }
      },

      // 修改现有的高亮方法
      toggleHighlight() {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const text = range.toString().trim();
        if (!text) return;

        const span = document.createElement('span');
        const annotation = this.addAnnotation('highlight', text, '', this.currentColor);
        
        span.className = 'adhd-highlight';
        span.dataset.annotationId = annotation.id;
        span.style.backgroundColor = this.annotationColors.find(c => c.name === this.currentColor)?.value;
        span.style.cursor = 'pointer';
        
        span.addEventListener('click', (e) => {
          if (this.selectedAnnotation === annotation.id) {
            const note = prompt('Add or edit note:', annotation.note);
            if (note !== null) {
              annotation.note = note;
              this.updateAnnotationPanel();
              this.saveAnnotations();
            }
            this.selectedAnnotation = null;
          } else {
            this.selectedAnnotation = annotation.id;
          }
        });

        range.surroundContents(span);
        selection.removeAllRanges();
      },

      extractContent() {
        const content = document.getElementById('adhd-reader-content');
        if (!content) return;

        // 清空现有内容
        content.innerHTML = '';

        // 获取页面主要内容
        const mainContent = this.findMainContent();
        if (!mainContent) return;

        // 创建文章标题
        const title = document.createElement('h1');
        title.textContent = document.title;
        content.appendChild(title);

        // 复制并清理内容
        const cleanedContent = this.cleanAndCloneContent(mainContent);
        content.appendChild(cleanedContent);
      },

      findMainContent() {
        // 尝试找到主要内容区域
        const selectors = [
          'article',
          '[role="main"]',
          'main',
          '.main-content',
          '#main-content',
          '.post-content',
          '.article-content',
          '.content'
        ];

        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element) return element;
        }

        // 如果找不到特定标记，使用启发式方法
        return this.findContentHeuristically();
      },

      findContentHeuristically() {
        // 获取所有段落
        const paragraphs = document.getElementsByTagName('p');
        if (paragraphs.length === 0) return null;

        // 找到包含最多文本内容的容器
        let bestContainer = null;
        let maxTextLength = 0;

        for (const p of paragraphs) {
          let container = p.parentElement;
          let textLength = 0;
          const pElements = container.getElementsByTagName('p');
          
          for (const p of pElements) {
            textLength += p.textContent.trim().length;
          }

          if (textLength > maxTextLength) {
            maxTextLength = textLength;
            bestContainer = container;
          }
        }

        return bestContainer;
      },

      cleanAndCloneContent(element) {
        // 创建深度克隆
        const clone = element.cloneNode(true);

        // 移除不需要的元素
        const unwantedSelectors = [
          'script',
          'style',
          'iframe',
          'nav',
          'header',
          'footer',
          'aside',
          '.ad',
          '.advertisement',
          '.social-share',
          '.comments',
          '[role="complementary"]'
        ];

        unwantedSelectors.forEach(selector => {
          clone.querySelectorAll(selector).forEach(el => el.remove());
        });

        // 清理属性
        this.cleanAttributes(clone);

        // 优化图片
        clone.querySelectorAll('img').forEach(img => {
          img.style.maxWidth = '100%';
          img.style.height = 'auto';
          img.loading = 'lazy';
          // 保留原始图片链接
          img.dataset.originalSrc = img.src;
        });

        // 保留链接但移除点击事件
        clone.querySelectorAll('a').forEach(a => {
          a.dataset.originalHref = a.href;
          a.removeAttribute('onclick');
          a.removeAttribute('target');
          a.style.color = 'inherit';
          a.style.textDecoration = 'underline';
        });

        return clone;
      },

      cleanAttributes(element) {
        // 保留的属性白名单
        const allowedAttributes = ['src', 'href', 'alt', 'title'];
        
        const clean = (el) => {
          const attrs = el.attributes;
          for (let i = attrs.length - 1; i >= 0; i--) {
            const attr = attrs[i];
            if (!allowedAttributes.includes(attr.name)) {
              el.removeAttribute(attr.name);
            }
          }
          
          // 递归清理子元素
          el.childNodes.forEach(child => {
            if (child.nodeType === 1) { // 元素节点
              clean(child);
            }
          });
        };

        clean(element);
        return element;
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

      async savePage() {
        const content = this.container.innerHTML;
        const blob = new Blob([content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'page.html';
        a.click();
        
        URL.revokeObjectURL(url);
      },

      async copyLink() {
        const url = new URL(window.location.href);
        url.searchParams.set('reader', 'true');
        await navigator.clipboard.writeText(url.toString());
        alert('Link copied to clipboard!');
      },

      close() {
        this.toggle(false);
      }
    };

    // ======================= 初始化逻辑 =======================
    function initialize() {
      try {
        // 初始化文本处理
        TextProcessor.applyStyleToText(document.body);
        
        // 初始化首字母高亮
        if (!window.__highlightInitialized) {
          window.__highlightInitialized = true;
          TextProcessor.highlightFirstLetters(`
            color: #ff0000;
            font-weight: 700;
            text-shadow: 0 0 2px rgba(255,0,0,0.3);
          `);
        }

        // 初始化沉浸模式
        ImmersiveMode.init();

        // 初始化阅读模式
        ReaderMode.init();

      } catch (error) {
        console.error('ADHD Reader初始化失败:', error);
      }
    }

    // ======================= 启动逻辑 =======================
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initialize);
    } else {
      initialize();
    }

    // ======================= 返回公共API =======================
    return {
      immersiveMode: ImmersiveMode,
      readerMode: ReaderMode
    };
  })();

  // 初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.ADHDReader.immersiveMode.init();
      window.ADHDReader.readerMode.init();
    });
  } else {
    window.ADHDReader.immersiveMode.init();
    window.ADHDReader.readerMode.init();
  }

  // 监听消息（只在主frame中添加）
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
          
          case 'downloadPage':
            window.ADHDReader.readerMode.savePage();
            sendResponse({ success: true });
            break;
          
          case 'copyLink':
            window.ADHDReader.readerMode.copyLink();
            sendResponse({ success: true });
            break;
          
          case 'annotation':
            if (request.annotationType === 'highlight') {
              window.ADHDReader.readerMode.toggleHighlight();
            } else if (request.annotationType === 'note') {
              window.ADHDReader.readerMode.addNote();
            }
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
}