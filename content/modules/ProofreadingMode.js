window.ProofreadingMode = {
  isActive: false,
  observer: null,
  options: {
    highlightFirstLetters: false,
    letterCount: 3,
    sentenceGradient: false,
    gradientStyle: 'subtle',
    smartKeywords: false,
    apiEndpoint: ''
  },
  
  init() {
    this.loadOptions();
    this.setupMutationObserver();
  },

  loadOptions() {
    const savedOptions = window.ADHDUtils.loadFromStorage('proofreadingOptions');
    if (savedOptions) {
      this.options = { ...this.options, ...savedOptions };
    }
  },

  saveOptions() {
    window.ADHDUtils.saveToStorage('proofreadingOptions', this.options);
  },

  setupMutationObserver() {
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new MutationObserver((mutations) => {
      if (this.isActive) {
        this.observer.disconnect();
        
        mutations.forEach(mutation => {
          if (mutation.addedNodes.length) {
            this.processNewContent(mutation.addedNodes);
          }
        });
        
        if (this.isActive) {
          this.observer.observe(document.body, {
            childList: true,
            subtree: true
          });
        }
      }
    });

    if (this.isActive) {
      this.observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  },

  processNewContent(nodes) {
    nodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        this.processElement(node);
      }
    });
  },

  processElement(element) {
    const textNodes = this.getTextNodes(element);
    const sentences = this.splitIntoSentences(textNodes);

    sentences.forEach(async sentence => {
      if (this.options.highlightFirstLetters) {
        this.highlightFirstLetters(sentence);
      }
      
      if (this.options.sentenceGradient) {
        this.applySentenceGradient(sentence);
      }
      
      if (this.options.smartKeywords) {
        await this.highlightKeywords(sentence);
      }
    });
  },

  getTextNodes(element) {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          return node.parentElement.tagName !== 'SCRIPT' &&
                 node.parentElement.tagName !== 'STYLE' &&
                 node.textContent.trim() !== '' ?
                 NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      }
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }
    return textNodes;
  },

  splitIntoSentences(textNodes) {
    const sentences = [];
    const sentenceRegex = /[^.!?]+[.!?]+/g;

    textNodes.forEach(node => {
      const text = node.textContent;
      let match;
      let lastIndex = 0;

      while ((match = sentenceRegex.exec(text)) !== null) {
        sentences.push({
          node,
          text: match[0],
          start: match.index,
          end: sentenceRegex.lastIndex
        });
        lastIndex = sentenceRegex.lastIndex;
      }

      if (lastIndex < text.length) {
        sentences.push({
          node,
          text: text.slice(lastIndex),
          start: lastIndex,
          end: text.length
        });
      }
    });

    return sentences;
  },

  highlightFirstLetters(sentence) {
    const words = sentence.text.split(/\s+/);
    const letterCount = this.options.letterCount;
    
    words.forEach(word => {
      if (word.length >= letterCount) {
        const span = document.createElement('span');
        span.className = 'first-letters-highlight';
        span.textContent = word.slice(0, letterCount);
        span.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
        
        const rest = document.createTextNode(word.slice(letterCount));
        
        const wordContainer = document.createElement('span');
        wordContainer.appendChild(span);
        wordContainer.appendChild(rest);
        
        const range = document.createRange();
        range.setStart(sentence.node, sentence.start);
        range.setEnd(sentence.node, sentence.end);
        range.deleteContents();
        range.insertNode(wordContainer);
      }
    });
  },

  applySentenceGradient(sentence) {
    const gradientStrengths = {
      subtle: { start: '0.2', end: '0.1' },
      medium: { start: '0.3', end: '0.15' },
      strong: { start: '0.4', end: '0.2' }
    };
    
    const strength = gradientStrengths[this.options.gradientStyle];
    const words = sentence.text.split(/\s+/);
    
    words.forEach((word, index) => {
      const progress = index / (words.length - 1);
      const opacity = strength.start - (progress * (strength.start - strength.end));
      
      const span = document.createElement('span');
      span.textContent = word + ' ';
      span.style.backgroundColor = `rgba(255, 255, 0, ${opacity})`;
      
      const range = document.createRange();
      range.setStart(sentence.node, sentence.start);
      range.setEnd(sentence.node, sentence.end);
      range.deleteContents();
      range.insertNode(span);
    });
  },

  localKeywordExtraction(text) {
    const keywords = new Set();
    
    const importantTerms = [
      'therefore', 'however', 'moreover', 'furthermore',
      'consequently', 'nevertheless', 'although', 'despite',
      'in conclusion', 'for example', 'specifically'
    ];
    
    const technicalTerms = /([A-Z][a-z]+){2,}|\b[A-Z]+\b/g;
    const numberPatterns = /\d+(\.\d+)?\s*(kg|m|km|s|min|hr|mph|°C|°F)/g;
    
    importantTerms.forEach(term => {
      if (text.toLowerCase().includes(term.toLowerCase())) {
        keywords.add(term);
      }
    });
    
    const techMatches = text.match(technicalTerms) || [];
    techMatches.forEach(match => keywords.add(match));
    
    const numberMatches = text.match(numberPatterns) || [];
    numberMatches.forEach(match => keywords.add(match));
    
    return Array.from(keywords);
  },

  async highlightKeywords(sentence) {
    let keywords = this.localKeywordExtraction(sentence.text);
    
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      sentence.text = sentence.text.replace(regex, match => {
        return `<span class="keyword-highlight" 
          title="Identified as key term"
          style="background-color: rgba(0, 255, 0, 0.2)">${match}</span>`;
      });
    });
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = sentence.text;
    while (sentence.node.firstChild) {
      sentence.node.removeChild(sentence.node.firstChild);
    }
    while (tempDiv.firstChild) {
      sentence.node.appendChild(tempDiv.firstChild);
    }
  },

  toggle(enabled, options = {}) {
    if (this.isActive === enabled) return;
    
    this.isActive = enabled;
    if (enabled) {
      this.options = { ...this.options, ...options };
      this.saveOptions();
      
      if (!this.observer) {
        this.setupMutationObserver();
      }
      
      this.processElement(document.body);
    } else {
      if (this.observer) {
        this.observer.disconnect();
      }
      
      document.querySelectorAll('.first-letters-highlight, .keyword-highlight').forEach(el => {
        const text = el.textContent;
        el.parentNode.replaceChild(document.createTextNode(text), el);
      });
    }
  },

  cleanup() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.isActive = false;
  }
}; 