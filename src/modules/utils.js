/**
 * A collection of generic utility functions.
 * @namespace utils
 */
const utils = {
    /**
     * Sanitizes user input to prevent XSS by escaping HTML characters.
     * @param {string} text - The text to sanitize.
     * @returns {string} The sanitized text.
     */
    sanitizeInput: function(text) {
        if (typeof text !== 'string') return text;
        const tempDiv = document.createElement('div');
        tempDiv.textContent = text;
        return tempDiv.innerHTML;
    },
    
    /**
     * Creates a debounced function that delays invoking `func` until after `delay` milliseconds
     * have elapsed since the last time the debounced function was invoked.
     * @param {Function} func - The function to debounce.
     * @param {number} delay - The number of milliseconds to delay.
     * @returns {Function} The new debounced function.
     */
    debounce: function(func, delay) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    },

    loadHighlightJS: function() {
        return new Promise((resolve, reject) => {
            if (window.hljs) return resolve();
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load highlight.js script.'));
            document.head.appendChild(script);
        });
    },

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
        const step = ReadmeGenerator.state.currentStep;
        ReadmeGenerator.ui.hideError();

        if (step === 1) {
            const apiKey = document.getElementById('apiKey').value.trim();
            const apiProvider = document.getElementById('apiProvider').value;
            const validationResult = this.validateApiKeyFormat(apiProvider, apiKey);
            if (!validationResult.valid) {
                ReadmeGenerator.ui.showError(validationResult.message);
                return false;
            }
        }

        if (step === 2) {
            if (!document.getElementById('projectName').value.trim()) {
                ReadmeGenerator.ui.showError('Project Name is a required field.');
                return false;
            }
            if (!document.getElementById('description').value.trim()) {
                ReadmeGenerator.ui.showError('Short Description is a required field.');
                return false;
            }
        }

        if (step === 6) {
            const toneSelect = document.getElementById('tone');
            if (toneSelect.value === 'custom' && !document.getElementById('customTone').value.trim()) {
                ReadmeGenerator.ui.showError('Please define your custom tone or choose another option from the list.');
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
        if (!ReadmeGenerator.state.lastFormData) return;

        const dataToShare = { ...ReadmeGenerator.state.lastFormData };
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
                ReadmeGenerator.ui.showError('Could not copy the link.');
            });

        } catch (error) {
            console.error('Failed to generate shareable link:', error);
            ReadmeGenerator.ui.showError('An error occurred while creating the shareable link.');
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
};