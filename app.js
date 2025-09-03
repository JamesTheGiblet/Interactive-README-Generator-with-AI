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
            document.getElementById('customToneGroup').style.display = e.target.value === 'custom' ? 'block' : 'none';
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
    // UI METHODS
    //================================================================
    ui: {
        showStep: function(step) {
            const self = ReadmeGenerator; // Reference to parent object
            self.state.currentStep = step;

            document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
            document.querySelector(`[data-step="${step}"]`).classList.add('active');
            
            const prevBtn = document.getElementById('prevBtn');
            const nextBtn = document.getElementById('nextBtn');
            
            prevBtn.style.display = step > 1 ? 'block' : 'none';
            
            if (step === self.config.totalSteps) {
                nextBtn.textContent = '🚀 Generate README';
            } else {
                nextBtn.textContent = 'Next →';
            }
            
            self.ui.updateProgress(self.state.currentStep, self.config.totalSteps);
            AccessibilityModule.announce(`Step ${step} of ${self.config.totalSteps} shown: ${document.querySelector(`[data-step="${step}"] h2`).textContent}`);

            const previewColumn = document.getElementById('preview-column');
            if (step > 1 && step <= self.config.totalSteps) {
                previewColumn.style.display = 'block';
                self.ui.updateLivePreview();
            } else {
                previewColumn.style.display = 'none';
            }
        },

        updateProgress: function(currentStep, totalSteps) {
            const progress = (currentStep / totalSteps) * 100;
            document.querySelector('.progress-bar').setAttribute('aria-valuenow', currentStep);
            document.getElementById('progressFill').style.width = `${progress}%`;
            document.getElementById('stepIndicator').textContent = `Step ${currentStep} of ${totalSteps}`;
        },

        showError: function(message) {
            const errorDiv = document.getElementById('error');
            errorDiv.style.background = 'var(--error-bg)';
            errorDiv.style.border = '1px solid var(--error-border)';
            errorDiv.style.color = 'var(--error-text)';
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            errorDiv.scrollIntoView({ behavior: 'smooth' });
            AccessibilityModule.announce(`Error: ${message}`);
        },

        showInfoMessage: function(message) {
            const infoDiv = document.getElementById('error');
            infoDiv.textContent = message;
            infoDiv.style.background = 'var(--info-bg)';
            infoDiv.style.color = 'var(--info-text)';
            infoDiv.style.border = '1px solid var(--info-border)';
            infoDiv.style.display = 'block';
            infoDiv.scrollIntoView({ behavior: 'smooth' });
            AccessibilityModule.announce(`Info: ${message}`);
        },

        hideError: function() {
            document.getElementById('error').style.display = 'none';
        },

        updateLivePreview: function() {
            const self = ReadmeGenerator;
            if (self.state.currentStep > 1 && self.state.currentStep <= self.config.totalSteps) {
                const formData = self.utils.collectFormData();
                const draftMarkdown = self.ui.generateDraftMarkdown(formData);
                const livePreviewEl = document.getElementById('live-preview'); 
                MarkdownRenderer.render(draftMarkdown, livePreviewEl);
            }
        },

        generateDraftMarkdown: function(data) {
            let md = `# ${data.projectName || 'Your Project Name'}\n\n`;

            if (data.license && data.license !== 'not-sure' && data.license !== 'Custom') {
                md += `!License: ${data.license}\n\n`;
            }

            md += `${data.description || '*A brief and engaging description of your project will appear here.*'}\n\n`;

            const toc = [];
            if (data.features) toc.push(`- Features`);
            if (data.includeInstall) toc.push(`- Installation`);
            if (data.includeUsage) toc.push(`- Usage`);
            if (data.includeAPI) toc.push(`- API Documentation`);
            if (data.includeContrib) toc.push(`- Contributing`);
            if (data.license && data.license !== 'not-sure') toc.push(`- License`);

            if (toc.length > 0) {
                md += `## Table of Contents\n\n${toc.join('\n')}\n\n`;
            }

            if (data.features) md += `## ✨ Features\n\n- ${data.features.replace(/\n/g, '\n- ')}\n\n`;

            if (data.includeInstall) {
                md += `## 🛠️ Installation\n\n`;
                md += data.installation ? `\`\`\`bash\n${data.installation}\n\`\`\`\n\n` : `*Installation instructions will be generated here based on your tech stack.*\n\n`;
            }

            if (data.includeUsage) {
                md += `## 🚀 Usage\n\n`;
                md += data.usage ? `\`\`\`javascript\n${data.usage}\n\`\`\`\n\n` : `*Usage examples will be generated here based on your project type.*\n\n`;
            }
            
            if (data.includeAPI) md += `## API Documentation\n\n*API documentation will be generated here if requested.*\n\n`;
            if (data.includeContrib) md += `## 🤝 Contributing\n\n*Standard contributing guidelines will be generated here.*\n\n`;
            if (data.license && data.license !== 'not-sure') md += `## 📄 License\n\nThis project is licensed under the ${data.license} License.\n\n`;

            return md;
        },

        displayResult: async function(readme) {
            const self = ReadmeGenerator;
            document.getElementById('loading').style.display = 'none';
            document.getElementById('result').style.display = 'block';
            localStorage.removeItem('readmeGenerator_draft');
            
            const preview = document.getElementById('preview');
            await MarkdownRenderer.render(readme, preview);
            
            self.ui.setupDownload(readme);

            AccessibilityModule.announce("README generated successfully. You can now preview, download, or copy the content.");
            const copyBtn = document.getElementById('copyBtn');
            copyBtn.onclick = () => self.ui.copyMarkdownToClipboard();
            copyBtn.textContent = '📋 Copy Markdown';
            copyBtn.disabled = false;

            document.getElementById('pdfBtn').onclick = () => self.utils.exportToPDF(readme);
            document.getElementById('htmlBtn').onclick = () => self.utils.exportToHTML(readme);

            const shareBtn = document.getElementById('shareBtn');
            shareBtn.onclick = () => self.utils.generateShareableLink();
            shareBtn.textContent = '🔗 Share Link';
            shareBtn.disabled = false;

            // Setup Preview Theme Toggle
            const appTheme = document.documentElement.classList.contains('dark-theme') ? 'dark' : 'light';
            const savedPreviewTheme = localStorage.getItem('readmePreviewTheme');
            const initialPreviewTheme = savedPreviewTheme || appTheme; // Use saved, or default to app theme
            self.ui.setPreviewTheme(initialPreviewTheme);

            document.getElementById('previewThemeLightBtn').onclick = () => self.ui.setPreviewTheme('light');
            document.getElementById('previewThemeDarkBtn').onclick = () => self.ui.setPreviewTheme('dark');

            const saveTemplateBtn = document.querySelector('.result .button-group button[onclick="ReadmeGenerator.saveTemplate()"]');
            saveTemplateBtn.textContent = '💾 Save as Template';
            saveTemplateBtn.disabled = false;

            // Setup A/B Test Button
            const abTestBtn = document.getElementById('abTestBtn');
            const otherProvider = self.state.lastFormData.apiProvider === 'gemini' ? 'OpenAI' : 'Gemini';
            abTestBtn.textContent = `🔄 Compare with ${otherProvider}`;
            abTestBtn.onclick = () => self.events.runABTest();
            abTestBtn.style.display = 'block';

            const resultToneSelect = document.getElementById('resultTone');
            const resultCustomToneGroup = document.getElementById('resultCustomToneGroup');
            const resultCustomToneInput = document.getElementById('resultCustomTone');
            const downloadBtn = document.getElementById('downloadBtn');

            if (self.state.lastFormData) {
                const isStandardTone = [...resultToneSelect.options].some(opt => opt.value === self.state.lastFormData.tone);
                if (isStandardTone) {
                    resultToneSelect.value = self.state.lastFormData.tone;
                    resultCustomToneGroup.style.display = 'none';
                } else {
                    resultToneSelect.value = 'custom';
                    resultCustomToneInput.value = self.state.lastFormData.tone;
                    resultCustomToneGroup.style.display = 'block';
                }
            }

            const handleResultToneChange = () => {
                if (resultToneSelect.value === 'custom') {
                    resultCustomToneGroup.style.display = 'block';
                    resultCustomToneInput.focus();
                } else {
                    resultCustomToneGroup.style.display = 'none';
                    self.events.changeToneAndRegenerate();
                }
            };

            const handleCustomToneEnter = (e) => {
                if (e.key === 'Enter') self.events.changeToneAndRegenerate();
            };

            resultToneSelect.onchange = handleResultToneChange;
            resultCustomToneInput.onkeypress = handleCustomToneEnter;
            resultToneSelect.disabled = false;
            downloadBtn.style.pointerEvents = 'auto';
            downloadBtn.style.opacity = '1';
        },

        setPreviewTheme: function(theme) {
            const preview = document.getElementById('preview');
            const lightBtn = document.getElementById('previewThemeLightBtn');
            const darkBtn = document.getElementById('previewThemeDarkBtn');
            const lightHljs = document.getElementById('hljs-light-theme');
            const darkHljs = document.getElementById('hljs-dark-theme');

            preview.classList.toggle('preview-light-theme', theme === 'light');
            preview.classList.toggle('preview-dark-theme', theme === 'dark');
            lightBtn.classList.toggle('active', theme === 'light');
            darkBtn.classList.toggle('active', theme === 'dark');
            lightHljs.disabled = (theme !== 'light');
            darkHljs.disabled = (theme !== 'dark');

            localStorage.setItem('readmePreviewTheme', theme);
        },

        editDetails: function() {
            const self = ReadmeGenerator;
            document.getElementById('result').style.display = 'none';
            document.getElementById('preview-column').style.display = 'block';
            document.getElementById('navigation').style.display = 'flex';
            self.ui.showStep(self.config.totalSteps);
            self.ui.hideError();
        },

        /**
         * Hides the A/B test comparison view and shows the single result view.
         */
        exitABTest: function() {
            document.querySelector('.main-layout').style.display = 'flex';
            document.getElementById('abTestResult').style.display = 'none';
            document.getElementById('result').style.display = 'block';
        },

        setupDownload: function(readme) {
            const downloadBtn = document.getElementById('downloadBtn');
            const blob = new Blob([readme], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            downloadBtn.href = url;
            downloadBtn.download = 'README.md';
        },

        copyMarkdownToClipboard: function() {
            const self = ReadmeGenerator;
            if (!self.state.generatedReadme) return;

            navigator.clipboard.writeText(self.state.generatedReadme).then(() => {
                const copyBtn = document.getElementById('copyBtn');
                copyBtn.textContent = '✅ Copied!';
                AccessibilityModule.announce("Copied to clipboard.");
                copyBtn.disabled = true;
                setTimeout(() => {
                    copyBtn.textContent = '📋 Copy Markdown';
                    copyBtn.disabled = false;
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                self.ui.showError('Could not copy to clipboard.');
            });
        },

        updateApiHelpText: function() {
            const provider = document.getElementById('apiProvider').value;
            const helpText = document.getElementById('apiKeyHelp');
            const apiKeyInput = document.getElementById('apiKey');
            const providerInfo = document.getElementById('apiProviderInfo');
            if (provider === 'gemini') {
                helpText.innerHTML = 'Get your free API key from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener">Google AI Studio</a>';
                apiKeyInput.placeholder = 'Enter your Gemini API key';
                providerInfo.textContent = 'Using Gemini 1.5 Flash. Great for large context and creative tasks. Pricing is competitive.';
            } else if (provider === 'openai') {
                helpText.innerHTML = 'Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener">OpenAI Platform</a>';
                apiKeyInput.placeholder = 'Enter your OpenAI API key';
                providerInfo.textContent = 'Using GPT-3.5-Turbo. Generally cost-effective and very fast for most README generation tasks.';
            }
        },

        updateFieldVisibility: function() {
            const projectType = document.getElementById('projectType').value;
            const apiField = document.querySelector('[data-field="api"]');
            
            if (['web-app', 'api', 'mobile-app', 'library', 'desktop-app'].includes(projectType)) {
                apiField.style.display = 'flex';
            } else {
                apiField.style.display = 'none';
                document.getElementById('includeAPI').checked = false;
            }
        },

        showSkeleton: function() {
            document.querySelectorAll('.step input, .step textarea, .step select').forEach(el => {
                el.classList.add('skeleton');
                el.disabled = true;
            });
        },

        hideSkeleton: function() {
            document.querySelectorAll('.step input, .step textarea, .step select').forEach(el => {
                el.classList.remove('skeleton');
                el.disabled = false;
            });
        },
    },

    //================================================================
    // API & DATA METHODS
    //================================================================
    analytics: {
        /**
         * Tracks a usage event. In a real application, this would send data to a backend.
         * For now, it logs to the console for demonstration purposes.
         * @param {string} eventName - The name of the event (e.g., 'readme_generated').
         * @param {object} eventData - An object containing data about the event.
         */
        trackEvent: function(eventName, eventData) {
            console.log(`[Analytics Event] ${eventName}:`, eventData);
            // In a real application, this would be an API call:
            // fetch('/api/analytics', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ eventName, ...eventData })
            // }).catch(err => console.error('Analytics tracking failed:', err));
        }
    },

    api: {
        callAIAPI: async function(provider, apiKey, prompt) {
            let url, options;
            if (provider === 'gemini') {
                url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
                options = {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                };
            } else if (provider === 'openai') {
                url = 'https://api.openai.com/v1/chat/completions';
                options = {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({ model: 'gpt-3.5-turbo', messages: [{ role: 'user', content: prompt }] })
                };
            } else {
                throw new Error(`Unsupported API provider: ${provider}`);
            }

            const response = await fetch(url, options);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = (provider === 'gemini' ? errorData.error?.message : errorData.error?.message) || `API request failed with status ${response.status}`;
                const error = new Error(errorMessage);
                error.status = response.status;
                throw error;
            }

            const data = await response.json();

            if (provider === 'gemini') {
                if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                    throw new Error('Invalid response from Gemini API');
                }
                return data.candidates[0].content.parts[0].text;
            } else { // openai
                if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                    throw new Error('Invalid response from OpenAI API');
                }
                return data.choices[0].message.content;
            }
        },

        createPrompt: function(data) {
            const self = ReadmeGenerator;
            const hasUnsureFields = self.utils.checkForUnsureFields(data);
            
            // Provider-specific optimization: Tweak the main instruction based on the provider.
            let instructionsHeader = `Create a comprehensive, professional README.md file for the following project:`;
            if (data.apiProvider === 'openai') {
                // OpenAI models can benefit from a more explicit role-playing instruction.
                instructionsHeader = `As an expert technical writer specializing in developer documentation, create a comprehensive, professional README.md file for the following project:`;
            }

            let prompt = `${instructionsHeader}

Project Name: ${data.projectName}
Description: ${data.description}
Project Type: ${data.projectType}
Primary Language: ${data.mainLanguage}
Frameworks/Technologies: ${data.frameworks}
Dependencies: ${data.dependencies}
Features: ${data.features}
Demo/Screenshots: ${data.demo}
Installation: ${data.installation}
Usage: ${data.usage}
Requirements: ${data.requirements}
License: ${data.license}
Author: ${data.author}
Contact: ${data.contact}
Acknowledgments: ${data.acknowledgments}

Include sections for:
${data.includeInstall ? '- Installation instructions' : ''}
${data.includeUsage ? '- Usage examples with code blocks' : ''}
${data.includeAPI ? '- API documentation' : ''}
${data.includeContrib ? '- Contributing guidelines' : ''}

IMPORTANT INSTRUCTIONS FOR HANDLING MISSING/UNCERTAIN INFORMATION:
${hasUnsureFields ? `
SMART FILLING REQUIRED: The user has indicated uncertainty about some fields or left them blank. Please intelligently fill in missing information based on the project description and available context:

1. If project type is "not-sure" - analyze the description and other details to determine the most likely project type
2. If language is "not-sure" - infer from frameworks, dependencies, or project description
3. If frameworks/dependencies contain "not sure" - suggest appropriate ones based on the project type and language
4. If features contain "not sure" - generate logical features based on the project description and type
5. If installation contains "not sure" - create standard installation instructions for the determined tech stack
6. If usage contains "not sure" - generate appropriate usage examples for the project type
7. If requirements contains "not sure" - list standard requirements for the tech stack
8. If license is "not-sure" - recommend MIT for open source projects or Apache 2.0 for larger projects
9. For any empty optional fields - generate reasonable content if it would improve the README

Be creative and logical in your assumptions, ensuring all generated content is realistic and appropriate for the project type and description provided.
` : ''}

Requirements:
1. **Tone of Voice**: Write the entire document in a **${data.tone}** tone. If the tone is "ai-decide", choose a tone that best fits the project's description and type (e.g., professional for a library, friendly for a consumer app).
2. **Markdown Style**:
   - Use a hyphen (-) for all unordered list items (MD004).
   - Ensure there is only a single blank line between elements (no multiple blank lines) (MD012).
3. Use proper Markdown formatting with headers, code blocks, lists, and badges.
4. Include a table of contents if the README is substantial.
5. Add relevant badges/shields (build status, version, license, etc.).
6. Make it professional and comprehensive.
7. Include proper code examples with language-specific syntax highlighting (e.g., \`\`\`javascript).
8. Add sections for troubleshooting if relevant.
9. Include links where appropriate.
10. Make it visually appealing with emojis and proper formatting.
11. Ensure all sections flow logically and provide value.
${hasUnsureFields ? '12. Fill in all uncertain or missing information intelligently based on context.' : ''}

Generate only the README content in valid Markdown format, nothing else.`;

            return prompt;
        },

        getApiErrorMessage: function(error, provider) {
            if (!error || typeof error.status === 'undefined') {
                return error.message || 'An unknown network error occurred. Please check your connection and try again.';
            }

            const status = error.status.toString();
            const errorMessages = {
                'gemini': {
                    '400': 'Bad request. The AI model could not process the input. Please check your form data.',
                    '401': 'Invalid API Key. Please verify your Gemini API key in Step 1.',
                    '403': 'Permission Denied. Your Gemini API key may not have the correct permissions.',
                    '429': 'Rate Limit Exceeded. You have made too many requests. Please wait a while before trying again.',
                    '500': 'Google AI Server Error. Please try again later.',
                    '503': 'Service Unavailable. Google AI service is temporarily down. Please try again later.'
                },
                'openai': {
                    '400': 'Bad request. The AI model could not process the input. Please check your form data.',
                    '401': 'Invalid API Key. Please verify your OpenAI API key in Step 1.',
                    '402': 'Insufficient Credits. Please check your OpenAI account balance.',
                    '429': 'Rate Limit Exceeded. You have made too many requests. Please wait a while before trying again.',
                    '500': 'OpenAI Server Error. Please try again later.',
                    '503': 'Service Unavailable. OpenAI service is temporarily overloaded. Please try again later.'
                }
            };
            
            return errorMessages[provider]?.[status] || error.message || `An unexpected error occurred (Status: ${status}).`;
        },

        importFromGitHub: async function() {
            const self = ReadmeGenerator;
            const repoUrl = prompt("Enter a public GitHub repository URL to import a template from (e.g., https://github.com/user/repo):");
            if (!repoUrl) return;

            let userRepo;
            try {
                const url = new URL(repoUrl);
                if (url.hostname === 'github.com') {
                    userRepo = url.pathname.substring(1).split('/').slice(0, 2).join('/');
                }
            } catch (e) {
                if (repoUrl.includes('/') && !repoUrl.startsWith('http')) {
                    userRepo = repoUrl.split('/').slice(0, 2).join('/');
                }
            }

            if (!userRepo || userRepo.split('/').length < 2) {
                self.ui.showError("Invalid GitHub repository URL format. Use 'user/repo' or a full URL.");
                return;
            }

            const templateFileName = '.readme-generator.json';
            const branches = ['main', 'master'];
            let templateData = null;

            self.ui.showInfoMessage('Importing from GitHub...');

            for (const branch of branches) {
                const rawUrl = `https://raw.githubusercontent.com/${userRepo}/${branch}/${templateFileName}`;
                try {
                    const response = await fetch(rawUrl);
                    if (response.ok) {
                        templateData = await response.json();
                        break;
                    }
                } catch (e) { /* Ignore fetch errors */ }
            }

            if (templateData) {
                self.utils.populateForm(templateData);
                self.ui.showInfoMessage(`Template successfully imported from '${userRepo}'.`);
                AccessibilityModule.announce(`Template successfully imported from repository ${userRepo}.`);
            } else {
                self.ui.showError(`Could not find a '${templateFileName}' file in the '${userRepo}' repository on 'main' or 'master' branch.`);
            }
        },
    },

    //================================================================
    // STORAGE METHODS
    //================================================================
    storage: {
        saveDraft: function() {
            const self = ReadmeGenerator;
            if (document.getElementById('result').style.display === 'block' || document.getElementById('loading').style.display === 'block') {
                return;
            }

            const formData = self.utils.collectFormData();
            delete formData.apiKey;

            const draft = {
                step: self.state.currentStep,
                formData: formData
            };

            localStorage.setItem('readmeGenerator_draft', JSON.stringify(draft));
        },

        loadDraft: function() {
            const self = ReadmeGenerator;
            const draftData = localStorage.getItem('readmeGenerator_draft');
            if (draftData) {
                try {
                    const draft = JSON.parse(draftData);
                    
                    if (draft.formData && typeof draft.step === 'number') {
                        self.utils.populateForm(draft.formData);
                        self.state.currentStep = draft.step;
                    } else {
                        self.utils.populateForm(draft);
                    }

                    self.ui.showInfoMessage('Your previous unsaved draft has been loaded.');
                    setTimeout(() => self.ui.hideError(), 3000);
                } catch (e) {
                    console.error("Could not load draft:", e);
                    localStorage.removeItem('readmeGenerator_draft');
                }
            }
        },

        handleApiKeyStorage: async function() {
            const remember = document.getElementById('rememberApiKey').checked;
            const apiKey = document.getElementById('apiKey').value.trim();
            if (remember && apiKey) {
                const encryptedKey = await SecurityModule.encryptData(apiKey);
                localStorage.setItem('apiProvider', document.getElementById('apiProvider').value);
                localStorage.setItem('apiKey', encryptedKey);
                localStorage.setItem('rememberApiKey', 'true');
            } else if (!remember) {
                localStorage.removeItem('apiProvider');
                localStorage.removeItem('apiKey');
                localStorage.removeItem('rememberApiKey');
            }
        },

        loadApiKeyFromStorage: async function() {
            if (localStorage.getItem('rememberApiKey') === 'true') {
                const provider = localStorage.getItem('apiProvider');
                const encryptedKey = localStorage.getItem('apiKey');
                
                if (provider && encryptedKey) {
                    const key = await SecurityModule.decryptData(encryptedKey);
                    document.getElementById('apiProvider').value = provider;
                    document.getElementById('apiKey').value = key;
                    document.getElementById('rememberApiKey').checked = true;
                    ReadmeGenerator.ui.updateApiHelpText();
                }
            }
        },

        saveTemplate: function() {
            const self = ReadmeGenerator;
            if (!self.state.lastFormData) return;

            const templateName = prompt("Enter a name for this template:", self.state.lastFormData.projectName || "New Template");
            if (!templateName) return;

            const templates = self.storage.getTemplates();
            const existingIndex = templates.findIndex(t => t.name === templateName);
            if (existingIndex > -1) {
                if (!confirm(`A template named "${templateName}" already exists. Do you want to overwrite it?`)) {
                    return;
                }
            }

            const templateData = { ...self.state.lastFormData };
            delete templateData.apiKey;

            const newTemplate = { name: templateName, data: templateData };

            if (existingIndex > -1) {
                templates[existingIndex] = newTemplate;
            } else {
                templates.push(newTemplate);
            }

            localStorage.setItem('readmeGeneratorTemplates', JSON.stringify(templates));
            self.storage.loadTemplates();

            const saveBtn = document.querySelector('.result .button-group button[onclick="ReadmeGenerator.saveTemplate()"]');
            saveBtn.textContent = '✅ Saved!';
            saveBtn.disabled = true;
            setTimeout(() => {
                saveBtn.textContent = '💾 Save as Template';
                saveBtn.disabled = false;
            }, 2000);
        },

        getTemplates: function() {
            try {
                return JSON.parse(localStorage.getItem('readmeGeneratorTemplates')) || [];
            } catch (e) {
                return [];
            }
        },

        loadTemplates: function() {
            const self = ReadmeGenerator;
            const templates = self.storage.getTemplates();
            const select = document.getElementById('savedTemplates');
            select.innerHTML = '';

            if (templates.length === 0) {
                select.innerHTML = '<option value="">-- No templates saved --</option>';
                return;
            }

            templates.sort((a, b) => a.name.localeCompare(b.name));

            const defaultOption = document.createElement('option');
            defaultOption.value = "";
            defaultOption.textContent = "-- Select a template --";
            select.appendChild(defaultOption);

            templates.forEach(template => {
                const option = document.createElement('option');
                option.value = template.name;
                option.textContent = template.name;
                select.appendChild(option);
            });
        },

        loadSelectedTemplate: function() {
            const self = ReadmeGenerator;
            const select = document.getElementById('savedTemplates');
            const templateName = select.value;
            if (!templateName) return;

            const templates = self.storage.getTemplates();
            const template = templates.find(t => t.name === templateName);

            if (template) {
                self.utils.populateForm(template.data);
                self.ui.showInfoMessage(`Template "${templateName}" loaded successfully.`);
                AccessibilityModule.announce(`Template ${templateName} loaded.`);
                setTimeout(() => self.ui.hideError(), 3000);
            }
        },

        deleteSelectedTemplate: function() {
            const self = ReadmeGenerator;
            const select = document.getElementById('savedTemplates');
            const templateName = select.value;
            if (!templateName) return;

            if (confirm(`Are you sure you want to delete the template "${templateName}"?`)) {
                let templates = self.storage.getTemplates();
                templates = templates.filter(t => t.name !== templateName);
                localStorage.setItem('readmeGeneratorTemplates', JSON.stringify(templates));
                AccessibilityModule.announce(`Template ${templateName} deleted.`);
                self.storage.loadTemplates();
            }
        },
    },

    //================================================================
    // EVENT HANDLERS & CONTROLLERS
    //================================================================
    events: {
        nextStep: function() {
            const self = ReadmeGenerator;
            if (self.utils.validateCurrentStep()) {
                if (self.state.currentStep < self.config.totalSteps) {
                    self.ui.showStep(self.state.currentStep + 1);
                }
            }
        },

        previousStep: function() {
            const self = ReadmeGenerator;
            if (self.state.currentStep > 1) {
                self.ui.showStep(self.state.currentStep - 1);
            }
        },

        changeToneAndRegenerate: async function() {
            const self = ReadmeGenerator;
            if (!self.state.lastFormData) return;

            const resultToneSelect = document.getElementById('resultTone');
            let newTone = resultToneSelect.value;

            if (newTone === 'custom') {
                newTone = document.getElementById('resultCustomTone').value.trim();
                if (!newTone) {
                    self.ui.showError("Please enter a custom tone before regenerating.");
                    document.getElementById('resultCustomTone').focus();
                    return;
                }
            }
            self.state.lastFormData.tone = newTone;

            const preview = document.getElementById('preview');
            const downloadBtn = document.getElementById('downloadBtn');

            preview.innerHTML = `<div class="loading" style="display: block; padding: 40px;"><div class="spinner"></div><p>Applying new tone...</p></div>`;
            downloadBtn.style.pointerEvents = 'none';
            downloadBtn.style.opacity = '0.5';
            resultToneSelect.disabled = true;

            try {
                const prompt = self.api.createPrompt(self.state.lastFormData);
                const readme = await self.api.callAIAPI(self.state.lastFormData.apiProvider, self.state.lastFormData.apiKey, prompt);
                
                self.state.generatedReadme = readme;
                self.ui.displayResult(readme);
                
            } catch (error) {
                console.error('Error regenerating README:', error);
                preview.innerHTML = marked.parse(self.state.generatedReadme);
                self.ui.showError(self.api.getApiErrorMessage(error, self.state.lastFormData.apiProvider));
                downloadBtn.style.pointerEvents = 'auto';
                downloadBtn.style.opacity = '1';
                resultToneSelect.disabled = false;
            }
        },

        /**
         * Runs an A/B test by generating a README with the alternate AI provider
         * and displaying the results side-by-side.
         */
        runABTest: async function() {
            const self = ReadmeGenerator;
            if (!self.state.lastFormData) return;

            const originalProvider = self.state.lastFormData.apiProvider;
            const alternateProvider = originalProvider === 'gemini' ? 'openai' : 'gemini';
            
            const abTestBtn = document.getElementById('abTestBtn');
            abTestBtn.textContent = '🧪 Testing...';
            abTestBtn.disabled = true;

            try {
                // Prepare the data for the alternate provider
                const alternateData = { ...self.state.lastFormData, apiProvider: alternateProvider };
                const prompt = self.api.createPrompt(alternateData);
                const alternateReadme = await self.api.callAIAPI(alternateProvider, self.state.lastFormData.apiKey, prompt);

                // Hide main result and form, show A/B test view
                document.querySelector('.main-layout').style.display = 'none';
                document.getElementById('abTestResult').style.display = 'block';

                // Populate A/B test view
                const abPreview1 = document.getElementById('abPreview1');
                const abPreview2 = document.getElementById('abPreview2');

                document.getElementById('abColumn1Header').textContent = originalProvider === 'gemini' ? 'Gemini Result' : 'OpenAI Result';
                await MarkdownRenderer.render(self.state.generatedReadme, abPreview1);
                AccessibilityModule.announce("Comparison view ready.");

                document.getElementById('abColumn2Header').textContent = alternateProvider === 'gemini' ? 'Gemini Result' : 'OpenAI Result';
                await MarkdownRenderer.render(alternateReadme, abPreview2);

            } catch (error) {
                console.error('A/B Test Error:', error);
                self.ui.showError(self.api.getApiErrorMessage(error, alternateProvider));
            } finally {
                const otherProviderName = alternateProvider === 'gemini' ? 'Gemini' : 'OpenAI';
                abTestBtn.textContent = `🔄 Compare with ${otherProviderName}`;
                abTestBtn.disabled = false;
            }
        },

        startOver: function() {
            const self = ReadmeGenerator;
            self.state.currentStep = 1;
            self.state.generatedReadme = '';
            self.state.lastFormData = null;
            localStorage.removeItem('readmeGenerator_draft');
            
            document.querySelectorAll('input, textarea, select').forEach(input => {
                if (input.type === 'checkbox') {
                    input.checked = ['includeInstall', 'includeUsage', 'includeContrib'].includes(input.id);
                } else if (input.id !== 'apiProvider') {
                    input.value = '';
                }
            });
            
            self.storage.loadApiKeyFromStorage();

            document.getElementById('result').style.display = 'none';
            document.getElementById('navigation').style.display = 'flex';
            self.ui.showStep(1);
            self.ui.hideError();
        },

        handleShareableLink: async function() {
            const self = ReadmeGenerator;
            if (window.location.hash.startsWith('#data=')) {
                self.ui.showSkeleton();
                const encodedData = window.location.hash.substring(6);
                try {
                    await new Promise(resolve => setTimeout(resolve, 50));

                    const compressedString = atob(encodedData);
                    const jsonString = pako.inflate(compressedString, { to: 'string' });
                    const data = JSON.parse(jsonString);

                    self.utils.populateForm(data);

                    self.ui.showStep(1);
                    self.ui.showInfoMessage('Shared project data has been loaded. Please provide your API key to proceed.');

                    history.replaceState(null, document.title, window.location.pathname + window.location.search);
                } catch (error) {
                    console.error('Failed to load from shareable link:', error);
                    self.ui.showError('The shareable link appears to be corrupted or invalid.');
                } finally {
                    self.ui.hideSkeleton();
                }
            };
        },
    },

    //================================================================
    // UTILITY METHODS
    //================================================================
    /**
     * A collection of utility functions for the application.
     * @namespace ReadmeGenerator.utils
     */
    utils: {
        /**
         * Validates the format of an API key based on the provider.
         * @param {string} provider - The AI provider ('openai' or 'gemini').
         * @param {string} key - The API key to validate.
         * @returns {{valid: boolean, message?: string}} An object indicating if the key is valid,
         * and an error message if it's not.
         */
        validateApiKeyFormat: function(provider, key) {
            if (!key) return { valid: false, message: 'API Key cannot be empty.' };

            if (provider === 'openai') {
                if (!key.startsWith('sk-')) return { valid: false, message: 'Invalid OpenAI key format. It should start with "sk-".' };
                if (key.length < 40) return { valid: false, message: 'OpenAI key appears to be too short.' };
            } else if (provider === 'gemini') {
                if (!key.startsWith('AIzaSy')) return { valid: false, message: 'Invalid Gemini key format. It should start with "AIzaSy".' };
                if (key.length !== 39) return { valid: false, message: 'Invalid Gemini key format. It should be 39 characters long.' };
            }
            return { valid: true };
        },

        /**
         * Validates the inputs for the current step of the form.
         * @returns {boolean} True if the current step's inputs are valid, otherwise false.
         */
        validateCurrentStep: function() {
            const self = ReadmeGenerator;
            const step = self.state.currentStep;
            self.ui.hideError();

            if (step === 1) {
                const apiKey = document.getElementById('apiKey').value.trim();
                const apiProvider = document.getElementById('apiProvider').value;
                const validationResult = this.validateApiKeyFormat(apiProvider, apiKey);
                if (!validationResult.valid) {
                    self.ui.showError(validationResult.message);
                    return false;
                }
            }

            if (step === 2) {
                if (!document.getElementById('projectName').value.trim()) {
                    self.ui.showError('Project Name is a required field.');
                    return false;
                }
                if (!document.getElementById('description').value.trim()) {
                    self.ui.showError('Short Description is a required field.');
                    return false;
                }
            }

            if (step === 6) {
                const toneSelect = document.getElementById('tone');
                if (toneSelect.value === 'custom' && !document.getElementById('customTone').value.trim()) {
                    self.ui.showError('Please define your custom tone or choose another option from the list.');
                    return false;
                }
            }

            return true;
        },

        /**
         * Collects and sanitizes all data from the form fields.
         * @returns {object} An object containing all the form data.
         */
        collectFormData: function() {
            const data = {};
            const formElements = document.getElementById('readmeForm').elements;

            for (const element of formElements) {
                if (!element.id || element.type === 'button' || element.type === 'submit') continue;

                const name = element.id;
                let value = element.value;

                if (element.type === 'checkbox') {
                    data[name] = element.checked;
                } else {
                    data[name] = utils.sanitizeInput(typeof value === 'string' ? value.trim() : value);
                }
            }

            // Handle special case for custom tone
            if (data.tone === 'custom') {
                data.tone = utils.sanitizeInput(formElements.customTone.value.trim()) || 'professional';
            }

            // Add apiKey separately as it's not part of the form data for prompts
            data.apiKey = document.getElementById('apiKey').value.trim();

            return data;
        },

        /**
         * Populates the form fields from a given data object.
         * Used for loading drafts, templates, and shared links.
         * @param {Partial<FormData>} data - The data object to populate the form with.
         */
        populateForm: function(data) {
            const formElements = document.getElementById('readmeForm').elements;

            // Set default values for checkboxes that might be undefined in old drafts
            const finalData = {
                includeInstall: true,
                includeUsage: true,
                includeContrib: true,
                includeAPI: false,
                ...data
            };

            for (const key in finalData) {
                if (Object.prototype.hasOwnProperty.call(finalData, key)) {
                    const element = formElements[key];
                    if (element) {
                        if (element.type === 'checkbox') {
                            element.checked = !!finalData[key];
                        } else if (element.id) { // Check for id to avoid issues with fieldsets etc.
                            element.value = finalData[key];
                        }
                    }
                }
            }

            // Handle special case for custom tone
            const toneSelect = formElements.tone;
            const customToneInput = formElements.customTone;
            const isStandardTone = [...toneSelect.options].some(opt => opt.value === data.tone);

            if (data.tone && !isStandardTone) {
                toneSelect.value = 'custom';
                customToneInput.value = data.tone;
            } else {
                toneSelect.value = data.tone || 'professional';
            }
            
            // Trigger UI updates that depend on form values
            ReadmeGenerator.ui.updateFieldVisibility();
            document.getElementById('customToneGroup').style.display = toneSelect.value === 'custom' ? 'block' : 'none';
        },

        /**
         * Checks if any of the form data fields are marked as "not sure".
         * @param {FormData} data - The form data object.
         * @returns {boolean} True if any field indicates uncertainty.
         */
        checkForUnsureFields: function(data) {
            const fieldsToCheck = [
                data.projectType, data.mainLanguage, data.frameworks, data.dependencies,
                data.features, data.installation, data.usage, data.requirements, data.license
            ];
            return fieldsToCheck.some(field => field === 'not-sure' || (typeof field === 'string' && field.toLowerCase().includes('not sure')));
        },

        /**
         * Generates a compressed, shareable link containing the form data
         * and copies it to the clipboard.
         */
        generateShareableLink: function() {
            const self = ReadmeGenerator;
            if (!self.state.lastFormData) return;

            const dataToShare = { ...self.state.lastFormData };
            delete dataToShare.apiKey;

            try {
                const jsonString = JSON.stringify(dataToShare);
                const compressed = pako.deflate(jsonString, { to: 'string' });
                const encodedData = btoa(compressed);
                const url = `${window.location.origin}${window.location.pathname}#data=${encodedData}`;

                navigator.clipboard.writeText(url).then(() => {
                    const shareBtn = document.getElementById('shareBtn');
                    shareBtn.textContent = '✅ Link Copied!';
                    shareBtn.disabled = true;
                    setTimeout(() => {
                        shareBtn.textContent = '🔗 Share Link';
                        shareBtn.disabled = false;
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy link: ', err);
                    self.ui.showError('Could not copy the link.');
                });

            } catch (error) {
                console.error('Failed to generate shareable link:', error);
                self.ui.showError('An error occurred while creating the shareable link.');
            }
        },

        /**
         * Exports the generated README preview as a PDF file.
         */
        exportToPDF: function(readme) {
            const element = document.getElementById('preview');
            const opt = {
                margin: 0.5,
                filename: 'README.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
            };
            html2pdf().from(element).set(opt).save();
        },

        /**
         * Exports the generated README as a self-contained HTML file.
         */
        exportToHTML: function(readme) {
            if (!readme) return;
            const fullHtml = `
                <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>README</title>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
                <style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji";max-width:800px;margin:40px auto;padding:20px;line-height:1.6;color:#333}pre{background:#1f2937;color:#f3f4f6;padding:1em;border-radius:8px}code{font-family:'Courier New',Courier,monospace}img{max-width:100%}</style>
                </head><body>${marked.parse(readme)}</body></html>`;
            const blob = new Blob([fullHtml], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'README.html';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
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

        document.getElementById('navigation').style.display = 'none';
        document.querySelector('.step.active').style.display = 'none';
        document.getElementById('preview-column').style.display = 'none';
        document.getElementById('loading').style.display = 'block';
        
        try {
            const prompt = self.api.createPrompt(data);
            const readme = await self.api.callAIAPI(data.apiProvider, apiKey, prompt);
            
            self.state.generatedReadme = readme;
            self.ui.displayResult(readme);
            
        } catch (error) {
            console.error('Error generating README:', error);
            self.ui.showError(self.api.getApiErrorMessage(error, data.apiProvider));
            
            document.getElementById('loading').style.display = 'none';
            document.querySelector(`[data-step="${self.state.currentStep}"]`).style.display = 'block';
            document.getElementById('navigation').style.display = 'flex';
        }
    },
};

document.addEventListener('DOMContentLoaded', () => {
    ReadmeGenerator.init();
});
