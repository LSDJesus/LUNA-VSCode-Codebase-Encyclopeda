# LUNA Worker Agent System

## Architecture Overview

The LUNA Worker Agent system enables **you (Copilot Chat in Agent Mode)** to delegate tasks to background AI workers running cheaper models, allowing true parallel cognitive processing.

```
┌─────────────────────────────────────────────────────────────┐
│ Copilot Chat (Agent Mode)                                    │
│ Model: Claude Sonnet 4.5 @ 1x cost                          │
│ Role: Main orchestrator, complex reasoning, user interaction│
└────────────┬────────────────────────────────────────────────┘
             │
             │ Calls MCP tool: spawn_worker_agent
             ↓
┌─────────────────────────────────────────────────────────────┐
│ LUNA MCP Server (Node.js process)                           │
│ - Receives worker spawn request                             │
│ - Makes HTTP POST to extension bridge                       │
└────────────┬────────────────────────────────────────────────┘
             │
             │ HTTP: POST to 127.0.0.1:PORT/api/spawn-worker
             ↓
┌─────────────────────────────────────────────────────────────┐
│ Extension Bridge (HTTP server in VS Code)                   │
│ - Receives spawn request                                    │
│ - Passes to BackgroundTaskManager                           │
└────────────┬────────────────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────────────────┐
│ Background Task Manager (extension)                         │
│ - Queues task                                               │
│ - Spawns worker using VS Code Language Model API            │
│ - Manages concurrency (default: 3 parallel workers)         │
└────────────┬────────────────────────────────────────────────┘
             │
             │ Uses vscode.lm.sendRequest()
             ↓
┌─────────────────────────────────────────────────────────────┐
│ Worker Agent (Copilot model in Agent Mode)                  │
│ Model: gpt-4o, gpt-4.1 (FREE) or claude-haiku (0.33x)      │
│ - Has full tool access (file editing, search, LUNA, etc.)   │
│ - Executes delegated task autonomously                      │
│ - Can create/edit files if autoExecute: true                │
│ - Returns results when complete                             │
└─────────────────────────────────────────────────────────────┘
```

## Communication Flow

1. **Extension starts HTTP bridge** on activation
   - Random port assigned (e.g., 127.0.0.1:54321)
   - Port saved to `~/.luna-bridge-port`

2. **MCP server reads port file** when tool is called
   - Discovers extension bridge dynamically
   - Makes HTTP calls to spawn/check workers

3. **Extension manages workers**
   - Uses VS Code Language Model API
   - Workers run in parallel (concurrency limit: 3)
   - Results stored in memory

## MCP Tools Available (for you, Luna!)

### `spawn_worker_agent`
Spawn an async AI worker to handle a subtask.

**Parameters:**
- `task_type`: 'documentation' | 'analysis' | 'testing' | 'refactoring' | 'research' | 'other'
- `prompt`: Detailed instructions for the worker
- `context_files`: Array of file paths to inject into worker context
- `model`: Which Copilot model to use (default: 'gpt-4o')
- `output_file`: Optional file path to write results to
- `auto_execute`: Allow worker to create/edit files (default: true)

**Returns:** Task ID immediately

**Example:**
```javascript
const task = await spawn_worker_agent({
    task_type: 'documentation',
    prompt: `Document the authentication refactoring. Create docs/AUTH_GUIDE.md with:
    - Architecture overview
    - Migration guide for developers
    - Security improvements
    - API reference
    
    Use clear examples and diagrams where helpful.`,
    context_files: ['src/auth/service.ts', 'src/auth/middleware.ts', 'src/auth/types.ts'],
    model: 'gpt-4o', // FREE!
    output_file: 'docs/AUTH_GUIDE.md',
    auto_execute: true
});

// task = { success: true, taskId: "uuid-1234", model: "gpt-4o", taskType: "documentation" }
```

### `check_worker_status`
Check status of worker(s).

**Parameters:**
- `task_id`: (optional) Specific task ID, or omit for all workers

**Returns:** Task object(s) with status, result, error, etc.

