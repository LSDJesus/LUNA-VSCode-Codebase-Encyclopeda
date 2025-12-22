# mcp-server/src/ — MCP Server Source Code

## Purpose

Core implementation of the Model Context Protocol server. Defines tools, handles requests, and manages codebase summary data.

## Contents

### Server Implementation
- [**index.ts**](index.ts) — MCP server entry point, tool definitions, request handlers
- [**summaryManager.ts**](summaryManager.ts) — Cache management, file I/O, summary queries
- [**copilotAnalyzer.ts**](copilotAnalyzer.ts) — Stub for future Copilot API integration

## File Breakdown

### index.ts
- Creates MCP server with stdio transport
- Registers 5 tools with the protocol
- Implements request handlers for each tool
- Forwards requests to appropriate managers

**Key functions**:
- `ListToolsRequestSchema` handler — Lists available tools
- `CallToolRequestSchema` handler — Routes tool calls

### summaryManager.ts
- **Public API**:
  - `getSummary()` — Read cached summary (MD + JSON)
  - `saveSummary()` — Write summary files
  - `listSummaries()` — Get all cached files
  - `searchSummaries()` — Query by dependency/component/keyword
  - `getDependencyGraph()` — Build node/edge relationships

- **Internals**:
  - File I/O for `.codebase/` folder
  - Pattern matching for searches
  - Graph building for dependencies

### copilotAnalyzer.ts
- **Placeholder** for future Copilot Chat API integration
- Currently returns dummy data
- Will be bridged to extension's Language Model API once HTTP/IPC connection established

## Tool Signatures

```typescript
get_file_summary(workspace_path, file_path) → FileSummary | null
analyze_file(workspace_path, file_path, force_regenerate?) → FileSummary
search_summaries(workspace_path, query, search_type?) → SearchResult[]
list_summaries(workspace_path) → SummaryMetadata[]
get_dependency_graph(workspace_path, file_path?) → Graph
```

## Data Structures

### FileSummary
```typescript
{
  sourceFile: string
  generatedAt: string
  summary: {
    purpose: string
    keyComponents: { name, description }[]
    dependencies: { internal, external }
    publicAPI: { signature, description }[]
    codeLinks: { symbol, path }[]
    implementationNotes: string
  }
  markdown: string  // Full .md content
}
```

### SearchResult
```typescript
{
  file: string
  matches: string[]  // Found patterns/components
}
```

### Graph
```typescript
{
  nodes: { id, purpose }[]
  edges: { from, to, type, usage }[]
}
```

## Search Types

- **keyword** — Full-text search across all summaries
- **dependency** — Find files using a package/module
- **component** — Find classes/functions by name
- **exports** — Find public API definitions

## Notes

- No async operations blocking — all file I/O is synchronous
- Returns structured JSON for all responses
- Gracefully handles missing files (returns null or empty results)
- Search is case-insensitive

## Build Output

Compiles to `../dist/` folder. Entry point: `../dist/index.js`
