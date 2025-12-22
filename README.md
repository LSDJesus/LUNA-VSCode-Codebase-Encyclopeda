# LUNA Codebase Encyclopedia

🚀 **AI-first codebase navigation system** that generates structured summaries optimized for AI assistants like GitHub Copilot.

## What This Does

Makes AI assistants 10x more effective by:
1. **Generating summaries** of every file using Copilot (free/cheap models)
2. **Dual format output** (Markdown for humans + JSON for AI)
3. **MCP server** for instant AI access to codebase context
4. **Direct code links** to jump between summaries and source

## Quick Start

### Step 1: Build Everything

```bash
# Install extension dependencies
npm install

# Build MCP server
cd mcp-server
npm install && npm run build
cd ..
```

### Step 2: Generate Summaries

1. **Press F5** to launch Extension Development Host
2. Run command: **"LUNA: Generate Codebase Summaries"**
3. Wait for Copilot to analyze your files
4. Summaries saved to `.codebase/`

### Step 3: Use with Copilot Agent Mode

1. Open **Copilot Chat** in VS Code
2. Switch to **Agent Mode**
3. Ask naturally:
   - "What does extension.ts do?"
   - "Find all files using the vscode API"
   - "Show me what depends on summaryPanel.ts"

Copilot will automatically use the MCP tools to answer from cached summaries! 🎯

---

### Alternative: MCP with Other AI Tools

Configure for Claude Desktop or Cline:

```json
{
  "mcpServers": {
    "luna-encyclopedia": {
      "command": "node",
      "args": ["path/to/mcp-server/dist/index.js"]
    }
  }
}
```

## How It Works

**The Magic Workflow**:

1. **Generate once** (Extension uses Copilot Chat API)
   - Analyzes all source files
   - Creates `.md` (human) + `.json` (AI) summaries
   - Saves to `.codebase/`

2. **Query forever** (Copilot Agent Mode uses MCP tools)
   - You: "What does main.ts export?"
   - Copilot reads `.codebase/main.ts.json` (instant, no tokens)
   - Answers from structured data

3. **Auto-update** (when files change)
   - MCP tool `analyze_file` regenerates stale summaries
   - Uses cheap Copilot models, not your main context

**Why this is brilliant**:
- ✅ Copilot doesn't re-read source files every conversation
- ✅ Zero context/token waste on parsing code
- ✅ Cheap models handle summarization task
- ✅ Instant answers from cached structured data

## Architecture

```
┌─────────────────────────────────────────┐
│  VS Code Extension                      │
│  ├─ File Discovery                      │
│  ├─ Copilot Chat API (generates)        │
│  └─ WebView Renderer                    │
└─────────────────────────────────────────┘
               ↓ writes
┌─────────────────────────────────────────┐
┌─────────────────────────────────────────┐
│  .codebase/                             │
│  ├─ src/extension.md + .json            │
│  ├─ src/summaryPanel.md + .json         │
│  └─ ...                                 │
└─────────────────────────────────────────┘
               ↑ reads
┌─────────────────────────────────────────┐
│  MCP Server (.vscode/mcp.json)          │
│  ├─ get_file_summary                    │
│  ├─ search_summaries                    │
│  └─ get_dependency_graph                │
└─────────────────────────────────────────┘
               ↑ uses
┌─────────────────────────────────────────┐
│  GitHub Copilot Agent Mode              │
│  "What does extension.ts do?"           │
└─────────────────────────────────────────┘
```

## Why This Exists

**Problem**: AI assistants waste context/tokens reading entire files to understand codebases.

**Solution**: Pre-generate structured summaries using cheap models (Copilot Chat API). AI can:
- Query summaries instead of reading raw code
- Understand architecture in seconds
- Find dependencies/relationships instantly
- Only read actual source when needed

## Key Features

### 🤖 Copilot-Powered Analysis
- Uses VS Code Language Model API (no separate API keys)
- Generates both human-readable MD and machine-parseable JSON
- Free/cheap models handle classification task

### 📊 Dual Format Outputs

**Markdown** (for humans):
```markdown
# extension

## Purpose
Main activation point for VS Code extension...

## Dependencies
- `vscode` - Extension API
- `./summaryPanel` - WebView rendering

## Code Links
- [activate](code:src/extension.ts#symbol=activate)
```

**JSON** (for AI):
```json
{
  "purpose": "Main activation point...",
  "dependencies": {
    "external": [{"package": "vscode", "usage": "Extension API"}],
    "internal": [{"path": "./summaryPanel", "usage": "WebView"}]
  },
  "publicAPI": [{"signature": "activate()", "description": "..."}]
}
```

### 🔗 Direct Navigation
Click `(code:...)` links in summaries → jumps to exact source location with symbol highlighting.

### 🔍 MCP Integration
AI assistants can:
```typescript
// Instant lookup (no LLM call)
const summary = await get_file_summary({ file_path: "src/main.ts" });

// Generate if missing (uses Copilot, not your context)
await analyze_file({ file_path: "src/new-file.ts" });

// Find all files using Express
await search_summaries({ query: "express", search_type: "dependency" });
```

## File Structure

```
.
├── src/                      # VS Code Extension (TypeScript)
│   ├── extension.ts          # Main entry point
│   ├── codebaseAnalyzer.ts   # Copilot API integration
│   ├── summaryPanel.ts       # WebView renderer
│   └── summaryTreeProvider.ts# Sidebar tree
├── mcp-server/               # MCP Server (Node.js)
│   └── src/
│       ├── index.ts          # MCP tools registration
│       ├── summaryManager.ts # Cache management
│       └── copilotAnalyzer.ts# Stub for Copilot calls
├── docs/codebase/            # Generated summaries (gitignored)
│   └── src/
│       ├── extension.md
│       ├── extension.json
│       └── ...
└── python/                   # Legacy (now using Copilot API)
```

## Development

**Extension**:
```bash
npm run watch     # Auto-compile TypeScript
# Press F5 to debug
```

**MCP Server**:
```bash
cd mcp-server
npm run watch     # Auto-rebuild
npm run start     # Test locally
```

## Next Steps

- [ ] Bridge MCP server to extension's Copilot API (replace stub)
- [ ] Add incremental updates (only regenerate changed files)
- [ ] Implement semantic search across summaries
- [ ] Add "Used By" reverse dependency tracking
- [ ] Generate workspace-level architecture diagram

## License

MIT - Built to make AI-assisted development radically more efficient.

---

**Pro tip**: After generating summaries, when you ask me (Copilot) questions about your codebase, I can use the MCP server to instantly understand structure without re-reading everything. 🎯
