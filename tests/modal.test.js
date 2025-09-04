/**
 * @jest-environment jsdom
 */

// Mock dependencies
global.MarkdownRenderer = {
    render: jest.fn(),
};
global.AccessibilityModule = {
    announce: jest.fn(),
};
global.ReadmeRules = {
    content: '## Best Practices Content',
};
global.fetch = jest.fn();

const { ModalManager } = require('../src/modules/modal.js');

describe('ModalManager', () => {
    beforeEach(() => {
        // Set up a comprehensive mock DOM with all modals and triggers
        document.body.innerHTML = `
            <button id="insightsBtn"></button>
            <button id="examplesBtn"></button>
            <button id="syncWithGithubBtn"></button>

            <div id="insightsModal" class="modal-overlay">
                <h2>Insights</h2>
                <button id="modalCloseBtn"></button>
                <div class="tabs">
                    <button class="tab-btn active" data-tab="practices">Practices</button>
                    <button class="tab-btn" data-tab="stats">Stats</button>
                </div>
                <div id="tab-practices" class="tab-content active"></div>
                <div id="tab-stats" class="tab-content"></div>
            </div>

            <div id="examplesModal" class="modal-overlay">
                <h2>Examples</h2>
                <button id="examplesModalCloseBtn"></button>
                <ul id="examplesList"></ul>
                <div id="examplesTabContent"></div>
            </div>

            <div id="githubSyncModal" class="modal-overlay">
                <h2>GitHub Sync</h2>
                <button id="githubSyncModalCloseBtn"></button>
                <button id="closeSyncModalBtn"></button>
            </div>
        `;
        // Clear all mocks before each test
        jest.clearAllMocks();
        fetch.mockClear();
    });

    describe('Initialization', () => {
        it('should add event listeners to all modal triggers and close buttons', () => {
            const insightsBtn = document.getElementById('insightsBtn');
            const insightsModal = document.getElementById('insightsModal');
            const closeBtn = document.getElementById('modalCloseBtn');
            
            const showSpy = jest.spyOn(ModalManager, 'show');
            const hideSpy = jest.spyOn(ModalManager, 'hide');

            ModalManager.init();

            insightsBtn.click();
            expect(showSpy).toHaveBeenCalledWith(insightsModal);

            closeBtn.click();
            expect(hideSpy).toHaveBeenCalledWith(insightsModal);
        });
    });

    describe('show/hide functionality', () => {
        it('show() should add is-visible class and announce the modal', () => {
            const modal = document.getElementById('insightsModal');
            ModalManager.show(modal);
            expect(modal.classList.contains('is-visible')).toBe(true);
            expect(AccessibilityModule.announce).toHaveBeenCalledWith('Insights modal opened.');
        });

        it('hide() should remove is-visible class and announce closure', () => {
            const modal = document.getElementById('insightsModal');
            modal.classList.add('is-visible');
            ModalManager.hide(modal);
            expect(modal.classList.contains('is-visible')).toBe(false);
            expect(AccessibilityModule.announce).toHaveBeenCalledWith('Modal closed.');
        });

        it('should hide the modal when clicking the overlay', () => {
            const modal = document.getElementById('insightsModal');
            const hideSpy = jest.spyOn(ModalManager, 'hide');
            ModalManager.init();

            ModalManager.show(modal);
            modal.click();

            expect(hideSpy).toHaveBeenCalledWith(modal);
        });
    });

    describe('Examples Modal', () => {
        it('should fetch and render the first example on initial open', async () => {
            const examplesBtn = document.getElementById('examplesBtn');
            fetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('# Example Content'),
            });

            ModalManager.init();
            examplesBtn.click();

            // Wait for async operations inside loadExampleContent
            await new Promise(process.nextTick);

            expect(fetch).toHaveBeenCalledWith('examples/README-Pro.md');
            expect(MarkdownRenderer.render).toHaveBeenCalledWith('# Example Content', expect.any(HTMLElement));
        });
    });
});