**Example:**
```javascript
// Check specific worker
const status = await check_worker_status({ task_id: "uuid-1234" });
// { id: "uuid-1234", status: "completed", result: "Created docs/AUTH_GUIDE.md...", ... }

// Check all workers
const allWorkers = await check_worker_status({});
// { tasks: [...], stats: { total: 5, queued: 0, running: 2, completed: 3, failed: 0 } }
```

### `wait_for_workers`
Block until worker(s) complete (use when you need results before proceeding).

**Parameters:**
- `task_ids`: (optional) Array of task IDs to wait for, or omit for all
- `timeout_seconds`: Max wait time (default: 60)

**Returns:** Completed tasks with results

**Example:**
```javascript
const results = await wait_for_workers({
    task_ids: ["uuid-1234", "uuid-5678"],
    timeout_seconds: 120
});
// { tasks: [{status: "completed", result: "..."}, ...], allCompleted: true }
```

## Usage Patterns (How You Should Use This!)

### Pattern 1: Delegate Documentation After Code Changes

```javascript
// User: "Refactor the authentication system to use JWT tokens"

// You do the refactoring work (Sonnet 4.5 for complex reasoning)
// ... make all code changes ...

// Then delegate the boring documentation work to a FREE worker
const docTask = await spawn_worker_agent({
    task_type: 'documentation',
    prompt: `I just refactored authentication to use JWT. Document the changes:
    
    1. Update docs/AUTH.md with new JWT flow
    2. Create migration guide in docs/MIGRATION_JWT.md
    3. Update API docs with new endpoints
    4. Add code examples for common use cases
    
    Reference the modified files for accurate details.`,
    context_files: [
        'src/auth/jwtService.ts',
        'src/auth/middleware.ts',
        'src/api/authRoutes.ts'
    ],
    model: 'gpt-4o', // FREE model is fine for docs
    auto_execute: true
});

// Continue chatting with user while worker runs in background
// Later: check status or wait for completion
const docResult = await check_worker_status({ task_id: docTask.taskId });
```

### Pattern 2: Parallel Analysis for Comprehensive Reviews

```javascript
// User: "Analyze the entire API layer for issues"

// Spawn 3 workers in parallel, each with different focus
const perfTask = await spawn_worker_agent({
    task_type: 'analysis',
    prompt: `Analyze API performance. Find:
    - N+1 query problems
    - Missing indexes
    - Inefficient algorithms
    - Caching opportunities
    
    Return JSON array of issues with severity and fix suggestions.`,
    context_files: ['src/api/**/*.ts'],
    model: 'gpt-4o'
});

const securityTask = await spawn_worker_agent({
    task_type: 'analysis',
    prompt: `Security audit of API endpoints. Find:
    - Auth bypass vulnerabilities
    - SQL injection risks
    - XSS vulnerabilities
    - Missing input validation
    
    Return JSON array with CVE-style descriptions.`,
    context_files: ['src/api/**/*.ts'],
    model: 'gpt-4o'
});

const archTask = await spawn_worker_agent({
    task_type: 'analysis',
    prompt: `Architectural analysis. Check:
    - SOLID violations
    - Tight coupling
    - Missing abstractions
    - Code duplication
    
    Suggest refactoring opportunities.`,
    context_files: ['src/api/**/*.ts'],
    model: 'raptor-mini' // Cheaper for simpler analysis
});

// All 3 running in parallel! Wait for all to complete:
const results = await wait_for_workers({
    task_ids: [perfTask.taskId, securityTask.taskId, archTask.taskId],
    timeout_seconds: 180
});

// Combine results and present to user
// "I found 12 performance issues, 3 security vulnerabilities, and 5 architectural improvements..."
```

### Pattern 3: Test Generation While You Continue Coding

```javascript
// User: "Add a new feature for bulk user imports"

// You implement the core feature logic
// ... create src/features/bulkImport.ts ...

// Delegate test writing to a worker (FREE model)
const testTask = await spawn_worker_agent({
    task_type: 'testing',
    prompt: `Generate comprehensive Jest tests for the bulk import feature.
    
    Include:
    - Unit tests for all public methods
    - Edge cases (empty file, invalid CSV, duplicate users)
    - Error handling tests
    - Integration tests with database mocks
    - Performance tests for large imports
    
    Follow existing test patterns in src/__tests__/.
    Create file: src/__tests__/bulkImport.test.ts`,
    context_files: [
        'src/features/bulkImport.ts',
        'src/__tests__/userService.test.ts' // Example test file for patterns
    ],
    model: 'gpt-4o',
    output_file: 'src/__tests__/bulkImport.test.ts',
    auto_execute: true
});

// Continue implementing other parts of the feature
// Worker writes tests in parallel
// Later: "Tests are ready! Running them now..." (check status and run)
```

