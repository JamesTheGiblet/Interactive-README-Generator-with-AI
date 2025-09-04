/**
 * @jest-environment jsdom
 */

// Mock dependencies
global.utils = {
    sanitizeInput: jest.fn(text => text), // Simple pass-through for testing
    loadHighlightJS: jest.fn(),
};
global.PerformanceOptimizer = {
    setupLazyLoading: jest.fn(),
};

// Mock the 'marked' library
const mockMarkedRenderer = {
    image: jest.fn(),
};
global.marked = {
    parse: jest.fn(text => `<p>${text}</p>`),
    use: jest.fn(),
    Renderer: jest.fn(() => mockMarkedRenderer),
};

// Mock the 'highlight.js' library
global.hljs = {
    getLanguage: jest.fn(() => true),
    highlight: jest.fn((code, { language }) => ({ value: `<span>${code}</span>` })),
};

const { MarkdownRenderer } = require('../src/modules/markdown.js');

describe('MarkdownRenderer', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('init', () => {
        it('should initialize marked with a custom image renderer', () => {
            MarkdownRenderer.init();

            expect(marked.use).toHaveBeenCalled();
            expect(marked.Renderer).toHaveBeenCalled();

            // Test the custom image renderer function that gets passed to marked
            const customRenderer = marked.use.mock.calls[0][0].renderer;
            const imageUrl = 'test.png';
            const imageTitle = 'A test image';
            const imageAltText = 'Test Alt';
            
            const imgTag = customRenderer.image(imageUrl, imageTitle, imageAltText);

            expect(utils.sanitizeInput).toHaveBeenCalledWith(imageUrl);
            expect(utils.sanitizeInput).toHaveBeenCalledWith(imageTitle);
            expect(utils.sanitizeInput).toHaveBeenCalledWith(imageAltText);
            
            expect(imgTag).toBe(`<img data-src="test.png" alt="Test Alt" title="A test image" loading="lazy">`);
        });
    });

    describe('render', () => {
        let container;

        beforeEach(() => {
            container = document.createElement('div');
            utils.loadHighlightJS.mockResolvedValue();
        });

        it('should render markdown to the container element and set up lazy loading', async () => {
            const markdown = '**hello**';
            await MarkdownRenderer.render(markdown, container);

            expect(utils.loadHighlightJS).toHaveBeenCalled();
            expect(marked.parse).toHaveBeenCalledWith(markdown);
            expect(container.innerHTML).toBe('<p>**hello**</p>');
            expect(PerformanceOptimizer.setupLazyLoading).toHaveBeenCalledWith(container);
        });

        it('should set up syntax highlighting via marked.use', async () => {
            await MarkdownRenderer.render('```js\nconst a = 1;\n```', container);
            
            const highlightFn = marked.use.mock.calls[0][0].highlight;
            highlightFn('const a = 1;', 'js');
            
            expect(hljs.getLanguage).toHaveBeenCalledWith('js');
            expect(hljs.highlight).toHaveBeenCalledWith('const a = 1;', { language: 'js', ignoreIllegals: true });
        });

        it('should handle highlight.js loading failure gracefully', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            utils.loadHighlightJS.mockRejectedValue(new Error('Failed to load'));

            await MarkdownRenderer.render('test', container);

            expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to load highlight.js for syntax highlighting.", expect.any(Error));
            expect(marked.parse).toHaveBeenCalledWith('test');

            consoleErrorSpy.mockRestore();
        });
    });
});