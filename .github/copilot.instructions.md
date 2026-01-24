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

### MCP Server Registration & Extension Bridge
MCP server auto-registers on first activation via `registerMCPServer()` in [extension.ts](src/extension.ts).
- Writes to VS Code's MCP config (`~/.config/Code/User/globalStorage/github.copilot-chat/mcpServers.json`)
- Points to compiled MCP server at `mcp-server/dist/index.js`
- **Extension Bridge**: HTTP server (localhost-only) created in [extensionBridge.ts](src/extensionBridge.ts) enables MCP server ↔ Extension communication
- Bridge port saved to `~/.luna-bridge-port` for MCP server discovery
- Auto-updates path on version changes

## File Organization Conventions

### Generated Output Structure (`.codebase/`)
```
.codebase/
  ├── src/file.md                  # Human-readable summary
  ├── src/file.json                # Machine-readable (AI agents query this)
  ├── src/file.breakdown.md        # Educational code explanation
  ├── src/INDEX.md                 # Directory index
  ├── api-reference.json           # REST API endpoints with full schemas
  ├── complexity-heatmap.json      # Refactoring guidance (0-10 scale)
  ├── component-map.json           # Architecture grouping
  ├── dependency-graph.json        # Full relationship map
  ├── dead-code-analysis.json      # Unused exports (AI-verified)
  └── QA_REPORT.json               # Quality assurance results
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

### 5. Background Task Queuing
`BackgroundTaskManager` handles async work without blocking:
```typescript
// Workers run with configured model, timeout, and concurrency limits
// Tasks persist in memory with full history for agent inspection
const taskId = await taskManager.submitTask('documentation', 'Generate...', {
    model: 'gpt-4o',
    outputFile: 'docs/output.md',
    autoExecute: true
});

