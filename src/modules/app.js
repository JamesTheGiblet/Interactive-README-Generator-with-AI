//================================================================
// GLOBAL ERROR HANDLERS
//================================================================
// These listeners catch any unexpected errors that might not be handled by
// specific try/catch blocks, preventing the application from crashing silently.

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Promise Rejection:', event.reason);
    // Check if the UI is available to display the error
    if (window.ReadmeGenerator && ReadmeGenerator.ui) {
        ReadmeGenerator.ui.showError('An unexpected error occurred. Please check the console and try again.');
    }
});

window.addEventListener('error', (event) => {
    console.error('Global Error:', event.error);
    if (window.ReadmeGenerator && ReadmeGenerator.ui) {
        ReadmeGenerator.ui.showError('A critical error occurred. Please refresh the page.');
    }
});

const ReadmeGenerator = {
    // STATE & CONFIG
    state: {
        currentStep: 1,
        generatedReadme: '',
        lastFormData: null,
    },
    config: {
        totalSteps: 6,
    },

    // MODULES
    analytics: analytics,
    api: api,
    storage: storage,
    ui: ui,
    utils: utils,

    // INITIALIZATION
    init: async function() {
        // Theme switcher logic
        const themeCheckbox = document.getElementById('theme-checkbox');

        // The <head> script has already set the theme. We just need to sync the checkbox state.
        themeCheckbox.checked = document.documentElement.classList.contains('dark-theme');

        // Update theme on toggle
        themeCheckbox.addEventListener('change', () => {
            const isDarkMode = themeCheckbox.checked;
            // Toggle the class on the <html> element to match the CSS and the initial script
            document.documentElement.classList.toggle('dark-theme', isDarkMode);
            localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        });

        MarkdownRenderer.init();
        ModalManager.init();
        AccessibilityModule.init();

        // Event Listeners
        document.getElementById('tone').addEventListener('change', (e) => {
            document.getElementById('customToneGroup').classList.toggle('hidden', e.target.value !== 'custom');
        });

        const debouncedUpdate = utils.debounce(() => {
            this.storage.saveDraft();
            this.ui.updateLivePreview();
        }, 500);
        document.getElementById('readmeForm').addEventListener('input', (e) => {
            if (e.target.matches('input, textarea, select')) {
                debouncedUpdate();
            }
        });

        document.getElementById('apiProvider').addEventListener('change', () => this.ui.updateApiHelpText());
        document.getElementById('projectType').addEventListener('change', () => this.ui.updateFieldVisibility());
        document.getElementById('analyzeRepoBtn').addEventListener('click', () => this.events.handleRepoAnalysis());

        // Handle the main progression button (Next / Generate)
        document.getElementById('nextBtn').addEventListener('click', () => {
            if (this.state.currentStep === this.config.totalSteps) {
                this.generateReadme();
            } else {
                this.events.nextStep();
            }
        });

        // Initial Data Load
        this.storage.loadDraft();
        this.storage.loadTemplates();
        await this.storage.loadApiKeyFromStorage();
        this.ui.updateApiHelpText();
        this.ui.showStep(this.state.currentStep);
        PerformanceOptimizer.init();

        await this.events.handleShareableLink();
    },

    //================================================================
    // EVENT HANDLERS & CONTROLLERS
    //================================================================
    events: {
        nextStep: function() {
            if (ReadmeGenerator.utils.validateCurrentStep()) {
                if (ReadmeGenerator.state.currentStep < ReadmeGenerator.config.totalSteps) {
                    ReadmeGenerator.ui.showStep(ReadmeGenerator.state.currentStep + 1);
                }
            }
        },

        previousStep: function() {;
            if (ReadmeGenerator.state.currentStep > 1) {
                ReadmeGenerator.ui.showStep(ReadmeGenerator.state.currentStep - 1);
            }
        },

        handleRepoAnalysis: async function() {;
            const repoUrl = document.getElementById('githubRepoUrl').value.trim();
            const token = document.getElementById('githubPat').value.trim();
        
            if (!repoUrl) {
                ReadmeGenerator.ui.showError("Please enter a GitHub repository URL.");
                return;
            }
        
            let owner, repo;
            try {
                const url = new URL(repoUrl);
                if (url.hostname !== 'github.com') {
                    throw new Error();
                }
                [owner, repo] = url.pathname.substring(1).split('/').slice(0, 2);
            } catch (e) {
                ReadmeGenerator.ui.showError("Invalid GitHub repository URL format. Please use a full URL like https://github.com/user/repo.");
                return;
            }
        
            if (!owner || !repo) {
                ReadmeGenerator.ui.showError("Invalid GitHub repository URL format. Could not extract owner and repository.");
                return;
            }
        
            const analyzeBtn = document.getElementById('analyzeRepoBtn');
            analyzeBtn.disabled = true;
            analyzeBtn.textContent = 'Analyzing...';
            ReadmeGenerator.ui.showInfoMessage(`Analyzing ${owner}/${repo}...`);
        
            try {
                const repoData = await ReadmeGenerator.api.fetchAndParseRepo(owner, repo, token);
                ReadmeGenerator.utils.populateForm(repoData);
                ReadmeGenerator.ui.showInfoMessage(`Analysis complete! Form has been pre-filled.`);
                AccessibilityModule.announce(`Repository analysis complete. Form has been pre-filled.`);
                setTimeout(() => ReadmeGenerator.ui.hideError(), 5000);
            } catch (error) {
                console.error("Repo analysis failed:", error);
                ReadmeGenerator.ui.showError(error.message || "Failed to analyze repository. Check the URL, token, and browser console.");
            } finally {
                analyzeBtn.disabled = false;
                analyzeBtn.textContent = 'Analyze Repository';
            }
        },

        changeToneAndRegenerate: async function() {
            if (!ReadmeGenerator.state.lastFormData) return;

            const resultToneSelect = document.getElementById('resultTone');
            let newTone = resultToneSelect.value;

            if (newTone === 'custom') {
                newTone = document.getElementById('resultCustomTone').value.trim();
                if (!newTone) {
                    ReadmeGenerator.ui.showError("Please enter a custom tone before regenerating.");
                    document.getElementById('resultCustomTone').focus();
                    return;
                }
            }
            ReadmeGenerator.state.lastFormData.tone = newTone;

            const preview = document.getElementById('preview');
            const downloadBtn = document.getElementById('downloadBtn');

            preview.innerHTML = `<div class="loading" style="display: block; padding: 40px;"><div class="spinner"></div><p>Applying new tone...</p></div>`;
            downloadBtn.classList.add('is-loading');
            resultToneSelect.disabled = true;

            try {
                const prompt = ReadmeGenerator.api.createPrompt(ReadmeGenerator.state.lastFormData);
                const readme = await ReadmeGenerator.api.callAIAPI(ReadmeGenerator.state.lastFormData.apiProvider, ReadmeGenerator.state.lastFormData.apiKey, prompt);
                
                ReadmeGenerator.state.generatedReadme = readme;
                ReadmeGenerator.ui.displayResult(readme);
                
            } catch (error) {
                console.error('Error regenerating README:', error);
                preview.innerHTML = marked.parse(ReadmeGenerator.state.generatedReadme);
                ReadmeGenerator.ui.showError(ReadmeGenerator.api.getApiErrorMessage(error, ReadmeGenerator.state.lastFormData.apiProvider));
                downloadBtn.classList.remove('is-loading');
                resultToneSelect.disabled = false;
            }
        },

        /**
         * Runs an A/B test by generating a README with the alternate AI provider
         * and displaying the results side-by-side.
         */
        runABTest: async function() {
            if (!ReadmeGenerator.state.lastFormData) return;

            const originalProvider = ReadmeGenerator.state.lastFormData.apiProvider;
            const alternateProvider = originalProvider === 'gemini' ? 'openai' : 'gemini';
            
            const abTestBtn = document.getElementById('abTestBtn');
            abTestBtn.textContent = '🧪 Testing...';
            abTestBtn.disabled = true;

            try {
                // Prepare the data for the alternate provider
                const alternateData = { ...ReadmeGenerator.state.lastFormData, apiProvider: alternateProvider };
                const prompt = ReadmeGenerator.api.createPrompt(alternateData);
                const alternateReadme = await ReadmeGenerator.api.callAIAPI(alternateProvider, ReadmeGenerator.state.lastFormData.apiKey, prompt);

                // Hide main result and form, show A/B test view
                ReadmeGenerator.ui.setView('ab-test');

                // Populate A/B test view
                const abPreview1 = document.getElementById('abPreview1');
                const abPreview2 = document.getElementById('abPreview2');

                document.getElementById('abColumn1Header').textContent = originalProvider === 'gemini' ? 'Gemini Result' : 'OpenAI Result';
                await MarkdownRenderer.render(ReadmeGenerator.state.generatedReadme, abPreview1);
                AccessibilityModule.announce("Comparison view ready.");

                document.getElementById('abColumn2Header').textContent = alternateProvider === 'gemini' ? 'Gemini Result' : 'OpenAI Result';
                await MarkdownRenderer.render(alternateReadme, abPreview2);

            } catch (error) {
                console.error('A/B Test Error:', error);
                ReadmeGenerator.ui.showError(ReadmeGenerator.api.getApiErrorMessage(error, alternateProvider));
            } finally {
                const otherProviderName = alternateProvider === 'gemini' ? 'Gemini' : 'OpenAI';
                abTestBtn.textContent = `🔄 Compare with ${otherProviderName}`;
                abTestBtn.disabled = false;
            }
        },

        startOver: function() {
            ReadmeGenerator.state.currentStep = 1;
            ReadmeGenerator.state.generatedReadme = '';
            ReadmeGenerator.state.lastFormData = null;
            localStorage.removeItem('readmeGenerator_draft');
            
            document.querySelectorAll('input, textarea, select').forEach(input => {
                if (input.type === 'checkbox') {
                    input.checked = ['includeInstall', 'includeUsage', 'includeContrib'].includes(input.id);
                } else if (input.id !== 'apiProvider') {
                    input.value = '';
                }
            });
            
            ReadmeGenerator.storage.loadApiKeyFromStorage();

            document.getElementById('result').style.display = 'none';
            document.getElementById('navigation').style.display = 'flex';
            ReadmeGenerator.ui.showStep(1);
            ReadmeGenerator.ui.hideError();
        },

        handleShareableLink: async function() {
            if (window.location.hash.startsWith('#data=')) {
                ReadmeGenerator.ui.showSkeleton();
                const encodedData = window.location.hash.substring(6);
                try {
                    await new Promise(resolve => setTimeout(resolve, 50));

                    const compressedString = atob(encodedData);
                    const jsonString = pako.inflate(compressedString, { to: 'string' });
                    const data = JSON.parse(jsonString);

                    ReadmeGenerator.utils.populateForm(data);

                    ReadmeGenerator.ui.showStep(1);
                    ReadmeGenerator.ui.showInfoMessage('Shared project data has been loaded. Please provide your API key to proceed.');

                    history.replaceState(null, document.title, window.location.pathname + window.location.search);
                } catch (error) {
                    console.error('Failed to load from shareable link:', error);
                    self.ui.showError('The shareable link appears to be corrupted or invalid.');
                } finally {
                    ReadmeGenerator.ui.hideSkeleton();
                }
            };
        },
    },

    // This is the main application logic function that was previously global
    generateReadme: async function() {
        const self = this;
        const apiKey = document.getElementById('apiKey').value.trim();
        if (!apiKey) { 
            self.ui.showError('API Key is missing. Please return to Step 1 to enter it.');
            self.ui.showStep(1);
            return;
        }
        await self.storage.handleApiKeyStorage();

        const data = self.utils.collectFormData();
        self.state.lastFormData = data;
        
        // Track the generation event for analytics
        self.analytics.trackEvent('readme_generated', {
            provider: data.apiProvider,
            projectType: data.projectType,
            language: data.mainLanguage,
        });

        self.ui.setView('loading');
        
        try {
            const prompt = self.api.createPrompt(data);
            const readme = await self.api.callAIAPI(data.apiProvider, apiKey, prompt);
            
            self.state.generatedReadme = readme;
            self.ui.displayResult(readme);
            
        } catch (error) {
            console.error('Error generating README:', error);
            self.ui.showError(self.api.getApiErrorMessage(error, data.apiProvider));
            
            self.ui.setView('form');
        }
    },
};
 
document.addEventListener('DOMContentLoaded', () => {
    ReadmeGenerator.init();
});
