// --- Global State ---
let currentStep = 1;
const totalSteps = 4;

// --- Global Functions (callable from HTML via onclick) ---

function updateStepAndProgress() {
    const progressBar = document.getElementById('progressBar');
    if (!progressBar) return;

    document.querySelectorAll('.form-step').forEach(step => step.classList.remove('active'));
    const activeStep = document.getElementById(`step${currentStep}`);
    if (activeStep) {
        activeStep.classList.add('active');
    }

    const progress = (currentStep / totalSteps) * 100;
    progressBar.style.width = `${progress}%`;
    progressBar.setAttribute('aria-valuenow', progress);
}

function validateStep(stepNumber) {
    const stepElement = document.getElementById(`step${stepNumber}`);
    if (!stepElement) return false;
    const requiredInputs = stepElement.querySelectorAll('[required]');
    let allValid = true;
    requiredInputs.forEach(input => {
        if (!input.value.trim()) {
            input.classList.add('is-invalid');
            allValid = false;
        } else {
            input.classList.remove('is-invalid');
        }
    });
    if (!allValid) {
        showToast('Please fill in all required fields.', 'warning');
    }
    return allValid;
}

function prevStep() {
    if (currentStep <= 1) return;
    currentStep--;
    updateStepAndProgress();
}

function nextStep() {
    if (currentStep >= totalSteps) return;
    
    if (!validateStep(currentStep)) {
        return;
    }
    currentStep++;
    updateStepAndProgress();
}

function scrollToGenerator() {
    const generatorEl = document.getElementById('generator');
    if (generatorEl) {
        generatorEl.scrollIntoView({ behavior: 'smooth' });
    }
}

function showPricing() { showToast('Pricing details coming soon!', 'info'); }
function showDemo() { showToast('Demo video coming soon!', 'info'); }

async function generateReadme() {
    if (currentStep !== 3) return; // Only generate from step 3

    if (!validateStep(currentStep)) {
        return; // Stop if validation fails
    }

    currentStep++;
    updateStepAndProgress(); // Manually advance to the preview step

    const previewContainer = document.getElementById('readmePreview');
    previewContainer.innerHTML = '<div class="d-flex align-items-center p-4"><strong role="status">Generating with AI...</strong><div class="spinner-border ms-auto" aria-hidden="true"></div></div>';
    
    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network/AI delay

    const data = getReadmeData();
    const readmeContent = buildReadmeContent(data);

    // Sanitize content for safe HTML display inside <pre> tag
    const sanitizedContent = readmeContent.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    previewContainer.innerHTML = `<pre class="m-0">${sanitizedContent}</pre>`;
}

function copyReadme() {
    const readmePreview = document.getElementById('readmePreview');
    if (!readmePreview) return;
    navigator.clipboard.writeText(readmePreview.innerText).then(() => showToast('README copied to clipboard!', 'success'), () => showToast('Failed to copy.', 'danger'));
}

function downloadReadme() {
    const readmePreview = document.getElementById('readmePreview');
    if (!readmePreview) return;

    const readmeText = readmePreview.innerText;
    const blob = new Blob([readmeText], { type: 'text/markdown' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'README.md' });
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('Downloading README.md...', 'success');
}

function editReadme() {
    if (currentStep !== 4) return;
    prevStep();
    showToast('You can now edit your inputs again.', 'info');
}

function startOver() {
    const readmeForm = document.getElementById('readmeForm');
    if (readmeForm) {
        readmeForm.reset();
    }
    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    currentStep = 1;
    updateStepAndProgress();

    const readmePreview = document.getElementById('readmePreview');
    if (readmePreview) {
        readmePreview.innerHTML = '<!-- Generated README will appear here -->';
    }
    showToast('Form has been reset.', 'info');
}

function shareReadme() { showToast('Share functionality coming soon!', 'info'); }

// --- Helper Functions ---

/**
 * Gathers all data from the form fields.
 * @returns {object} An object containing all form data.
 */
function getReadmeData() {
    return {
        projectName: document.getElementById('projectName').value,
        description: document.getElementById('description').value,
        version: document.getElementById('version').value,
        primaryLanguage: document.getElementById('primaryLanguage').value,
        githubUrl: document.getElementById('githubUrl').value,
        keyFeatures: document.getElementById('keyFeatures').value,
        installation: document.getElementById('installation').value,
        usage: document.getElementById('usage').value,
        license: document.getElementById('license').value,
        author: document.getElementById('author').value,
        email: document.getElementById('email').value,
        website: document.getElementById('website').value,
        includeBadges: document.getElementById('includeBadges').checked,
        includeContributing: document.getElementById('contributing').checked,
        includeChangelog: document.getElementById('changelog').checked,
        includeRoadmap: document.getElementById('roadmap').checked,
        includeFaq: document.getElementById('faq').checked,
        includeAcknowledgments: document.getElementById('acknowledgments').checked,
        includeScreenshots: document.getElementById('screenshots').checked,
    };
}

/**
 * Builds the complete README markdown string from the provided data.
 * @param {object} data - The form data from getReadmeData().
 * @returns {string} The complete README content as a markdown string.
 */
