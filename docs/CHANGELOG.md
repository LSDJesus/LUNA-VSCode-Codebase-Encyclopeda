# Changelog

## Overview
LUNA has undergone significant updates from v1.1.11 to v1.1.14, introducing the **async worker agent system**. This system enables parallel task delegation to background AI workers, enhancing efficiency and scalability. Key features include structured output parsing, an HTTP bridge for communication, and robust task management.

## New Files
- **src/backgroundTaskManager.ts**: Manages background tasks, including queuing, execution, and concurrency control.
- **src/extensionBridge.ts**: Implements an HTTP bridge for communication between the MCP server and the VS Code extension.
- **docs/WORKER_AGENTS.md**: Provides detailed documentation on the worker agent system, including architecture, usage patterns, and configuration.

## Key Features
1. **Async Worker Agent System**:
   - Allows delegation of tasks to background AI workers.
   - Supports multiple task types: documentation, analysis, testing, refactoring, research, and more.
   - Workers operate in parallel with a configurable concurrency limit (default: 3).

2. **HTTP Bridge**:
   - Facilitates communication between the MCP server and the extension.
   - Runs on a dynamically assigned localhost port for security.
   - Supports endpoints for spawning workers, checking status, and managing tasks.

3. **Structured Output Parsing**:
   - Ensures worker responses are parsed as valid JSON.
   - Supports automatic file creation and updates based on worker output.

## Technical Details
### Architecture
- The **BackgroundTaskManager** handles task submission, queuing, and execution.
- The **ExtensionBridge** acts as an HTTP server, enabling external systems to interact with the task manager.
- Workers are spawned using the VS Code Language Model API, leveraging models like `gpt-4o` for cost-effective processing.

### Workflow
1. A task is submitted via the HTTP bridge.
2. The task manager queues the task and starts execution based on available slots.
3. Workers process the task, generate structured output, and optionally create or modify files.
4. Results are stored in memory and can be retrieved via the HTTP bridge.

## Configuration
New settings introduced in this update:
- **`luna-encyclopedia.defaultWorkerModel`**: Default model for workers (e.g., `gpt-4o`).
- **`luna-encyclopedia.workerConcurrencyLimit`**: Maximum number of parallel workers (default: 3).
- **`luna-encyclopedia.workerTimeoutSeconds`**: Timeout for worker tasks (default: 300 seconds).
- **`luna-encyclopedia.workerAutoCleanupHours`**: Auto-delete completed tasks after a specified duration (default: 24 hours).

## Version History
### v1.1.12
- Introduced the **BackgroundTaskManager** for managing async tasks.
- Added support for structured output parsing.
- Initial implementation of the worker agent system.

### v1.1.13
- Added the **ExtensionBridge** for HTTP communication.
- Enabled task spawning via the `/api/spawn-worker` endpoint.
- Improved error handling and logging in the task manager.

### v1.1.14
- Finalized the async worker agent system.
- Added detailed documentation in `docs/WORKER_AGENTS.md`.
- Enhanced configuration options for worker management.
- Optimized concurrency handling and task execution.

---

This changelog provides a detailed summary of the updates and improvements made to LUNA, focusing on the introduction of the async worker agent system and its associated features.