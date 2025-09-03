const fs = require('fs');
const path = require('path');

console.log('Starting build process...');

// Define the correct order of scripts. Dependencies must come before the files that use them.
// 'app.js' must be last as it orchestrates the other modules.
const scriptOrder = [
    'rules.js',
    'utils.js',
    'security.js',
    'accessibility.js',
    'markdown.js',
    'modal.js',
    'performance.js',
    'analytics.js',
    'api.js',
    'storage.js',
    'ui.js',
    'app.js' // The main app orchestrator should be last
];

// Generate the HTML script tags in the correct order.
const scriptTags = scriptOrder
    .map(scriptFile => `    <script src="src/modules/${scriptFile}"></script>`)
    .join('\n');

// Read the template file.
const templatePath = path.join(__dirname, 'index.template.html');
const outputPath = path.join(__dirname, 'index.html');

console.log(`Reading template from: ${templatePath}`);
let templateContent = fs.readFileSync(templatePath, 'utf-8');

// Replace a placeholder in the template with the generated script tags.
const finalHtml = templateContent.replace('<!-- SCRIPT_INJECT_POINT -->', scriptTags);

// Write the final index.html file.
fs.writeFileSync(outputPath, finalHtml);

console.log(`Build complete. index.html has been generated successfully.`);
