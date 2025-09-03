/**
 * @jest-environment jsdom
 */

// Mock all module dependencies BEFORE requiring app.js
// These are expected to be global in the browser context.
global.analytics = {
    trackEvent: jest.fn(),
};
global.api = {
    createPrompt: jest.fn(),
    callAIAPI: jest.fn(),
    getApiErrorMessage: jest.fn(),
    fetchAndParseRepo: jest.fn(),
};
global.storage = {
    loadDraft: jest.fn(),
    loadTemplates: jest.fn(),
    loadApiKeyFromStorage: jest.fn(),
    handleApiKeyStorage: jest.fn(),
    saveDraft: jest.fn(),
};
global.ui = {
    showError: jest.fn(),
    showInfoMessage: jest.fn(),
    showStep: jest.fn(),
    updateApiHelpText: jest.fn(),
    updateFieldVisibility: jest.fn(),
    displayResult: jest.fn(),
    setView: jest.fn(),
    updateLivePreview: jest.fn(),
    hideError: jest.fn(),
    showSkeleton: jest.fn(),
    hideSkeleton: jest.fn(),
};
global.utils = {
    validateCurrentStep: jest.fn(),
    collectFormData: jest.fn(),
    populateForm: jest.fn(),
    // For testing, we don't need a real debounce, just call the function.
    debounce: (fn) => fn,
};
global.MarkdownRenderer = {
    init: jest.fn(),
    render: jest.fn(),
};
global.ModalManager = {
    init: jest.fn(),
};
global.AccessibilityModule = {
    init: jest.fn(),
    announce: jest.fn(),
};
global.PerformanceOptimizer = {
    init: jest.fn(),
};
// Mock pako for shareable link feature
global.pako = {
    inflate: jest.fn(),
};

// Now, require app.js. It will create the global ReadmeGenerator object.
// We don't need to export it from app.js because it attaches itself to the window.
require('../src/modules/app.js');

describe('app.js - ReadmeGenerator', () => {
    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Set up a comprehensive mock DOM for the application
        document.body.innerHTML = `
            <html class="">
                <head></head>
                <body>
                    <input type="checkbox" id="theme-checkbox">
                    <form id="readmeForm">
                        <div data-step="1">
                            <input id="apiKey" value="test-key">
                            <select id="apiProvider"><option value="openai"></option></select>
                            <input id="githubRepoUrl">
                            <button id="analyzeRepoBtn"></button>
                        </div>
                        <div data-step="6"></div>
                        <select id="tone"><option value="professional"></option><option value="custom"></option></select>
                        <div id="customToneGroup" class="hidden"></div>
                    </form>
                    <div id="navigation">
                        <button id="prevBtn"></button>
                        <button id="nextBtn"></button>
                    </div>
                    <div id="result"></div>
                    <div id="loading"></div>
                    <div id="abTestResult"></div>
                    <div class="main-layout"></div>
                </body>
            </html>
        `;
    });

    describe('init', () => {
        it('should initialize all modules and load initial data', async () => {
            await ReadmeGenerator.init();

            expect(MarkdownRenderer.init).toHaveBeenCalled();
            expect(ModalManager.init).toHaveBeenCalled();
            expect(AccessibilityModule.init).toHaveBeenCalled();
            expect(storage.loadDraft).toHaveBeenCalled();
            expect(storage.loadTemplates).toHaveBeenCalled();
            expect(storage.loadApiKeyFromStorage).toHaveBeenCalled();
            expect(ui.updateApiHelpText).toHaveBeenCalled();
            expect(ui.showStep).toHaveBeenCalledWith(1); // Initial step
            expect(PerformanceOptimizer.init).toHaveBeenCalled();
        });
    });

    describe('events', () => {
        it('nextStep should advance the step if validation passes', () => {
            utils.validateCurrentStep.mockReturnValue(true);
            ReadmeGenerator.state.currentStep = 2;
            
            ReadmeGenerator.events.nextStep();
            
            expect(ui.showStep).toHaveBeenCalledWith(3);
        });

        it('nextStep should not advance the step if validation fails', () => {
            utils.validateCurrentStep.mockReturnValue(false);
            ReadmeGenerator.state.currentStep = 2;

            ReadmeGenerator.events.nextStep();

            expect(ui.showStep).not.toHaveBeenCalled();
        });
    });

    describe('generateReadme', () => {
        it('should show an error if the API key is missing', async () => {
            document.getElementById('apiKey').value = '';
            
            await ReadmeGenerator.generateReadme();

            expect(ui.showError).toHaveBeenCalledWith('API Key is missing. Please return to Step 1 to enter it.');
            expect(ui.showStep).toHaveBeenCalledWith(1);
            expect(api.callAIAPI).not.toHaveBeenCalled();
        });

        it('should successfully generate a README and display the result', async () => {
            const mockFormData = { projectName: 'Test', apiProvider: 'openai', apiKey: 'test-key' };
            const mockReadme = '# Test README';
            utils.collectFormData.mockReturnValue(mockFormData);
            api.createPrompt.mockReturnValue('test-prompt');
            api.callAIAPI.mockResolvedValue(mockReadme);

            await ReadmeGenerator.generateReadme();

            expect(ui.setView).toHaveBeenCalledWith('loading');
            expect(storage.handleApiKeyStorage).toHaveBeenCalled();
            expect(analytics.trackEvent).toHaveBeenCalledWith('readme_generated', expect.any(Object));
            expect(api.callAIAPI).toHaveBeenCalledWith('openai', 'test-key', 'test-prompt');
            expect(ui.displayResult).toHaveBeenCalledWith(mockReadme);
            expect(ReadmeGenerator.state.generatedReadme).toBe(mockReadme);
        });
    });
});