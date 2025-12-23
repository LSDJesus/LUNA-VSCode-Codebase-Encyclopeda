import * as fs from 'fs';
import * as path from 'path';

export class BootstrapGuideGenerator {
    static generateGuide(workspacePath: string): string {
        const projectName = path.basename(workspacePath);
        const timestamp = new Date().toISOString();
        
        const readme = this.generateReadme(projectName, timestamp);
        const instructions = this.generateInstructions(projectName, timestamp);
        
        // Save both files
        const codebaseDir = path.join(workspacePath, '.codebase');
        if (!fs.existsSync(codebaseDir)) {
            fs.mkdirSync(codebaseDir, { recursive: true });
        }
        fs.writeFileSync(path.join(codebaseDir, 'README.md'), readme);
        fs.writeFileSync(path.join(codebaseDir, 'LUNA_INSTRUCTIONS.md'), instructions);
        
        return readme; // Return README for backward compatibility
    }

    private static generateReadme(projectName: string, timestamp: string): string {
        return `# LUNA Codebase Encyclopedia – README

**Project**: ${projectName}  
**Generated**: ${timestamp}  
**Purpose**: Quick start guide for users and Copilot

---

## What is LUNA?

LUNA automatically generates **structured summaries** of your codebase files. Think of it as creating instant documentation that your Copilot agent can query without burning tokens.

### The Workflow

1. **Generate** – Run a command to analyze your code (one-time setup)
2. **Store** – Summaries are cached locally in \`.codebase/\`
3. **Query** – Ask Copilot questions about your code in Chat (instant answers)
4. **Navigate** – Click links to jump directly to source code

---

## Key Features

### 📚 Structured Summaries
Every file gets both:
- **Markdown** – Human-readable format with purpose, components, dependencies
- **JSON** – Machine-parseable format for Copilot Agent Mode

### 🚀 Zero-Token Queries
Once generated, querying summaries costs **zero tokens**. Copilot reads cached JSON, not your source files.

### 🔗 Precise Navigation
Summaries include exact line numbers for every component. Click a link → jump to that line in your editor.

### 🔄 Bidirectional Dependencies
Instantly see:
- What does File X import/depend on?
- What other files use File X?

---

## Getting Started

### Step 1: Generate Summaries

In VS Code:
1. Open Command Palette: \`Ctrl+Shift+P\`
2. Run: **"LUNA: Generate Codebase Summaries"**
3. Wait for completion (check status bar)

You'll see new files appear in \`.codebase/\` folder.

### Step 2: Ask Copilot

Open Copilot Chat (\`Ctrl+I\`):

\`\`\`
"What does the main extension file do?"
"Show me all files that export utility functions"
"Which files depend on this database module?"
\`\`\`

Copilot automatically uses LUNA's summaries to answer instantly.

### Step 3: Configuration (Optional)

If you want to customize what files are analyzed:

1. Edit \`.codebase/.lunasummarize\`
2. Adjust include/exclude patterns
3. Re-run "LUNA: Generate Codebase Summaries"

For detailed instructions, see **LUNA_INSTRUCTIONS.md** in this folder.

---

## Common Questions

**Q: Do I need to commit .codebase/ to git?**  
A: No. Add it to \`.gitignore\`. Regenerate it fresh when cloning.

**Q: How often should I regenerate?**  
A: After major refactors or significant new features. For small changes, summaries stay accurate for weeks.

**Q: Can I manually edit the summaries?**  
A: Don't—they'll be overwritten on regeneration. Edit source code, then regenerate instead.

**Q: Which Copilot model does this use?**  
A: Default is \`gpt-4o\`, but you can change it in VS Code Settings → LUNA Encyclopedia.

---

## Supported File Types

By default, LUNA analyzes: **TypeScript, JavaScript, Python, Java, C#, Go, Rust, C/C++**

You can customize this in VS Code Settings.

---

## Next Steps

1. ✅ Run "LUNA: Generate Codebase Summaries"
2. ✅ Open Copilot Chat and ask about your code
3. 📖 Read **LUNA_INSTRUCTIONS.md** for advanced setup (for Copilot agents)

**Questions?** Check the project's main README.md or MCP_INTEGRATION.md for technical details.`;
    }

