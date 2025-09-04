/**
 * @jest-environment node
 */

const { api } = require('../src/modules/api.js');

// Mock the global fetch function
global.fetch = jest.fn();

// Mock dependencies from other modules
global.ReadmeGenerator = {
    utils: {
        checkForUnsureFields: jest.fn(),
    }
};

describe('api.js', () => {
    beforeEach(() => {
        fetch.mockClear();
        ReadmeGenerator.utils.checkForUnsureFields.mockClear();
    });

    describe('callAIAPI', () => {
        it('should call the OpenAI API with the correct parameters', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ choices: [{ message: { content: 'Test README' } }] }),
            });

            const response = await api.callAIAPI('openai', 'test-key', 'test-prompt');

            expect(fetch).toHaveBeenCalledWith(
                'https://api.openai.com/v1/chat/completions',
                expect.objectContaining({
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer test-key',
                    },
                    body: JSON.stringify({ model: 'gpt-3.5-turbo', messages: [{ role: 'user', content: 'test-prompt' }] }),
                })
            );
            expect(response).toBe('Test README');
        });

        it('should call the Gemini API with the correct parameters', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text: 'Test README' }] } }] }),
            });

            const response = await api.callAIAPI('gemini', 'test-key', 'test-prompt');

            expect(fetch).toHaveBeenCalledWith(
                'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=test-key',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: 'test-prompt' }] }] }),
                })
            );
            expect(response).toBe('Test README');
        });

        it('should throw an error on API failure', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: () => Promise.resolve({ error: { message: 'Invalid API key' } }),
            });

            await expect(api.callAIAPI('openai', 'bad-key', 'prompt')).rejects.toThrow('Invalid API key');
        });
    });

    describe('createPrompt', () => {
        it('should create a well-formed prompt from form data', () => {
            ReadmeGenerator.utils.checkForUnsureFields.mockReturnValue(false);
            const formData = {
                projectName: 'My Test App',
                description: 'It tests things.',
                tone: 'professional',
            };

            const prompt = api.createPrompt(formData);
            expect(prompt).toContain('Project Name: My Test App');
            expect(prompt).toContain('1. **Tone of Voice**: Write the entire document in a **professional** tone.');
            expect(prompt).not.toContain('SMART FILLING REQUIRED');
            expect(prompt).toContain('This README was generated with ❤️ by');
        });

        it('should include smart filling instructions if fields are unsure', () => {
            ReadmeGenerator.utils.checkForUnsureFields.mockReturnValue(true);
            const formData = {
                projectName: 'My Test App',
                description: 'It tests things.',
                projectType: 'not-sure',
                tone: 'professional',
            };

            const prompt = api.createPrompt(formData);
            expect(prompt).toContain('Project Type: not-sure');
            expect(prompt).toContain('SMART FILLING REQUIRED');
            expect(prompt).toContain('This README was generated with ❤️ by');
        });
    });
});
