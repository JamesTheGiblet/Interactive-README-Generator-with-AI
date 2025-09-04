/**
 * @jest-environment jsdom
 */

// Mock dependencies
global.ReadmeGenerator = {
    config: { totalSteps: 6 },
    ui: { showStep: jest.fn() },
};
global.ModalManager = {
    hide: jest.fn(),
};

const { AccessibilityModule } = require('../src/modules/accessibility.js');

describe('AccessibilityModule', () => {
    beforeEach(() => {
        // Set up a fresh DOM for each test
        document.body.innerHTML = `
            <div id="navigation">
                <button id="prevBtn"></button>
                <button id="nextBtn"></button>
            </div>
            <form>
                <label for="test-input">Label</label>
                <input name="test-input">
                <div class="help-text">Some help</div>
            </form>
        `;
        // Reset mocks
        jest.clearAllMocks();
        // Remove any existing live region
        const existingLiveRegion = document.getElementById('a11y-live-region');
        if (existingLiveRegion) {
            existingLiveRegion.remove();
        }
    });

    describe('init', () => {
        it('should call setupLiveRegion, enhanceFormLabels, and addKeyboardNavigation', () => {
            const setupLiveRegionSpy = jest.spyOn(AccessibilityModule, 'setupLiveRegion');
            const enhanceFormLabelsSpy = jest.spyOn(AccessibilityModule, 'enhanceFormLabels');
            const addKeyboardNavigationSpy = jest.spyOn(AccessibilityModule, 'addKeyboardNavigation');

            AccessibilityModule.init();

            expect(setupLiveRegionSpy).toHaveBeenCalled();
            expect(enhanceFormLabelsSpy).toHaveBeenCalled();
            expect(addKeyboardNavigationSpy).toHaveBeenCalled();

            setupLiveRegionSpy.mockRestore();
            enhanceFormLabelsSpy.mockRestore();
            addKeyboardNavigationSpy.mockRestore();
        });
    });

    describe('setupLiveRegion', () => {
        it('should create and append a live region to the body', () => {
            document.body.innerHTML = ''; // Start with empty body
            AccessibilityModule.setupLiveRegion();
            const liveRegion = document.getElementById('a11y-live-region');
            expect(liveRegion).not.toBeNull();
            expect(liveRegion.getAttribute('aria-live')).toBe('polite');
            expect(liveRegion.classList.contains('visually-hidden')).toBe(true);
        });
    });

    describe('announce', () => {
        it('should set the text of the live region', () => {
            AccessibilityModule.setupLiveRegion(); // Ensure region exists
            const liveRegion = document.getElementById('a11y-live-region');
            
            AccessibilityModule.announce('Test announcement');
            
            // The new implementation clears and sets text in the same tick
            expect(liveRegion.textContent).toBe('Test announcement');
        });
    });

    describe('enhanceFormLabels', () => {
        it('should add IDs and aria-describedby to form elements', () => {
            const input = document.querySelector('input');
            const helpText = document.querySelector('.help-text');
            
            AccessibilityModule.enhanceFormLabels();

            expect(input.id).toBe('input-test-input');
            expect(helpText.id).toBe('help-input-test-input');
            expect(input.getAttribute('aria-describedby')).toBe('help-input-test-input');
        });
    });

    describe('addKeyboardNavigation', () => {
        it('should navigate steps with Alt + number keys', () => {
            AccessibilityModule.addKeyboardNavigation();
            
            const event = new KeyboardEvent('keydown', { key: '2', altKey: true });
            document.dispatchEvent(event);

            expect(ReadmeGenerator.ui.showStep).toHaveBeenCalledWith(2);
        });
    });
});