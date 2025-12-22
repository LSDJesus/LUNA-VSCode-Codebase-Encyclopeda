# src/ — VS Code Extension Source Code

## Purpose

Contains all TypeScript source code for the LUNA VS Code Extension. Handles file discovery, Copilot integration, summary generation, and UI components.

## Contents

### Core Logic
- [**extension.ts**](extension.ts) — Extension activation, command registration, and initialization
- [**codebaseAnalyzer.ts**](codebaseAnalyzer.ts) — File discovery, Copilot API integration, summary generation pipeline
- [**ignorePatternMatcher.ts**](ignorePatternMatcher.ts) — Parses `.lunasummarize` config, handles include/exclude patterns
- [**bootstrapGuideGenerator.ts**](bootstrapGuideGenerator.ts) — Auto-generates `LUNA_GUIDE.md` for each project

### UI Components
- [**summaryPanel.ts**](summaryPanel.ts) — WebView panel for rendering summary Markdown with syntax highlighting
- [**summaryTreeProvider.ts**](summaryTreeProvider.ts) — Tree view provider for `.codebase/` folder structure in sidebar

## Key Features

| Feature | Files |
|---------|-------|
| Summary generation | codebaseAnalyzer.ts |
| Config management | ignorePatternMatcher.ts |
| File filtering | codebaseAnalyzer.ts |
| UI rendering | summaryPanel.ts, summaryTreeProvider.ts |
| User guidance | bootstrapGuideGenerator.ts |

## Configuration & Settings

- `luna-encyclopedia.copilotModel` — Copilot model to use (gpt-4o, gpt-5-mini, etc.)
- `luna-encyclopedia.maxTokens` — Token limit for summaries
- `luna-encyclopedia.temperature` — LLM temperature (0 = deterministic)
- `luna-encyclopedia.fileTypesToInclude` — File extensions to analyze
- `luna-encyclopedia.fileTypesToExclude` — Files to skip (*.test.ts, *.min.js, etc.)

See [package.json](../package.json) `contributes.configuration` for full details.

## Commands Registered

- `luna-encyclopedia.generateSummaries` — Analyze all files and generate summaries
- `luna-encyclopedia.showSummary` — Display summary in WebView panel
- `luna-encyclopedia.refreshTree` — Refresh sidebar tree view

## Summary Generation Flow

```
User runs command
    ↓
discoverFiles() — finds all files matching criteria
    ↓
analyzeSingleFile() — for each file:
  ├─ Read content
  ├─ Build analysis prompt
  ├─ Call Copilot Chat API
  ├─ Parse response (JSON + Markdown)
  └─ Save to .codebase/
    ↓
saveSummary() — writes .md and .json files with folder structure
    ↓
UI updates (tree view refresh, notification)
```

## Dependencies

- **vscode** — VS Code Extension API
- **marked** — Markdown rendering
- **minimatch** — Pattern matching for .lunasummarize

## Notes

- All paths use forward slashes (`/`) internally, converted for platform at runtime
- Summaries are stored with mirrored folder structure: `src/file.ts` → `.codebase/src/file.md`
- Copilot model selection is configurable per-workspace via VS Code settings
- Bootstrap guide auto-generates with project name and timestamp

## Build Output

Compiles to `out/` folder (TypeScript → JavaScript). Entry point: `out/extension.js`
