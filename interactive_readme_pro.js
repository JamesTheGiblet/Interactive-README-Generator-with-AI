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
    await new Promise(resolve => setTimeout(resolve, 1500));

    const projectName = document.getElementById('projectName').value || 'My Awesome Project';
    const description = document.getElementById('description').value || 'A brief description of what your project does.';
    const installation = document.getElementById('installation').value || 'npm install my-project';
    const usage = document.getElementById('usage').value || "const myProject = require('my-project');";
    const license = document.getElementById('license').value || 'MIT';

    const readmeContent = `# ${projectName}\n\n${description}\n\n## Installation\n\n\`\`\`bash\n${installation}\n\`\`\`\n\n## Usage\n\n\`\`\`javascript\n${usage}\n\`\`\`\n\n## License\n\nThis project is licensed under the ${license} License.`;
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