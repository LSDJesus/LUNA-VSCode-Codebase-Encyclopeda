# LUNA Codebase Encyclopedia v1.1.12 Release Notes

**Release Date:** January 10, 2026  
**Type:** Major Feature Release

---

## 🎉 Overview

Version 1.1.12 introduces the **Async Worker Agent System** - a groundbreaking feature that enables the main AI agent (Luna in Copilot Chat) to spawn background worker agents that run asynchronously using cheaper or free Copilot models.

This release transforms LUNA from a single-agent system into a **parallel cognitive architecture**, where complex reasoning tasks stay with the premium model while routine work (documentation, testing, analysis) gets delegated to cost-free worker agents running in the background.

**Key Benefits:**
- ⚡ **Faster turnaround** - Multiple tasks run in parallel
- 💰 **Cost optimization** - Use FREE models (gpt-4o, gpt-4.1) for 70% of work
- 🎯 **Better focus** - Main agent handles complex reasoning, workers handle grunt work
- 🔄 **True async** - Workers run without blocking main conversation

---

## ✨ Key Features

### 1. Asynchronous Worker Agents
- Spawn background AI workers that execute tasks independently
- Workers run using VS Code Language Model API
- Full Agent Mode capabilities (file editing, code search, terminal access)
- Non-blocking execution - continue conversation while workers run

### 2. Parallel Execution
- Run up to 3 workers concurrently (configurable: 1-10)
- Queue-based task management with automatic scheduling
- Timeout protection (default: 5 minutes per worker)
- Auto-cleanup of completed tasks (default: 24 hours)

### 3. Cost Optimization
- Use FREE Copilot models for workers (gpt-4o, gpt-4.1, gpt-5-mini, raptor-mini)
- Use cheap models for simple tasks (claude-haiku @ 0.33x, gemini-flash @ 0.33x)
- Main agent keeps expensive model for complex reasoning
- **Typical savings:** 50-70% cost reduction on multi-step workflows

### 4. MCP Server Integration
- Three new MCP tools: `spawn_worker_agent`, `check_worker_status`, `wait_for_workers`
- HTTP bridge for MCP ↔ Extension communication
- Secure localhost-only communication
- Dynamic port assignment with file-based discovery

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Copilot Chat (Agent Mode)                                    │
│ Model: Claude Sonnet 4.5 @ 1x cost                          │
│ Role: Main orchestrator, complex reasoning                   │
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
│ - Manages concurrency (default: 3 parallel)                 │
└────────────┬────────────────────────────────────────────────┘
             │
             │ Uses vscode.lm.sendRequest()
             ↓
┌─────────────────────────────────────────────────────────────┐
│ Worker Agent (Copilot model)                                │
│ Model: gpt-4o, gpt-4.1 (FREE) or claude-haiku (0.33x)      │
│ - Executes delegated task autonomously                      │
│ - Returns results when complete                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Usage Examples

### Example 1: Documentation Delegation

```javascript
// User: "Refactor authentication to use JWT and document it"

// Main agent (Sonnet 4.5) does complex refactoring
// ... makes code changes ...

// Spawn FREE worker for documentation
const docTask = await spawn_worker_agent({
    task_type: 'documentation',
    prompt: `Document the JWT authentication refactoring:
    - Update docs/AUTH.md with new flow
    - Create migration guide
    - Add API examples`,
    context_files: ['src/auth/jwtService.ts', 'src/auth/middleware.ts'],
    model: 'gpt-4o', // FREE!
    output_file: 'docs/AUTH_REFACTOR.md',
    auto_execute: true
});

// Continue conversation while worker writes docs...
// Result: Code refactored + Documentation complete, 0x cost for docs
```

### Example 2: Parallel Analysis

```javascript
// User: "Analyze the API layer for issues"

// Spawn 3 workers in parallel for comprehensive review
const perfWorker = await spawn_worker_agent({
    task_type: 'analysis',
    prompt: 'Find performance bottlenecks, N+1 queries, missing indexes',
    model: 'gpt-4o'
});

const secWorker = await spawn_worker_agent({
    task_type: 'analysis',
    prompt: 'Security audit: auth bypasses, injection risks, XSS',
    model: 'gpt-4o'
});

const archWorker = await spawn_worker_agent({
    task_type: 'analysis',
    prompt: 'Check SOLID violations, tight coupling, duplication',
    model: 'raptor-mini' // FREE, good enough for architecture review
});

// All 3 run simultaneously! Wait for completion:
const results = await wait_for_workers({
    task_ids: [perfWorker.taskId, secWorker.taskId, archWorker.taskId],
    timeout_seconds: 180
});

// Present combined findings to user
```

