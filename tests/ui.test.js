/**
 * @jest-environment jsdom
 */

// Mock dependencies from other modules that ui.js interacts with.
global.ReadmeGenerator = {
    state: { currentStep: 1, lastFormData: {}, generatedReadme: '' },
    config: { totalSteps: 6 },
    utils: {
        collectFormData: jest.fn(),
        generateShareableLink: jest.fn(),
        exportToPDF: jest.fn(),
        exportToHTML: jest.fn(),
    },
    events: {
        runABTest: jest.fn(),
        changeToneAndRegenerate: jest.fn(),
    },
    storage: {
        saveTemplate: jest.fn(),
    }
};
global.AccessibilityModule = {
    announce: jest.fn(),
};
global.MarkdownRenderer = {
    render: jest.fn(),
};

const { ui } = require('../src/modules/ui.js');

describe('ui.js', () => {
    beforeEach(() => {
        // Set up a comprehensive DOM structure for all ui.js tests
        document.body.dataset.view = 'form';
        document.body.innerHTML = `
            <div id="error"></div>
            <form id="readmeForm">
                <div class="step active" data-step="1">
                    <h2>Step 1 Title</h2>
                    <select id="apiProvider">
                        <option value="gemini">Gemini</option>
                        <option value="openai" selected>OpenAI</option>
                    </select>
                    <input id="apiKey" value="sk-test">
                    <p id="apiKeyHelp"></p>
                    <div id="apiProviderInfo"></div>
                </div>
                <div class="step" data-step="2">
                    <h2>Step 2 Title</h2>
                    <select id="projectType">
                        <option value="web-app">Web App</option>
                        <option value="cli">CLI Tool</option>
                    </select>
                    <div data-field="api" style="display: flex;">
                        <input type="checkbox" id="includeAPI">
                    </div>
                </div>
                <div class="step" data-step="6"><h2>Step 6 Title</h2></div>
                <input id="projectName" value="Test Project">
            </form>

            <div class="progress-bar" aria-valuenow="1"><div id="progressFill" style="width: 16.66%;"></div></div>
            <div id="stepIndicator"></div>
            <button id="prevBtn" style="display: none;"></button>
            <button id="nextBtn">Next →</button>

            <div id="preview-column" class="is-visible">
                <div id="live-preview"></div>
            </div>

            <div id="result" class="result" style="display: none;">
                <div id="preview" class="preview-light-theme"></div>
                <div class="button-group">
                    <button id="copyBtn"></button>
                    <a id="downloadBtn"></a>
                    <button id="pdfBtn"></button>
                    <button id="htmlBtn"></button>
                    <button id="shareBtn"></button>
                    <button onclick="ReadmeGenerator.storage.saveTemplate()"></button>
                    <button id="abTestBtn"></button>
                </div>
                <div class="button-group">
                    <button id="previewThemeLightBtn" class="active"></button>
                    <button id="previewThemeDarkBtn"></button>
                </div>
                <select id="resultTone">
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="custom">Custom</option>
                </select>
                <div id="resultCustomToneGroup" class="hidden">
                    <input id="resultCustomTone">
                </div>
            </div>
            <link id="hljs-light-theme" rel="stylesheet" href="">
            <link id="hljs-dark-theme" rel="stylesheet" href="" disabled>
        `;
        // Clear mocks
        jest.clearAllMocks();
        // Reset state
        ReadmeGenerator.state.currentStep = 1;
        ReadmeGenerator.state.lastFormData = {};
        ReadmeGenerator.state.generatedReadme = '';

        // Mock localStorage
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: jest.fn(),
                setItem: jest.fn(),
                removeItem: jest.fn(),
                clear: jest.fn(),
            },
            writable: true,
        });

        // Mock navigator.clipboard
        Object.defineProperty(navigator, 'clipboard', {
            value: {
                writeText: jest.fn(),
            },
            writable: true,
        });

        // Mock URL.createObjectURL
        global.URL.createObjectURL = jest.fn(blob => `blob:${blob.type}/mock-url`);

        // Mock scrollIntoView as it's not implemented in jsdom
        window.HTMLElement.prototype.scrollIntoView = jest.fn();
    });

    // Use fake timers for tests involving setTimeout
    jest.useFakeTimers();

    describe('setView', () => {
        it('should set the data-view attribute on the body', () => {
            ui.setView('loading');
            expect(document.body.dataset.view).toBe('loading');
            ui.setView('result');
            expect(document.body.dataset.view).toBe('result');
        });
    });

    describe('showError', () => {
        it('should display an error message and make the error div visible', () => {
            const errorMessage = 'A test error occurred.';
            ui.showError(errorMessage);

            const errorDiv = document.getElementById('error');
            expect(errorDiv.textContent).toBe(errorMessage);
            expect(errorDiv.classList.contains('is-visible')).toBe(true);
            expect(errorDiv.classList.contains('is-info')).toBe(false);
            expect(AccessibilityModule.announce).toHaveBeenCalledWith(`Error: ${errorMessage}`);
        });
    });

    describe('showInfoMessage', () => {
        it('should display an info message and add the correct classes', () => {
            const infoMessage = 'This is an info message.';
            ui.showInfoMessage(infoMessage);

            const errorDiv = document.getElementById('error');
            expect(errorDiv.textContent).toBe(infoMessage);
            expect(errorDiv.classList.contains('is-visible')).toBe(true);
            expect(errorDiv.classList.contains('is-info')).toBe(true);
            expect(AccessibilityModule.announce).toHaveBeenCalledWith(`Info: ${infoMessage}`);
        });
    });

    describe('showStep', () => {
        it('should show the correct step and update progress when moving forward', () => {
            ReadmeGenerator.utils.collectFormData.mockReturnValue({});
            ui.showStep(2);
            expect(document.querySelector('[data-step="1"]').classList.contains('active')).toBe(false);
            expect(document.querySelector('[data-step="2"]').classList.contains('active')).toBe(true);
            expect(document.getElementById('nextBtn').textContent).toBe('Next →');
            expect(document.getElementById('prevBtn').style.display).toBe('block');
            expect(AccessibilityModule.announce).toHaveBeenCalledWith('Step 2 of 6 shown: Step 2 Title');
        });
    });

    describe('updateLivePreview', () => {
        it('should call collectFormData and render when on a relevant step', () => {
            ReadmeGenerator.state.currentStep = 2;
            ReadmeGenerator.utils.collectFormData.mockReturnValue({ projectName: 'Live Preview Test' });
            
            ui.updateLivePreview();
            
            expect(ReadmeGenerator.utils.collectFormData).toHaveBeenCalled();
            expect(MarkdownRenderer.render).toHaveBeenCalledWith(expect.any(String), document.getElementById('live-preview'));
        });
    });

    describe('displayResult', () => {
        it('should switch view to result, render markdown, and set up buttons', async () => {
            const readmeContent = '# Final README';
            ReadmeGenerator.state.lastFormData = { apiProvider: 'gemini', tone: 'casual' };
            
            const setViewSpy = jest.spyOn(ui, 'setView').mockImplementation(() => {});

            await ui.displayResult(readmeContent);

            expect(setViewSpy).toHaveBeenCalledWith('result');
            expect(localStorage.removeItem).toHaveBeenCalledWith('readmeGenerator_draft');
            expect(MarkdownRenderer.render).toHaveBeenCalledWith(readmeContent, document.getElementById('preview'));
            expect(document.getElementById('downloadBtn').href).toContain('blob:');
            expect(document.getElementById('copyBtn').onclick).toBeDefined();
            expect(document.getElementById('abTestBtn').textContent).toContain('OpenAI');
            
            setViewSpy.mockRestore();
        });
    });

    describe('copyMarkdownToClipboard', () => {
        it('should copy readme to clipboard and update button text on success', async () => {
            ReadmeGenerator.state.generatedReadme = '## Markdown Content';
            navigator.clipboard.writeText.mockResolvedValue(undefined);

            ui.copyMarkdownToClipboard();
            
            await Promise.resolve(); // Allow promise to resolve

            expect(navigator.clipboard.writeText).toHaveBeenCalledWith('## Markdown Content');
            const copyBtn = document.getElementById('copyBtn');
            expect(copyBtn.textContent).toBe('✅ Copied!');
            expect(copyBtn.disabled).toBe(true);

            jest.runAllTimers();

            expect(copyBtn.textContent).toBe('📋 Copy Markdown');
            expect(copyBtn.disabled).toBe(false);
        });
    });

    describe('updateApiHelpText', () => {
        it('should show Gemini help text when Gemini is selected', () => {
            document.getElementById('apiProvider').value = 'gemini';
            ui.updateApiHelpText();
            
            expect(document.getElementById('apiKeyHelp').innerHTML).toContain('Google AI Studio');
            expect(document.getElementById('apiKey').placeholder).toBe('Enter your Gemini API key');
        });
    });

    describe('updateFieldVisibility', () => {
        it('should hide API field for project types that do not use it', () => {
            const apiField = document.querySelector('[data-field="api"]');
            document.getElementById('projectType').value = 'cli';
            
            ui.updateFieldVisibility();
            
            expect(apiField.style.display).toBe('none');
            expect(document.getElementById('includeAPI').checked).toBe(false);
        });
    });
});