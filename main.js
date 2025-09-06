// --- Global State ---
let currentStep = 1;
const totalSteps = 4;
let darkMode = false;

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

function shareReadme() { 
    // Enhanced share functionality
    const readmePreview = document.getElementById('readmePreview');
    if (!readmePreview) return;
    
    const readmeText = readmePreview.innerText;
    const shareData = {
        title: 'My Generated README',
        text: 'Check out this README I generated with README Pro!',
        url: window.location.href
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        navigator.share(shareData).catch(() => {
            fallbackShare(readmeText);
        });
    } else {
        fallbackShare(readmeText);
    }
}

function toggleDarkMode() {
    darkMode = !darkMode;
    const body = document.body;
    const themeIcon = document.querySelector('.theme-toggle i');
    
    if (darkMode) {
        body.classList.add('dark-mode');
        if (themeIcon) {
            themeIcon.className = 'bi bi-sun-fill';
        }
        localStorage.setItem('darkMode', 'true');
        showToast('Dark mode enabled', 'info');
    } else {
        body.classList.remove('dark-mode');
        if (themeIcon) {
            themeIcon.className = 'bi bi-moon-fill';
        }
        localStorage.setItem('darkMode', 'false');
        showToast('Light mode enabled', 'info');
    }
}

function fallbackShare(readmeText) {
    // Create a temporary shareable link (simulate backend)
    const shareId = Math.random().toString(36).substring(2, 15);
    const shareUrl = `${window.location.origin}/shared/${shareId}`;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl).then(() => {
            showToast('Share link copied to clipboard!', 'success');
        }).catch(() => {
            showToast(`Share link: ${shareUrl}`, 'info');
        });
    } else {
        showToast(`Share link: ${shareUrl}`, 'info');
    }
}

// --- Helper Functions ---

/**
 * Gathers all data from the form fields.
 * @returns {object} An object containing all form data.
 */
