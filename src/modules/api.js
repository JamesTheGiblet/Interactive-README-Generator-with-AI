const api = {
    callAIAPI: async function(provider, apiKey, prompt) {
        let url, options;
        if (provider === 'gemini') {
            url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
            options = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            };
        } else if (provider === 'openai') {
            url = 'https://api.openai.com/v1/chat/completions';
            options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({ model: 'gpt-3.5-turbo', messages: [{ role: 'user', content: prompt }] })
            };
        } else {
            throw new Error(`Unsupported API provider: ${provider}`);
        }

        const response = await fetch(url, options);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = (provider === 'gemini' ? errorData.error?.message : errorData.error?.message) || `API request failed with status ${response.status}`;
            const error = new Error(errorMessage);
            error.status = response.status;
            throw error;
        }

        const data = await response.json();

        if (provider === 'gemini') {
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                throw new Error('Invalid response from Gemini API');
            }
            return data.candidates[0].content.parts[0].text;
        } else { // openai
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Invalid response from OpenAI API');
            }
            return data.choices[0].message.content;
        }
    },

    createPrompt: function(data) {
        const hasUnsureFields = ReadmeGenerator.utils.checkForUnsureFields(data);
        
        // Provider-specific optimization: Tweak the main instruction based on the provider.
        let instructionsHeader = `Create a comprehensive, professional README.md file for the following project:`;
        if (data.apiProvider === 'openai') {
            // OpenAI models can benefit from a more explicit role-playing instruction.
            instructionsHeader = `As an expert technical writer specializing in developer documentation, create a comprehensive, professional README.md file for the following project:`;
        }

        let prompt = `${instructionsHeader}

Project Name: ${data.projectName}
Description: ${data.description}
${data.fileStructure ? `
File Structure Summary:
${data.fileStructure}` : ''}
Project Type: ${data.projectType}
Primary Language: ${data.mainLanguage}
Frameworks/Technologies: ${data.frameworks}
Dependencies: ${data.dependencies}
Features: ${data.features}
Demo/Screenshots: ${data.demo}
Installation: ${data.installation}
Usage: ${data.usage}
Requirements: ${data.requirements}
License: ${data.license}
Author: ${data.author}
Contact: ${data.contact}
Acknowledgments: ${data.acknowledgments}

Include sections for:
${data.includeInstall ? '- Installation instructions' : ''}
${data.includeUsage ? '- Usage examples with code blocks' : ''}
${data.includeAPI ? '- API documentation' : ''}
${data.includeContrib ? '- Contributing guidelines' : ''}

IMPORTANT INSTRUCTIONS FOR HANDLING MISSING/UNCERTAIN INFORMATION:
${hasUnsureFields ? `
SMART FILLING REQUIRED: The user has indicated uncertainty about some fields or left them blank. Please intelligently fill in missing information based on the project description and available context:

1. If project type is "not-sure" - analyze the description and file structure to determine the most likely project type (e.g., presence of 'src/main.js' and 'public/index.html' suggests a web app).
2. If language is "not-sure" - infer from frameworks, dependencies, or project description
3. If frameworks/dependencies contain "not sure" - suggest appropriate ones based on the project type and language
4. If features contain "not sure" - generate logical features based on the project description and type
5. If installation contains "not sure" - create standard installation instructions for the determined tech stack
6. If usage contains "not sure" - generate appropriate usage examples for the project type
7. If requirements contains "not sure" - list standard requirements for the tech stack
8. If license is "not-sure" - recommend MIT for open source projects or Apache 2.0 for larger projects
9. For any empty optional fields - generate reasonable content if it would improve the README

Be creative and logical in your assumptions, ensuring all generated content is realistic and appropriate for the project type and description provided.
` : ''}

Requirements:
1. **Tone of Voice**: Write the entire document in a **${data.tone}** tone. If the tone is "ai-decide", choose a tone that best fits the project's description and type (e.g., professional for a library, friendly for a consumer app).
2. **Markdown Style**:
   - Use a hyphen (-) for all unordered list items (MD004).
   - Ensure there is only a single blank line between elements (no multiple blank lines) (MD012).
3. Use proper Markdown formatting with headers, code blocks, lists, and badges.
4. Include a table of contents if the README is substantial.
5. Add relevant badges/shields (build status, version, license, etc.).
6. Make it professional and comprehensive.
7. Include proper code examples with language-specific syntax highlighting (e.g., \`\`\`javascript).
8. Add sections for troubleshooting if relevant.
9. Include links where appropriate.
10. Make it visually appealing with emojis and proper formatting.
11. Ensure all sections flow logically and provide value.
${hasUnsureFields ? '12. Fill in all uncertain or missing information intelligently based on context.' : ''}

Generate only the README content in valid Markdown format, nothing else.`;

        return prompt;
    },

    getApiErrorMessage: function(error, provider) {
        if (!error || typeof error.status === 'undefined') {
            return error.message || 'An unknown network error occurred. Please check your connection and try again.';
        }

        const status = error.status.toString();
        const errorMessages = {
            'gemini': {
                '400': 'Bad request. The AI model could not process the input. Please check your form data.',
                '401': 'Invalid API Key. Please verify your Gemini API key in Step 1.',
                '403': 'Permission Denied. Your Gemini API key may not have the correct permissions.',
                '429': 'Rate Limit Exceeded. You have made too many requests. Please wait a while before trying again.',
                '500': 'Google AI Server Error. Please try again later.',
                '503': 'Service Unavailable. Google AI service is temporarily down. Please try again later.'
            },
            'openai': {
                '400': 'Bad request. The AI model could not process the input. Please check your form data.',
                '401': 'Invalid API Key. Please verify your OpenAI API key in Step 1.',
                '402': 'Insufficient Credits. Please check your OpenAI account balance.',
                '429': 'Rate Limit Exceeded. You have made too many requests. Please wait a while before trying again.',
                '500': 'OpenAI Server Error. Please try again later.',
                '503': 'Service Unavailable. OpenAI service is temporarily overloaded. Please try again later.'
            }
        };
        
        return errorMessages[provider]?.[status] || error.message || `An unexpected error occurred (Status: ${status}).`;
    },

    fetchAndParseRepo: async function(owner, repo, token) {
        const headers = { 'Accept': 'application/vnd.github.v3+json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    
        const githubApiGet = async (path) => {
            const response = await fetch(`https://api.github.com${path}`, { headers });
            if (response.status === 404) return null; // Gracefully handle not found
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `GitHub API request failed: ${response.status}`);
            }
            return response.json();
        };
    
        const getFileContent = async (filePath) => {
            const data = await githubApiGet(`/repos/${owner}/${repo}/contents/${filePath}`);
            if (!data || !data.content) return null;
            return atob(data.content);
        };
    
        // 1. Fetch basic repo info
        const repoInfo = await githubApiGet(`/repos/${owner}/${repo}`);
        if (!repoInfo) throw new Error("Repository not found or access denied.");
    
        const extractedData = {
            projectName: repoInfo.name,
            description: repoInfo.description || '',
            mainLanguage: repoInfo.language ? repoInfo.language.toLowerCase() : 'not-sure',
            author: repoInfo.owner?.login || '',
        };

        // 2. Fetch and analyze file structure for deeper insights
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
                extractedData.fileStructure = filePaths.slice(0, 100).join('\n'); // Limit to 100 files for prompt efficiency
            }
        }
    
        // 2. Fetch and parse dependency files
        const packageJsonContent = await getFileContent('package.json');
        if (packageJsonContent) {
            try {
                const packageJson = JSON.parse(packageJsonContent);
                const deps = {
                    ...packageJson.dependencies,
                    ...packageJson.devDependencies
                };
                const depKeys = Object.keys(deps);
                
                // Simple logic to find frameworks
                const frameworks = depKeys.filter(k => ['react', 'vue', 'angular', 'svelte', 'express', 'next', 'nuxt'].includes(k));
                
                if(frameworks.length > 0) extractedData.frameworks = frameworks.join(', ');
                if(depKeys.length > 0) extractedData.dependencies = depKeys.slice(0, 5).join(', '); // List first 5
                extractedData.projectType = 'web-app'; // Good assumption for package.json
                if (packageJson.license) extractedData.license = packageJson.license;
            } catch (e) {
                console.warn("Could not parse package.json");
            }
        }
    
        const requirementsTxtContent = await getFileContent('requirements.txt');
        if (requirementsTxtContent) {
            const deps = requirementsTxtContent.split('\n').filter(line => line && !line.startsWith('#')).map(line => line.split(/==|>=/)[0].trim());
            const currentDeps = extractedData.dependencies ? extractedData.dependencies + ', ' : '';
            extractedData.dependencies = currentDeps + deps.slice(0, 5).join(', ');
            extractedData.projectType = 'web-app'; // Or could be a library
            if (!extractedData.mainLanguage || extractedData.mainLanguage === 'not-sure') {
                extractedData.mainLanguage = 'python';
            }
        }
        
        // Can add more parsers here for pom.xml, Gemfile, etc.
    
        return extractedData;
    },
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { api };
}
