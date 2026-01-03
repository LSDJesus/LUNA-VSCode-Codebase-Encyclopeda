# LUNA Codebase Encyclopedia - Instructions

## What is LUNA?

LUNA is an **Agent-First Context API** that generates:
1. **Structured summaries** for AI agents (instant, zero-token queries)
2. **API reference documentation** for instant endpoint lookup (NEW!)
3. **Educational code breakdowns** for human learning

## How to Use

### 1. Generate Encyclopedia Summaries
- Command: **"LUNA: Generate Codebase Summaries"**
- Analyzes all files matching your include/exclude criteria
- Creates summaries in this directory (.codebase/)
- **NEW**: Includes API endpoint extraction for route files
- **NEW**: Includes AI quality assurance reviews for accuracy

### 2. Query API Endpoints (NEW!)
- Ask Copilot in Agent Mode:
  - "Show me all POST endpoints"
  - "What's the endpoint for updating characters?"
  - "Which endpoints require authentication?"
- Uses `get_api_reference` and `search_endpoints` MCP tools
- Returns: path, method, request schema, response schema, auth requirements
- No more grep → read → guess workflow!

### 3. Learn Your Code
- Right-click any file → **"LUNA: Explain This Code"**
- Choose verbosity level in Settings:
  - **Beginner** 📚: Full explanations with analogies and examples
  - **Intermediate** 📖: Balanced detail (default)
  - **Expert** ⚡: Quick architecture overview
- Generates `filename.breakdown.md` with line-by-line educational content

### 4. Update Stale Summaries
- Command: **"LUNA: Update Stale Summaries"**
- Only regenerates files that have changed (git-aware)
- Use after each coding session

### 5. Reset If Needed (NEW!)
- Command: **"LUNA: Reset .codebase Directory"**
- Safely deletes all summaries and starts fresh
- Useful when switching branches or major refactors

### 6. Query with Copilot Agent Mode
- Open Copilot Chat (Cmd+I)
- Toggle **Agent Mode** (top right)
- Ask naturally:
  - "What does extension.ts do?"
  - "Which files import summaryPanel?"
  - "Show me the architecture"
  - "Are any summaries out of date?"
  - "What are the most complex files?"
  - **"Show me all GET endpoints"** (NEW!)
  - **"What's the request schema for /api/users?"** (NEW!)

### 7. Navigate to Code
- Agent references exact line numbers (e.g., "lines 10-25")
- Click links in responses → editor jumps to that location
- Bidirectional dependencies: "used by" shows reverse imports

### 8. Maintenance & Staleness
- If you detect that a file has been modified but its summary is stale (check `list_stale_summaries`), **inform the user**.
- After performing a significant refactor, **explicitly suggest** that the user runs the **"LUNA: Summarize File"** command (or "Update Stale Summaries") to keep your context accurate.
- Do not attempt to summarize files yourself; rely on the extension's specialized generation logic to maintain consistency.

## Configuration

Edit **.lunasummarize** in this directory to customize:
- Which directories to include (opt-in model)
- Which file types to include (extensions)
- Which patterns to exclude
- See .lunasummarize for full documentation

**Global Settings** (in VS Code):
- Enable/disable Copilot QA reviews
- Breakdown verbosity level (Beginner/Intermediate/Expert)
- Concurrent workers for speed
- Max file size limit
- Copilot model selection (gpt-4o, gpt-5-mini, etc.)

## File Structure

- **QUICK_START.md** - Quick reference guide
- **COPILOT_INSTRUCTIONS.md** - This file
- **.lunasummarize** - Configuration file (customize this!)
- **api-reference.json** - Complete API endpoint documentation (NEW!)
- **src/file.md** - Human-readable summary (Markdown)
- **src/file.json** - Machine-readable summary (JSON)
- **src/file.breakdown.md** - Educational code breakdown
- **src/INDEX.md** - Directory index with file listings
- **complexity-heatmap.json** - QA-validated complexity scores
- **dead-code-analysis.json** - Unused exports with false positive detection
- **component-map.json** - Smart architecture grouping
- **dependency-graph.json** - Full bidirectional dependency map
- **QA_REPORT.json** - Quality assurance validation results
- **INDEX.md** - Root index for navigation

## MCP Tools Available

Via Copilot Agent Mode:

**File & Code Tools:**
- `get_file_summary` - Instant cached lookup
- `search_summaries` - Find by dependency/component/keyword
- `list_summaries` - List all cached files
- `list_stale_summaries` - Find outdated summaries
- `get_dependency_graph` - Show relationships
- `analyze_file` - Generate summary for new file

**API Reference Tools (NEW!):**
- `get_api_reference` - Get all endpoints (filter by path/method/tag)
- `search_endpoints` - Search endpoints (by path, description, schema)

## Tool Selection Decision Tree (for AI Agents)