function getReadmeData() {
    return {
        projectName: document.getElementById('projectName')?.value || '',
        description: document.getElementById('description')?.value || '',
        version: document.getElementById('version')?.value || '',
        primaryLanguage: document.getElementById('primaryLanguage')?.value || '',
        projectType: document.getElementById('projectType')?.value || '',
        githubUrl: document.getElementById('githubUrl')?.value || '',
        keyFeatures: document.getElementById('keyFeatures')?.value || '',
        installation: document.getElementById('installation')?.value || '',
        usage: document.getElementById('usage')?.value || '',
        license: document.getElementById('license')?.value || '',
        author: document.getElementById('author')?.value || '',
        email: document.getElementById('email')?.value || '',
        website: document.getElementById('website')?.value || '',
        tone: document.getElementById('tone')?.value || 'professional',
        includeBadges: document.getElementById('includeBadges')?.checked || false,
        includeContributing: document.getElementById('contributing')?.checked || false,
        includeChangelog: document.getElementById('changelog')?.checked || false,
        includeRoadmap: document.getElementById('roadmap')?.checked || false,
        includeFaq: document.getElementById('faq')?.checked || false,
        includeAcknowledgments: document.getElementById('acknowledgments')?.checked || false,
        includeScreenshots: document.getElementById('screenshots')?.checked || false,
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

    // Project title
    parts.push(`# ${data.projectName || 'My Awesome Project'}`);
    
    // Badges
    if (data.includeBadges) {
        parts.push(generateBadges(data, repoPath));
    }
    
    // Description with tone consideration
    const description = data.description || 'A brief description of what your project does.';
    parts.push(enhanceDescriptionByTone(description, data.tone));
    
    // Table of Contents for longer READMEs
    if (hasMultipleSections(data)) {
        parts.push(generateTableOfContents(data));
    }
    
    // Key Features
    if (data.keyFeatures) {
        parts.push(`## ✨ Key Features\n\n${formatFeaturesList(data.keyFeatures)}`);
    }
    
    // Screenshots
    if (data.includeScreenshots) {
        parts.push(`## 📸 Screenshots\n\n![App Screenshot](https://via.placeholder.com/800x400?text=Add+Your+Screenshot+Here)\n\n*Replace with actual screenshots of your application*`);
    }
    
    // Installation
    if (data.installation) {
        parts.push(`## 🚀 Installation\n\n\`\`\`bash\n${data.installation}\n\`\`\``);
    }

    // Usage
    if (data.usage) {
        const lang = data.primaryLanguage ? getLanguageCode(data.primaryLanguage) : 'javascript';
        parts.push(`## 💡 Usage\n\n\`\`\`${lang}\n${data.usage}\n\`\`\``);
    }

    // API Documentation (for API projects)
    if (data.projectType === 'API/Backend') {
        parts.push(generateAPISection());
    }

    // Roadmap
    if (data.includeRoadmap) {
        parts.push(generateRoadmapSection(repoPath));
    }

    // FAQ
    if (data.includeFaq) {
        parts.push(generateFaqSection());
    }

    // Contributing
    if (data.includeContributing) {
        parts.push(generateContributingSection(repoPath));
    }

    // Changelog
    if (data.includeChangelog) {
        parts.push(`## 📝 Changelog\n\nSee [CHANGELOG.md](CHANGELOG.md) for a complete list of changes and version history.`);
    }

    // License
    if (data.license && data.license !== 'Custom') {
        parts.push(`## 📄 License\n\nDistributed under the ${data.license} License. See \`LICENSE\` for more information.`);
    } else if (data.license === 'Custom') {
        parts.push(`## 📄 License\n\nSee the \`LICENSE\` file for license information.`);
    }

    // Author/Contact
    const contactInfo = generateContactSection(data);
    if (contactInfo) {
        parts.push(contactInfo);
    }

    // Acknowledgments
    if (data.includeAcknowledgments) {
        parts.push(generateAcknowledgmentsSection());
    }

    // Support section
    if (repoPath) {
        parts.push(`## 💝 Support\n\nIf this project helped you, please consider giving it a ⭐ on [GitHub](https://github.com/${repoPath})!`);
    }

    return parts.filter(Boolean).join('\n\n');
}

// Enhanced helper functions

function enhanceDescriptionByTone(description, tone) {
    const toneEnhancements = {
        professional: description,
        friendly: description + "\n\n> Built with ❤️ for developers who value great documentation!",
        technical: description + "\n\n### Technical Overview\n\nThis project implements modern best practices and follows industry standards.",
        creative: description + "\n\n✨ *Crafted with passion and attention to detail* ✨",
        minimal: description
    };
    return toneEnhancements[tone] || description;
}

function hasMultipleSections(data) {
    const sections = [
        data.keyFeatures, data.installation, data.usage, data.includeRoadmap,
        data.includeFaq, data.includeContributing, data.includeChangelog
    ];
    return sections.filter(Boolean).length >= 4;
}

function generateTableOfContents(data) {
    const sections = [];
    if (data.keyFeatures) sections.push('- [✨ Key Features](#-key-features)');
    if (data.includeScreenshots) sections.push('- [📸 Screenshots](#-screenshots)');
    if (data.installation) sections.push('- [🚀 Installation](#-installation)');
    if (data.usage) sections.push('- [💡 Usage](#-usage)');
    if (data.projectType === 'API/Backend') sections.push('- [📡 API Reference](#-api-reference)');
    if (data.includeRoadmap) sections.push('- [🗺️ Roadmap](#️-roadmap)');
    if (data.includeFaq) sections.push('- [❓ FAQ](#-faq)');
    if (data.includeContributing) sections.push('- [🤝 Contributing](#-contributing)');
    if (data.license) sections.push('- [📄 License](#-license)');
    
    return `## 📋 Table of Contents\n\n${sections.join('\n')}`;
}

function formatFeaturesList(features) {
    return features.split('\n')
        .filter(f => f.trim())
        .map(feature => {
            const clean = feature.replace(/^[•\-*\s]*/, '').trim();
            return `- ${clean}`;
        })
        .join('\n');
}

function getLanguageCode(language) {
    const langMap = {
        'JavaScript': 'javascript',
        'TypeScript': 'typescript',
        'Python': 'python',
        'Java': 'java',
        'C++': 'cpp',
        'C#': 'csharp',
        'Go': 'go',
        'Rust': 'rust',
        'PHP': 'php',
        'Ruby': 'ruby',
        'Kotlin': 'kotlin'
    };
    return langMap[language] || language.toLowerCase();
}

function generateAPISection() {
    return `## 📡 API Reference\n\n#### Get all items\n\n\`\`\`http\nGET /api/items\n\`\`\`\n\n| Parameter | Type     | Description                |\n| :-------- | :------- | :------------------------- |\n| \`api_key\` | \`string\` | **Required**. Your API key |\n\n#### Get item\n\n\`\`\`http\nGET /api/items/\${id}\n\`\`\`\n\n| Parameter | Type     | Description                       |\n| :-------- | :------- | :-------------------------------- |\n| \`id\`      | \`string\` | **Required**. Id of item to fetch |`;
}

function generateRoadmapSection(repoPath) {
    let content = `## 🗺️ Roadmap\n\n- [x] Initial release\n- [ ] Add more integrations\n- [ ] Improve performance\n- [ ] Mobile app version\n- [ ] Advanced analytics`;
    if (repoPath) {
        content += `\n\nSee the [open issues](https://github.com/${repoPath}/issues) for a full list of proposed features and known issues.`;
    }
    return content;
}

function generateFaqSection() {
    return `## ❓ FAQ\n\n#### **Q: How do I get started?**\nA: Follow the installation instructions above, then check out the usage examples.\n\n#### **Q: Is this project actively maintained?**\nA: Yes! We regularly update and improve the project based on user feedback.\n\n#### **Q: Can I contribute to this project?**\nA: Absolutely! Check out our contributing guidelines for more information.`;
}

function generateContributingSection(repoPath) {
    let content = `## 🤝 Contributing\n\nContributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.`;
    
    if (repoPath) {
        content += `\n\n### Development Setup\n\n1. Fork the Project\n2. Clone your fork (\`git clone https://github.com/YOUR_USERNAME/${repoPath.split('/')[1]}.git\`)\n3. Create your Feature Branch (\`git checkout -b feature/AmazingFeature\`)\n4. Make your changes\n5. Run tests (\`npm test\` or equivalent)\n6. Commit your Changes (\`git commit -m 'Add some AmazingFeature'\`)\n7. Push to the Branch (\`git push origin feature/AmazingFeature\`)\n8. Open a Pull Request\n\n### Code Style\n\nPlease ensure your code follows the existing style conventions and passes all tests.`;
    } else {
        content += `\n\nIf you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".`;
    }
    
    return content;
}

function generateContactSection(data) {
    const contactInfo = [];
    
    if (data.author) contactInfo.push(`**${data.author}**`);
    if (data.email) contactInfo.push(`- 📧 Email: ${data.email}`);
    if (data.website) contactInfo.push(`- 🌐 Website: [${data.website}](${data.website})`);
    if (data.githubUrl) {
        const username = data.githubUrl.split('/')[3];
        contactInfo.push(`- 🐙 GitHub: [@${username}](https://github.com/${username})`);
    }
    
    if (contactInfo.length > 0) {
        return `## 👤 Author\n\n${contactInfo.join('\n')}`;
    }
    return '';
}

function generateAcknowledgmentsSection() {
    return `## 🙏 Acknowledgments\n\n- [Shields.io](https://shields.io) for the badges\n- [Choose an Open Source License](https://choosealicense.com) for license guidance\n- [GitHub Emoji Cheat Sheet](https://www.webpagefx.com/tools/emoji-cheat-sheet) for emojis\n- [Readme Template](https://github.com/othneildrew/Best-README-Template) for inspiration`;
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

function generateBadges(data, repoPath) {
    const badges = [];
    const style = 'for-the-badge';

    // License Badge
    if (data.license && data.license !== 'Custom') {
        const licenseFormatted = encodeURIComponent(data.license);
        if (repoPath) {
            badges.push(`[![License](https://img.shields.io/github/license/${repoPath}?style=${style})](https://github.com/${repoPath}/blob/main/LICENSE)`);
        } else {
            badges.push(`![License](https://img.shields.io/badge/license-${licenseFormatted}-blue?style=${style})`);
        }
    }

    // Version Badge
    if (data.version) {
        const versionFormatted = encodeURIComponent(data.version);
        if (repoPath) {
            badges.push(`[![Version](https://img.shields.io/github/v/release/${repoPath}?style=${style})](https://github.com/${repoPath}/releases)`);
        } else {
            badges.push(`![Version](https://img.shields.io/badge/version-${versionFormatted}-blue?style=${style})`);
        }
    }

    // Primary Language Badge
    if (data.primaryLanguage && data.primaryLanguage !== 'Other') {
        const lang = encodeURIComponent(data.primaryLanguage);
        if (repoPath) {
            badges.push(`![Language](https://img.shields.io/github/languages/top/${repoPath}?style=${style})`);
        } else {
            const langColor = getLanguageColor(data.primaryLanguage);
            badges.push(`![Language](https://img.shields.io/badge/${lang}-${langColor}?style=${style}&logo=${getLanguageLogo(data.primaryLanguage)}&logoColor=white)`);
        }
    }

    // Build Status Badge (if GitHub repo)
    if (repoPath) {
        badges.push(`![Build Status](https://img.shields.io/github/actions/workflow/status/${repoPath}/ci.yml?style=${style})`);
        badges.push(`![Issues](https://img.shields.io/github/issues/${repoPath}?style=${style})`);
        badges.push(`![Forks](https://img.shields.io/github/forks/${repoPath}?style=${style})`);
        badges.push(`![Stars](https://img.shields.io/github/stars/${repoPath}?style=${style})`);
    }

    return badges.join(' ');
}

function getLanguageColor(language) {
    const colors = {
        'JavaScript': 'F7DF1E',
        'TypeScript': '3178C6',
        'Python': '3776AB',
        'Java': 'ED8B00',
        'C++': '00599C',
        'C#': '239120',
        'Go': '00ADD8',
        'Rust': '000000',
        'PHP': '777BB4',
        'Ruby': 'CC342D',
        'Kotlin': '0095D5'
    };
    return colors[language] || '333333';
}

function getLanguageLogo(language) {
    const logos = {
        'JavaScript': 'javascript',
        'TypeScript': 'typescript',
        'Python': 'python',
        'Java': 'java',
        'C++': 'cplusplus',
        'C#': 'csharp',
        'Go': 'go',
        'Rust': 'rust',
        'PHP': 'php',
        'Ruby': 'ruby',
        'Kotlin': 'kotlin'
    };
    return logos[language] || 'code';
}

// Enhanced analytics counter animation
function animateCounters() {
    const counters = document.querySelectorAll('.analytics-number');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.5
    });

    counters.forEach(counter => observer.observe(counter));
}

