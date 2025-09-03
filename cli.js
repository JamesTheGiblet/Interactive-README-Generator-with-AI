#!/usr/bin/env node

/**
 * Interactive README Pro - CLI Tool
 *
 * This script allows generating a README from the command line by analyzing a GitHub repository.
 * It mirrors the core logic of the web application but is designed for a Node.js environment.
 *
 * Usage:
 * node cli.js --repo <repository_url> --key <your_api_key> [--provider gemini|openai] [--out README.md]
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const C = {
    Reset: "\x1b[0m",
    Bright: "\x1b[1m",
    Dim: "\x1b[2m",
    Underscore: "\x1b[4m",
    Blink: "\x1b[5m",
    Reverse: "\x1b[7m",
    Hidden: "\x1b[8m",
    FgBlack: "\x1b[30m",
    FgRed: "\x1b[31m",
    FgGreen: "\x1b[32m",
    FgYellow: "\x1b[33m",
    FgBlue: "\x1b[34m",
    FgMagenta: "\x1b[35m",
    FgCyan: "\x1b[36m",
    FgWhite: "\x1b[37m",
};

/**
 * Parses command-line arguments into a key-value object.
 * Example: --repo url --key 123 -> { repo: 'url', key: '123' }
 */
function parseArgs() {
    const args = {};
    process.argv.slice(2).forEach((arg, index, arr) => {
        if (arg.startsWith('--')) {
            const key = arg.substring(2);
            const next = arr[index + 1];
            if (next && !next.startsWith('--')) {
                args[key] = next;
            } else {
                args[key] = true;
            }
        }
    });
    return args;
}

/**
 * A collection of API interaction logic, adapted for Node.js from app.js.
 */
const api = {
    fetchAndParseRepo: async function(owner, repo, token) {
        const headers = { 'Accept': 'application/vnd.github.v3+json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const githubApiGet = async (path) => {
            const response = await fetch(`https://api.github.com${path}`, { headers });
            if (response.status === 404) return null;
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `GitHub API request failed: ${response.status}`);
            }
            return response.json();
        };

        const getFileContent = async (filePath) => {
            const data = await githubApiGet(`/repos/${owner}/${repo}/contents/${filePath}`);
            if (!data || !data.content) return null;
            return Buffer.from(data.content, 'base64').toString('utf-8');
        };

        const repoInfo = await githubApiGet(`/repos/${owner}/${repo}`);
        if (!repoInfo) throw new Error("Repository not found or access denied.");

        const extractedData = {
            projectName: repoInfo.name,
            description: repoInfo.description || '',
            mainLanguage: repoInfo.language ? repoInfo.language.toLowerCase() : 'not-sure',
            author: repoInfo.owner?.login || '',
            license: repoInfo.license?.spdx_id || 'not-sure',
            // Set defaults for fields not easily found via API
            projectType: 'not-sure',
            frameworks: 'not-sure',
            dependencies: 'not-sure',
            features: 'not-sure',
            installation: 'not-sure',
            usage: 'not-sure',
            requirements: 'not-sure',
            demo: '',
            contact: '',
            acknowledgments: '',
            includeInstall: true,
            includeUsage: true,
            includeAPI: false,
            includeContrib: true,
            tone: 'professional'
        };

        const tree = await githubApiGet(`/repos/${owner}/${repo}/git/trees/${repoInfo.default_branch}?recursive=1`);
        if (tree && tree.tree) {
            const relevantExtensions = ['.js', '.ts', '.py', '.java', '.go', '.rb', '.php', '.cs', '.html', '.css', '.scss', '.md', '.json', '.yml', '.yaml', '.toml', '.xml', 'dockerfile', 'gemfile', 'pom.xml'];
            const excludedDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', 'vendor', 'target', 'public/'];
            const filePaths = tree.tree
                .filter(node => node.type === 'blob')
                .map(node => node.path)
                .filter(path => !excludedDirs.some(dir => path.startsWith(dir)))
                .filter(path => {
                    const lowerPath = path.toLowerCase();
                    return relevantExtensions.some(ext => lowerPath.endsWith(ext) || lowerPath.includes(ext.replace('.', '')));
                });
            
            if (filePaths.length > 0) {
                extractedData.fileStructure = filePaths.slice(0, 100).join('\n');
            }
        }

        const packageJsonContent = await getFileContent('package.json');
        if (packageJsonContent) {
            try {
                const packageJson = JSON.parse(packageJsonContent);
                const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
                const depKeys = Object.keys(deps);
                const frameworks = depKeys.filter(k => ['react', 'vue', 'angular', 'svelte', 'express', 'next', 'nuxt'].includes(k));
                if (frameworks.length > 0) extractedData.frameworks = frameworks.join(', ');
                if (depKeys.length > 0) extractedData.dependencies = depKeys.slice(0, 5).join(', ');
                extractedData.projectType = 'web-app';
                if (packageJson.license) extractedData.license = packageJson.license;
            } catch (e) { console.warn("Could not parse package.json"); }
        }

        const requirementsTxtContent = await getFileContent('requirements.txt');
        if (requirementsTxtContent) {
            const deps = requirementsTxtContent.split('\n').filter(line => line && !line.startsWith('#')).map(line => line.split(/==|>=/)[0].trim());
            const currentDeps = extractedData.dependencies !== 'not-sure' ? extractedData.dependencies + ', ' : '';
            extractedData.dependencies = currentDeps + deps.slice(0, 5).join(', ');
            extractedData.projectType = 'web-app';
            if (!extractedData.mainLanguage || extractedData.mainLanguage === 'not-sure') {
                extractedData.mainLanguage = 'python';
            }
        }

        return extractedData;
    },

    createPrompt: function(data) {
        // This prompt creation logic is copied from app.js for consistency.
        return `Create a comprehensive, professional README.md file for the following project:

Project Name: ${data.projectName}
Description: ${data.description}
${data.fileStructure ? `File Structure Summary:\n${data.fileStructure}\n` : ''}
Project Type: ${data.projectType}
Primary Language: ${data.mainLanguage}
Frameworks/Technologies: ${data.frameworks}
Dependencies: ${data.dependencies}
Features: ${data.features}
License: ${data.license}
Author: ${data.author}

IMPORTANT INSTRUCTIONS:
The user has provided the above information by analyzing a GitHub repository. Some fields are marked 'not-sure'. Please intelligently fill in all missing or uncertain information based on the project details and file structure provided. For example, infer the project type from the file structure, suggest features, and generate standard installation/usage instructions appropriate for the detected language and frameworks.

Requirements:
1. Tone of Voice: Write the entire document in a professional tone.
2. Use proper Markdown formatting with headers, code blocks, lists, and badges.
3. Include a table of contents.
4. Add relevant badges (build status, version, license).
5. Make it professional, comprehensive, and visually appealing with emojis.

Generate only the README content in valid Markdown format.`;
    },

    callAIAPI: async function(provider, apiKey, prompt) {
        let url, options;
        if (provider === 'gemini') {
            url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
            options = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            };
        } else { // Default to openai
            url = 'https://api.openai.com/v1/chat/completions';
            options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({ model: 'gpt-3.5-turbo', messages: [{ role: 'user', content: prompt }] })
            };
        }

        const response = await fetch(url, options);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = (provider === 'gemini' ? errorData.error?.message : errorData.error?.message) || `API request failed with status ${response.status}`;
            throw new Error(errorMessage);
        }

        const data = await response.json();
        if (provider === 'gemini') {
            if (!data.candidates || !data.candidates[0]?.content?.parts[0]?.text) throw new Error('Invalid response from Gemini API');
            return data.candidates[0].content.parts[0].text;
        } else {
            if (!data.choices || !data.choices[0]?.message?.content) throw new Error('Invalid response from OpenAI API');
            return data.choices[0].message.content;
        }
    }
};