```
START: User asks a question about code
│
├─ Query is about API ENDPOINTS?
│  ├─ Specific endpoint mentioned?
│  │  └─ USE: search_endpoints(query="endpoint_path", search_in="path")
│  │
│  ├─ Filter by method/tag?
│  │  └─ USE: get_api_reference(filter_method="POST", filter_tag="auth")
│  │
│  └─ General API overview?
│     └─ USE: get_api_reference()
│
├─ Query mentions SPECIFIC FILE NAME?
│  ├─ YES: "What does extension.ts do?"
│  │      "Show me summaryPanel.ts"
│  │      → USE: get_file_summary(file_path="src/extension.ts")
│  │
│  └─ NO: Continue to next check...
│
├─ Query contains DISCOVERY keywords?
│  │  ("find files", "which files", "search for", "show all")
│  ├─ YES: "Which files use the vscode API?"
│  │      "Find all files that import express"
│  │      → USE: search_summaries(query="vscode", search_type="dependency")
│  │
│  └─ NO: Continue to next check...
│
├─ Query about STALENESS/CURRENCY?
│  │  ("outdated", "stale", "current", "up to date", "out of date")
│  ├─ YES: "Are my summaries current?"
│  │      "Which files need updating?"
│  │      → USE: list_stale_summaries()
│  │
│  └─ NO: Continue to next check...
│
├─ Query about RELATIONSHIPS/DEPENDENCIES?
│  │  ("depends on", "uses", "imports", "who uses", "used by")
│  ├─ Specific file mentioned?
│  │  ├─ YES: "What depends on summaryPanel.ts?"
│  │  │      "Show me who uses extension.ts"
│  │  │      → USE: get_dependency_graph(file_path="src/summaryPanel.ts")
│  │  │
│  │  └─ NO: Broad search
│  │         "Find all files that use React"
│  │         → USE: search_summaries(query="React", search_type="dependency")
│  │
│  └─ NO: Continue to next check...
│
├─ Query asks to GENERATE NEW SUMMARY?
│  │  ("summarize", "analyze", "generate summary for")
│  ├─ YES: "Summarize this new file"
│  │      "Generate a summary for utils.ts"
│  │      → USE: analyze_file(file_path="src/utils.ts")
│  │
│  └─ NO: Continue to next check...
│
└─ Query is GENERAL/ARCHITECTURAL?
   │  ("architecture", "overview", "how does this work", "structure")
   └─ Use multiple tools as needed:
      1. list_summaries() → Get all files
      2. search_summaries() → Find key components
      3. get_dependency_graph() → Map relationships
      4. Synthesize into architectural overview
```

## Quick Reference: Query Patterns → Tools

| User Query Pattern | Tool to Use | Example |
|-------------------|-------------|---------|
| "What does `<filename>` do?" | `get_file_summary` | `get_file_summary(file_path="src/app.ts")` |
| "Which files use `<library>`?" | `search_summaries` | `search_summaries(query="express", search_type="dependency")` |
| "Are summaries outdated?" | `list_stale_summaries` | `list_stale_summaries()` |
| "What depends on `<filename>`?" | `get_dependency_graph` | `get_dependency_graph(file_path="src/utils.ts")` |
| "Summarize `<new_file>`" | `analyze_file` | `analyze_file(file_path="src/new.ts")` |
| "Show me the architecture" | Multiple tools | Combine `list_summaries` + `search_summaries` + `get_dependency_graph` |

## Expected Response Structures

### get_file_summary returns:
```json
{
  "summary": {
    "purpose": "Main entry point for VS Code extension",
    "keyComponents": [
      {
        "name": "activate",
        "description": "Extension activation function",
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
    "usedBy": [
      {
        "file": "src/main.ts",
        "usage": "Imports activate function",
        "lines": "5"
      }
    ]
  }
}
```

- All components include `lines` field (e.g., "10-25")
- `usedBy` array shows reverse dependencies
- Returns `null` if file not summarized yet

### search_summaries returns:
```json
{
  "results": [
    {
      "file": "src/extension.ts",
      "matchedContext": "Imports vscode API for extension functionality"
    },
    {
      "file": "src/commands.ts",
      "matchedContext": "Uses vscode.commands to register commands"
    }
  ]
}
```

- Array of matching file paths
- Each result includes matched context
- Use for broad discovery across codebase

### list_stale_summaries returns:
```json
{
  "total_stale": 3,
  "stale_files": [
    {
      "file": "src/extension.ts",
      "summaryTimestamp": "2025-12-22T10:00:00Z",
      "fileLastModified": "2025-12-22T15:30:00Z",
      "isStale": true,
      "reason": "File modified after summary"
    }
  ]
}
```

- `total_stale` count
- `stale_files` array with timestamps and reasons
- Use to recommend regeneration to user

