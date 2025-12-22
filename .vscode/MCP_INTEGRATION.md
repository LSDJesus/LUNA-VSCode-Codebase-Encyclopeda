# MCP Server Integration with GitHub Copilot

This project includes an MCP server that provides codebase navigation tools directly to GitHub Copilot's Agent Mode.

## Setup

The MCP server is already configured in `.vscode/mcp.json` and will automatically be available when you open this workspace.

## Available Tools in Copilot Agent Mode

Once configured, open Copilot Chat and switch to **Agent Mode**. You'll have access to:

### `get_file_summary`
Get cached summary for any file instantly (no LLM overhead).

**Usage in chat**:
```
#get_file_summary with workspace_path=D:\project and file_path=src/extension.ts
```

### `analyze_file`
Generate or update a file summary using Copilot (cheap model, doesn't use your context).

**Usage in chat**:
```
#analyze_file with workspace_path=D:\project and file_path=src/new-file.ts
```

### `search_summaries`
Find files by dependency, component, or keyword.

**Usage in chat**:
```
#search_summaries with workspace_path=D:\project, query=vscode, search_type=dependency
```

### `list_summaries`
List all cached summaries with metadata.

**Usage in chat**:
```
#list_summaries with workspace_path=D:\project
```

### `get_dependency_graph`
Get dependency relationships for a file or entire workspace.

**Usage in chat**:
```
#get_dependency_graph with workspace_path=D:\project and file_path=src/main.ts
```

## Natural Language Usage

You don't need to use the explicit syntax above. Just ask naturally:

- "What does extension.ts do?" → Copilot will use `get_file_summary`
- "Find all files that use Express" → Copilot will use `search_summaries`
- "Show me what depends on summaryPanel.ts" → Copilot will use `get_dependency_graph`

## How It Works

```
You ask Copilot a question
    ↓
Copilot Agent Mode decides which tool to use
    ↓
MCP server reads .codebase/ summaries (instant)
    ↓
Returns structured JSON to Copilot
    ↓
Copilot answers using the summary data
```

**Key advantage**: Copilot doesn't waste tokens reading source files - it uses pre-generated summaries created by cheaper models.

## Generating Summaries

Before using the MCP tools, generate summaries:

1. Press **F5** to launch extension (or install it)
2. Run command: **"LUNA: Generate Codebase Summaries"**
3. Wait for completion
4. Summaries saved to `.codebase/`

Now Copilot Agent Mode can instantly access all that structured data!

## Troubleshooting

If tools aren't showing up:
1. Ensure `.vscode/mcp.json` exists
2. Restart VS Code
3. Open Copilot Chat → switch to Agent Mode
4. Check tools menu for `lunaEncyclopedia` tools
5. Ensure `mcp-server/dist/index.js` exists (run `cd mcp-server && npm run build`)
