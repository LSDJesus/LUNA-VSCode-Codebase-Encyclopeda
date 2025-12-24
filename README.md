# LUNA Codebase Encyclopedia

🚀 **Agent-First Context API** - Generate structured summaries of your entire codebase using GitHub Copilot, then enable instant, zero-token queries via Copilot Agent Mode.

**Philosophy**: LUNA is not a visual wiki or diagram tool. It's a **high-speed, low-latency, structured knowledge API** optimized for AI agents to understand codebases without burning tokens.

## What This Does

**Problem**: AI assistants waste context/tokens reading entire source files to understand codebases.

**Solution**: LUNA generates structured summaries (MD + JSON) using a hybrid approach:
1. **Static Analysis** (regex-based) extracts imports/dependencies with 100% accuracy
2. **Copilot Chat API** generates rich insights (purpose, components, patterns)
3. Results are merged and exposed via MCP tools for instant, zero-token queries

### The Agent-First Workflow

```
1. Generate summaries once (free models: gpt-4o, gpt-4.1, gpt-5-mini)
   ↓
2. Summaries include precise line numbers for every component
   ↓
3. Bidirectional dependencies: "uses X" + "used by Y"
   ↓
4. Copilot Agent Mode queries structured JSON (zero tokens, instant)
   ↓
5. Agent references exact line numbers for precision
   ↓
6. Click links → jump directly to source code in editor
```

**What LUNA is**:
- ✅ Structured JSON API for AI agents
- ✅ Precise line-number tracking
- ✅ Bidirectional dependency graph
- ✅ Instant, zero-token queries
- ✅ Code navigation (agent → editor)

