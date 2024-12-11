
if (!window.__highlightFirstLettersInitialized) {
  window.__highlightFirstLettersInitialized = true;

// Highlights the first letter of each word based on user settings
const highlightFirstLetters = (style) => {
  const body = document.body;
  const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);

  while (walker.nextNode()) {
    const node = walker.currentNode;

    // Skip empty text nodes
    if (node.textContent.trim() === "") continue;

    const words = node.textContent.split(/\s+/); // Split text into words
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

// Example usage
// highlightFirstLetters("background-color: yellow; color: black; font-weight: bold;");


// Listen for messages from the background script
//  highlightFirstLetters();
}

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