function animateCounter(element) {
    const target = element.textContent;
    const numericValue = parseFloat(target.replace(/[^\d.]/g, ''));
    const hasDecimal = target.includes('.');
    const suffix = target.replace(/[\d.]/g, '');
    
    let current = 0;
    const increment = numericValue / 60; // 60 frames for smooth animation
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= numericValue) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            const displayValue = hasDecimal ? current.toFixed(1) : Math.floor(current);
            element.textContent = displayValue + suffix;
        }
    }, 16); // ~60fps
}

// Enhanced GitHub URL validation with more features
function setupGitHubValidation() {
    const githubUrlInput = document.getElementById('githubUrl');
    const githubStatus = document.getElementById('githubStatus');
    if (!githubUrlInput || !githubStatus) return;

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
            const isValid = /^https:\/\/github\.com\/[a-zA-Z0-9-._]+\/[a-zA-Z0-9-._]+\/?$/.test(url);
            
            if (isValid) {
                githubStatus.innerHTML = '<i class="bi bi-check-circle-fill text-success" title="Valid GitHub URL"></i>';
                showToast('Valid GitHub repository URL detected!', 'info');
                
                // Auto-populate project name if empty
                const projectNameInput = document.getElementById('projectName');
                if (!projectNameInput.value) {
                    const repoName = url.split('/').pop().replace('.git', '');
                    projectNameInput.value = repoName.replace(/[-_]/g, ' ')
                        .replace(/\b\w/g, l => l.toUpperCase());
                }
            } else {
                githubStatus.innerHTML = '<i class="bi bi-x-circle-fill text-danger" title="Invalid GitHub URL"></i>';
            }
        }, 800);
    });
}

