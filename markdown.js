const MarkdownRenderer = {
    init: function() {
        if (!window.marked) {
            console.error("marked.js is not loaded. Markdown rendering will not work.");
            return;
        }

        const renderer = new marked.Renderer();
        
        // Custom image renderer for lazy loading
        renderer.image = (href, title, text) => {
            // Assumes utils.sanitizeInput is available globally
            const sanitizedHref = utils.sanitizeInput(href);
            const sanitizedTitle = title ? `title="${utils.sanitizeInput(title)}"` : '';
            const sanitizedText = utils.sanitizeInput(text);
            // Add loading="lazy" for native browser lazy loading as a fallback
            return `<img data-src="${sanitizedHref}" alt="${sanitizedText}" ${sanitizedTitle} loading="lazy">`;
        };

        marked.use({ renderer });
    },

    /**
     * Renders markdown string into a container element, with syntax highlighting and lazy loading.
     * @param {string} markdownText The markdown string to render.
     * @param {HTMLElement} containerElement The element to render the HTML into.
     */
    render: async function(markdownText, containerElement) {
        if (!containerElement) {
            console.error("Render container not provided.");
            return;
        }

        try {
            await utils.loadHighlightJS();
            marked.use({
                highlight: function (code, lang) {
                    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
                    return hljs.highlight(code, { language, ignoreIllegals: true }).value;
                }
            });
        } catch (error) {
            console.error("Failed to load highlight.js for syntax highlighting.", error);
        }

        containerElement.innerHTML = marked.parse(markdownText || '');
        
        if (window.PerformanceOptimizer) {
            PerformanceOptimizer.setupLazyLoading(containerElement);
        }
    }
};