    private static generateInstructions(projectName: string, timestamp: string): string {
        return `# LUNA_INSTRUCTIONS – Copilot Agent Setup & Operations Manual

**Project**: ${projectName}  
**Generated**: ${timestamp}  
**Audience**: Copilot Agent Mode (technical operations guide)

---

## Overview

This guide teaches you (Copilot agent) how to properly set up LUNA for a project and use the MCP tools correctly. Follow these steps to ensure project-specific code is properly captured.

---

## Phase 1: Project Discovery & Configuration

### Step 1A: Understand Project Structure

**YOUR TASK**: Search the project for all significant source code files.

Use these Copilot Chat queries to explore:

\`\`\`
"List all directories in the project root and explain what each contains"
"Show me the directory tree of [project-name] – what are the main source folders?"
"What file extensions are used in this project? (find .ts, .py, .js, .go, etc.)"
\`\`\`

**Red flags if you miss**:
- Hidden directories starting with \`.\`
- Monorepo subdirectories (\`packages/*/src\`, \`services/*/lib\`)
- Plugin/addon directories (\`plugins/\`, \`extensions/\`)
- Multiple language files (\`src/\` + \`lib/\` + \`tools/\`)

### Step 1B: Find Project-Specific Code

**YOUR TASK**: Identify which folders contain application code vs. boilerplate/config.

Ask Copilot Chat (without Agent Mode):

\`\`\`
"Which directories in this project contain custom application code (not dependencies, tests, or generated files)?"
"Where is the main source code for [feature/module] located?"
"What are the 'src', 'lib', or 'source' directories in this project?"
\`\`\`

**Common patterns to look for**:
- \`src/\` – Primary source
- \`lib/\` or \`packages/\` – Library code
- \`services/\` or \`modules/\` – Domain-specific code
- Language-specific: \`cmd/\` (Go), \`internal/\` (Go), \`app/\` (Python), etc.

### Step 1C: Review Current .lunasummarize Config

Check the file: \`.codebase/.lunasummarize\`

Example structure:
\`\`\`yaml
includeExtensions: ts js py
excludePatterns:
  - node_modules/**
  - dist/**
  - __pycache__/**
excludeFiles:
  - **/*.test.ts
  - **/*.spec.js
\`\`\`

Ask yourself:
- ✅ Are all source directories included?
- ✅ Are test files excluded?
- ✅ Are build outputs excluded?
- ❌ Are important directories accidentally excluded?

---

## Phase 2: Verify Configuration

### Step 2A: Check for Missed Files

**YOUR TASK**: Ensure all project-specific code is included.

Run this Copilot Agent Mode query:

\`\`\`
#search_summaries with query=[project-domain], search_type=keyword
\`\`\`

Where \`[project-domain]\` is the main topic (e.g., "auth", "database", "api", "ui").

**Expected**: Should find multiple files related to that domain.  
**Problem**: If 0-2 files found, you're probably excluding something important.

### Step 2B: Spot-Check Key Files

For each major component identified in 1B, verify it appears in summaries:

\`\`\`
#get_file_summary with file_path=src/[important-file].ts
\`\`\`

If the file returns "not found", it's being excluded. Check the \`.lunasummarize\` patterns.

### Step 2C: Review Dependencies Graph

\`\`\`
#get_dependency_graph with file_path=src/main.ts
\`\`\`

This shows what your project actually depends on. If components are missing, adjust config.

---

## Phase 3: Optimize Configuration

### Step 3A: Refine Includes

Edit \`.codebase/.lunasummarize\`:

\`\`\`yaml
# Add specific file extensions used in this project
includeExtensions: ts tsx js jsx json

# If monorepo: explicitly include source folders
# Leave commented if single-repo
# includeDirectories:
#   - packages/core/src
#   - packages/api/src
#   - services/auth/src
\`\`\`

### Step 3B: Refine Excludes

Add patterns for this project's test/build structure:

\`\`\`yaml
excludePatterns:
  - node_modules/**
  - dist/**
  - build/**
  - .next/**
  - coverage/**

excludeFiles:
  - **/*.test.ts
  - **/*.spec.js
  - **/*.d.ts          # TypeScript declarations (not useful to summarize)
  - **/node_modules/** # Double-check: no dependencies
\`\`\`

**Rule of thumb**: Exclude anything generated, tested, or vendored. Include everything custom.

---

## Phase 4: Generate & Validate

### Step 4A: Trigger Regeneration

Tell the user to run in VS Code:
\`"LUNA: Generate Codebase Summaries"\`

Or use: \`#analyze_file with file_path=[new-file] force_regenerate=true\`

### Step 4B: Validate Coverage

After generation, verify:

\`\`\`
#list_summaries
\`\`\`

Check:
- ✅ Does the count seem reasonable? (Should match source files)
- ✅ Are key files present? (Search the list for important names)
- ✅ Any unexpected files? (Should not see test files, node_modules, etc.)

### Step 4C: Test Queries

Run searches to ensure everything is discoverable:

\`\`\`
#search_summaries with query=import, search_type=dependency
#search_summaries with query=[main-class-name], search_type=component
#search_summaries with query=export, search_type=exports
\`\`\`

If searches return few results, reconfigure and regenerate.

---

## Phase 5: Using MCP Tools Effectively

### Available Tools & When to Use Them

#### \`#get_file_summary\`
**Purpose**: Quick lookup of a specific file's summary  
**Cost**: Zero tokens (cached lookup)  
**Use When**: You need exact details about one file

Example:
\`\`\`
#get_file_summary with file_path=src/auth/tokenManager.ts
Returns: Purpose, exports, dependencies, line numbers for all functions
\`\`\`

#### \`#search_summaries\`
**Purpose**: Find files matching criteria (dependency, component, keyword)  
**Cost**: Zero tokens  
**Use When**: You don't know the file name but know what you're looking for

Examples:
\`\`\`
#search_summaries with query=DatabaseConnection, search_type=component
#search_summaries with query=express, search_type=dependency
#search_summaries with query=authentication, search_type=keyword
\`\`\`

Search types:
- \`component\` – Find classes, functions, types
- \`dependency\` – Find files using a package
- \`exports\` – Find what files export
- \`keyword\` – Text search

#### \`#get_dependency_graph\`
**Purpose**: See import relationships (what uses what)  
**Cost**: Zero tokens  
**Use When**: Understanding architecture or finding impact of changes

Example:
\`\`\`
#get_dependency_graph with file_path=src/core/database.ts
Returns: All files that import from database.ts + what database.ts imports
\`\`\`

#### \`#analyze_file\`
**Purpose**: Generate or update a single file summary  
**Cost**: Cheap (uses gpt-4o mini)  
**Use When**: New file added or summary seems stale

Example:
\`\`\`
#analyze_file with file_path=src/features/newFeature.ts force_regenerate=true
\`\`\`

---

## Troubleshooting

### Problem: Can't find a file you know exists

**Diagnosis**:
1. Is it in an excluded pattern in \`.lunasummarize\`?
2. Is the extension in \`includeExtensions\`?
3. Is it above the \`maxFileSize\` limit?

**Fix**: Update \`.lunasummarize\`, then regenerate.

### Problem: Too many irrelevant files in summaries

**Diagnosis**: Exclude patterns are too loose

**Fix**: Add more specific patterns:
\`\`\`yaml
excludeFiles:
  - **/*.test.*
  - **/*.spec.*
  - **/mocks/**
  - **/fixtures/**
\`\`\`

### Problem: Searches return no results

**Diagnosis**: Files aren't being analyzed

**Fix**: 
1. Check \`.lunasummarize\` configuration
2. Verify files match \`includeExtensions\`
3. Regenerate with verbose logging enabled

---

## Best Practices for Copilot Agents

✅ **DO**:
- Search summaries first before analyzing individual files
- Use \`get_dependency_graph\` to understand architecture before making changes
- Reference exact line numbers from summaries when guiding users to code
- Regenerate after suggesting significant refactors

❌ **DON'T**:
- Assume all files are summarized (check with #list_summaries first)
- Use summaries as substitute for reading critical security/business logic
- Ignore files you think might be out of scope (verify with #search_summaries)
- Recommend changes without checking who depends on the code (#get_dependency_graph)

---

## Configuration Checklist

Before considering setup complete:

- [ ] Ran "LUNA: Generate Codebase Summaries"
- [ ] Reviewed \`.codebase/.lunasummarize\` for this specific project
- [ ] Verified all source directories are included in config
- [ ] Ran \`#list_summaries\` and reviewed results
- [ ] Tested searches for key project components
- [ ] Spot-checked important files with \`#get_file_summary\`
- [ ] Documented any project-specific patterns in this file

---

## Next Query Ideas

Once set up, you can ask:

\`\`\`
"Summarize the architecture of [module-name]"
"What's the dependency tree for [file]?"
"Find all files that use [library/framework]"
"Which files implement [interface/pattern]?"
"Show me the data flow between [component A] and [component B]"
\`\`\``;
    }
}