function initializeDarkMode() {
    // Check localStorage for saved preference
    const savedMode = localStorage.getItem('darkMode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Set initial state based on saved preference or system preference
    darkMode = savedMode === 'true' || (savedMode === null && prefersDark);
    
    // Apply the theme
    if (darkMode) {
        document.body.classList.add('dark-mode');
        const themeIcon = document.querySelector('.theme-toggle i');
        if (themeIcon) {
            themeIcon.className = 'bi bi-sun-fill';
        }
    }
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (localStorage.getItem('darkMode') === null) {
            darkMode = e.matches;
            if (darkMode) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
        }
    });
}

// --- Initialization Functions ---

/**
 * Initializes the entire application after the DOM is loaded.
 */
function initializeApp() {
    // Initialize dark mode first as it affects the whole page
    initializeDarkMode();
    
    // Setup the tool switcher and load the default tool
    initializeToolSwitcher();
    
    // Initialize analytics counter animation
    setTimeout(animateCounters, 500); // Slight delay to ensure DOM is ready
    
    // Add smooth scrolling to all anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    console.log('Enhanced README Pro initialized successfully');
}

/**
 * Sets up the tool switching tabs and loads the default tool.
 */
function initializeToolSwitcher() {
    const toolSwitcher = document.getElementById('tool-switcher');
    if (!toolSwitcher) return;

    const tabs = toolSwitcher.querySelectorAll('[data-bs-toggle="tab"]');
    
    tabs.forEach(tab => {
        tab.addEventListener('shown.bs.tab', event => {
            const templateId = event.target.dataset.toolTemplate;
            const initFunction = event.target.dataset.toolInit;
            if (templateId) {
                loadTool(templateId, initFunction);
            }
        });
    });

    // Load the default tool initially
    const activeTab = toolSwitcher.querySelector('.nav-link.active');
    if (activeTab) {
        const templateId = activeTab.dataset.toolTemplate;
        const initFunction = activeTab.dataset.toolInit;
        if (templateId) {
            loadTool(templateId, initFunction);
        }
    }
}

