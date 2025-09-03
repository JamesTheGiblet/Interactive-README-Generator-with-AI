/**
 * @jest-environment jsdom
 */

// Mock the global ReadmeGenerator object that some utils depend on.
global.ReadmeGenerator = {
    state: { currentStep: 1 },
    ui: {
        hideError: jest.fn(),
        showError: jest.fn(),
    }
};

// Mock document elements that are accessed directly
document.body.innerHTML = `
    <div id="error"></div>
    <form id="readmeForm">
        <input id="projectName" value="Test Project">
        <input id="description" value="A test description.">
        <input id="apiKey" value="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx">
        <select id="apiProvider">
            <option value="openai" selected>OpenAI</option>
            <option value="gemini">Gemini</option>
        </select>
        <select id="tone">
            <option value="professional" selected>Professional</option>
            <option value="custom">Custom</option>
        </select>
        <input id="customTone" value="">
    </form>
`;

const { utils } = require('../src/modules/utils.js');

describe('utils.js', () => {
    beforeEach(() => {
        // Reset mocks before each test
        ReadmeGenerator.ui.showError.mockClear();
    });

    describe('sanitizeInput', () => {
        it('should escape HTML tags to prevent XSS', () => {
            const input = '<img src=x onerror=alert(1)>';
            const expected = '&lt;img src=x onerror=alert(1)&gt;';
            expect(utils.sanitizeInput(input)).toBe(expected);
        });

        it('should handle regular strings correctly', () => {
            const input = "This is a test.";
            expect(utils.sanitizeInput(input)).toBe(input);
        });
    });

    describe('validateApiKeyFormat', () => {
        it('should return valid for a correct OpenAI key', () => {
            expect(utils.validateApiKeyFormat('openai', 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx').valid).toBe(true);
        });

        it('should return invalid for an incorrect OpenAI key', () => {
            expect(utils.validateApiKeyFormat('openai', 'pk-123').valid).toBe(false);
        });

        it('should return valid for a correct Gemini key', () => {
            expect(utils.validateApiKeyFormat('gemini', 'AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx').valid).toBe(true);
        });

        it('should return invalid for a Gemini key of wrong length', () => {
            expect(utils.validateApiKeyFormat('gemini', 'AIzaSyxxxx').valid).toBe(false);
        });
    });

    describe('validateCurrentStep', () => {
        it('should return false and show error if project name is missing on step 2', () => {
            ReadmeGenerator.state.currentStep = 2;
            document.getElementById('projectName').value = ' ';
            document.getElementById('description').value = 'My Description';
            expect(utils.validateCurrentStep()).toBe(false);
            expect(ReadmeGenerator.ui.showError).toHaveBeenCalledWith('Project Name is a required field.');
        });
    });
});