### Pattern 4: Cost Optimization Strategy

```javascript
// Complex architectural decision (use YOUR expensive model)
// "Should we use microservices or monolith for this?"
// You analyze, reason, and decide...

// Simple secretarial work (delegate to FREE workers)
const tasks = [];

// Update all import paths (mechanical work)
tasks.push(await spawn_worker_agent({
    task_type: 'refactoring',
    prompt: 'Update all imports from @old/package to @new/package',
    model: 'raptor-mini', // FREE
    auto_execute: true
}));

// Format code (no thinking required)
tasks.push(await spawn_worker_agent({
    task_type: 'other',
    prompt: 'Run prettier on all TypeScript files and fix lint errors',
    model: 'gpt-4.1', // FREE
    auto_execute: true
}));

// Generate boilerplate (repetitive)
tasks.push(await spawn_worker_agent({
    task_type: 'other',
    prompt: 'Create CRUD endpoints for User, Product, Order entities using existing patterns',
    context_files: ['src/api/templates/crudTemplate.ts'],
    model: 'gpt-4o', // FREE
    auto_execute: true
}));

// All running in parallel while you focus on hard problems!
```

## Configuration Settings

Users can customize worker behavior in VS Code settings:

- `luna-encyclopedia.defaultWorkerModel` - Default model for workers (recommended: `gpt-4o`)
- `luna-encyclopedia.workerConcurrencyLimit` - Max parallel workers (default: 3)
- `luna-encyclopedia.workerTimeoutSeconds` - Task timeout (default: 300s)
- `luna-encyclopedia.workerAutoCleanupHours` - Auto-delete old tasks (default: 24h)

## Cost Optimization Guide

### FREE Models (Recommended for Workers)
- **gpt-4o** - Best quality/cost ratio
- **gpt-4.1** - Solid, reliable
- **gpt-5-mini** - Fast for simple tasks
- **raptor-mini** - Microsoft's efficient model

### Paid Budget Models (0.33x cost)
- **claude-haiku-4.5** - Fastest Claude, great for workers
- **gemini-3-flash** - Google's fast model

### When to Use Paid Models for Workers
- Complex code analysis requiring deep reasoning
- Security audits (Claude Haiku's strong at this)
- Large context windows needed

### Cost Calculation Example
```
User asks complex question requiring:
- Main agent (you): 5 turns of Sonnet 4.5 @ 1x = 5x cost
- 3 doc workers: gpt-4o @ 0x (FREE) = 0x cost
- 2 analysis workers: gpt-4o @ 0x (FREE) = 0x cost
- 1 test worker: gpt-4o @ 0x (FREE) = 0x cost

Total: 5x cost (same as if you did everything yourself, but MUCH faster!)
```

## Debugging

If workers aren't spawning:

1. Check extension output: `LUNA` channel
2. Verify bridge started: Should see "🌉 Extension bridge started on port XXXX"
3. Check bridge port file exists: `~/.luna-bridge-port`
4. Test bridge health: `curl http://127.0.0.1:PORT/health`
5. Check worker stats: Call `check_worker_status({})` to see all tasks

## Limitations

- Workers are non-interactive (can't ask user questions)
- Workers can't spawn sub-workers (no recursion)
- Workers share concurrency limit (max 3 running at once by default)
- Workers timeout after 5 minutes (configurable)
- Workers can't access user's clipboard or other VS Code UI features
- Bridge only works when LUNA extension is active in VS Code

## Security Notes

- HTTP bridge binds to `127.0.0.1` only (localhost, not accessible from network)
- No authentication required (since it's localhost only)
- Port is randomly assigned to avoid conflicts
- Workers can only edit files in the workspace (VS Code permission model)
