/**
 * @jest-environment node
 */
const { version } = require('../package.json');

// Mock dependencies before importing the cli module
jest.mock('fs');
jest.mock('../src/modules/api.cli.js');

describe('cli.js', () => {
    let consoleLogSpy, consoleErrorSpy, processExitSpy, stdoutWriteSpy;
    let main, parseArgs, api, fs;

    beforeEach(() => {
        // Reset mocks and spies
        jest.resetModules();
        jest.clearAllMocks();

        // Spy on console and process methods to track CLI output and behavior
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        // Mock process.exit to prevent tests from terminating
        processExitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
            throw new Error(`process.exit called with code ${code}`);
        });
        stdoutWriteSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => {});

        // Set default process.argv for each test
        process.argv = ['node', 'cli.js'];

        // Import modules inside beforeEach AFTER resetting modules to get fresh mocks
        fs = require('fs');
        api = require('../src/modules/api.cli.js').api;
        const cli = require('../src/modules/cli.js');
        main = cli.main;
        parseArgs = cli.parseArgs;
    });

    afterEach(() => {
        // Restore original methods
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        processExitSpy.mockRestore();
        stdoutWriteSpy.mockRestore();
    });

    describe('Argument Parsing and Usage', () => {
        it('should print usage information and exit if --repo is missing', async () => {
            process.argv.push('--key', 'some-key');

            await expect(main()).rejects.toThrow('process.exit called with code 1');

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Usage: node cli.js'));
            expect(processExitSpy).toHaveBeenCalledWith(1);
        });

        it('should print usage information and exit if --key is missing', async () => {
            process.argv.push('--repo', 'https://github.com/user/repo');
            
            await expect(main()).rejects.toThrow('process.exit called with code 1');
            
            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('--key <api_key> is required.'));
            expect(processExitSpy).toHaveBeenCalledWith(1);
        });

        it('should print the version and exit when --version is used', async () => {
            process.argv.push('--version');
            await main();
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining(version));
            expect(processExitSpy).not.toHaveBeenCalled();
        });

        it('should print the version and exit when -v is used', async () => {
            process.argv.push('-v');
            await main();
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining(version));
        });
    });

    describe('Successful Generation', () => {
        it('should run in pro mode when --pro is used', async () => {
            process.argv.push('--repo', 'https://github.com/user/repo', '--key', 'test-api-key', '--provider', 'gemini', '--pro');

            // Mock the API methods
            api.fetchAndParseRepo.mockResolvedValue({ projectName: 'repo' });
            api.createPrompt.mockReturnValue('Test prompt');
            api.callAIAPI.mockResolvedValue('## Generated README');

            await expect(main()).resolves.toBeUndefined();

            expect(api.fetchAndParseRepo).toHaveBeenCalledWith('user', 'repo', undefined, true);
            expect(api.createPrompt).toHaveBeenCalledWith(expect.any(Object), true);
            expect(fs.writeFileSync).toHaveBeenCalledWith('README.md', '## Generated README');
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Running in Pro Mode'));
        });

        it('should use the --out argument to specify the output file', async () => {
            process.argv.push('--repo', 'https://github.com/user/repo', '--key', 'test-key', '--out', 'CUSTOM_README.md');

            // Mock the API methods
            api.fetchAndParseRepo.mockResolvedValue({ projectName: 'repo' });
            api.createPrompt.mockReturnValue('Test prompt');
            api.callAIAPI.mockResolvedValue('## Custom README');

            await expect(main()).resolves.toBeUndefined();

            expect(fs.writeFileSync).toHaveBeenCalledWith('CUSTOM_README.md', '## Custom README');
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Successfully saved to'));
        });

        it('should pass the --token argument to the GitHub API call', async () => {
            const fakeToken = 'ghp_fake_token_string';
            process.argv.push('--repo', 'https://github.com/user/private-repo', '--key', 'test-key', '--token', fakeToken, '--pro');

            // Mock the API methods
            api.fetchAndParseRepo.mockResolvedValue({ projectName: 'private-repo' });
            api.createPrompt.mockReturnValue('Test prompt');
            api.callAIAPI.mockResolvedValue('## Private Repo README');

            await expect(main()).resolves.toBeUndefined();

            expect(api.fetchAndParseRepo).toHaveBeenCalledWith('user', 'private-repo', fakeToken, true);
        });

        it('should run in free mode by default', async () => {
            process.argv.push('--repo', 'https://github.com/user/repo', '--key', 'test-key');

            api.fetchAndParseRepo.mockResolvedValue({ projectName: 'repo' });
            api.createPrompt.mockReturnValue('Free prompt');
            api.callAIAPI.mockResolvedValue('## Free README');

            await expect(main()).resolves.toBeUndefined();

            expect(api.fetchAndParseRepo).toHaveBeenCalledWith('user', 'repo', undefined, false); // isPro = false
            expect(api.createPrompt).toHaveBeenCalledWith(expect.any(Object), false); // isPro = false
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Running in Free Mode'));
        });
    });

    describe('Error Handling', () => {
        it('should handle GitHub API failures gracefully', async () => {
            process.argv.push('--repo', 'https://github.com/user/repo', '--key', 'test-api-key');

            // Mock the API to throw an error
            api.fetchAndParseRepo.mockImplementation(async () => {
                throw new Error('Repository not found or access denied.');
            });

            await expect(main()).rejects.toThrow('process.exit called with code 1');

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error: Repository not found or access denied.'));
            expect(api.callAIAPI).not.toHaveBeenCalled();
        });

        it('should handle AI API failures gracefully', async () => {
            process.argv.push('--repo', 'https://github.com/user/repo', '--key', 'bad-key', '--provider', 'openai');

            api.createPrompt.mockReturnValue('Test prompt');
            api.fetchAndParseRepo.mockResolvedValue({ projectName: 'repo' });
            api.callAIAPI.mockImplementation(async () => {
                throw new Error('Invalid key');
            });

            await expect(main()).rejects.toThrow('process.exit called with code 1');

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error: Invalid key'));
        });

        it('should handle invalid GitHub URL format', async () => {
            process.argv.push('--repo', 'not-a-url', '--key', 'test-api-key');

            await expect(main()).rejects.toThrow('process.exit called with code 1');

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid GitHub repository URL format.'));
            expect(api.fetchAndParseRepo).not.toHaveBeenCalled();
        });
    });
});