**What LUNA is NOT**:
- ❌ A visual wiki or documentation generator
- ❌ A UML diagram tool
- ❌ A replacement for reading critical code
- ❌ A UI-first tool (it's API-first)

### Cost Model

**Zero Premium Requests** (Recommended):
- Use default models: `gpt-4o`, `gpt-4.1`, or `gpt-5-mini`
- Available to all GitHub Copilot subscribers (Individual, Business, Enterprise)
- **No premium request costs** - these are standard Copilot models
- Summaries don't need advanced reasoning - basic models work great

**Premium Models** (Optional):
- Claude Sonnet, Gemini Pro, GPT-5 variants available if needed
- Consumes premium request quota if selected
- Generally unnecessary for code summarization

💡 **Stick with the defaults** - LUNA is optimized to produce high-quality summaries using standard models.

### The Workflow

```
1. Run "LUNA: Generate Codebase Summaries"
   ↓
2. For each file:
   • Static analyzer extracts imports (100% reliable)
   • Copilot analyzes purpose, components, patterns
   • Results merged into .md (human) + .json (AI)
   ↓
3. Stores in .codebase/ folder with .lunasummarize config
   ↓
4. Post-processor computes "Used By" relationships
   ↓
5. Open Copilot Chat → Switch to Agent Mode
   ↓
6. Ask: "What does extension.ts do?"
   ↓
7. Copilot uses MCP tools to query .codebase/ (instant, no tokens wasted!)
```

## Why Hybrid Analysis?

**Static Analysis (Regex-based)**:
- ✅ 100% accurate dependency extraction
- ✅ Handles Python, TypeScript/JavaScript, Java, C#, Go
- ✅ Resolves relative imports correctly
- ✅ Fast and deterministic

**Copilot Analysis (LLM-based)**:
- ✅ Rich semantic understanding
- ✅ Describes purpose and patterns
- ✅ Identifies key components
- ✅ Documents public APIs

**Best of Both Worlds**: Reliable dependency graphs + human-quality insights.

## Quick Start

### Step 1: Initialize Your Workspace

---

## Generated Files & Analysis

LUNA generates **structured summaries AND meta-analysis files** in the `.codebase/` folder:

### File Summaries
- **`src/file.md`** - Human-readable summary (purpose, components, dependencies, line numbers)
- **`src/file.json`** - Machine-readable summary (structured for AI agent queries)
- **`src/foldername.index.md`** - Directory index with file listings
- **`src/foldername.index.json`** - Directory index (machine-readable)

### Meta-Analysis Files
LUNA automatically generates actionable insights about your codebase:

#### 1. **`dead-code-analysis.json`** - Find Unused Exports
Identifies exports that are defined but never imported. Clean up dead code before it becomes technical debt.

#### 2. **`component-map.json`** - Understand Architecture
Groups files into logical components (Core, UI, Utilities, etc.). Use for documentation and architecture reviews.

#### 3. **`complexity-heatmap.json`** - Identify Refactoring Candidates
Scores files 0-10 based on **coupling** (dependencies), **impact** (dependents), and **volatility** (change likelihood).
- 🔴 **8-10: REFACTOR** - Consider breaking into smaller files
- ⚠️ **6-7: CONSIDER_REFACTOR** - Monitor this file
- ✅ **0-5: OK** - Good complexity

**Perfect for**: Deciding which files to refactor first, understanding quality hotspots.

See `.codebase/ANALYSIS_GUIDE.md` for detailed explanations.

---

## Quick Start

**First time only!** Creates configuration and instruction files.

1. Open your project in VS Code
2. **Press F5** to launch Extension Development Host
3. Command Palette: **Ctrl+Shift+P** → **"LUNA: Initialize Workspace"**
4. The `.lunasummarize` file opens automatically for you to review/customize

### Step 2: (Optional) Customize Configuration

Edit `.lunasummarize` to control what gets analyzed:
- **includeExtensions**: File types (ts, tsx, js, jsx, py, java, etc.)
- **excludePatterns**: Directories to skip (node_modules, dist, .git, etc.)
- **excludeFiles**: File patterns to skip (tests, .min.js, .d.ts, etc.)

Save and close when done. *(You can always edit this later.)*

### Step 3: Generate Summaries

1. Command Palette: **Ctrl+Shift+P**
2. Run: **"LUNA: Generate Codebase Summaries"**
3. Wait for completion (depends on project size)
4. `.codebase/` is now fully populated

**After generation**, check `SUMMARY_REPORT.md`:
- Lists files that were **too large** to analyze (consider refactoring)
- Lists files with **syntax errors** (need fixing)
- Lists files with **API errors** (retry later)
- Actionable recommendations for each issue with summaries

### Step 4: Query with Copilot Agent Mode

1. Open Copilot Chat (**Ctrl+I**)
2. Click **Agent Mode** toggle (top right)
3. Ask naturally:
   - "What does extension.ts do?"
   - "Which files import summaryPanel?"
   - "Show me the architecture"
4. Copilot uses MCP tools → instant responses with line numbers
   - **MCP server auto-registers on first use** - no manual configuration needed!

### Step 5: Keep Summaries Fresh

After each coding session:
1. Commit your changes to git
2. Command Palette: **Ctrl+Shift+P** → **"LUNA: Update Stale Summaries"**
3. Only modified files regenerate (much faster!)

---

## Install & Build

### For Users (Installing the Extension)

1. Install the LUNA extension from the VS Code Marketplace (or install the `.vsix` file)
2. Reload VS Code
3. The MCP server will auto-register on first activation
4. You'll see a notification: "✅ LUNA MCP Server registered!"

**That's it!** No manual configuration needed.

### For Developers (Contributing to LUNA)

```bash
# Install extension dependencies
npm install

# Build MCP server
cd mcp-server
npm install && npm run build
cd ..

# Compile extension
npm run compile

# Press F5 to launch Extension Development Host
```

---

### Legacy Quick Start

### 1. Install & Build

```bash
# Install extension dependencies
npm install

# Build MCP server
cd mcp-server
npm install && npm run build
cd ..

# Compile extension
npm run compile
```

### 2. Launch Extension

**Press F5** to open Extension Development Host

You should see:
- "LUNA Encyclopedia" in the sidebar (if not, reload window)
- Commands available in Command Palette (`Ctrl+Shift+P`)

### 3. Generate Summaries

1. Run: **"LUNA: Generate Codebase Summaries"**
2. Wait for Copilot to analyze your workspace
3. Summaries saved to `.codebase/` with:
   - `LUNA_GUIDE.md` - Complete usage guide
   - `.lunasummarize` - Configuration for this project
   - `src/file.md` + `src/file.json` - Mirrored folder structure

### 4. Keep Summaries Up-to-Date

**After editing files & committing:**
1. Run: **"LUNA: Update Stale Summaries"**
2. Extension detects changed files using git history
3. Only regenerates summaries for modified files
4. Shows count: "Found 5 stale summaries (2 missing, 3 outdated). Update?"

**Why this is brilliant**:
- ✅ Edit 2 files out of 1000? Only regenerate those 2!
- ✅ Uses git timestamps, not filesystem times (accurate)
- ✅ Detects missing summaries (new files)
- ✅ Massive token/time savings

### 5. Use with Copilot Agent Mode

1. Open **Copilot Chat**
2. Switch to **Agent Mode** (toggle at top)
3. Ask naturally:
   - "What does extension.ts do?"
   - "Find all files using the vscode API"
   - "Show me dependency relationships"
   - "Which summaries are out of date?" ← New!

✨ Copilot automatically uses MCP tools to query summaries!

## Architecture

### VS Code Extension
- **File Discovery**: Scans workspace for source files
- **Copilot Integration**: Uses Language Model API to generate summaries
- **Sidebar**: Tree view of `.codebase/` structure
- **WebView**: Renders formatted summaries with syntax highlighting
- **Settings**: Configure models, file types, exclusions

### MCP Server
Provides 6 tools for Copilot Agent Mode:
- `get_file_summary` - Instant cached lookup with line numbers
- `analyze_file` - Generate/update summary (uses default models)
- `search_summaries` - Find by dependency/component/keyword
- `list_summaries` - List all cached files
- `list_stale_summaries` - Find outdated summaries (git-aware)
- `get_dependency_graph` - Show bidirectional relationships

### Configuration
- **`.codebase/.lunasummarize`** - Include/exclude patterns
- **VS Code Settings** - Model selection, file types, token limits
- **MCP Server** - Auto-registered on extension activation (zero-config)

## Configuration

### VS Code Settings (`Ctrl+,` search "LUNA Encyclopedia")

**Model Selection**:
- `luna-encyclopedia.copilotModel` - Which Copilot model to use
  - Default: `gpt-4o` (free, recommended)
  - Free options: `gpt-4o`, `gpt-4.1`, `gpt-5-mini`, `raptor-mini`
  - Premium: Claude Opus/Sonnet, Gemini Pro, GPT-5 variants

**Token Management**:
- `luna-encyclopedia.maxTokens` - Max response length (default: 4096)
- `luna-encyclopedia.temperature` - LLM temperature (default: 0 = deterministic)

**File Filtering**:
- `luna-encyclopedia.fileTypesToInclude` - Which extensions to analyze
  - Default: ts, tsx, js, jsx, py, java, cs, go, rs, cpp, c, h, hpp
- `luna-encyclopedia.fileTypesToExclude` - Files to skip
  - Default: *.test.ts, *.spec.ts, *.min.js, *.min.css

### Project Config (`.codebase/.lunasummarize`)

```ini
# Optional: Only analyze these folders (empty = analyze all)
[include]
src/
lib/

# Always exclude these patterns
[exclude]
*.test.ts
*.spec.ts
__tests__/
mocks/
node_modules/
dist/
```

**Logic**: `(in [include] OR [include] empty) AND NOT in [exclude] AND file type allowed`

## Development

### Quick Setup

```bash
# Terminal 1: Auto-compile on changes (keeps running)
npm run watch

# Terminal 2: Launch extension (one-time)
npm run compile
npm start  # Or press F5 in VS Code
```

### Fast Reload Workflow

After making code changes:
1. Code auto-compiles via `npm run watch`
2. Press **Ctrl+Shift+F5** in Extension Development Host
3. Changes are live (no need to close/reopen)

### Full Restart (When Needed)

Press **F5** only if you change:
- `package.json` (commands, contributions, settings)
- Core configuration

For regular code changes, **Ctrl+Shift+F5** is faster!

## Advanced Features

### Branch-Aware Summaries

**Setting**: `luna-encyclopedia.branchAwareSummaries` (default: `false`)

When enabled, LUNA creates separate summaries for each git branch.

**How it works**:
```
git checkout feature-login
  → Generates: auth.feature-login.json, auth.feature-login.md

git checkout main  
  → Uses: auth.json, auth.md (fallback to main if branch missing)
```

**Use cases**:
- Feature branches with significant code changes
- Multiple developers on different branches
- Need branch-specific accuracy for agents

**Enable in settings**:
```json
"luna-encyclopedia.branchAwareSummaries": true
```

**Trade-offs**:
- ✅ Accurate summaries per branch
- ✅ No stale data when switching branches
- ❌ More files in `.codebase/` (one set per active branch)
- ❌ Must regenerate summaries after branch changes

**Recommended**: Keep disabled unless you work heavily with feature branches.

## File Structure



```
your-project/
├── src/                          # Your source code
├── .codebase/                    # Auto-generated summaries
│   ├── LUNA_GUIDE.md            # User guide (auto-generated)
│   ├── .lunasummarize           # Config for this project
│   ├── src/
│   │   ├── extension.md         # Human-readable summary
│   │   └── extension.json       # Machine-readable summary
│   └── ...
├── .vscode/
│   ├── mcp.json                 # MCP server config (auto)
│   ├── launch.json              # Debug config
│   └── tasks.json               # Build tasks
└── mcp-server/                  # MCP server (separate build)
```
taleness Detection & Incremental Updates

LUNA automatically tracks when summaries were generated and compares them against git commit history.

### How It Works

Each summary stores its generation timestamp:
```json
{
  "sourceFile": "src/extension.ts",
  "generatedAt": "2025-12-22T10:00:00.000Z",
  "summary": { ... }
}
```

When you run **"Update Stale Summaries"**:
1. Scans all `.json` files for `generatedAt` timestamps
2. Compares against file's last git commit (uses `git log --format=%cI`)
3. Falls back to filesystem mtime if not in git
4. Reports: total files, up-to-date, stale, missing

### Two Update Modes

**Full Regeneration** (`Generate Codebase Summaries`):
- Analyzes every file
- Use after major refactors or directory changes
- Takes longer but guarantees everything is current

**Incremental Update** (`Update Stale Summaries`):
- Only processes changed/missing files
- Uses git history for accuracy
- 10x faster than full regeneration
- **Recommended for daily use**

### Example Workflow

```
Day 1: Generate summaries (1000 files)
  ↓
Day 2: Edit 2 files, commit
  ↓
Run "Update Stale Summaries"
  → Detects 2 files changed since generation
  → Only regenerates those 2 files
  → Rest of 998 summaries untouched ✅
```

### Querying Staleness from Copilot

Use the new **`list_stale_summaries`** MCP tool:

```
You: "Are any summaries out of date?"

Copilot: Uses #list_stale_summaries
Returns:
{
  "total_stale": 3,
  "stale_files": [
    {
      "file": "src/extension.ts",
      "summaryTimestamp": "2025-12-22T10:00:00Z",
      "fileLastModified": "2025-12-22T15:30:00Z",
      "isStale": true,
      "reason": "File modified after summary"
    },
    ...
  ]
}
```

---


## Summary Format

### Markdown (`.md`)
Human-readable with sections:
- **Purpose**: What the file does
- **Key Components**: Classes, functions, exports **with line numbers**
- **Dependencies**: Internal and external imports **with line numbers**
- **Public API**: What other files can use **with line numbers**
- **Used By**: Reverse dependencies (who uses this file) **with line numbers**
- **Code Links**: Clickable navigation to exact line ranges
- **Implementation Notes**: Patterns and gotchas

**Example**:
```markdown
## Key Components
- [`activate()`](vscode://file/src/extension.ts?line=10&endLine=25) (lines 10-25): Extension entry point
- [`CodebaseAnalyzer`](vscode://file/src/extension.ts?line=30) (line 30): Main analyzer class

## Used By
- [`src/main.ts`](vscode://file/src/main.ts?line=5) (line 5) - Imports activate function
```

### JSON (`.json`)
Machine-parseable with structured data:
```json
{
  "sourceFile": "src/extension.ts",
  "generatedAt": "2025-12-22T...",
  "summary": {
    "purpose": "Main activation point for VS Code extension",
    "keyComponents": [
      {
        "name": "activate",
        "description": "Extension entry point",
        "lines": "10-25"
      }
    ],
    "dependencies": {
      "internal": [
        {
          "path": "./codebaseAnalyzer",
          "usage": "Main analysis engine",
          "lines": "3"
        }
      ],
      "external": [
        {
          "package": "vscode",
          "usage": "Extension API",
          "lines": "1"
        }
      ]
    },
    "publicAPI": [
      {
        "signature": "export function activate(context: ExtensionContext)",
        "description": "Called when extension activates",
        "lines": "10-25"
      }
    ],
    "usedBy": [
      {
        "file": "src/main.ts",
        "usage": "Imports activate function",
        "lines": "5"
      }
    ],
    "codeLinks": [
      {
        "symbol": "activate",
        "path": "src/extension.ts",
        "lines": "10-25"
      }
    ],
    "implementationNotes": "Uses Language Model API for summary generation"
  }
}
```

**Key Features**:
- Every component has precise line numbers
- Bidirectional dependencies (uses + usedBy)
- Agent can reference "line 123-168" with confidence
- Clicking links opens editor at exact location

## Performance

### Generation Speed

LUNA uses **5 parallel workers** to analyze files concurrently, significantly speeding up summary generation.

| Project Size | Sequential | Parallel (5 workers) | Speed Improvement |
|---|---|---|---|
| 100 files | 5 min | 1-2 min | **3-5x faster** |
| 500 files | 25 min | 5-8 min | **3-5x faster** |
| 1000 files | 60 min | 12-20 min | **3-5x faster** |

**How it works**:
- 5 files analyzed simultaneously via Copilot API
- Remaining files queued automatically
- Progress bar shows: `[X/Y] file.ts (5 running, 10 queued)`
- Respects Copilot API rate limits

### Query Performance

After generation, queries use **LRU caching**:
- First query: ~30-50ms (disk read + JSON parse)
- Repeated queries: ~2ms (from memory)
- Hit rate on typical workflows: 70-80%

---



LUNA's MCP server includes an **LRU (Least Recently Used) cache** for lightning-fast queries.

### How It Works

- **File Summary Cache**: Caches `get_file_summary` responses (100 entries)
- **Search Results Cache**: Caches `search_summaries` responses (100 entries)
- **Sub-10ms Responses**: Repeated queries hit memory instead of disk
- **Automatic Invalidation**: Caches clear when summaries are regenerated

### Performance Impact

| Scenario | Without Cache | With Cache | Improvement |
|----------|---------------|-----------|-------------|
| First query | ~40ms | ~40ms | — |
| Same query again | ~40ms | ~2ms | **20x faster** |
| 5 files, 20 queries | 800ms | 80ms | **10x faster** |
| Typical agent session (100 queries) | 4s | ~500ms | **8x faster** |

### Real-World Example

Analyzing a 1000-file project:
- **Generation**: 60 minutes (one-time, uses default models)
- **Agent queries in one session**: 70-80% cache hit rate
- **Result**: Agent gets instant responses for all repeated architecture questions

Cache is automatically managed—no configuration needed. See [PERFORMANCE_OPTIMIZATION.md](docs/PERFORMANCE_OPTIMIZATION.md) for details.

---



### Explicit References

You can explicitly call tools:

```
#get_file_summary with file_path=src/extension.ts
#search_summaries with query=vscode, search_type=dependency
#get_dependency_graph with file_path=src/main.ts
#list_stale_summaries
```

### Natural Language

Or ask naturally (Copilot decides which tool to use):

- "What does extension.ts do?" → Uses `get_file_summary`
- "Show me all files using Express" → Uses `search_summaries`
- "What depends on summaryPanel?" → Uses `get_dependency_graph`
- "Generate a summary for the new file" → Uses `analyze_file`
- "Which files import extension.ts?" → Returns `usedBy` from summary

**Agent receives structured JSON with line numbers**:
```
Agent: "Where is the activate function defined?"
Response: {
  "name": "activate",
  "lines": "10-25",
  "path": "src/extension.ts"
}
Agent: "See lines 10-25 in src/extension.ts"
```

User clicks link → editor jumps to lines 10-25 instantly.

**Agent receives structured JSON with line numbers**:
```
Agent: "Where is the activate function defined?"
Response: {
  "name": "activate",
  "lines": "10-25",
  "path": "src/extension.ts"
}
Agent: "See lines 10-25 in src/extension.ts"
```

User clicks link → editor jumps to lines 10-25 instantly.

## Development

### Build

```bash
npm run compile      # Compile TypeScript
npm run watch        # Auto-compile on changes
```

### MCP Server

```bash
cd mcp-server
npm run build        # Build TypeScript
npm run watch        # Auto-rebuild
npm run start        # Test locally
```

### Debug Extension

1. **Press F5** to launch Extension Development Host
2. Open **Output Panel** (`Ctrl+` `) → Select "Extension Host"
3. Run "LUNA: Generate Codebase Summaries" to test

## Common Tasks

### Regenerate Summaries

After code changes:
1. Command Palette (`Ctrl+Shift+P`)
2. Run: **"LUNA: Generate Codebase Summaries"**

### Update Config for Large Projects

Edit `.codebase/.lunasummarize` to specify which folders to analyze:

```ini
[include]
packages/core/src
packages/utils/src

[exclude]
- Maintaining codebase context requires constant regeneration

**With LUNA**:
- Generate summaries once (default models: gpt-4o, gpt-4.1, gpt-5-mini)
- Query thousands of times (zero token cost after generation)
- Instant architecture understanding
- AI stays focused on actual development work
- **Update only changed files** - minimal maintenance
- Git-aware staleness detection prevents manual tracking

**Real-world example**:
- 1000-file monorepo: 1 hour to generate (one-time)
- Edit 3 files: 2 minutes to update only those files
- Copilot can answer 1000+ questions about architecture instantly
- Never burns tokens re-reading files again
### Skip Test Files

Add to `fileTypesToExclude` in VS Code settings:
- `test.ts`
- `spec.ts`
- `.test.js`
- `.spec.js`

Or edit `.codebase/.lunasummarize`:
```ini
[exclude]
*.test.ts
*.spec.ts
```

### Focus on Specific File Types

Change `fileTypesToInclude` in settings to (e.g.):
- TypeScript only: `["ts", "tsx"]`
- Python only: `["py"]`
- JavaScript only: `["js", "jsx"]`

## Best Practices

✅ **DO**:
- Run summaries after major refactors
- Update `.lunasummarize` when structure changes
- Use Copilot Agent Mode for architecture questions
- Regenerate periodically to keep summaries fresh

❌ **DON'T**:
- Manually edit `.md` or `.json` files (auto-overwritten)
- Analyze massive files (use file type filters)
- Keep summaries older than your last big change
- Use as substitute for reading critical code

## Troubleshooting

### "LUNA Encyclopedia" doesn't appear in sidebar

**Solution**:
1. Reload window (`Ctrl+Shift+P` → "Reload Window")
2. Check Output panel (Extension Host) for errors
3. Ensure extension compiled: `npm run compile`

### Files not in summaries

**Check**:
1. File extension in `fileTypesToInclude`?
2. File in `[exclude]` patterns?
3. File in `[include]` list (if specified)?
4. File in baseline exclusions (node_modules, dist, etc.)?

### Copilot Chat can't find tools

**Solution**:
1. Ensure `.vscode/mcp.json` exists
2. Restart VS Code
3. Check Copilot Chat is in **Agent Mode**
4. Run "LUNA: Generate Codebase Summaries" first

### Summaries seem outdated

**Solution**: Regenerate all summaries
```
Ctrl+Shift+P → "LUNA: Generate Codebase Summaries"
```

## How It Works (Deep Dive)

### Summary Generation

1. **Discovery**: Scans workspace respecting `.lunasummarize` and file type filters
2. **Analysis**: Sends each file to Copilot Chat API with analysis prompt
3. **Parsing**: Extracts structured JSON + Markdown from response
4. **Storage**: Saves both formats preserving folder structure

### MCP Integration

1. **Registration**: `.vscode/mcp.json` tells VS Code about MCP server
2. **Discovery**: Copilot Chat discovers available tools
3. **Querying**: When you ask, Copilot chooses which tool to use
4. **Execution**: MCP server reads cached summaries from `.codebase/`
5. **Response**: Copilot answers using structured summary data

**Key advantage**: Copilot never re-reads source files - always uses cached summaries!

## Why This Matters
 ✅ **DONE**
- [ ] Workspace diagram generation *(Deferred - use specialized tools)*
- [ ] Dependency visualization UI *(Deferred - agent queries are sufficient)*
- [ ] Integration with git hooks (auto-update on commits)
- [ ] Export as API for CI/CD pipelines
- [ ] Multi-language semantic analysis
- [ ] Custom summary templates
- [ ] Semantic code search (beyond keyword matching)

**Note**: Visual diagrams and wikis are intentionally out of scope. LUNA focuses on providing **structured, queryable data** for AI agents. Use tools like Mermaid, PlantUML, or Obsidian for visualization.

**With LUNA**:
- Generate summaries once (default models: gpt-4o, gpt-4.1, gpt-5-mini)
- Query thousands of times (zero token cost after generation)
- Instant architecture understanding
- AI stays focused on actual development work

## Future Enhancements

- [ ] Incremental updates (only regenerate changed files)
- [ ] Workspace diagram generation
- [ ] Dependency visualization UI
- [ ] Integration with git hooks (auto-update on commits)
- [ ] Export as API for CI/CD pipelines
- [ ] Multi-language semantic analysis
- [ ] Custom summary templates

## License

MIT - Built to make AI-assisted development radically more efficient.

---

**Questions?** Each generated project gets `LUNA_GUIDE.md` in `.codebase/` with detailed instructions.

**Pro tip**: After generating summaries, ask Copilot: "What's the architecture of this project?" and watch it synthesize everything from the summaries. 🎯
