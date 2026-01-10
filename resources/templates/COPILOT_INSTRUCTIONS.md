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

## Worker Agent Delegation Tools

The LUNA system supports delegating tasks to background AI worker agents, enabling parallel processing for documentation, analysis, testing, and more. These tools allow you to offload repetitive or time-consuming tasks to workers, freeing you to focus on complex reasoning and user interaction.

### `spawn_worker_agent`
- **Purpose:** Spawn an async AI worker to handle a specific subtask
- **Parameters:**
  - `task_type` (string): Type of task - 'documentation', 'analysis', 'testing', 'refactoring', 'research', 'other'
  - `prompt` (string): Detailed instructions for the worker
  - `context_files` (array): Files to include in the worker's context
  - `model` (string, optional): Model to use (default: 'gpt-4o' - FREE)
  - `output_file` (string, optional): File path for worker output
  - `auto_execute` (boolean, optional): Allow worker to create/edit files (default: true)
- **Returns:** Task ID immediately (non-blocking)
- **Use when:** You need to delegate a task that doesn't require immediate results

**Example:**
```javascript
const task = await spawn_worker_agent({
    task_type: 'documentation',
    prompt: 'Document the authentication system with examples and migration guide',
    context_files: ['src/auth/service.ts', 'src/auth/middleware.ts'],
    model: 'gpt-4o', // FREE model!
    output_file: 'docs/AUTH.md',
    auto_execute: true
});
// Returns: { taskId: "uuid-1234", model: "gpt-4o", taskType: "documentation" }
```

### `check_worker_status`
- **Purpose:** Check the status of worker task(s)
- **Parameters:**
  - `task_id` (string, optional): Specific task ID, or omit for all workers
- **Returns:** Task object(s) with status ('queued'|'running'|'completed'|'failed'), result, filesModified, error, etc.
- **Use when:** You need to poll for task completion or check progress

**Example:**
```javascript
const status = await check_worker_status({ task_id: 'uuid-1234' });
// Returns: { id: "uuid-1234", status: "completed", result: "...", filesModified: ["docs/AUTH.md"] }
```

### `wait_for_workers`
- **Purpose:** Block until worker(s) complete
- **Parameters:**
  - `task_ids` (array, optional): Task IDs to wait for, or omit for all active workers
  - `timeout_seconds` (number, optional): Max wait time (default: 60)
- **Returns:** Array of completed tasks with results
- **Use when:** You need results before proceeding with next steps

**Example:**
```javascript
const results = await wait_for_workers({
    task_ids: ['uuid-1234', 'uuid-5678'],
    timeout_seconds: 120
});
// Returns: { tasks: [...], allCompleted: true }
```

### Decision Tree: When to Delegate vs. Do It Yourself

**Delegate to Workers (spawn_worker_agent):**
- ✅ Task is repetitive or mechanical (documentation, test generation, formatting)
- ✅ Cost optimization is a priority (use FREE models like `gpt-4o`, `raptor-mini`)
- ✅ Parallel processing can save time (e.g., analyze multiple modules simultaneously)
- ✅ Task doesn't require user interaction
- ✅ Results aren't immediately needed (can check status later)

**Do It Yourself (use your own model):**
- ✅ Task requires complex reasoning or creative problem-solving
- ✅ Immediate results are critical to continue conversation
- ✅ User is waiting for your response
- ✅ Task involves sensitive decision-making or architecture design
- ✅ Task requires access to tools workers don't have

### Cost Optimization with Workers

- **FREE models (0x cost):** `gpt-4o`, `gpt-4.1`, `gpt-5-mini`, `raptor-mini`
- **Budget paid (0.33x cost):** `claude-haiku-4.5`, `gemini-3-flash`
- **Typical savings:** 50-70% cost reduction on multi-step workflows

**Example Cost Calculation:**
```
Without workers:
  10 tasks × Sonnet 4.5 @ 1x = 10x cost

With workers:
  3 complex tasks × Sonnet 4.5 @ 1x = 3x cost
  7 simple tasks × gpt-4o @ 0x (FREE) = 0x cost
  Total: 3x cost (70% savings!)
```

### Worker Output Format

Workers return structured JSON that gets automatically parsed and executed by the extension:
```json
{
  "summary": "Created comprehensive authentication docs",
  "files": [
    {
      "path": "docs/AUTH.md",
      "content": "# Authentication System\n\n..."
    }
  ]
}
```

The extension automatically:
1. Parses the JSON response
2. Creates directories if needed
3. Writes files to workspace
4. Updates task.filesModified with list of changed files

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