---

## ⚙️ Configuration

New settings in `luna-encyclopedia.*`:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `defaultWorkerModel` | string | `gpt-4o` | Default Copilot model for worker agents |
| `workerConcurrencyLimit` | number | `3` | Max workers running simultaneously (1-10) |
| `workerTimeoutSeconds` | number | `300` | Task timeout in seconds (30-1800) |
| `workerAutoCleanupHours` | number | `24` | Delete completed tasks after N hours |

**Recommended model choices:**
- **FREE models:** `gpt-4o`, `gpt-4.1`, `gpt-5-mini`, `raptor-mini`
- **Budget paid:** `claude-haiku-4.5` (0.33x), `gemini-3-flash` (0.33x)

---

## 🔄 Breaking Changes

**None.** This is a fully backward-compatible feature addition.

**New Dependencies:**
- `http` module (Node.js built-in, no installation needed)

---

## 📦 Migration Notes

**For users:**
1. Update to v1.1.12
2. Reload VS Code window
3. Check LUNA output channel - you should see:
   ```
   🌉 Extension bridge started on port XXXXX
   📝 Bridge port saved to ~/.luna-bridge-port
   ```
4. Worker agents are now available in Copilot Chat (Agent Mode)

**No configuration changes required** - defaults work great for most users.

---

## 💰 Cost Optimization Tips

1. **Use FREE models for workers**
   - Documentation: `gpt-4o` or `gpt-4.1`
   - Simple analysis: `raptor-mini`
   - Test generation: `gpt-5-mini`

2. **Reserve premium models for complex work**
   - Main agent (you): Complex reasoning, architectural decisions
   - Workers: Mechanical work, documentation, simple analysis

3. **Typical cost breakdown:**
   ```
   Old way: 10 tasks × 1x (Sonnet) = 10x cost
   New way: 3 tasks × 1x (Sonnet) + 7 tasks × 0x (gpt-4o) = 3x cost
   Savings: 70%!
   ```

4. **Maximize parallelization**
   - Increase `workerConcurrencyLimit` to 5-10 for large projects
   - Batch similar tasks (e.g., test all modules at once)

---

## 🔧 Technical Details

### Communication Protocol
- **Bridge Server:** HTTP server on `127.0.0.1:random_port`
- **Port Discovery:** Extension writes port to `~/.luna-bridge-port`
- **MCP → Bridge:** HTTP POST/GET requests with JSON payloads
- **Security:** Localhost-only (127.0.0.1), no network exposure

### API Endpoints
- `POST /api/spawn-worker` - Create new worker task
- `GET /api/worker-status?taskId=<id>` - Check task status
- `POST /api/wait-for-workers` - Block until workers complete
- `GET /api/list-workers` - Get all tasks
- `GET /health` - Health check

### File Locations
- **Bridge port:** `~/.luna-bridge-port` (or `C:\Users\<user>\.luna-bridge-port` on Windows)
- **MCP server:** `<extension>/mcp-server/dist/index.js`
- **Extension bridge:** `src/extensionBridge.ts`

### Security Notes
- HTTP bridge binds to `127.0.0.1` only (not accessible from network)
- No authentication required (localhost trust model)
- Port randomly assigned to avoid conflicts
- Workers restricted to workspace file operations only

---

## 📚 Documentation

- **Full Worker Guide:** [docs/WORKER_AGENTS.md](WORKER_AGENTS.md)
- **Architecture Details:** See "Architecture" section above
- **Usage Examples:** See "Usage Examples" section above

---

## 🙏 Credits

This feature enables true parallel AI cognitive architecture in VS Code - a first-of-its-kind capability for IDE extensions.

**Implemented in:** v1.1.12  
**Total new files:** 3 (BackgroundTaskManager, ExtensionBridge, WORKER_AGENTS.md)  
**Total new MCP tools:** 3  
**Total new settings:** 4  
**Lines of code added:** ~800

---

**Enjoy your new AI worker swarm! 🚀**
