#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { version } = require('../../package.json');
const { api } = require('./api.cli.js');

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
    BgBlack: "\x1b[40m",
    BgRed: "\x1b[41m",
    BgGreen: "\x1b[42m",
    BgYellow: "\x1b[43m",
    BgBlue: "\x1b[44m",
    BgMagenta: "\x1b[45m",
    BgCyan: "\x1b[46m",
    BgWhite: "\x1b[47m",
};

/**
 * A simple argument parser.
 * @returns {object} Parsed arguments.
 */
function parseArgs() {
    const args = {};
    const argv = process.argv.slice(2);
    const argMap = {
        'repo': '--',
        'key': '--',
        'out': '--',
        'token': '--',
        'provider': '--',
        'version': '--',
        'pro': '--'
    };
    const aliasMap = {
        'v': 'version'
    };

    for (let i = 0; i < argv.length; i++) {
        let arg = argv[i];
        if (arg.startsWith('--')) {
            const key = arg.substring(2);
            if (argMap[key] && (i + 1 < argv.length) && !argv[i + 1].startsWith('--')) {
                args[key] = argv[++i];
            } else {
                args[key] = true;
            }
        } else if (arg.startsWith('-')) {
            const key = aliasMap[arg.substring(1)];
            if (key) {
                args[key] = true;
            }
        }
    }
    return args;
}

/**
 * Analyzes the repository, showing a spinner during the process.
 * @param {string} repoUrl - The full URL of the GitHub repository.
 * @param {string|undefined} token - The GitHub PAT.
 * @param {boolean} isPro - Whether to perform a deep analysis.
 * @returns {Promise<object>} The analyzed repository data.
 */
async function runAnalysis(repoUrl, token, isPro) {
    const spinner = ['|', '/', '-', '\\'];
    let i = 0;
    const interval = setInterval(() => {
        process.stdout.write(`\r${C.FgYellow}Analyzing repository... ${spinner[i++ % spinner.length]}${C.Reset}`);
    }, 100);

    let owner, repo;
    try {
        const url = new URL(repoUrl);
        [owner, repo] = url.pathname.substring(1).split('/').slice(0, 2);
    } catch (e) {
        throw new Error("Invalid GitHub repository URL format. Please use a full URL.");
    }

    try {
        const repoData = await api.fetchAndParseRepo(owner, repo, token, isPro);
        clearInterval(interval);
        process.stdout.write(`\r${C.FgGreen}✓ Repository analysis complete.${C.Reset}\n`);
        return repoData;
    } catch (error) {
        clearInterval(interval);
        // Re-throw to be caught by main's catch block
        throw error;
    }
}

/**
 * Generates the README content by calling the AI provider.
 * @param {string} provider - The AI provider ('openai' or 'gemini').
 * @param {string} key - The API key.
 * @param {object} repoData - The data from the repository analysis.
 * @param {boolean} isPro - Whether to generate a pro-level prompt.
 * @returns {Promise<string>} The generated README content.
 */
async function runGeneration(provider, key, repoData, isPro) {
    process.stdout.write(`${C.FgYellow}Generating README with ${provider}...${C.Reset}`);
    const prompt = api.createPrompt(repoData, isPro);
    const readmeContent = await api.callAIAPI(provider, key, prompt);
    process.stdout.write(`\r${C.FgGreen}✓ README content generated.${C.Reset}\n`);
    return readmeContent;
}

/**
 * Cleans and saves the README content to a file.
 * @param {string} outputFile - The path to save the file to.
 * @param {string} content - The raw README content from the AI.
 */
function saveReadme(outputFile, content) {
    if (typeof content !== 'string') {
        throw new Error('Failed to generate README content from AI provider.');
    }
    const finalContent = content.replace(/```markdown\n/g, '').replace(/```/g, '').trim();
    fs.writeFileSync(outputFile, finalContent);
    console.log(`${C.FgGreen}✓ Successfully saved to ${path.resolve(outputFile)}${C.Reset}`);
}

/**
 * Main execution function for the CLI.
 */
async function main() {
    let interval;
    if (process.argv.includes('--version') || process.argv.includes('-v')) {
        console.log(`interactive-readme-pro version ${version}`);
        return;
    }

    try {
        const args = parseArgs();

        if (!args.repo) {
            console.log(`${C.Bright}Interactive README Pro CLI${C.Reset}`);
            console.log("Usage: node cli.js --repo <github_url> --key <api_key> [options]");
            console.log("\nOptions:");
            console.log("  --provider <name>  AI provider to use (gemini or openai). Default: openai");
            console.log("  --out <file_path>  Output file path. Default: README.md");
            console.log("  --token <gh_token> GitHub Personal Access Token for private repos.");
            console.log("  --pro              Run in Pro Mode for deep repository analysis.");
            process.exit(1);
        }

        const isPro = !!args['pro'];
        if (!args.key) {
            console.error(`${C.FgRed}Error: --key <api_key> is required.${C.Reset}`);
            process.exit(1);
        }

        const provider = args.provider || 'openai';
        const outputFile = args.out || 'README.md';

        console.log(`${C.FgBlue}Starting README generation for ${args.repo}...${C.Reset}`);
        if (isPro) {
            console.log(`${C.FgMagenta}Running in Pro Mode (deep analysis).${C.Reset}`);
        } else {
            console.log(`${C.FgCyan}Running in Free Mode (basic analysis). Use --pro for a more detailed README!${C.Reset}`);
        }

        // 1. Analyze
        const repoData = await runAnalysis(args.repo, args.token, isPro);

        // 2. Generate
        const readmeContent = await runGeneration(provider, args.key, repoData, isPro);

        // 3. Save
        saveReadme(outputFile, readmeContent);
    } catch (err) {
        if (interval) clearInterval(interval);
        process.stdout.write('\r');

        console.error(`\n${C.FgRed}Error: ${err.message}${C.Reset}`);
        process.exit(1);
    }
}

// This allows the script to be run directly but also to be required for testing
if (require.main === module) {
    main();
}

// Export for testing
module.exports = {
    parseArgs,
    main
};
