# LUNA Codebase Encyclopedia - AI Agent Reference

## System Overview

LUNA generates structured codebase documentation optimized for AI agent consumption via MCP (Model Context Protocol).

**Output artifacts:**
- File summaries (`.md` + `.json` pairs per source file)
- API reference (`api-reference.json`)
- Dependency graph (`dependency-graph.json`)
- Component map (`component-map.json`)
- Complexity heatmap (`complexity-heatmap.json`)
- Dead code analysis (`dead-code-analysis.json`)
- Quality assurance report (`QA_REPORT.json`)

**Supported languages:** Python, TypeScript, JavaScript, Java, C#, Go

**Supported frameworks:** FastAPI, Django, Flask, Spring, ASP.NET Core, React, Express

## Generated Files

### Per-File Summaries
**Location:** `.codebase/src/filename.{md,json}`

**Structure:**
```json
{
  "sourceFile": "src/extension.ts",
  "generatedAt": "2026-01-03T12:00:00Z",
  "gitHash": "abc123",
  "summary": {
    "purpose": "...",
    "keyComponents": [{"name": "...", "description": "...", "lines": "10-25"}],
    "dependencies": {
      "internal": [{"path": "./analyzer", "usage": "...", "lines": "3"}],
      "external": [{"package": "vscode", "usage": "..."}]
    },
    "publicAPI": [{"signature": "activate()", "description": "..."}],
    "usedBy": ["src/main.ts"],
    "implementationNotes": "..."
  }
}
```

### API Reference
**Location:** `.codebase/api-reference.json`

**Structure:**
```json
{
  "generated": "2026-01-03T12:00:00Z",
  "totalEndpoints": 42,
  "frameworks": ["FastAPI"],
  "endpoints": [
    {
      "path": "/api/characters/{character_id}",
      "method": "POST",
      "handler": "update_character",
      "file": "api/routes.py",
      "lines": "89-112",
      "requestSchema": {
        "type": "CharacterUpdate",
        "fields": [
          {"name": "name", "type": "str", "required": false},
          {"name": "health", "type": "int", "required": false}
        ]
      },
      "responseSchema": {
        "type": "Character",
        "fields": [...],
        "statusCode": 200
      },
      "pathParams": [{"name": "character_id", "type": "str"}],
      "queryParams": [],
      "authentication": "Bearer token",
      "description": "Update character attributes",
      "tags": ["characters"]
    }
  ]
}
```

### Other Analysis Files
- **dependency-graph.json** - Bidirectional file relationships
- **component-map.json** - Architectural groupings
- **complexity-heatmap.json** - Refactoring priority (0-10 scale)
- **dead-code-analysis.json** - Unused exports (AI-verified)
- **QA_REPORT.json** - Validation results for deterministic analyses

## Available MCP Tools

### File & Code Tools

**`get_file_summary`**
- **Purpose:** Retrieve cached summary for a specific file
- **Parameters:** `workspace_path` (string), `file_path` (string, relative)
- **Returns:** Full summary object (JSON + Markdown)
- **Use when:** User asks about a specific file by name

**`search_summaries`**
- **Purpose:** Search across all summaries by keyword, dependency, or component
- **Parameters:** `workspace_path` (string), `query` (string), `search_type` (enum: 'keyword'|'dependency'|'component'|'exports')
- **Returns:** Array of matching files with summaries
- **Use when:** User asks "which files use X" or "find files that..."

**`list_summaries`**
- **Purpose:** Get list of all cached summaries with metadata
- **Parameters:** `workspace_path` (string)
- **Returns:** Array of {filePath, generatedAt, gitHash}
- **Use when:** User asks for inventory or architecture overview

**`list_stale_summaries`**
- **Purpose:** Check which summaries are outdated based on git
- **Parameters:** `workspace_path` (string)
- **Returns:** Array of stale file paths
- **Use when:** User asks if summaries are current

**`get_dependency_graph`**
- **Purpose:** Get bidirectional dependency relationships
- **Parameters:** `workspace_path` (string), `file_path` (string, optional)
- **Returns:** {nodes: [], edges: [{from, to, type, usage}]}
- **Use when:** User asks "what depends on X" or "show relationships"

**`analyze_file`**
- **Purpose:** Generate/update summary for a specific file
- **Parameters:** `workspace_path` (string), `file_path` (string), `force_regenerate` (boolean)
- **Returns:** Newly generated summary
- **Use when:** User explicitly requests summarization or summary is missing

### API Reference Tools

**`get_api_reference`**
- **Purpose:** Get all API endpoints with optional filtering
- **Parameters:** 
  - `workspace_path` (string)
  - `filter_path` (string, optional) - e.g., "/api/characters"
  - `filter_method` (enum, optional) - GET|POST|PUT|DELETE|PATCH
  - `filter_tag` (string, optional) - e.g., "auth"
- **Returns:** {total_endpoints, frameworks, endpoints: [...]}
- **Use when:** User asks about API endpoints, routes, or HTTP methods

