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
    await new Promise(resolve => setTimeout(resolve, 500));

    // 1. Data Collection
    const data = {
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

    // 2. README Content Generation
    const readmeParts = [];

    // Title
    readmeParts.push(`# ${data.projectName || 'My Awesome Project'}`);

    // Badges
    if (data.includeBadges) {
        const badges = generateBadges(data);
        if (badges) readmeParts.push(badges);
    }

    // Description
    readmeParts.push(data.description || 'A brief description of what your project does.');

    // Key Features
    if (data.keyFeatures) {
        readmeParts.push(`## ✨ Key Features\n\n${data.keyFeatures}`);
    }

    // Screenshots
    if (data.includeScreenshots) {
        readmeParts.push(`## 📸 Screenshots\n\n*Add your screenshots here. For example:*\n\n!App Screenshot`);
    }

    // Installation
    if (data.installation) {
        const lang = data.primaryLanguage ? data.primaryLanguage.toLowerCase() : 'bash';
        readmeParts.push(`## 🚀 Installation\n\n\`\`\`${lang}\n${data.installation}\n\`\`\``);
    }

    // Usage
    if (data.usage) {
        const lang = data.primaryLanguage ? data.primaryLanguage.toLowerCase() : 'javascript';
        readmeParts.push(`## 💡 Usage\n\n\`\`\`${lang}\n${data.usage}\n\`\`\``);
    }

    // Roadmap
    if (data.includeRoadmap) {
        readmeParts.push(`## 🗺️ Roadmap\n\n- [ ] Additional Feature 1\n- [ ] Additional Feature 2`);
    }

    // Contributing
    if (data.includeContributing) {
        readmeParts.push(`## 🤝 Contributing\n\nContributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.\n\nIf you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".`);
    }

    // License
    if (data.license && data.license !== 'Custom') {
        readmeParts.push(`## 📄 License\n\nThis project is licensed under the ${data.license} License. See the \`LICENSE\` file for more information.`);
    } else if (data.license === 'Custom') {
        readmeParts.push(`## 📄 License\n\nSee the \`LICENSE\` file for license information.`);
    }

    // Author / Contact
    const contactInfo = [data.author ? `**${data.author}**` : '', data.email ? `- Email: ${data.email}` : '', data.website ? `- Website: ${data.website}` : ''].filter(Boolean);
    if (contactInfo.length > 0) {
        readmeParts.push(`## 👤 Author\n\n${contactInfo.join('\n')}`);
    }

    // Acknowledgments
    if (data.includeAcknowledgments) {
        readmeParts.push(`## 🙏 Acknowledgments\n\n- Awesome README Templates\n- Shields.io`);
    }

    // 3. Final Assembly & Display
    const readmeContent = readmeParts.join('\n\n');
    previewContainer.innerHTML = `<pre class="m-0">${readmeContent.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`;
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
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.style.width = '25%';
        progressBar.setAttribute('aria-valuenow', 25);
    }
    showToast('Form has been reset.', 'info');
}

function shareReadme() { showToast('Share functionality coming soon!', 'info'); }

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