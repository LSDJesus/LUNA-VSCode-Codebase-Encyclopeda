# LUNA Codebase Encyclopedia — Project Index

## Overview

This is a **VS Code Extension + MCP Server** for AI-powered codebase navigation. The project generates structured summaries (Markdown + JSON) of codebases using GitHub Copilot, then exposes them to Copilot Agent Mode via Model Context Protocol tools.

## Root Structure

- [**src/**](src/INDEX.md) — VS Code Extension source code (TypeScript)
- [**mcp-server/**](mcp-server/INDEX.md) — MCP server implementation (separate Node.js app)
- [**.vscode/**](.vscode/INDEX.md) — VS Code configuration (launch, tasks, MCP registration)
- [**package.json**](package.json) — Extension dependencies and contribution points
- [**tsconfig.json**](tsconfig.json) — TypeScript configuration
- [**README.md**](README.md) — User-facing documentation
- [**Project_roadmap.md**](Project_roadmap.md) — Development roadmap and planning
- [**LICENSE**](LICENSE) — MIT license

## Key Concepts

### Generated Artifacts
- **`.codebase/`** — Auto-generated folder (not in repo) containing:
  - `LUNA_GUIDE.md` — Auto-generated user guide per project
  - `.lunasummarize` — Configuration (include/exclude patterns)
  - `src/file.md` + `src/file.json` — Mirrored summaries for each file

### Configuration Files
- **`.vscode/mcp.json`** — Registers MCP server with Copilot Chat
- **`.vscode/launch.json`** — Debug configuration for extension
- **`.vscode/tasks.json`** — Build tasks

## Architecture

```
User runs "LUNA: Generate Codebase Summaries"
    ↓
Extension (src/) analyzes files using Copilot Chat API
    ↓
Generates .md (human) + .json (AI) summaries
    ↓
Stores in .codebase/ mirroring project structure
    ↓
MCP Server reads .codebase/ when Copilot Agent Mode queries tools
    ↓
Copilot answers from cached summaries (zero token cost)
```

## Quick Navigation

| What                              | Where                  |
|-----------------------------------|------------------------|
| Extension entry point             | [src/extension.ts](src/extension.ts) |
| File analysis & summary generation| [src/codebaseAnalyzer.ts](src/codebaseAnalyzer.ts) |
| MCP tool implementations          | [mcp-server/src/index.ts](mcp-server/src/index.ts) |
| Summary cache management          | [mcp-server/src/summaryManager.ts](mcp-server/src/summaryManager.ts) |
| Config parsing (.lunasummarize)   | [src/summaryIncludeMatcher.ts](src/summaryIncludeMatcher.ts) |
| Bootstrap guide generator         | [src/bootstrapGuideGenerator.ts](src/bootstrapGuideGenerator.ts) |

## Development Commands

```bash
# Extension
npm run compile          # TypeScript → JavaScript
npm run watch           # Auto-compile on changes

# MCP Server
cd mcp-server
npm run build           # TypeScript → JavaScript
npm run watch          # Auto-rebuild on changes
npm run start          # Run server locally

# Debug
# Press F5 to launch Extension Development Host
```

## File Naming Conventions

- **`*Analyzer.ts`** — Main business logic (file discovery, summary generation)
- **`*Generator.ts`** — Content generation (guides, summaries)
- **`*Manager.ts`** — Data management (caching, reading)
- **`*Provider.ts`** — VS Code UI providers (tree views, panels)
- **`*Matcher.ts`** — Pattern matching (ignore patterns)

## Next Steps

1. Start with [src/INDEX.md](src/INDEX.md) to understand the extension
2. Then see [mcp-server/INDEX.md](mcp-server/INDEX.md) for MCP tools
3. Check [README.md](README.md) for user-facing docs
