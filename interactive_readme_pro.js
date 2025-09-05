let currentStep = 1;
const totalSteps = 4;
const progressBar = document.getElementById('progressBar');

function updateStepAndProgress() {
    document.querySelectorAll('.form-step').forEach(step => step.classList.remove('active'));
    document.getElementById(`step${currentStep}`).classList.add('active');

    const progress = (currentStep / totalSteps) * 100;
    progressBar.style.width = `${progress}%`;
    progressBar.setAttribute('aria-valuenow', progress);
}

function nextStep() {
    if (currentStep >= totalSteps) return;
    
    const currentStepElement = document.getElementById(`step${currentStep}`);
    const requiredInputs = currentStepElement.querySelectorAll('[required]');
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
        return;
    }

    currentStep++;
    updateStepAndProgress();
}

function prevStep() {
    if (currentStep <= 1) return;
    currentStep--;
    updateStepAndProgress();
}

function scrollToGenerator() { document.getElementById('generator').scrollIntoView({ behavior: 'smooth' }); }
function showPricing() { showToast('Pricing details coming soon!', 'info'); }
function showDemo() { showToast('Demo video coming soon!', 'info'); }

async function generateReadme() {
    if (currentStep !== 3) return; // Only generate from step 3
    nextStep(); // Move to step 4

    const previewContainer = document.getElementById('readmePreview');
    previewContainer.innerHTML = '<div class="d-flex align-items-center p-4"><strong role="status">Generating with AI...</strong><div class="spinner-border ms-auto" aria-hidden="true"></div></div>';
    
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
    const readmeText = document.getElementById('readmePreview').innerText;
    navigator.clipboard.writeText(readmeText).then(() => showToast('README copied to clipboard!', 'success'), () => showToast('Failed to copy.', 'danger'));
}

function downloadReadme() {
    const readmeText = document.getElementById('readmePreview').innerText;
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
    document.getElementById('readmeForm').reset();
    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    currentStep = 1;
    updateStepAndProgress();
    document.getElementById('readmePreview').innerHTML = '<!-- Generated README will appear here -->';
    progressBar.style.width = '25%';
    progressBar.setAttribute('aria-valuenow', 25);
    showToast('Form has been reset.', 'info');
}

function shareReadme() { showToast('Share functionality coming soon!', 'info'); }

function showToast(message, type = 'primary') {
    const toastContainer = document.querySelector('.toast-container');
    const toastId = 'toast-' + Date.now();
    const toastHTML = `<div id="${toastId}" class="toast align-items-center text-bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true"><div class="d-flex"><div class="toast-body">${message}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div></div>`;
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);
    const toastEl = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
    toast.show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

// GitHub URL validation simulation
const githubUrlInput = document.getElementById('githubUrl');
const githubStatus = document.getElementById('githubStatus');
let debounceTimer;
githubUrlInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const url = githubUrlInput.value.trim();
    if (!url) {
        githubStatus.innerHTML = '';
        return;
    }
    githubStatus.innerHTML = '<div class="spinner-border spinner-border-sm text-secondary" role="status"></div>';
    debounceTimer = setTimeout(() => {
        if (/^https:\/\/github\.com\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-._]+$/.test(url)) {
            githubStatus.innerHTML = '<i class="bi bi-check-circle-fill text-success"></i>';
            showToast('Valid GitHub repository URL detected!', 'info');
        } else {
            githubStatus.innerHTML = '<i class="bi bi-x-circle-fill text-danger"></i>';
        }
    }, 800);
});