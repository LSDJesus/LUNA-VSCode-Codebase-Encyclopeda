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

## Worker Agent Delegation Tools (v1.1.16 - TRUE AUTONOMOUS AGENTS!)

**MAJOR BREAKTHROUGH:** Workers now have FULL tool access and can autonomously execute complex multi-step tasks!

Workers are no longer limited to returning JSON - they are **true autonomous agents** with the same tool capabilities you have:
- ✅ Read any file in the workspace
- ✅ Write/create/edit files directly
- ✅ Search the codebase
- ✅ Use all LUNA tools (get_file_summary, search_summaries, etc.)
- ✅ Multi-turn reasoning (up to 20 tool calls per task)
- ✅ See results of their actions and adapt
- ✅ ALL while using FREE models (gpt-4o)!

### `spawn_worker_agent`
- **Purpose:** Spawn a fully autonomous AI worker agent with complete tool access
- **Parameters:**
  - `task_type` (string): Type of task - 'documentation', 'analysis', 'testing', 'refactoring', 'research', 'other'
  - `prompt` (string): High-level goal - worker will figure out the steps autonomously
  - `context_files` (array, optional): Initial files to show the worker
  - `model` (string, optional): Model to use (default: 'gpt-4o' - FREE)
  - `auto_execute` (boolean, optional): Always true now (workers use tools directly)
- **Returns:** Task ID immediately (non-blocking)
- **Use when:** ANY multi-step task that doesn't require immediate user interaction

**What Changed (v1.1.16):**
- **Before:** Workers returned JSON → extension parsed it → extension wrote files
- **Now:** Workers use tools directly → read files → write files → see results → continue working
- **Impact:** Workers can handle MUCH more complex tasks autonomously!

**Example - Simple Documentation:**
```javascript
const task = await spawn_worker_agent({
    task_type: 'documentation',
    prompt: 'Document the authentication system with examples',
    context_files: ['src/auth/service.ts'], // Optional - worker can read more if needed
    model: 'gpt-4o' // FREE!
});
// Worker autonomously:
// 1. Reads src/auth/service.ts (tool call)
// 2. Searches for related files (tool call)
// 3. Reads src/auth/middleware.ts (tool call)
// 4. Creates docs/AUTH.md (tool call)
// 5. Returns summary
```

**Example - Complex Refactoring:**
```javascript
const task = await spawn_worker_agent({
    task_type: 'refactoring',
    prompt: `Refactor authentication to use JWT tokens:
    - Create new JWT service
    - Update all middleware  
    - Update tests
    - Document changes`,
    model: 'gpt-4o' // FREE!
});
// Worker autonomously executes ~10-15 tool calls:
// - Reads current implementation
// - Creates new files
// - Updates existing files
// - Verifies changes
// - Creates documentation
// All without any manual intervention!
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
- ✅ Task is repetitive or mechanical (documentation, test generation, refactoring)
- ✅ Task has clear requirements and doesn't need creative problem-solving
- ✅ Cost optimization is desired (workers use FREE models!)
- ✅ Parallel processing can save time
- ✅ Task doesn't require user interaction or real-time feedback
- ✅ Multi-step workflows (workers can read → analyze → modify → verify autonomously)
- ✅ File operations needed (workers have full file system access now!)

**Do It Yourself (use your own model):**
- ✅ Task requires complex creative reasoning or novel solutions
- ✅ Immediate results needed to continue conversation
- ✅ User is waiting for your response right now
- ✅ Task involves critical architecture decisions
- ✅ You need to explain reasoning to the user as you work

**Note:** Since v1.1.16, workers have the SAME tool access you do! The main difference is:
- **You:** Premium model, interactive, can chat with user
- **Workers:** FREE model, silent execution, fully autonomous tool usage

### Worker Tool Access (Curated Set - 128 Tool Limit)

Workers have access to a **curated subset** of VS Code tools (due to 128 tool limit per request):

**✅ File Operations:**
- `vscode_readFile` - Read any file in workspace
- `vscode_writeFile` - Create or update files
- `vscode_createDirectory` - Create directories
- `vscode_searchWorkspace` - Search for code patterns
- `vscode_findFiles` - Find files by pattern
- `vscode_listFiles` - List directory contents

**✅ LUNA Encyclopedia Tools (ALL 12):**
- `get_file_summary` - Get cached file analysis
- `search_summaries` - Search across all summaries
- `list_summaries` - List all cached summaries
- `get_dependency_graph` - Get file relationships
- `analyze_file` - Generate new summary
- `list_stale_summaries` - Check outdated summaries
- `get_api_reference` - Get all API endpoints
- `search_endpoints` - Search API endpoints
- `get_complexity_heatmap` - Get refactoring candidates
- `get_dead_code` - Get unused exports
- `get_component_map` - Get architecture grouping
- `get_qa_report` - Get quality metrics

**✅ GitHub Tools (Limited Set):**
- `list_branches` - List repository branches
- `list_commits` - List commit history
- `get_commit` - Get commit details
- `get_file_contents` - Get file from GitHub

**✅ Pylance Tools (Python Development):**
- All Pylance MCP tools for Python analysis

**❌ Workers DO NOT Have Access To:**
- Worker spawning tools (prevents infinite recursion)
- Web search / fetch_webpage tools
- PostgreSQL database tools
- Container/Docker tools
- Agent/subagent management tools
- GitHub search_code / search_repositories

**Why the restrictions?**
1. **128 tool limit** - Keep only relevant tools for code work
2. **Safety** - Prevent worker recursion and unrelated operations
3. **Focus** - Workers handle code, you handle research/DB/web
4. **Performance** - Fewer tools = faster model decisions

### Cost Optimization with Workers

- **FREE models (0x cost):** `gpt-4o`, `gpt-4.1`, `gpt-5-mini`, `raptor-mini`
- **Budget paid (0.33x cost):** `claude-haiku-4.5`, `gemini-3-flash`
- **Typical savings:** 50-70% cost reduction on multi-step workflows

**Example Cost Calculation:**
```
Without workers:
  10 tasks × Sonnet 4.5 @ 1x = 10x cost

With workerExecution Model (NEW in v1.1.16!)

**Workers use tools directly** - no JSON needed!

Multi-turn execution flow:
```
Turn 1: Worker calls vscode_readFile('src/auth.ts')
        → Extension executes tool → Returns file content

Turn 2: Worker calls vscode_readFile('src/middleware.ts')  
        → Extension executes tool → Returns file content

Turn 3: Worker calls vscode_writeFile('docs/AUTH.md', <content>)
        → Extension executes tool → File created

Turn 4: Worker calls get_file_summary('src/utils.ts')
        → Extension executes tool → Returns summary

Turn 5: Worker calls vscode_writeFile('src/newFeature.ts', <content>)
        → Extension executes tool → File created

Turn 6: Worker returns summary text (no more tool calls)
        → Task complete!
```

**Key advantages over JSON mode:**
- ✅ No file size limits (tools handle any content)
- ✅ No JSON escaping issues with quotes/newlines
- ✅ Workers see results and can adapt (error recovery!)
- ✅ Workers can read files they discover mid-task
- ✅ True multi-step autonomous workflows

The extension automatically:
1. Executes tool calls as worker requests them
2. Feeds results back to worker for next decision
3. Tracks all modified files
4. Stops when worker completes (no more tool calls)

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
