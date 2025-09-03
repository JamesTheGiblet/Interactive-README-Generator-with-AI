/**
 * @jest-environment jsdom
 */

// Mock dependencies
global.ReadmeGenerator = {
    state: { currentStep: 1, lastFormData: {} },
    utils: {
        collectFormData: jest.fn(),
        populateForm: jest.fn(),
    },
    ui: {
        showInfoMessage: jest.fn(),
        hideError: jest.fn(),
        updateApiHelpText: jest.fn(),
    }
};
global.AccessibilityModule = {
    announce: jest.fn(),
};
global.SecurityModule = {
    encryptData: jest.fn(data => Promise.resolve(`encrypted:${data}`)),
    decryptData: jest.fn(data => Promise.resolve(data.replace('encrypted:', ''))),
};

const { storage } = require('../src/modules/storage.js');

describe('storage.js', () => {
    beforeEach(() => {
        // Set up mock DOM
        document.body.innerHTML = `
            <div id="result" class="result" style="display: none;">
                <div class="button-group">
                    <button onclick="ReadmeGenerator.storage.saveTemplate()"></button>
                </div>
            </div>
            <div id="loading" style="display: none;"></div>
            <input id="rememberApiKey" type="checkbox">
            <input id="apiKey" value="test-key">
            <select id="apiProvider"><option value="openai">OpenAI</option><option value="gemini">Gemini</option></select>
            <select id="savedTemplates">
                <option value="">-- Select a template --</option>
            </select>
        `;

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

        // Mock window.prompt and window.confirm
        global.prompt = jest.fn();
        global.confirm = jest.fn();

        // Use fake timers for setTimeout
        jest.useFakeTimers();
        // Clear all mocks
        jest.clearAllMocks();
    });

    describe('saveDraft', () => {
        it('should save form data and current step to localStorage', () => {
            ReadmeGenerator.state.currentStep = 3;
            ReadmeGenerator.utils.collectFormData.mockReturnValue({ projectName: 'My Draft' });
            
            storage.saveDraft();

            expect(localStorage.setItem).toHaveBeenCalledWith(
                'readmeGenerator_draft',
                JSON.stringify({ step: 3, formData: { projectName: 'My Draft' } })
            );
        });

        it('should not save if the result or loading view is active', () => {
            document.getElementById('result').style.display = 'block';
            storage.saveDraft();
            expect(localStorage.setItem).not.toHaveBeenCalled();
        });
    });

    describe('loadDraft', () => {
        it('should load and populate form from draft in localStorage', () => {
            const draft = { step: 2, formData: { projectName: 'Loaded Draft' } };
            localStorage.getItem.mockReturnValue(JSON.stringify(draft));

            storage.loadDraft();

            expect(ReadmeGenerator.utils.populateForm).toHaveBeenCalledWith(draft.formData);
            expect(ReadmeGenerator.state.currentStep).toBe(2);
            expect(ReadmeGenerator.ui.showInfoMessage).toHaveBeenCalledWith('Your previous unsaved draft has been loaded.');
        });
    });

    describe('handleApiKeyStorage', () => {
        it('should encrypt and save API key if remember is checked', async () => {
            document.getElementById('rememberApiKey').checked = true;
            
            await storage.handleApiKeyStorage();

            expect(SecurityModule.encryptData).toHaveBeenCalledWith('test-key');
            expect(localStorage.setItem).toHaveBeenCalledWith('apiKey', 'encrypted:test-key');
            expect(localStorage.setItem).toHaveBeenCalledWith('rememberApiKey', 'true');
        });

        it('should remove API key from storage if remember is not checked', async () => {
            document.getElementById('rememberApiKey').checked = false;

            await storage.handleApiKeyStorage();

            expect(localStorage.removeItem).toHaveBeenCalledWith('apiKey');
            expect(localStorage.removeItem).toHaveBeenCalledWith('rememberApiKey');
        });
    });

    describe('loadApiKeyFromStorage', () => {
        it('should load and decrypt API key if remember is checked', async () => {
            localStorage.getItem.mockImplementation(key => {
                if (key === 'rememberApiKey') return 'true';
                if (key === 'apiProvider') return 'gemini';
                if (key === 'apiKey') return 'encrypted:secret-gemini-key';
                return null;
            });

            await storage.loadApiKeyFromStorage();

            expect(SecurityModule.decryptData).toHaveBeenCalledWith('encrypted:secret-gemini-key');
            expect(document.getElementById('apiProvider').value).toBe('gemini');
            expect(document.getElementById('apiKey').value).toBe('secret-gemini-key');
            expect(document.getElementById('rememberApiKey').checked).toBe(true);
            expect(ReadmeGenerator.ui.updateApiHelpText).toHaveBeenCalled();
        });
    });

    describe('Template Management', () => {
        it('saveTemplate should save last form data to localStorage', () => {
            ReadmeGenerator.state.lastFormData = { projectName: 'My Template Project' };
            prompt.mockReturnValue('My Template');
            
            storage.saveTemplate();

            expect(localStorage.setItem).toHaveBeenCalledWith(
                'readmeGeneratorTemplates',
                JSON.stringify([{ name: 'My Template', data: { projectName: 'My Template Project' } }])
            );
            const saveBtn = document.querySelector('button[onclick="ReadmeGenerator.storage.saveTemplate()"]');
            expect(saveBtn.textContent).toBe('✅ Saved!');
            
            jest.runAllTimers();
            expect(saveBtn.textContent).toBe('💾 Save as Template');
        });

        it('loadTemplates should populate the select dropdown', () => {
            const templates = [{ name: 'Template A', data: {} }, { name: 'Template B', data: {} }];
            localStorage.getItem.mockReturnValue(JSON.stringify(templates));

            storage.loadTemplates();

            const select = document.getElementById('savedTemplates');
            expect(select.options.length).toBe(3); // Including default option
            expect(select.options[1].textContent).toBe('Template A');
            expect(select.options[2].textContent).toBe('Template B');
        });

        it('loadSelectedTemplate should populate form with template data', () => {
            const template = { name: 'My Template', data: { projectName: 'Loaded From Template' } };
            localStorage.getItem.mockReturnValue(JSON.stringify([template]));
            
            // Manually add the option to the select element to simulate it being loaded
            const select = document.getElementById('savedTemplates');
            const option = document.createElement('option');
            option.value = 'My Template';
            option.textContent = 'My Template';
            select.appendChild(option);
            select.value = 'My Template';

            storage.loadSelectedTemplate();

            expect(ReadmeGenerator.utils.populateForm).toHaveBeenCalledWith(template.data);
            expect(ReadmeGenerator.ui.showInfoMessage).toHaveBeenCalledWith('Template "My Template" loaded successfully.');
        });
    });
});