function buildReadmeContent(data) {
    const repoPathMatch = data.githubUrl ? data.githubUrl.match(/github\.com\/([^\/]+\/[^\/]+)/) : null;
    const repoPath = repoPathMatch && repoPathMatch[1] ? repoPathMatch[1].replace(/\.git$/, '') : null;
    const parts = [];

    parts.push(`# ${data.projectName || 'My Awesome Project'}`);
    if (data.includeBadges) parts.push(generateBadges(data, repoPath));
    parts.push(data.description || 'A brief description of what your project does.');
    if (data.keyFeatures) parts.push(`## ✨ Key Features\n\n${data.keyFeatures}`);
    if (data.includeScreenshots) parts.push(`## 📸 Screenshots\n\n*Add your screenshots here. For example:*\n\n!App Screenshot`);
    
    if (data.installation) {
        // Installation instructions are typically shell commands.
        parts.push(`## 🚀 Installation\n\n\`\`\`bash\n${data.installation}\n\`\`\``);
    }

    if (data.usage) {
        const lang = data.primaryLanguage ? data.primaryLanguage.toLowerCase() : 'javascript';
        parts.push(`## 💡 Usage\n\n\`\`\`${lang}\n${data.usage}\n\`\`\``);
    }

    if (data.includeRoadmap) {
        let roadmapContent = `## 🗺️ Roadmap\n\n- [ ] Feature A\n- [ ] Feature B`;
        if (repoPath) roadmapContent += `\n\nSee the open issues for a full list of proposed features (and known issues).`;
        parts.push(roadmapContent);
    }

    if (data.includeContributing) {
        let contributingContent = `## 🤝 Contributing\n\nContributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.`;
        if (repoPath) {
            contributingContent += `\n\n1. Fork the Project\n2. Create your Feature Branch (\`git checkout -b feature/AmazingFeature\`)\n3. Commit your Changes (\`git commit -m 'Add some AmazingFeature'\`)\n4. Push to the Branch (\`git push origin feature/AmazingFeature\`)\n5. Open a Pull Request`;
        } else {
            contributingContent += `\n\nIf you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".`;
        }
        parts.push(contributingContent);
    }

    if (data.license && data.license !== 'Custom') {
        parts.push(`## 📄 License\n\nDistributed under the ${data.license} License. See \`LICENSE\` for more information.`);
    } else if (data.license === 'Custom') {
        parts.push(`## 📄 License\n\nSee the \`LICENSE\` file for license information.`);
    }

    const contactInfo = [
        data.author ? `**${data.author}**` : '',
        data.email ? `- <${data.email}>` : '',
        data.website ? `- Website` : ''
    ].filter(Boolean);
    if (contactInfo.length > 0) {
        parts.push(`## 👤 Author\n\n${contactInfo.join('\n')}`);
    }

    if (data.includeAcknowledgments) {
        parts.push(`## 🙏 Acknowledgments\n\n- Awesome README Templates\n- Shields.io\n- Unsplash`);
    }

    return parts.filter(Boolean).join('\n\n');
}

function showToast(message, type = 'primary') {
    const toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) return;
    const toastId = 'toast-' + Date.now();
    const toastHTML = `<div id="${toastId}" class="toast align-items-center text-bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true"><div class="d-flex"><div class="toast-body">${message}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div></div>`;
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);
    const toastEl = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
    toast.show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

function generateBadges(data) {
    const badges = [];
    const style = 'for-the-badge'; // Other options: 'flat', 'flat-square', 'plastic', 'social'
    const repoPathMatch = data.githubUrl ? data.githubUrl.match(/github\.com\/([^\/]+\/[^\/]+)/) : null;
    const repoPath = repoPathMatch && repoPathMatch[1] ? repoPathMatch[1].replace(/\.git$/, '') : null;

    // License Badge
    if (data.license && data.license !== 'Custom') {
        const licenseFormatted = encodeURIComponent(data.license.replace('-', '--'));
        if (repoPath) {
            // Dynamic badge from GitHub API
            badges.push(`[!License](https://github.com/${repoPath}/blob/main/LICENSE)`);
        } else {
            // Static fallback badge
            badges.push(`!License`);
        }
    }

    // Version Badge
    if (data.version) {
        const versionFormatted = encodeURIComponent(data.version);
        badges.push(`!Version`);
    }

    // Primary Language Badge
    if (data.primaryLanguage && data.primaryLanguage !== 'Other') {
        const lang = encodeURIComponent(data.primaryLanguage);
        const logo = lang.toLowerCase();
        const langColor = '239120'; // A generic green color
        badges.push(`!Language`);
    }

    return badges.join(' ');
}

// --- Initialization Function ---
// This function is called from interactive_readme_pro.html after the form is fetched and loaded.
function initializeGeneratorForm() {
    // Set initial progress and step visibility
    updateStepAndProgress();

    // GitHub URL validation simulation
    const githubUrlInput = document.getElementById('githubUrl');
    const githubStatus = document.getElementById('githubStatus');
    if (!githubUrlInput || !githubStatus) return;

    let debounceTimer;
    githubUrlInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const url = githubUrlInput.value.trim();
        githubStatus.innerHTML = !url ? '' : '<div class="spinner-border spinner-border-sm text-secondary" role="status"></div>';
        if (!url) return;

        debounceTimer = setTimeout(() => {
            const isValid = /^https:\/\/github\.com\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-._]+$/.test(url);
            githubStatus.innerHTML = isValid ? '<i class="bi bi-check-circle-fill text-success"></i>' : '<i class="bi bi-x-circle-fill text-danger"></i>';
            if (isValid) showToast('Valid GitHub repository URL detected!', 'info');
        }, 800);
    });
}