/**
 * Main execution function for the CLI.
 */
async function main() {
    const args = parseArgs();

    if (!args.repo || !args.key) {
        console.log(`${C.Bright}Interactive README Pro CLI${C.Reset}`);
        console.log("Usage: node cli.js --repo <github_url> --key <api_key> [options]");
        console.log("\nOptions:");
        console.log("  --provider <name>  AI provider to use (gemini or openai). Default: openai");
        console.log("  --out <file_path>  Output file path. Default: README.md");
        console.log("  --token <gh_token> GitHub Personal Access Token for private repos.");
        return;
    }

    const provider = args.provider || 'openai';
    const outputFile = args.out || 'README.md';

    console.log(`${C.FgBlue}Starting README generation for ${args.repo}...${C.Reset}`);

    // 1. Analyze Repository
    let owner, repo;
    try {
        const url = new URL(args.repo);
        [owner, repo] = url.pathname.substring(1).split('/').slice(0, 2);
    } catch (e) {
        throw new Error("Invalid GitHub repository URL format. Please use a full URL.");
    }
    
    const spinner = ['|', '/', '-', '\\'];
    let i = 0;
    const interval = setInterval(() => {
        process.stdout.write(`\r${C.FgYellow}Analyzing repository... ${spinner[i++ % spinner.length]}${C.Reset}`);
    }, 100);

    const repoData = await api.fetchAndParseRepo(owner, repo, args.token);
    clearInterval(interval);
    process.stdout.write(`\r${C.FgGreen}✓ Repository analysis complete.${C.Reset}\n`);

    // 2. Create Prompt and Call AI
    process.stdout.write(`${C.FgYellow}Generating README with ${provider}...${C.Reset}`);
    const prompt = api.createPrompt(repoData);
    const readmeContent = await api.callAIAPI(provider, args.key, prompt);
    process.stdout.write(`\r${C.FgGreen}✓ README content generated.${C.Reset}\n`);

    // 3. Save File
    const finalContent = readmeContent.replace(/```markdown\n/g, '').replace(/```/g, '').trim();
    fs.writeFileSync(outputFile, finalContent);
    console.log(`${C.FgGreen}✓ Successfully saved to ${path.resolve(outputFile)}${C.Reset}`);
}

main().catch(err => {
    // Ensure spinner is cleared on error
    const activeIntervals = setInterval(() => {}, 1000);
    for(let i = 0; i < activeIntervals; i++) clearInterval(i);
    process.stdout.write('\r');

    console.error(`\n${C.FgRed}Error: ${err.message}${C.Reset}`);
    process.exit(1);
});