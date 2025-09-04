/**
 * @jest-environment node
 */

jest.mock('node-fetch');
const fetch = require('node-fetch');
const { Response } = jest.requireActual('node-fetch');

const { api } = require('../src/modules/api.cli.js');

describe('api.cli.js', () => {
    beforeEach(() => {
        fetch.mockClear();
    });

    describe('fetchAndParseRepo', () => {
        it('should parse mainEntryPoint from package.json if it exists', async () => {
            // Mock the sequence of API calls made by fetchAndParseRepo
            const packageJson = {
                name: 'test-repo',
                version: '1.0.0',
                main: 'dist/bundle.js',
                dependencies: { 'react': '18.0.0' },
                scripts: {
                    "start": "node .",
                    "test": "jest"
                }
            };

            // 1. Repo info
            fetch.mockResolvedValueOnce(new Response(JSON.stringify({
                name: 'test-repo',
                description: 'A test repository',
                language: 'JavaScript',
                owner: { login: 'testuser' },
                license: { spdx_id: 'MIT' },
                default_branch: 'main'
            })));
            // 2. File tree
            fetch.mockResolvedValueOnce(new Response(JSON.stringify({ tree: [] })));
            // 3. package.json content
            fetch.mockResolvedValueOnce(new Response(JSON.stringify({
                content: Buffer.from(JSON.stringify(packageJson)).toString('base64')
            })));
            // 4. requirements.txt (not found)
            fetch.mockResolvedValueOnce(new Response(null, { status: 404 }));

            const data = await api.fetchAndParseRepo('testuser', 'test-repo', null);

            // Verify that the mainEntryPoint was correctly extracted
            expect(data.mainEntryPoint).toBe('dist/bundle.js');

            // Verify other data is still parsed correctly
            expect(data.projectName).toBe('test-repo');
            expect(data.dependencies).toContain('react');
            expect(data.scripts).toBe('start, test');
        });

        it('should handle repositories without a package.json gracefully', async () => {
            // 1. Repo info
            fetch.mockResolvedValueOnce(new Response(JSON.stringify({
                name: 'simple-repo',
                description: 'A simple repository',
                language: 'Python',
                owner: { login: 'testuser' },
                license: null,
                default_branch: 'main'
            })));
            // 2. File tree
            fetch.mockResolvedValueOnce(new Response(JSON.stringify({ tree: [] })));
            // 3. package.json content (not found)
            fetch.mockResolvedValueOnce(new Response(null, { status: 404 }));
            // 4. requirements.txt (not found)
            fetch.mockResolvedValueOnce(new Response(null, { status: 404 }));

            const data = await api.fetchAndParseRepo('testuser', 'simple-repo', null);

            // Verify that it falls back to defaults without crashing
            expect(data.projectName).toBe('simple-repo');
            expect(data.mainEntryPoint).toBe('not-sure');
            expect(data.scripts).toBe('not-sure');
        });

        it('should detect a LICENSE file if not specified elsewhere', async () => {
            // 1. Repo info (no license specified)
            fetch.mockResolvedValueOnce(new Response(JSON.stringify({
                name: 'license-test-repo',
                description: 'A test repository',
                language: 'Go',
                owner: { login: 'testuser' },
                license: null, // Key part of the mock
                default_branch: 'main'
            })));
            // 2. File tree (contains a LICENSE file)
            fetch.mockResolvedValueOnce(new Response(JSON.stringify({
                tree: [{ path: 'LICENSE', type: 'blob' }] // Key part of the mock
            })));
            // 3. package.json content (not found)
            fetch.mockResolvedValueOnce(new Response(null, { status: 404 }));
            // 4. requirements.txt (not found)
            fetch.mockResolvedValueOnce(new Response(null, { status: 404 }));

            const data = await api.fetchAndParseRepo('testuser', 'license-test-repo', null);

            expect(data.license).toBe('Exists (see LICENSE file)');
        });

        it('should parse requirements.txt with version specifiers', async () => {
            const requirementsContent = 'Django==3.2.12\nrequests>=2.25.1\n# a comment\nnumpy';
            // 1. Repo info
            fetch.mockResolvedValueOnce(new Response(JSON.stringify({
                name: 'python-repo',
                description: 'A python repository',
                language: 'Python',
                owner: { login: 'testuser' },
                license: null,
                default_branch: 'main'
            })));
            // 2. File tree
            fetch.mockResolvedValueOnce(new Response(JSON.stringify({ tree: [] })));
            // 3. package.json content (not found)
            fetch.mockResolvedValueOnce(new Response(null, { status: 404 }));
            // 4. requirements.txt
            fetch.mockResolvedValueOnce(new Response(JSON.stringify({
                content: Buffer.from(requirementsContent).toString('base64')
            })));

            const data = await api.fetchAndParseRepo('testuser', 'python-repo', null);

            expect(data.dependencies).toBe('Django==3.2.12, requests>=2.25.1, numpy');
        });

        it('should only fetch basic data when isPro is false', async () => {
            // Only mock the first API call for basic repo info
            fetch.mockResolvedValueOnce(new Response(JSON.stringify({
                name: 'pro-test-repo',
                description: 'A test repository for pro features',
                language: 'JavaScript',
                owner: { login: 'testuser' },
                license: { spdx_id: 'MIT' },
                default_branch: 'main'
            })));

            const data = await api.fetchAndParseRepo('testuser', 'pro-test-repo', null, false);

            // Should not have attempted to fetch file tree or other files
            expect(fetch).toHaveBeenCalledTimes(1);
            expect(data.projectName).toBe('pro-test-repo');
            // These fields are only populated by deep analysis
            expect(data.fileStructure).toBe('not-sure');
            expect(data.scripts).toBe('not-sure');
        });
    });

    describe('createPrompt', () => {
        it('should create a prompt that includes the watermark', () => {
            const data = { projectName: 'My CLI App' };
            const prompt = api.createPrompt(data, true); // Test pro prompt
            expect(prompt).toContain('Project Name: My CLI App');
            expect(prompt).toContain('This README was generated with ❤️ by');
            expect(prompt).toContain('File Structure Summary'); // A pro feature in the prompt
        });

        it('should create a different prompt for the free tier', () => {
            const data = { projectName: 'My Free App' };
            const prompt = api.createPrompt(data, false); // Test free prompt
            expect(prompt).toContain('Project Name: My Free App');
            expect(prompt).toContain('Upgrade to Pro for a more detailed and accurate README');
            expect(prompt).not.toContain('File Structure Summary');
        });
    });
});