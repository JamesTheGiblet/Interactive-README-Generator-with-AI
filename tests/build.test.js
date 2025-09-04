/**
 * @jest-environment node
 */

// Mock the 'fs' module to avoid actual file system operations during tests.
const fs = require('fs');
jest.mock('fs');

// Define the expected order of scripts from the build script to verify against.
const SCRIPT_ORDER = [
    'rules.js',
    'utils.js',
    'security.js',
    'accessibility.js',
    'markdown.js',
    'modal.js',
    'performance.js',
    'analytics.js',
    'api.js',
    'storage.js',
    'ui.js',
    'app.js'
];

describe('build.js', () => {
    const MOCK_TEMPLATE_CONTENT = '<html><head></head><body><!-- SCRIPT_INJECT_POINT --></body></html>';

    beforeEach(() => {
        // Reset mocks before each test to ensure isolation.
        fs.readFileSync.mockClear();
        fs.writeFileSync.mockClear();

        // Set up a mock return value for when the build script reads the template.
        fs.readFileSync.mockReturnValue(MOCK_TEMPLATE_CONTENT);
    });

    it('should read the template and write a new index.html with correctly ordered scripts', () => {
        // Use jest.isolateModules to run the script with a clean slate and our mocks.
        // This ensures that `require` executes the script logic within the test's context.
        jest.isolateModules(() => {
            require('../src/modules/build.js');
        });

        // 1. Verify that the template file was read correctly.
        expect(fs.readFileSync).toHaveBeenCalledWith(
            expect.stringContaining('index.template.html'),
            'utf-8'
        );

        // 2. Verify that the output file was written to.
        expect(fs.writeFileSync).toHaveBeenCalledTimes(1);

        // 3. Inspect the content that was written to the output file.
        const writeCallArgs = fs.writeFileSync.mock.calls[0];
        const outputPath = writeCallArgs[0];
        const outputHtml = writeCallArgs[1];

        // Check that the output path is correct.
        expect(outputPath).toContain('index.html');

        // Check that the placeholder was replaced and is no longer present.
        expect(outputHtml).not.toContain('<!-- SCRIPT_INJECT_POINT -->');

        // 4. Verify that all scripts are present and in the correct order by building the expected string.
        const expectedScriptTags = SCRIPT_ORDER
            .map(scriptFile => `    <script src="src/modules/${scriptFile}"></script>`)
            .join('\n');
        
        // Check that the generated block of script tags is present in the final HTML.
        expect(outputHtml).toContain(expectedScriptTags);
    });
});