/**
 * Loads a tool from a template into the main content area.
 * @param {string} templateId The ID of the <template> element to load.
 * @param {string} initFunctionName The name of the function to call to initialize the tool's scripts.
 */
function loadTool(templateId, initFunctionName) {
    const toolContentArea = document.getElementById('tool-content-area');
    const template = document.getElementById(templateId);

    if (!toolContentArea || !template) {
        console.error(`Tool content area or template with id '${templateId}' not found!`);
        toolContentArea.innerHTML = `<div class="alert alert-danger" role="alert"><strong>Error:</strong> Could not load the tool. Template is missing.</div>`;
        return;
    }

    const templateContent = template.content.cloneNode(true);
    toolContentArea.innerHTML = ''; // Clear previous tool or spinner
    toolContentArea.appendChild(templateContent);
    
    if (initFunctionName && typeof window[initFunctionName] === 'function') {
        windowinitFunctionName;
    }
}

/**
 * Initializes JavaScript functionality specific to the generator form.
 */
function initializeGeneratorScripts() {
    updateStepAndProgress();
    setupGitHubValidation();
}

/**
 * Initializes JavaScript functionality specific to the DID Manager tool.
 */
function initializeDidManagerScripts() {
    console.log('DID Manager tool placeholder initialized.');
    // Future JS for this tool will go here.
}

document.addEventListener('DOMContentLoaded', initializeApp);