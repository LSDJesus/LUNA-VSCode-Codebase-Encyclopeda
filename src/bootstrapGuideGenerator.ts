import * as fs from 'fs';
import * as path from 'path';

export class BootstrapGuideGenerator {
    static generateGuide(workspacePath: string): string {
        const projectName = path.basename(workspacePath);
        const timestamp = new Date().toISOString();
        
        const guide = `# LUNA Codebase Encyclopedia Guide

Project: ${projectName}
Generated: ${timestamp}
Version: 1.0

---

## Quick Start

This project uses LUNA Codebase Encyclopedia - an AI-powered tool that generates and maintains structured summaries of your codebase. The summaries in this folder (.codebase/) are optimized for use with GitHub Copilot Agent Mode.

### Using with Copilot Chat

1. Open Copilot Chat in VS Code
2. Switch to Agent Mode (button at top of chat)
3. Ask naturally about your codebase:
   - "What does the extension.ts file do?"
   - "Show me all files that use the vscode API"
   - "What does the summaryPanel export?"

Copilot will automatically use the MCP tools to query these summaries!

---

## Available MCP Tools

When in Copilot Agent Mode, you can explicitly reference:

### get_file_summary

Get cached summary for any file (instant lookup, no LLM overhead).

Usage: #get_file_summary with file_path=src/extension.ts

Returns: JSON structure with purpose, dependencies, exports, etc.

---

### analyze_file

Generate or update a file summary using Copilot (uses cheap model).

Usage: #analyze_file with file_path=src/newFile.ts

Use when a file is new or the summary is stale.

---

### search_summaries

Find files by dependency, component, or keyword.

Usage: #search_summaries with query=express, search_type=dependency

Search types:
- dependency - Find files using a package/module
- component - Find specific classes/functions
- exports - Find public API definitions
- keyword - General text search

---

### list_summaries

List all cached summaries with metadata.

Usage: #list_summaries

Useful for understanding project scope.

---

### get_dependency_graph

Get dependency relationships for a file or entire workspace.

Usage: #get_dependency_graph with file_path=src/main.ts

Returns nodes and edges showing what depends on what.

---

## Summary Format

Each file has two formats:

### Markdown (.md)

Human-readable format with:
- Purpose: What the file does
- Key Components: Classes, functions, exports
- Dependencies: Internal and external imports
- Public API: What other files can use
- Code Links: Direct navigation to source
- Implementation Notes: Patterns, algorithms, important details

### JSON (.json)

Machine-parseable format with structured data for AI analysis.

---

## Keeping Summaries Up-to-Date

### Automatic Updates

When you modify this project, summaries become stale. Here's how to keep them fresh:

### Option 1: Full Regeneration (Recommended)

In VS Code:
1. Open Command Palette (Ctrl+Shift+P)
2. Run: "LUNA: Generate Codebase Summaries"
3. Wait for completion

This re-analyzes all files and updates all summaries.

### Option 2: Single File Update

In Copilot Chat:
#analyze_file with file_path=src/newFile.ts force_regenerate=true

Use this for newly created files without regenerating everything.

---

## Updating .lunasummarize Config

The .lunasummarize file in this folder controls which files are analyzed.

### When to Update:

Add to [include] if:
- You have a large monorepo and only want to analyze specific folders
- You want to exclude entire areas (e.g., only analyze src/, not scripts/)

Add to [exclude] if:
- You have new test folders
- You add vendor code you don't want analyzed
- You have generated files cluttering the summaries

### Example Updates:

Scenario 1: Added new tests/ folder you don't want in summaries

[exclude]
tests/
*.test.ts

Scenario 2: Monorepo - only analyze core packages

[include]
packages/core/src
packages/utils/src
packages/cli/src

[exclude]
*.test.ts
__tests__/

After updating .lunasummarize:
1. Run "LUNA: Generate Codebase Summaries" again
2. Old summaries for excluded files remain but are ignored by Copilot

---

## Best Practices

DO:
- Run summary generation after major refactors
- Update .lunasummarize when project structure changes
- Use Copilot Agent Mode for architecture questions
- Reference specific files with #get_file_summary for precise info

DON'T:
- Manually edit .md or .json files (they will be overwritten)
- Exclude entire folders if you might need them later
- Forget to regenerate after adding new folders
- Use summaries as a substitute for reading critical code

---

## Troubleshooting

### Summaries seem outdated

Solution: Run "LUNA: Generate Codebase Summaries" to refresh all files.

### File not appearing in summaries

Check:
1. Is the file extension in fileTypesToInclude setting?
2. Is the file in an excluded pattern in .lunasummarize?
3. Is the file's folder in the [include] list?

### Copilot not finding tools

Solution:
1. Ensure .vscode/mcp.json exists and is configured
2. Restart VS Code
3. Check Copilot Chat settings

---

## Configuration Settings

You can customize LUNA in VS Code settings (Ctrl+,):

- luna-encyclopedia.copilotModel - Which Copilot model to use (default: gpt-4o)
- luna-encyclopedia.maxTokens - Maximum response length (default: 4096)
- luna-encyclopedia.fileTypesToInclude - Which file extensions to analyze
- luna-encyclopedia.fileTypesToExclude - Which files to skip (e.g., .test.ts)

---

## Next Steps

1. Summaries are generated and stored in .codebase/
2. .lunasummarize is configured for this project
3. Next: Open Copilot Chat and try asking about your codebase!

Questions? See the MCP_INTEGRATION.md in your project root for more details.

Pro tip: Keep this guide up-to-date with your project! Add project-specific notes here for your team.`;
        
        return guide;
    }
}