### get_dependency_graph returns:
```json
{
  "file": "src/summaryPanel.ts",
  "dependencies": [
    {
      "path": "./analyzer",
      "lines": "3"
    }
  ],
  "dependents": [
    {
      "file": "src/extension.ts",
      "lines": "15"
    },
    {
      "file": "src/webview.ts",
      "lines": "8"
    }
  ]
}
```

- `dependencies` - what this file imports
- `dependents` - what files import this
- Complete bidirectional view

## Concrete Invocation Examples

### Example 1: Direct file query
**User**: "What does extension.ts do?"

**Agent action**:
```
'mcp_lunaencyclope_get_file_summary' with file_path="src/extension.ts"
```

**Agent response**:
> extension.ts is the main entry point. It defines `activate()` (lines 10-25) which registers commands and initializes the tree view. It imports `CodebaseAnalyzer` from ./codebaseAnalyzer (line 3) and uses the vscode API (line 1).

### Example 2: Dependency discovery
**User**: "Which files use the vscode API?"

**Agent action**:
```
'mcp_lunaencyclope_search_summaries' with query="vscode", search_type="dependency"
```

**Agent response**:
> Found 5 files importing vscode:
> - src/extension.ts (line 1)
> - src/commands.ts (line 2)
> - src/webview.ts (line 1)
> - src/treeView.ts (line 3)
> - src/summaryPanel.ts (line 1)

### Example 3: Staleness check
**User**: "Are my summaries current?"

**Agent action**:
```
'mcp_lunaencyclope_list_stale_summaries'
```

**Agent response**:
> ⚠️ 3 summaries are outdated:
> - src/extension.ts (modified 4 hours ago)
> - src/analyzer.ts (modified yesterday)
> - src/utils.ts (modified 2 days ago)
>
> Run 'LUNA: Update Stale Summaries' to refresh them.

### Example 4: Relationship query
**User**: "What files depend on summaryPanel?"

**Agent action**:
```
'mcp_lunaencyclope_get_dependency_graph' with file_path="src/summaryPanel.ts"
```

**Agent response**:
> summaryPanel.ts is imported by:
> - src/extension.ts (line 15) - Registers webview panel
> - src/webview.ts (line 8) - Creates panel instances

## Error Handling for Agents

### If `get_file_summary` returns null or error

**Cause**: File likely has no summary yet

**Bad Response**: ❌ "No summary found."

**Good Response**: ✅
> extension.ts hasn't been summarized yet. Would you like me to:
> 1. Generate a summary now using `#analyze_file`
> 2. Or have you run **'LUNA: Generate Codebase Summaries'** for the entire project?

---

### If `search_summaries` returns empty array

**Cause**: No files match the criteria

**Bad Response**: ❌ "No results."

**Good Response**: ✅
> No files found matching 'vscode'. This could mean:
> 1. No files import/use this dependency
> 2. Summaries haven't been generated yet
>
> Try:
> - Using broader search terms
> - Running `#list_summaries` to see what's available
> - Generating summaries if this is a new project

---

### If `list_stale_summaries` shows many stale files

**Cause**: Summaries are outdated (may affect accuracy)

**Bad Response**: ❌ "Some files are stale."

**Good Response**: ✅
> ⚠️ **15 summaries are outdated.** Results may be inaccurate until refreshed.
>
> **Strong recommendation**: Run **'LUNA: Update Stale Summaries'** to bring them current. This only regenerates changed files (much faster than full regeneration).

---

### If MCP tools are unavailable

**Cause**: MCP server not registered or extension not activated

**Bad Response**: ❌ "Tools not found."

**Good Response**: ✅
> LUNA tools aren't available. Ensure:
> 1. The LUNA extension is installed and activated
> 2. VS Code has been reloaded since installation
> 3. You're in **Agent Mode** (toggle in chat header)
>
> The MCP server should auto-register on first activation.

## Performance Tips

- **Cache**: Repeated queries are cached (sub-10ms responses)
- **Incremental updates**: Only changed files regenerated
- **Line numbers**: All components include exact line ranges
- **Bidirectional deps**: "who uses X?" returns complete list

## Troubleshooting

**Summaries aren't generating?**
- Ensure GitHub Copilot extension is installed and active
- Check that .lunasummarize isn't excluding all files
- Review SUMMARY_REPORT.md for errors

**Updates are slow?**
- First update of large repos takes longer
- Subsequent updates are much faster (only changed files)
- Check SUMMARY_REPORT.md for files that failed

**Copilot isn't using MCP tools?**
- Switch to Agent Mode (toggle in chat header)
- Ask a question that requires code context
- Agent automatically uses appropriate tools
- If still not working, reload VS Code window

## Philosophy

LUNA is **not** a visual wiki or diagram tool. It's a structured knowledge API for agents. For visualization, use specialized tools like Mermaid or PlantUML.

---

Generated by LUNA Codebase Encyclopedia
