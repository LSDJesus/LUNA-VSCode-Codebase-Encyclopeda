# LUNA Codebase Encyclopedia - AI Agent Instructions

## Project Architecture

LUNA is a **dual-component VS Code extension** that generates AI-queryable codebase summaries:

1. **Extension (`src/`)** - VS Code extension that analyzes codebases using Copilot API
2. **MCP Server (`mcp-server/`)** - Model Context Protocol server exposing summaries to AI agents

**Key Architecture Pattern**: Hybrid Analysis
- Static analysis (`StaticImportAnalyzer`) extracts dependencies (100% accurate)
- Copilot API generates semantic insights (purpose, components, patterns)
- Results merged into dual-format output (Markdown + JSON)
- Post-processing adds bidirectional "used by" relationships

## Critical Build & Development Workflow

### Build Commands
```bash
npm run compile          # Build extension (TypeScript → CommonJS in out/)
npm run watch            # Watch mode for development
cd mcp-server && npm run build   # Build MCP server (TypeScript → ESM in dist/)
```

**Important**: Extension uses CommonJS (`module: "commonjs"`), MCP server uses ESM (`"type": "module"`). Don't mix them.

### Testing Workflow
1. Press F5 to launch Extension Development Host
2. In debug window, test commands via Command Palette (Ctrl+Shift+P)
3. Key commands to test:
   - `LUNA: Initialize Workspace` - Creates `.codebase/` structure
   - `LUNA: Generate Codebase Summaries` - Full analysis
   - `LUNA: Update Stale Summaries` - Git-aware incremental update