// MCP `spawn_worker_agent` tool uses this under the hood
// Agents can poll status with `check_worker_status` tool
```

**Key insight**: This enables MCP server to delegate work back to extension without blocking agent, perfect for long-running tasks.

### 6. Framework Detection
API extraction uses regex patterns to detect:
- Express.js: `router\.(get|post|put|delete|patch)`
- FastAPI: `@app\.(get|post|put|delete|patch)` + type hints
- Spring Boot: `@(GetMapping|PostMapping|RequestMapping)`
- Django: `path\(|url\(`
- ASP.NET: `[HttpGet]`, `[Route]` decorators

See [apiReferenceGenerator.ts](src/apiReferenceGenerator.ts) for extraction patterns.

## Integration Points

### Worker Agents & Background Task System (NEW in v1.1.15+)
Located in [backgroundTaskManager.ts](src/backgroundTaskManager.ts) and [extensionBridge.ts](src/extensionBridge.ts):

**What it does**: Delegates AI-driven work to background worker agents without blocking the user.
```typescript
// Submit a task from MCP server
await submitTask('documentation', 'Generate architecture diagrams', {
    contextFiles: ['src/extension.ts', 'src/codebaseAnalyzer.ts'],
    model: 'gpt-4o',
    outputFile: 'docs/ARCHITECTURE.md',
    autoExecute: true  // Allow worker to create/edit files
});

// Task lifecycle: queued → running → completed/failed
```

**Key features**:
- Concurrency limiting (default 3 concurrent workers, configurable: `luna-encyclopedia.workerConcurrencyLimit`)
- Timeout protection (default 300s, configurable: `luna-encyclopedia.workerTimeoutSeconds`)
- Auto-cleanup of old tasks (default 24h, configurable: `luna-encyclopedia.workerAutoCleanupHours`)
- Model selection per task (can override default in settings)
- Full task history with creation/started/completed timestamps

**When to use**: 
- Large documentation generation tasks
- Parallel analysis across multiple files
- Anything that would block analysis or generation workflows
- MCP server tools like `spawn_worker_agent` automatically use this system

### VS Code Extension API
- `vscode.lm.*` - Language Model API for Copilot integration
- `vscode.workspace.*` - File system operations, config
- `vscode.window.withProgress()` - Cancellable long-running tasks
- Custom tree view provider (`SummaryTreeProvider`)

### API Reference Generation
Located in [apiReferenceGenerator.ts](src/apiReferenceGenerator.ts):
- Extracts REST endpoints from route files (Express, FastAPI, Spring, Django, etc.)
- Generates schemas for requests and responses
- Detects framework-specific patterns (decorators, router definitions)
- Output: `api-reference.json` with all endpoints, methods, parameters, and authentication info

### MCP Server Tools (AI Agent Interface)
Located in [mcp-server/src/index.ts](mcp-server/src/index.ts):
- `get_file_summary` - Cached lookup (LRU cache, sub-10ms)
- `search_summaries` - Pattern matching across all summaries
- `list_stale_summaries` - Git-based freshness check
- `get_dependency_graph` - Bidirectional relationships
- `analyze_file` - Generate summary on-demand
- `get_api_reference` - Query REST API endpoints with filtering
- `search_endpoints` - Find endpoints by pattern, method, or response type
- `spawn_worker_agent` - Delegate work to background worker (async, non-blocking)
- `get_complexity_heatmap` - Code complexity analysis (0-10 scale)
- `get_component_map` - Architecture grouping and file organization
- `get_dead_code` - Unused exports and unreachable code
- `list_summaries` - Browse all cached summaries with metadata

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

### Problem: Worker agents not executing tasks
**Diagnosis**:
1. Check if extension bridge is running: look for "🌉 Extension bridge started" in LUNA output channel
2. Verify `.luna-bridge-port` file exists: `cat ~/.luna-bridge-port`
3. Ensure MCP server can reach extension: network isolation or firewall rules
4. Check timeout settings: default 300s, increase if needed for large tasks

### Problem: API endpoints not detected
**Check**:
1. Framework detection in [apiReferenceGenerator.ts](src/apiReferenceGenerator.ts) - regex may need updating
2. Route definitions must match recognized patterns (check supported frameworks in code)
3. Run API reference generation explicitly: `LUNA: Generate Codebase Summaries`
4. Verify `api-reference.json` is in `.codebase/` after generation

## Development Best Practices

### Adding New File Type Support
1. Update `StaticImportAnalyzer.extractDependencies()` with language-specific regex
2. Add file extension to default `fileTypesToInclude` in [package.json](package.json#L144-L160)
3. Update Copilot system prompt if language has unique patterns (see prompt in [codebaseAnalyzer.ts](src/codebaseAnalyzer.ts#L499-L597))

### Adding Framework-Specific API Extraction
1. Add regex pattern to [apiReferenceGenerator.ts](src/apiReferenceGenerator.ts) `detectFramework()` method
2. Define extraction rules (route pattern, parameter extraction, response handling)
3. Test with sample route files in the framework's typical style
4. Verify `api-reference.json` includes all endpoints with correct schemas

### Modifying Summary Schema
1. Update `FileSummary` interface in [codebaseAnalyzer.ts](src/codebaseAnalyzer.ts#L15-L53)
2. Update MCP server response types in [mcp-server/src/summaryManager.ts](mcp-server/src/summaryManager.ts)
3. Regenerate all summaries (schema changes break cache)
4. Update template docs in [resources/templates/](resources/templates/)

### Submitting Worker Agent Tasks (for MCP developers)
```typescript
// From MCP server code, call extension bridge to submit tasks
const taskResult = await callExtensionBridge('/api/tasks', 'POST', {
    taskType: 'documentation',
    prompt: 'Generate architecture documentation...',
    contextFiles: ['src/extension.ts', 'src/codebaseAnalyzer.ts'],
    model: 'gpt-4o',
    outputFile: 'docs/generated.md',
    autoExecute: true
});

// Poll for completion (non-blocking)
const taskStatus = await callExtensionBridge(`/api/tasks/${taskResult.id}`, 'GET');
// { status: 'running' | 'completed' | 'failed', result?: string, error?: string }
```

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

## Key Architectural Decisions & Their Implications

### Why Two Build Outputs (CommonJS + ESM)?
- **Extension** (CommonJS): Bundles to single `out/extension.js`, loaded as VS Code extension
- **MCP Server** (ESM): Uses native ESM for Node.js portability, runs as subprocess
- **Why**: Each environment has different tooling/module requirements. Extension runs in VS Code, MCP server runs in Node.js for other tools.

### Why Hybrid Analysis (Static + Copilot)?
- **Static** (100% accurate): `StaticImportAnalyzer` finds all imports/exports via regex
- **Copilot API** (semantic): Explains purpose, components, relationships using AI
- **Why**: Static analysis is fast and precise; Copilot adds semantic meaning that regex can't. Combined = best of both.

### Why Extension Bridge HTTP Server?
- **Problem**: MCP server (Node.js subprocess) can't directly call VS Code APIs (only running in extension)
- **Solution**: HTTP bridge (localhost-only) lets MCP server request work from extension (background tasks, file access)
- **Why**: Enables MCP agents to trigger long-running work without blocking chat, keeps agent responsive

### Why LRU Cache in MCP Server?
- **Problem**: AI agents may query same file summary 100x per conversation (expensive deserialization)
- **Solution**: In-memory LRU cache with configurable size
- **Why**: Sub-10ms lookups enable real-time, conversational queries. Cache invalidation happens on `.codebase/` changes.

### Why Background Task System?
- **Problem**: Large tasks (100+ file analysis, document generation) block the extension
- **Solution**: Queue tasks with concurrency limits, MCP agents poll status asynchronously
- **Why**: Keeps VS Code responsive, allows multiple agents to coordinate through task history

---

**Philosophy**: LUNA is a knowledge API, not a documentation generator. Summaries are optimized for AI agent queries (instant, cached, structured) rather than human reading.
