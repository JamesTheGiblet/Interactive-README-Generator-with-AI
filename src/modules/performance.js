const PerformanceOptimizer = {
  init() {
    // This can be called once to set up observers on static elements.
    this.setupPreviewVirtualization();
  },

  /**
   * Sets up IntersectionObserver to lazy-load images within a given container.
   * @param {HTMLElement} containerElement The element to search for images within.
   */
  setupLazyLoading(containerElement) {
    if (!containerElement || !('IntersectionObserver' in window)) {
      // Fallback for older browsers or if container is not found
      const images = containerElement ? containerElement.querySelectorAll('img[data-src]') : [];
      images.forEach(img => {
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
        }
      });
      return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target;
          if (element.dataset.src) {
            element.src = element.dataset.src;
            element.removeAttribute('data-src'); // Clean up
            obs.unobserve(element);
          }
        }
      });
    }, { rootMargin: '200px 0px' }); // Start loading images 200px before they enter the viewport

    const images = containerElement.querySelectorAll('img[data-src]');
    images.forEach(img => {
      observer.observe(img);
    });
  },

  setupPreviewVirtualization() {
    // Virtualize the preview for very long READMEs
    const preview = document.getElementById('preview');
    if (preview) {
      let isVirtualizing = false;

      const virtualizeIfNeeded = () => {
        // Using a larger threshold to avoid virtualizing unnecessarily.
        if (preview.scrollHeight > 3000 && !isVirtualizing) {
          isVirtualizing = true;
          this.virtualizePreview(preview);
        }
      };

      // Check on content changes
      const observer = new MutationObserver(virtualizeIfNeeded);
      observer.observe(preview, { childList: true, subtree: true });
    }
  },

  virtualizePreview(previewElement) {
    // This is a placeholder for a more complex virtualization implementation.
    // A full implementation would involve slicing the content and only rendering
    // the visible parts, which is beyond the scope of this simple optimization.
    console.log('Virtualizing preview for performance. (This is a placeholder for a full implementation)');
  }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PerformanceOptimizer };
}