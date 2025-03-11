window.ImmersiveMode = {
  overlay: null,
  highlightArea: null,
  isActive: false,
  isResizing: false,
  resizeDirection: null,
  startX: 0,
  startY: 0,
  startWidth: 0,
  startHeight: 0,

  init() {
    if (!this.overlay) {
      this.createOverlay();
    }
  },

  createOverlay() {
    // 移除现有遮罩
    const existing = document.getElementById('immersive-overlay');
    if (existing) existing.remove();

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

    // 绑定事件处理器
    this.resize = this.resize.bind(this);
    this.stopResize = this.stopResize.bind(this);
    this.drag = this.drag.bind(this);
    this.stopDrag = this.stopDrag.bind(this);
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

  setupEventListeners() {
    // 移动高亮区域
    this.highlightArea.addEventListener('mousedown', this.startDragging.bind(this));
    
    // 调整大小
    this.highlightArea.querySelectorAll('[data-direction]').forEach(handle => {
      handle.addEventListener('mousedown', this.startResizing.bind(this));
    });

    // 全局事件
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.stopDragging.bind(this));
    
    // 键盘快捷键
    document.addEventListener('keydown', this.handleKeyPress.bind(this));
  },

  startDragging(e) {
    if (e.target === this.highlightArea) {
      this.isDragging = true;
      const rect = this.highlightArea.getBoundingClientRect();
      this.startX = e.clientX - rect.left;
      this.startY = e.clientY - rect.top;
      e.preventDefault();
    }
  },

  startResizing(e) {
    if (e.target.dataset.direction) {
      this.isResizing = true;
      this.resizeDirection = e.target.dataset.direction;
      const rect = this.highlightArea.getBoundingClientRect();
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.startWidth = rect.width;
      this.startHeight = rect.height;
      e.preventDefault();
      e.stopPropagation();
    }
  },

  handleMouseMove(e) {
    if (this.isDragging) {
      const rect = this.highlightArea.getBoundingClientRect();
      const x = e.clientX - this.startX;
      const y = e.clientY - this.startY;
      
      this.highlightArea.style.left = `${x}px`;
      this.highlightArea.style.top = `${y}px`;
      this.highlightArea.style.transform = 'none';
    } else if (this.isResizing) {
      const dx = e.clientX - this.startX;
      const dy = e.clientY - this.startY;
      this.resizeHighlightArea(dx, dy);
    }
  },

  resizeHighlightArea(dx, dy) {
    const rect = this.highlightArea.getBoundingClientRect();
    const minSize = 100;

    switch (this.resizeDirection) {
      case 'e':
        this.highlightArea.style.width = `${Math.max(minSize, this.startWidth + dx)}px`;
        break;
      case 'w':
        const newWidth = Math.max(minSize, this.startWidth - dx);
        this.highlightArea.style.width = `${newWidth}px`;
        this.highlightArea.style.left = `${rect.left + (this.startWidth - newWidth)}px`;
        break;
      case 's':
        this.highlightArea.style.height = `${Math.max(minSize, this.startHeight + dy)}px`;
        break;
      case 'n':
        const newHeight = Math.max(minSize, this.startHeight - dy);
        this.highlightArea.style.height = `${newHeight}px`;
        this.highlightArea.style.top = `${rect.top + (this.startHeight - newHeight)}px`;
        break;
      // ... 处理其他方向的调整
    }
  },

  stopDragging() {
    this.isDragging = false;
    this.isResizing = false;
    this.resizeDirection = null;
  },

  handleKeyPress(e) {
    if (!this.isActive) return;

    const step = e.shiftKey ? 10 : 1;
    const rect = this.highlightArea.getBoundingClientRect();

    switch (e.key) {
      case 'ArrowUp':
        this.highlightArea.style.top = `${rect.top - step}px`;
        break;
      case 'ArrowDown':
        this.highlightArea.style.top = `${rect.top + step}px`;
        break;
      case 'ArrowLeft':
        this.highlightArea.style.left = `${rect.left - step}px`;
        break;
      case 'ArrowRight':
        this.highlightArea.style.left = `${rect.left + step}px`;
        break;
      case 'Escape':
        this.toggle(false);
        break;
    }
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

  cleanup() {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    this.overlay = null;
    this.highlightArea = null;
    this.isActive = false;
  }
}; 