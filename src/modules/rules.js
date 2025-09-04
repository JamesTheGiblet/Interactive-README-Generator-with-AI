const ReadmeRules = {
    content: `
## The Anatomy of a Great README

### 1. The Hook (First 30 Seconds)

Your README has 30 seconds to convince someone to keep reading. The opening must immediately communicate:

- **What problem you solve** (not what you built)
- **Why it matters** (the pain point)
- **How quickly they can see results** (time to value)

**Examples from successful projects:**

\`\`\`markdown
# API Blueprint Generator
Stop writing APIs twice. Write the spec once, get the working code.
\`\`\`

\`\`\`markdown
# Project Aegis CLI
Every good project needs a SECURITY.md file, but let's be honest—it's a boring, 
repetitive chore that's easy to forget. So, most projects don't have them until it's too late.
\`\`\`

**The Formula:**
\`[Problem Statement] + [Simple Solution] + [Immediate Benefit]\`

### 2. Instant Gratification Section

After the hook, provide immediate proof that your tool works. This should be:

- **Copy-pasteable commands** that work out of the box
- **Before/after examples** showing transformation
- **Visual proof** (screenshots, GIFs, or code samples)

**Example Pattern:**
\`\`\`markdown
🚀 Quick Start

Transform this simple input:
[Simple example]

Into this output:
[Impressive result]

In seconds:
\`\`\`
\`\`\`bash
pip install your-tool
your-tool input.txt --output amazing-result
\`\`\`

### 3. The "Why This Matters" Section

Address the real frustrations developers face. Don't just list features—explain the pain they eliminate.

**Effective Pain Point Communication:**
\`\`\`markdown
## The Problem

- You write the API docs, then you write the code. It's redundant.
- The docs and the code never stay in sync.
- Starting every API project from scratch is a waste of time.
- Teams end up with inconsistent patterns.

## The Solution

- One File: One Markdown file defines everything.
- Ready to Go: Generated code includes tests, validation, and deployment config.
- Time Savings: Cuts down on boilerplate by a lot.
\`\`\`

### 4. Feature Presentation That Sells

Don't just list what your tool does—explain the value each feature provides.

**Instead of:**
- Authentication support
- Multiple database backends
- Docker integration

**Write:**
- **JWT Authentication**: Skip the boilerplate—get secure token-based auth out of the box
- **Database Flexibility**: Start with SQLite, scale to PostgreSQL without code changes
- **One-Command Deploy**: \`docker-compose up\` gets you from code to running service

### 5. Installation That Actually Works

Provide multiple installation paths and account for different user contexts:

\`\`\`markdown
## Installation

### Using pip (Recommended)
\`\`\`bash
pip install your-package
\`\`\`

### Using Docker
\`\`\`bash
docker pull your-org/your-tool
docker run -v $(pwd):/workspace your-org/your-tool
\`\`\`

### From Source
\`\`\`bash
git clone https://github.com/your-org/your-tool.git
cd your-tool
pip install -e .
\`\`\`
\`\`\`

### 6. Usage Examples That Inspire

Show progressively complex examples that demonstrate growth potential:

1.  **Minimal viable example** (proves it works)
2.  **Realistic use case** (shows practical value)
3.  **Advanced scenario** (demonstrates full power)

**Example Structure:**
\`\`\`markdown
## Usage

### Basic Example
\`\`\`bash
# The simplest possible use case
tool generate simple.md
\`\`\`

### Real-World Usage
\`\`\`bash
# How you'd actually use it in a project
tool generate api-spec.md --output my-api --database postgresql
\`\`\`

### Advanced Configuration
[Complex example with configuration files]
\`\`\`

## Voice and Tone Patterns

### The "Honest Builder" Voice
- Acknowledges limitations upfront
- Uses informal, direct language
- Shows personality without being unprofessional

**Example:**
> "Let's be crystal clear: this tool is a starting point, not a magic bullet."

### The "Problem-First" Approach
- Starts with frustration, not features
- Uses second-person ("You write...") to create identification
- Positions tool as solution, not product

### The "Show Don't Tell" Philosophy
- More code examples, fewer feature lists
- Concrete benefits over abstract capabilities
- Proof through demonstration

## Visual and Structural Enhancements

### Strategic Use of Badges and Visual Elements
Modern READMEs leverage visual elements to communicate key information quickly:

\`\`\`markdown
!Node.js
!Express.js
!License
\`\`\`

**Badge Strategy:**
- **Tech Stack Badges**: Show what technologies users need to know
- **Status Badges**: Build confidence (passing builds, current version)
- **License Badges**: Address legal concerns immediately
- **Achievement Badges**: Highlight adoption or quality metrics

### Emoji Usage Patterns
Strategic emoji use improves scannability without being unprofessional:

- **Section Headers**: 🚀 Getting Started, 🛠️ Installation, 📊 Features
- **Feature Lists**: ✅ Complete, 🔒 Secure, ⚡ Fast
- **Status Indicators**: 🎯 Core functionality, 🔮 Future features
- **Categories**: 📱 Mobile, 🖥️ Desktop, ☁️ Cloud

**Rule**: Use emojis to create visual hierarchy, not decoration.

### Table Formatting for Technical Information
Tables work excellently for structured information:

\`\`\`markdown
| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| \`PORT\` | Server port | No | \`3000\` |
| \`MONGODB_URI\` | Database connection | Yes | - |
\`\`\`

**Effective table usage:**
- Environment variables and configuration
- API endpoints and parameters
- Feature comparisons
- Compatibility matrices

## Final Thoughts

The best READMEs don't just document—they **sell the vision** of what's possible with your tool. They take readers on a journey from problem recognition through to successful implementation.

Remember: Your README isn't documentation—it's marketing material that happens to be technically accurate.

**Key Success Metrics:**
- Time to first success < 5 minutes
- Clear value proposition within 30 seconds
- Progressive examples that inspire exploration
- Honest about limitations while emphasizing strengths

Your README should make someone think: "This solves my exact problem and I can try it right now."
`
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ReadmeRules };
}