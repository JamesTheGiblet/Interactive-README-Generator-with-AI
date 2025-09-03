const storage = {
    saveDraft: function() {
        if (document.getElementById('result').style.display === 'block' || document.getElementById('loading').style.display === 'block') {
            return;
        }

        const formData = ReadmeGenerator.utils.collectFormData();
        delete formData.apiKey;

        const draft = {
            step: ReadmeGenerator.state.currentStep,
            formData: formData
        };

        localStorage.setItem('readmeGenerator_draft', JSON.stringify(draft));
    },

    loadDraft: function() {
        const draftData = localStorage.getItem('readmeGenerator_draft');
        if (draftData) {
            try {
                const draft = JSON.parse(draftData);
                
                if (draft.formData && typeof draft.step === 'number') {
                    ReadmeGenerator.utils.populateForm(draft.formData);
                    ReadmeGenerator.state.currentStep = draft.step;
                } else {
                    ReadmeGenerator.utils.populateForm(draft);
                }

                ReadmeGenerator.ui.showInfoMessage('Your previous unsaved draft has been loaded.');
                setTimeout(() => ReadmeGenerator.ui.hideError(), 3000);
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
        if (!ReadmeGenerator.state.lastFormData) return;

        const templateName = prompt("Enter a name for this template:", ReadmeGenerator.state.lastFormData.projectName || "New Template");
        if (!templateName) return;

        const templates = this.getTemplates();
        const existingIndex = templates.findIndex(t => t.name === templateName);
        if (existingIndex > -1) {
            if (!confirm(`A template named "${templateName}" already exists. Do you want to overwrite it?`)) {
                return;
            }
        }

        const templateData = { ...ReadmeGenerator.state.lastFormData };
        delete templateData.apiKey;

        const newTemplate = { name: templateName, data: templateData };

        if (existingIndex > -1) {
            templates[existingIndex] = newTemplate;
        } else {
            templates.push(newTemplate);
        }

        localStorage.setItem('readmeGeneratorTemplates', JSON.stringify(templates));
        this.loadTemplates();

        const saveBtn = document.querySelector('.result .button-group button[onclick="ReadmeGenerator.storage.saveTemplate()"]');
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
        const templates = this.getTemplates();
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
        const select = document.getElementById('savedTemplates');
        const templateName = select.value;
        if (!templateName) return;

        const templates = this.getTemplates();
        const template = templates.find(t => t.name === templateName);

        if (template) {
            ReadmeGenerator.utils.populateForm(template.data);
            ReadmeGenerator.ui.showInfoMessage(`Template "${templateName}" loaded successfully.`);
            AccessibilityModule.announce(`Template ${templateName} loaded.`);
            setTimeout(() => ReadmeGenerator.ui.hideError(), 3000);
        }
    },

    deleteSelectedTemplate: function() {
        const select = document.getElementById('savedTemplates');
        const templateName = select.value;
        if (!templateName) return;

        if (confirm(`Are you sure you want to delete the template "${templateName}"?`)) {
            let templates = this.getTemplates();
            templates = templates.filter(t => t.name !== templateName);
            localStorage.setItem('readmeGeneratorTemplates', JSON.stringify(templates));
            AccessibilityModule.announce(`Template ${templateName} deleted.`);
            this.loadTemplates();
        }
    },
};