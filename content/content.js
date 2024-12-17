


// Step 1: Apply basic style to ensure all text is consistent
const applyStyleToText = (root) => {
  const nodes = root.querySelectorAll('*');
  nodes.forEach(node => {
    if (node.nodeType === 3 && node.nodeValue.trim() !== '') {
      const computedStyle = window.getComputedStyle(node);
      if (computedStyle.color !== 'black') {
        node.style.color = 'black'; // Change non-black text to black
      }
    }
  });

  const iframe = document.querySelector('iframe.docs-texteventtarget-iframe');
  if( iframe && iframe.contentDocument){
    const docBody = iframe.contentDocument.body;
    applyStyleToText(docBody);
  
};

// Step 2: Highlight first letters
const highlightFirstLetters = (style) => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);

  while (walker.nextNode()) {
    const node = walker.currentNode;

    // Skip empty text nodes
    if (node.nodeValue.trim() === "") continue;

    const words = node.nodeValue.split(/\s+/); // Split text into words
    const fragment = document.createDocumentFragment();

    words.forEach((word, index) => {
      if (word) {
        const span = document.createElement("span");
        span.style.cssText = style;
        span.textContent = word[0]; // Highlight the first letter

        const restText = document.createTextNode(word.slice(1)); // Remaining letters
        fragment.appendChild(span);
        fragment.appendChild(restText);

        if (index < words.length - 1) {
          fragment.appendChild(document.createTextNode(" ")); // Add space between words
        }
      }
    });

    // Replace the original text node with the new fragment
    node.parentNode.replaceChild(fragment, node);
  }
};

// Apply style to the entire document
applyStyleToText(document.body);

// Initialize highlighting when necessary
if (!window.__highlightFirstLettersInitialized) {
  window.__highlightFirstLettersInitialized = true;
  highlightFirstLetters("color: red; font-weight: bold;"); // Example style
}


/**
 * immersive-overlay 
 */



let immersiveOverlay = document.createElement('div');
immersiveOverlay.id = 'immersive-overlay';
document.body.appendChild(immersiveOverlay);

let highlightArea = document.createElement('div');
highlightArea.id = 'highlight-area';
immersiveOverlay.appendChild(highlightArea);

// Listen to mousemove events and adjust highlight area
document.addEventListener('mousemove', (event) => {
  const mouseY = event.clientY; // Get mouse Y position
  console.log(mouseY);
  
  // Adjust the highlight area position
  highlightArea.style.top = `${mouseY - 50}px`; // Make mouse center of the area
});

// Update the highlight area position on scroll
window.addEventListener('scroll', () => {
  highlightArea.style.top = `${window.scrollY + window.innerHeight / 2 - 50}px`;
});