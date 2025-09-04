/**
 * API interaction logic for the CLI tool.
 */
const fetch = require('node-fetch');

async function githubApiGet(path, headers) {
    const response = await fetch(`https://api.github.com${path}`, { headers });
    if (response.status === 404) return null;
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `GitHub API request failed: ${response.status}` }));
        throw new Error(errorData.message || `GitHub API request failed: ${response.status}`);
    }
    return response.json();
}

async function getFileContent(owner, repo, filePath, headers) {
    const data = await githubApiGet(`/repos/${owner}/${repo}/contents/${filePath}`, headers);
    if (!data || !data.content) return null;
    return Buffer.from(data.content, 'base64').toString('utf-8');
}

/**
 * Parses package.json content and updates the extracted data object.
 * @param {string|null} content - The string content of package.json.
 * @param {object} extractedData - The data object to be mutated.
 * @private
 */
function _parsePackageJson(content, extractedData) {
    if (!content) return;
    try {
        const packageJson = JSON.parse(content);
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        const depKeys = Object.keys(deps);
        const frameworks = depKeys.filter(k => ['react', 'vue', 'angular', 'svelte', 'express', 'next', 'nuxt'].includes(k));
        if (frameworks.length > 0) extractedData.frameworks = frameworks.join(', ');
        if (packageJson.scripts) {
            extractedData.scripts = Object.keys(packageJson.scripts).join(', ');
        }
        if (depKeys.length > 0) extractedData.dependencies = depKeys.slice(0, 5).join(', ');
        extractedData.projectType = 'web-app';
        if (packageJson.main) extractedData.mainEntryPoint = packageJson.main;
        if (packageJson.license) extractedData.license = packageJson.license;
    } catch (e) { console.warn("Could not parse package.json"); }
}

/**
 * Parses requirements.txt content and updates the extracted data object.
 * @param {string|null} content - The string content of requirements.txt.
 * @param {object} extractedData - The data object to be mutated.
 * @private
 */
function _parseRequirementsTxt(content, extractedData) {
    if (!content) return;
    const deps = content.split('\n').filter(line => line && !line.startsWith('#')).map(line => line.trim());
    const currentDeps = extractedData.dependencies !== 'not-sure' ? extractedData.dependencies + ', ' : '';
    extractedData.dependencies = currentDeps + deps.slice(0, 5).join(', ');
    extractedData.projectType = 'web-app';
    if (!extractedData.mainLanguage || extractedData.mainLanguage === 'not-sure') {
        extractedData.mainLanguage = 'python';
    }
}

const api = {
    fetchAndParseRepo: async function(owner, repo, token, isPro = true) {
        const headers = { 'Accept': 'application/vnd.github.v3+json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const repoInfo = await githubApiGet(`/repos/${owner}/${repo}`, headers);
        if (!repoInfo) throw new Error("Repository not found or access denied.");

        const extractedData = {
            projectName: repoInfo.name,
            description: repoInfo.description || '',
            mainLanguage: repoInfo.language ? repoInfo.language.toLowerCase() : 'not-sure',
            author: repoInfo.owner?.login || '',
            license: repoInfo.license?.spdx_id || 'not-sure',
            projectType: 'not-sure',
            fileStructure: 'not-sure',
            mainEntryPoint: 'not-sure',
            scripts: 'not-sure',
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

        // For the free tier, we stop here and return only the basic info.
        if (!isPro) {
            return extractedData;
        }

        const tree = await githubApiGet(`/repos/${owner}/${repo}/git/trees/${repoInfo.default_branch}?recursive=1`, headers);
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

        const packageJsonContent = await getFileContent(owner, repo, 'package.json', headers);
        _parsePackageJson(packageJsonContent, extractedData);

        const requirementsTxtContent = await getFileContent(owner, repo, 'requirements.txt', headers);
        _parseRequirementsTxt(requirementsTxtContent, extractedData);

        // If license is still not found, check for a LICENSE file in the root.
        if (extractedData.license === 'not-sure' && tree && tree.tree) {
            const licenseFile = tree.tree.find(node =>
                node.path.toLowerCase().startsWith('license') && node.type === 'blob'
            );
            if (licenseFile) {
                extractedData.license = 'Exists (see LICENSE file)';
            }
        }

        return extractedData;
    },

    createPrompt: function(data, isPro = true) {
        if (!isPro) {
            return `Create a good-looking, professional README.md file for the following project.
The analysis was basic. You only have the following information:

Project Name: ${data.projectName}
Description: ${data.description}
Primary Language: ${data.mainLanguage}
Author: ${data.author}

Based on this, please generate a standard, high-quality README. Include sections like Installation, Usage, and Contributing, but make the content generic and based on best practices for a project of this language.

At the very end of the file, add the following footer exactly as written, including the horizontal rule:
---
<sub>*This README was generated with the free version of Interactive README Pro. Upgrade to Pro for a more detailed and accurate README based on deep repository analysis!*</sub>`;
        }
        return `Create a comprehensive, professional README.md file for the following project:

Project Name: ${data.projectName}
Description: ${data.description}
${data.fileStructure && data.fileStructure !== 'not-sure' ? `File Structure Summary:\n${data.fileStructure}\n` : ''}
${data.scripts && data.scripts !== 'not-sure' ? `Available Scripts: ${data.scripts}\n` : ''}
${data.mainEntryPoint && data.mainEntryPoint !== 'not-sure' ? `Main Entry Point: ${data.mainEntryPoint}\n` : ''}
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

Generate only the README content in valid Markdown format.

At the very end of the file, add the following footer exactly as written, including the horizontal rule:
---
<sub>*This README was generated with ❤️ by Interactive README Pro*</sub>`;
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

module.exports = { api };