**`search_endpoints`**
- **Purpose:** Search endpoints by pattern, description, or schema
- **Parameters:** 
  - `workspace_path` (string)
  - `query` (string) - search term
  - `search_in` (enum, optional) - 'all'|'path'|'description'|'response_schema'|'request_schema'
- **Returns:** {total_results, query, endpoints: [...]}
- **Use when:** User asks "which endpoint returns X" or "find POST endpoints with Y"

### Meta-Analysis Tools (NEW!)

**`get_complexity_heatmap`**
- **Purpose:** Get code complexity scores for refactoring prioritization
- **Parameters:**
  - `workspace_path` (string)
  - `min_score` (number, optional) - filter files with score >= value (0-10 scale)
- **Returns:** {generated, summary, complexity: [{file, coupling, volatility, totalScore, recommendation}]}
- **Use when:** User asks "what needs refactoring?" or "show complex files"

**`get_dead_code`**
- **Purpose:** Get unused exports (AI-verified to reduce false positives)
- **Parameters:**
  - `workspace_path` (string)
- **Returns:** {generated, summary, orphanedExports: [...], notes}
- **Use when:** User asks "which exports are unused?" or "find dead code"

**`get_component_map`**
- **Purpose:** Get architectural component grouping and file organization
- **Parameters:**
  - `workspace_path` (string)
- **Returns:** {generated, components: [{name, description, files: [...]}], qaReviewed}
- **Use when:** User asks "what's the architecture?" or "show component organization"

**`get_qa_report`**
- **Purpose:** Get quality assurance validation results
- **Parameters:**
  - `workspace_path` (string)
- **Returns:** {generated, validations: {...}, overallScore, issues: [...]}
- **Use when:** User asks "what's the quality score?" or "are there validation issues?"

## Tool Selection Logic

```
IF query about COMPLEXITY/REFACTORING → get_complexity_heatmap
  ("complex", "refactor", "hotspot", "quality")

ELSE IF query about DEAD CODE/UNUSED → get_dead_code
  ("unused", "dead code", "orphaned", "not used")

ELSE IF query about ARCHITECTURE/COMPONENTS → get_component_map
  ("architecture", "structure", "components", "grouping", "organization")

ELSE IF query about QA/VALIDATION → get_qa_report
  ("quality", "validation", "accuracy", "score")

ELSE IF query about API ENDPOINTS → get_api_reference OR search_endpoints
  ("endpoint", "route", "API", "HTTP method", "request schema")

ELSE IF query mentions SPECIFIC FILENAME → get_file_summary
  ("What does extension.ts do?")

ELSE IF query about DISCOVERY → search_summaries
  ("which files", "find files", "search for")

ELSE IF query about STALENESS → list_stale_summaries
  ("outdated", "stale", "current")

ELSE IF query about RELATIONSHIPS → get_dependency_graph
  ("depends on", "uses", "imports", "who uses")

ELSE IF BROAD/ARCHITECTURAL → combine multiple tools
```

## Query Examples

| User Query | Tool | Parameters |
|------------|------|------------|
| "What does extension.ts do?" | `get_file_summary` | `file_path="src/extension.ts"` |
| "Show me the most complex files" | `get_complexity_heatmap` | `min_score=7` |
| "Which exports are unused?" | `get_dead_code` | _(no params)_ |
| "What's the architecture?" | `get_component_map` | _(no params)_ |
| "What's the QA score?" | `get_qa_report` | _(no params)_ |
| "Show me all POST endpoints" | `get_api_reference` | `filter_method="POST"` |
| "Which endpoint updates characters?" | `search_endpoints` | `query="update"` |
| "Which files import React?" | `search_summaries` | `query="React", search_type="dependency"` |
| "What depends on utils.ts?" | `get_dependency_graph` | `file_path="src/utils.ts"` |
| "Are summaries outdated?" | `list_stale_summaries` | _(no params)_ |

## Response Guidelines

1. **Always include line numbers** when referencing code (from summary `lines` fields)
2. **Check staleness** if summary timestamp is >24h old and user is asking about current state
3. **Use bidirectional deps** - summaries include both `dependencies` and `usedBy`
4. **Suggest re-summarization** if you detect stale data, don't attempt to summarize yourself
5. **Leverage API reference** for route questions instead of reading source files

## Maintenance Protocol

- If user makes significant code changes, suggest: "Run 'LUNA: Update Stale Summaries' to refresh"
- If `list_stale_summaries` shows outdated files, inform user
- Never attempt to generate summaries yourself - always use MCP tools or suggest user commands
- If api-reference.json is missing, note: "API reference not generated. Run 'LUNA: Generate Codebase Summaries'"

## Architecture Notes

- Summaries are git-aware (track branch and commit hash)
- Dead code analysis is AST-based with AI verification to reduce false positives
- Complexity scores (0-10) are validated by AI against actual code patterns
- Framework detection is automatic (FastAPI, Django, Spring, React, etc.)
- Multi-language projects are fully supported
