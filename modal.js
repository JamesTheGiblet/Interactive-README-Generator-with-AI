const ModalManager = {
    init: function() {
        this.setupInsightsModal();
        this.setupExamplesModal();
    },

    setupInsightsModal: function() {
        const insightsModal = document.getElementById('insightsModal');
        if (!insightsModal) return;

        document.getElementById('insightsBtn').addEventListener('click', () => this.show(insightsModal));
        document.getElementById('modalCloseBtn').addEventListener('click', () => this.hide(insightsModal));
        
        insightsModal.addEventListener('click', (event) => {
            if (event.target === insightsModal) {
                this.hide(insightsModal);
            }
        });

        // Tab functionality
        document.querySelectorAll('#insightsModal .tab-btn').forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.dataset.tab;
                document.querySelectorAll('#insightsModal .tab-btn').forEach(btn => btn.classList.remove('active'));
                document.querySelectorAll('#insightsModal .tab-content').forEach(content => content.classList.remove('active'));
                button.classList.add('active');
                document.getElementById(`tab-${tabId}`).classList.add('active');
            });
        });
    },

    setupExamplesModal: function() {
        const examplesModal = document.getElementById('examplesModal');
        if (!examplesModal) return;

        document.getElementById('examplesBtn').addEventListener('click', () => {
            this.show(examplesModal);
            // Initialize examples content on first open
            if (!examplesModal.dataset.initialized) {
                this.initExamplesContent();
                examplesModal.dataset.initialized = 'true';
            }
        });

        document.getElementById('examplesModalCloseBtn').addEventListener('click', () => this.hide(examplesModal));
        examplesModal.addEventListener('click', (e) => {
            if (e.target === examplesModal) {
                this.hide(examplesModal);
            }
        });
    },

    initExamplesContent: function() {
        const examplesList = document.getElementById('examplesList');
        const examples = [
            { name: 'Professional', file: 'examples/README-Pro.md' },
            { name: 'Playful', file: 'examples/README-Playful.md' },
            { name: 'Friendly', file: 'examples/README-Friendly.md' },
            { name: 'Technical', file: 'examples/README-Technical.md' },
            { name: 'Sarcastic', file: 'examples/README-Sarcastic.md' },
            { name: 'AI Decided', file: 'examples/README-AI-Decided.md' }
        ];

        examplesList.innerHTML = '';
        examples.forEach((example, index) => {
            const listItem = document.createElement('li');
            listItem.textContent = example.name;
            listItem.dataset.file = example.file;
            examplesList.appendChild(listItem);

            if (index === 0) {
                listItem.classList.add('active');
                this.loadExampleContent(example.file);
            }
        });

        examplesList.addEventListener('click', (e) => {
            if (e.target.tagName === 'LI') {
                const currentActive = examplesList.querySelector('li.active');
                if (currentActive) currentActive.classList.remove('active');
                e.target.classList.add('active');
                this.loadExampleContent(e.target.dataset.file);
            }
        });
    },

    loadExampleContent: async function(filePath) {
        const examplesTabContent = document.getElementById('examplesTabContent');
        try {
            examplesTabContent.innerHTML = '<div class="spinner" style="margin: 20px auto;"></div><p style="text-align: center;">Loading example...</p>';
            const response = await fetch(filePath);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const markdown = await response.text();
            await MarkdownRenderer.render(markdown, examplesTabContent);
        } catch (error) {
            console.error('Error loading example:', error);
            examplesTabContent.innerHTML = `<div class="error" style="display:block;">Failed to load example file: ${filePath}.</div>`;
        }
    },

    show: function(modalElement) {
        if (modalElement) modalElement.style.display = 'flex';
        if (window.AccessibilityModule) AccessibilityModule.announce(`${modalElement.querySelector('h2').textContent} modal opened.`);
    },

    hide: function(modalElement) {
        if (modalElement) modalElement.style.display = 'none';
        if (window.AccessibilityModule) AccessibilityModule.announce('Modal closed.');
    }
};