### MCP Server Registration
MCP server auto-registers on first activation via `registerMCPServer()` in [extension.ts](src/extension.ts#L17-L85).
- Writes to VS Code's MCP config (`~/.config/Code/User/globalStorage/github.copilot-chat/mcpServers.json`)
- Points to compiled MCP server at `mcp-server/dist/index.js`
- Auto-updates path on version changes

## File Organization Conventions

### Generated Output Structure (`.codebase/`)
```
.codebase/
  ├── src/file.md              # Human-readable summary
  ├── src/file.json            # Machine-readable (AI agents query this)
  ├── src/file.breakdown.md    # Educational code explanation
  ├── src/INDEX.md             # Directory index
  ├── complexity-heatmap.json  # Refactoring guidance (0-10 scale)
  ├── component-map.json       # Architecture grouping
  ├── dependency-graph.json    # Full relationship map
  ├── dead-code-analysis.json  # Unused exports (AI-verified)
  └── QA_REPORT.json           # Quality assurance results
```

### Source Code Structure
**Extension Entry Point**: [src/extension.ts](src/extension.ts)
- `activate()` - Registers commands, initializes tree view, starts git watcher
- `deactivate()` - Cleanup

**Core Analysis Pipeline**: [src/codebaseAnalyzer.ts](src/codebaseAnalyzer.ts)
1. `discoverFiles()` - Find files matching include/exclude patterns
2. `analyzeSingleFile()` - Hybrid analysis (static + Copilot)
3. `saveSummary()` - Write .md + .json
4. Post-process with `DependencyLinker` for bidirectional deps

**Key Helper Classes** (single-responsibility pattern):
- `StaticImportAnalyzer` - Parse imports (Python, TS/JS, Java, C#, Go)
- `StalenessDetector` - Git-based change detection
- `ConcurrencyLimiter` - Parallel analysis throttling
- `QualityAssuranceValidator` - AI reviews deterministic results

## Project-Specific Patterns

### 1. Copilot Model Selection
Configuration stored in `luna-encyclopedia.copilotModel` setting.
```typescript
// Get current model dynamically
const modelSelector = this.getModelSelector(); // Returns { vendor: 'copilot', family: 'gpt-4o' }
const models = await vscode.lm.selectChatModels(modelSelector);
```

**Free models**: `gpt-4o`, `gpt-5-mini`, `raptor-mini`  
**Paid models**: Cost multipliers shown in [package.json](package.json#L109-L127) `enumDescriptions`

### 2. Git-Aware Staleness
Summary files include frontmatter metadata:
```markdown
---
generated: 2026-01-02T12:30:00Z
gitHash: abc123def456
branch: main
---
```

`StalenessDetector` compares git timestamps to detect changes. Supports branch-aware mode (separate summaries per branch).

### 3. Line Number Precision
**Critical for navigation**: All components MUST include `lines` field.
```json
{
  "keyComponents": [
    { "name": "activate", "description": "...", "lines": "14-32" }
  ],
  "dependencies": {
    "internal": [{ "path": "./analyzer", "lines": "3" }]
  }
}
```

Copilot prompt explicitly requests this ([codebaseAnalyzer.ts](src/codebaseAnalyzer.ts#L499-L597)).

### 4. Concurrency Control
Uses semaphore pattern in `ConcurrencyLimiter`:
```typescript
const limiter = new ConcurrencyLimiter(config.get('concurrentWorkers', 5));
await limiter.run(async () => { /* analysis work */ });
```

Prevents API rate limits and memory issues during large codebase analysis.

## Integration Points

### VS Code Extension API
- `vscode.lm.*` - Language Model API for Copilot integration
- `vscode.workspace.*` - File system operations, config
- `vscode.window.withProgress()` - Cancellable long-running tasks
- Custom tree view provider (`SummaryTreeProvider`)

### MCP Server Tools (AI Agent Interface)
Located in [mcp-server/src/index.ts](mcp-server/src/index.ts):
- `get_file_summary` - Cached lookup (LRU cache, sub-10ms)
- `search_summaries` - Pattern matching across all summaries
- `list_stale_summaries` - Git-based freshness check
- `get_dependency_graph` - Bidirectional relationships
- `analyze_file` - Generate summary on-demand

**Tool Selection Logic**: See decision tree in [LUNA_INSTRUCTIONS.md](.codebase/LUNA_INSTRUCTIONS.md#L79-L129)

### External Dependencies
- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `marked` - Markdown rendering for webview panel
- `minimatch` - Glob pattern matching for file filtering

## Critical Configuration Files

### `.lunasummarize` (per-workspace)
Generated in `.codebase/` during initialization:
```json
{
  "include": ["**/*.ts", "**/*.py"],
  "exclude": ["node_modules/**", "test/**"],
  "maxFileSize": 500000,
  "verbosity": "detailed"
}
```

Controls which files are analyzed. **Always check this first** when summaries are missing.

### `package.json` Activation
```json
"activationEvents": ["onStartupFinished"]
```

Extension activates immediately on VS Code startup to register MCP server and start git watcher.

## Common Pitfalls & Solutions

### Problem: Summaries not generated
**Check**:
1. `.lunasummarize` isn't excluding target files
2. File size under `maxFileSize` limit (default 500KB)
3. GitHub Copilot extension is installed and authenticated
4. Selected model is available (`vscode.lm.selectChatModels` returns non-empty)

### Problem: MCP tools not working in Copilot Chat
**Solution**:
1. Ensure Agent Mode is toggled ON (chat header)
2. Reload VS Code window after installation
3. Check MCP server path in `~/.config/Code/User/globalStorage/github.copilot-chat/mcpServers.json`
4. Verify MCP server compiles: `cd mcp-server && npm run build`

### Problem: Stale summaries not updating
**Root cause**: Git hash comparison fails if `.codebase/` is in `.gitignore` (it shouldn't be).
**Solution**: Commit `.codebase/` directory or use manual regeneration instead of staleness detection.

### Problem: Out of memory during large codebase analysis
**Solution**: Reduce `luna-encyclopedia.concurrentWorkers` from 5 to 2-3. The default assumes ~8GB RAM available.

## Development Best Practices

### Adding New File Type Support
1. Update `StaticImportAnalyzer.extractDependencies()` with language-specific regex
2. Add file extension to default `fileTypesToInclude` in [package.json](package.json#L144-L160)
3. Update Copilot system prompt if language has unique patterns (see prompt in [codebaseAnalyzer.ts](src/codebaseAnalyzer.ts#L499-L597))

### Modifying Summary Schema
1. Update `FileSummary` interface in [codebaseAnalyzer.ts](src/codebaseAnalyzer.ts#L15-L53)
2. Update MCP server response types in [mcp-server/src/summaryManager.ts](mcp-server/src/summaryManager.ts)
3. Regenerate all summaries (schema changes break cache)
4. Update template docs in [resources/templates/](resources/templates/)

### Testing MCP Server Locally
```bash
cd mcp-server
npm run build
node dist/index.js  # Expects stdin/stdout communication (MCP protocol)
```

Test via `@modelcontextprotocol/inspector` or Copilot Chat in Agent Mode.

## Quality Assurance Pattern

If `enableCopilotQA` is true (default), LUNA runs two-phase analysis:
1. **Phase 1**: Fast deterministic analysis (dead code, complexity, components)
2. **Phase 2**: Copilot validates Phase 1 results to reduce false positives

Example: Dead code detector finds "unused" export, but QA validator checks if it's:
- Framework-specific (React components, FastAPI routes, Django models)
- Test fixtures or mocks
- Public API intended for external use

Results saved to `.codebase/QA_REPORT.json` with validation rationale.

## When to Suggest Regeneration

**After making code changes**, if you notice:
- File modified but summary timestamp is old (`list_stale_summaries`)
- Dependencies changed but not reflected in summary
- New exports added that aren't documented

**Recommended**: Prompt user to run `LUNA: Update Stale Summaries` (incremental, faster) instead of full regeneration.

**Never**: Attempt to summarize files yourself - rely on extension's specialized Copilot prompting.

---

**Philosophy**: LUNA is a knowledge API, not a documentation generator. Summaries are optimized for AI agent queries (instant, cached, structured) rather than human reading.
