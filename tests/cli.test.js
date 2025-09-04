/**
 * @jest-environment node
 */

// Mock dependencies before importing the cli module
jest.mock('fs');
jest.mock('node-fetch');

const fs = require('fs');
const fetch = require('node-fetch');
const { Response } = jest.requireActual('node-fetch');

describe('cli.js', () => {
    let consoleLogSpy, consoleErrorSpy, processExitSpy, stdoutWriteSpy;
    let main, parseArgs, api;

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

        // Import the module inside beforeEach to get a fresh version with mocks
        const cli = require('../src/modules/cli.js');
        main = cli.main;
        parseArgs = cli.parseArgs;
        api = cli.api;
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
            
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Usage: node cli.js'));
            expect(processExitSpy).toHaveBeenCalledWith(1);
        });
    });

    describe('Successful Generation', () => {
        it('should analyze, generate, and save a README with correct arguments', async () => {
            process.argv.push('--repo', 'https://github.com/user/repo', '--key', 'test-api-key', '--provider', 'gemini');

            // Mock the sequence of fetch calls
            fetch
                // GitHub API: Get repo info
                .mockResolvedValueOnce(new Response(JSON.stringify({ name: 'repo', description: 'A test repo', default_branch: 'main' })))
                // GitHub API: Get file tree
                .mockResolvedValueOnce(new Response(JSON.stringify({ tree: [] })))
                // Gemini API call
                .mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '## Generated README' }] } }] })));

            await main();

            // Verify GitHub API was called
            expect(fetch).toHaveBeenCalledWith(expect.stringContaining('https://api.github.com/repos/user/repo'), expect.any(Object));
            // Verify Gemini API was called
            expect(fetch).toHaveBeenCalledWith(expect.stringContaining('https://generativelanguage.googleapis.com'), expect.any(Object));
            // Verify the file was written
            expect(fs.writeFileSync).toHaveBeenCalledWith('README.md', '## Generated README');
            // Verify success message
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Successfully saved to'));
        });
    });

    describe('Error Handling', () => {
        it('should handle GitHub API failures gracefully', async () => {
            process.argv.push('--repo', 'https://github.com/user/repo', '--key', 'test-api-key');

            // Mock a failed fetch call to GitHub
            fetch.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 }));

            await expect(main()).rejects.toThrow('process.exit called with code 1');

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error: Not Found'));
        });

        it('should handle AI API failures gracefully', async () => {
            process.argv.push('--repo', 'https://github.com/user/repo', '--key', 'bad-key', '--provider', 'openai');

            fetch
                .mockResolvedValueOnce(new Response(JSON.stringify({ name: 'repo', default_branch: 'main' })))
                .mockResolvedValueOnce(new Response(JSON.stringify({ tree: [] })))
                .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: 'Invalid key' } }), { status: 401 }));

            await expect(main()).rejects.toThrow('process.exit called with code 1');

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error: Invalid key'));
        });
    });
});