const ui = {
    showStep: function(step) {
        ReadmeGenerator.state.currentStep = step;

        document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
        document.querySelector(`[data-step="${step}"]`).classList.add('active');
        
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        prevBtn.style.display = step > 1 ? 'block' : 'none';
        
        if (step === ReadmeGenerator.config.totalSteps) {
            nextBtn.textContent = '🚀 Generate README';
        } else {
            nextBtn.textContent = 'Next →';
        }
        
        this.updateProgress(ReadmeGenerator.state.currentStep, ReadmeGenerator.config.totalSteps);
        AccessibilityModule.announce(`Step ${step} of ${ReadmeGenerator.config.totalSteps} shown: ${document.querySelector(`[data-step="${step}"] h2`).textContent}`);

        const previewColumn = document.getElementById('preview-column');
        if (step > 1 && step <= ReadmeGenerator.config.totalSteps) {
            previewColumn.style.display = 'block';
            this.updateLivePreview();
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
        if (ReadmeGenerator.state.currentStep > 1 && ReadmeGenerator.state.currentStep <= ReadmeGenerator.config.totalSteps) {
            const formData = ReadmeGenerator.utils.collectFormData();
            const draftMarkdown = this.generateDraftMarkdown(formData);
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
        document.getElementById('loading').style.display = 'none';
        document.getElementById('result').style.display = 'block';
        localStorage.removeItem('readmeGenerator_draft');
        
        const preview = document.getElementById('preview');
        await MarkdownRenderer.render(readme, preview);
        
        this.setupDownload(readme);

        AccessibilityModule.announce("README generated successfully. You can now preview, download, or copy the content.");
        const copyBtn = document.getElementById('copyBtn');
        copyBtn.onclick = () => this.copyMarkdownToClipboard();
        copyBtn.textContent = '📋 Copy Markdown';
        copyBtn.disabled = false;

        document.getElementById('pdfBtn').onclick = () => ReadmeGenerator.utils.exportToPDF(readme);
        document.getElementById('htmlBtn').onclick = () => ReadmeGenerator.utils.exportToHTML(readme);

        const shareBtn = document.getElementById('shareBtn');
        shareBtn.onclick = () => ReadmeGenerator.utils.generateShareableLink();
        shareBtn.textContent = '🔗 Share Link';
        shareBtn.disabled = false;

        // Setup Preview Theme Toggle
        const appTheme = document.documentElement.classList.contains('dark-theme') ? 'dark' : 'light';
        const savedPreviewTheme = localStorage.getItem('readmePreviewTheme');
        const initialPreviewTheme = savedPreviewTheme || appTheme; // Use saved, or default to app theme
        this.setPreviewTheme(initialPreviewTheme);

        document.getElementById('previewThemeLightBtn').onclick = () => this.setPreviewTheme('light');
        document.getElementById('previewThemeDarkBtn').onclick = () => this.setPreviewTheme('dark');

        const saveTemplateBtn = document.querySelector('.result .button-group button[onclick="ReadmeGenerator.storage.saveTemplate()"]');
        saveTemplateBtn.textContent = '💾 Save as Template';
        saveTemplateBtn.disabled = false;

        // Setup A/B Test Button
        const abTestBtn = document.getElementById('abTestBtn');
        const otherProvider = ReadmeGenerator.state.lastFormData.apiProvider === 'gemini' ? 'OpenAI' : 'Gemini';
        abTestBtn.textContent = `🔄 Compare with ${otherProvider}`;
        abTestBtn.onclick = () => ReadmeGenerator.events.runABTest();
        abTestBtn.style.display = 'block';

        const resultToneSelect = document.getElementById('resultTone');
        const resultCustomToneGroup = document.getElementById('resultCustomToneGroup');
        const resultCustomToneInput = document.getElementById('resultCustomTone');
        const downloadBtn = document.getElementById('downloadBtn');

        if (ReadmeGenerator.state.lastFormData) {
            const isStandardTone = [...resultToneSelect.options].some(opt => opt.value === ReadmeGenerator.state.lastFormData.tone);
            if (isStandardTone) {
                resultToneSelect.value = ReadmeGenerator.state.lastFormData.tone;
                resultCustomToneGroup.style.display = 'none';
            } else {
                resultToneSelect.value = 'custom';
                resultCustomToneInput.value = ReadmeGenerator.state.lastFormData.tone;
                resultCustomToneGroup.style.display = 'block';
            }
        }

        const handleResultToneChange = () => {
            if (resultToneSelect.value === 'custom') {
                resultCustomToneGroup.style.display = 'block';
                resultCustomToneInput.focus();
            } else {
                resultCustomToneGroup.style.display = 'none';
                ReadmeGenerator.events.changeToneAndRegenerate();
            }
        };

        const handleCustomToneEnter = (e) => {
            if (e.key === 'Enter') ReadmeGenerator.events.changeToneAndRegenerate();
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
        document.getElementById('result').style.display = 'none';
        document.getElementById('preview-column').style.display = 'block';
        document.getElementById('navigation').style.display = 'flex';
        this.showStep(ReadmeGenerator.config.totalSteps);
        this.hideError();
    },

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
        if (!ReadmeGenerator.state.generatedReadme) return;

        navigator.clipboard.writeText(ReadmeGenerator.state.generatedReadme).then(() => {
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
            this.showError('Could not copy to clipboard.');
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
};