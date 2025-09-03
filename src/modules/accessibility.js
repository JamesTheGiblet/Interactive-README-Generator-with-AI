const AccessibilityModule = {
  init() {
    this.setupLiveRegion();
    this.enhanceFormLabels();
    this.addKeyboardNavigation();
  },

  /**
   * Creates a visually hidden live region for screen reader announcements.
   */
  setupLiveRegion() {
    const liveRegion = document.createElement('div');
    liveRegion.id = 'a11y-live-region';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.classList.add('visually-hidden');
    document.body.appendChild(liveRegion);
  },

  /**
   * Announces a message to screen readers using the live region.
   * @param {string} message The message to announce.
   */
  announce(message) {
    const liveRegion = document.getElementById('a11y-live-region');
    if (liveRegion) {
      // Clear the content first to ensure the change is announced by screen readers
      liveRegion.textContent = '';
      // Set the new message
      liveRegion.textContent = message;
    }
  },

  /**
   * Ensures all form elements have IDs and are linked to help text for better accessibility.
   */
  enhanceFormLabels() {
    document.querySelectorAll('input, textarea, select').forEach(input => {
      if (!input.id) {
        // Generate a more descriptive ID if a name exists
        const id = input.name ? `input-${input.name}` : `input-${Math.random().toString(36).substr(2, 9)}`;
        input.id = id;
      }
      
      const helpText = input.nextElementSibling;
      if (helpText && helpText.classList.contains('help-text')) {
        const helpId = `help-${input.id}`;
        helpText.id = helpId;
        input.setAttribute('aria-describedby', helpId);
      }
    });
  },

  /**
   * Adds enhanced keyboard navigation shortcuts for the application.
   */
  addKeyboardNavigation() {
    // This combines the new shortcuts with the existing ones from app.js
    document.addEventListener('keydown', (e) => {
      const activeElement = document.activeElement;
      const isEditingText = activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA';

      // Alt + [1-6] to jump to a step
      if (e.altKey && '123456'.includes(e.key)) {
        e.preventDefault();
        const stepNum = parseInt(e.key);
        if (window.ReadmeGenerator && ReadmeGenerator.config && stepNum <= ReadmeGenerator.config.totalSteps) {
          ReadmeGenerator.ui.showStep(stepNum);
        }
      }

      // Escape key to close modals
      if (e.key === 'Escape') {
        const openModal = document.querySelector('.modal-overlay.is-visible');
        if (openModal) {
          ModalManager.hide(openModal);
        }
      }

      // Ctrl + Arrow keys for step navigation (from app.js)
      const isFormActive = document.getElementById('navigation')?.style.display !== 'none';
      if (isFormActive && e.ctrlKey && !isEditingText) {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          document.getElementById('nextBtn').click();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          document.getElementById('prevBtn').click();
        }
      }
    });

    // Enter key to advance steps
    document.querySelectorAll('.step input:not([type="checkbox"]), .step select').forEach(element => {
        element.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('nextBtn').click();
            }
        });
    });
  }
};