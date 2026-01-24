# LUNA Encyclopedia - AI Tools Quick Reference

## Available MCP Tools

### Summary & Search Tools
| Tool | Usage | Requires `workspace_path` |
|------|-------|--------------------------|
| `get_file_summary` | Cached lookup of specific file (sub-10ms) | ✓ |
| `search_summaries` | Find files by keyword, dependency, component, or exports | ✓ |
| `list_summaries` | Browse all cached summaries with metadata | ✓ |

### Analysis & Architecture Tools
| Tool | Usage | Requires `workspace_path` |
|------|-------|--------------------------|
| `get_dependency_graph` | Map file relationships (who uses X, what X depends on) | ✓ |
| `get_complexity_heatmap` | Identify complex files needing refactoring (0-10 scale) | ✓ |
| `get_component_map` | Understand architectural grouping and organization | ✓ |
| `get_dead_code` | Find unused exports and unreachable code | ✓ |

### Code Generation & Analysis
| Tool | Usage | Requires `workspace_path` |
|------|-------|--------------------------|
| `analyze_file` | Generate or refresh summary for a file on-demand | ✓ |

### API Tools (REST Endpoints)
| Tool | Usage | Requires `workspace_path` |
|------|-------|--------------------------|
| `get_api_reference` | Query all REST endpoints with optional filtering | ✓ |
| `search_endpoints` | Find endpoints by pattern, method, or response type | ✓ |

### Staleness & Updates
| Tool | Usage | Requires `workspace_path` |
|------|-------|--------------------------|
| `list_stale_summaries` | Check which summaries are out-of-date (git-aware) | ✓ |

### Worker Agents (Async Tasks)
| Tool | Usage | Requires `workspace_path` |
|------|-------|--------------------------|
| `spawn_worker_agent` | Delegate long-running tasks (documentation, analysis, testing, refactoring) | ✓ |
| `check_worker_status` | Poll task status without blocking | ✓ |
| `wait_for_workers` | Block until specified workers complete | ✓ |

---

## Usage Patterns

### **Always Include `workspace_path`**
```python
# ✓ CORRECT
result = get_file_summary(workspace_path="/path/to/project", file_path="src/extension.ts")

# ✗ WRONG
result = get_file_summary(file_path="src/extension.ts")  # Missing workspace_path!
```

### **Understanding `file_path` Format**
- Relative to workspace root (no leading `/`)
- Examples: `src/extension.ts`, `mcp-server/src/index.ts`, `README.md`
- Use forward slashes `/` even on Windows

### **When to Use Which Tool**

| You Want To... | Use This Tool |
|---|---|
| Find what a specific file does | `get_file_summary(workspace_path, file_path)` |
| Understand architecture/structure | `get_component_map(workspace_path)` or `get_dependency_graph(workspace_path, file_path)` |
| Find all files that use X | `search_summaries(workspace_path, query="X", search_type="dependency")` |
| Identify refactoring candidates | `get_complexity_heatmap(workspace_path, min_score=8)` |
| Find unused code | `get_dead_code(workspace_path)` |
| Query API endpoints | `get_api_reference(workspace_path)` or `search_endpoints(workspace_path, query="update")` |
| Check what's out-of-date | `list_stale_summaries(workspace_path)` |
| Delegate long work | `spawn_worker_agent(task_type, prompt, context_files, output_file, auto_execute)` |

### **Filtering Examples**
```python
# Get API reference for only POST endpoints
get_api_reference(workspace_path, filter_method="POST")

# Search for complexity issues
get_complexity_heatmap(workspace_path, min_score=8)  # Only score 8+ (hardest)

# Find all files using a specific module
search_summaries(workspace_path, query="codebaseAnalyzer", search_type="dependency")

# List all dead code
get_dead_code(workspace_path)
```

### **Worker Agent Example**
```python
# Spawn a long-running documentation task
task_id = spawn_worker_agent(
    task_type="documentation",
    prompt="Generate comprehensive architecture documentation with diagrams",
    context_files=["src/extension.ts", "src/codebaseAnalyzer.ts", "mcp-server/src/index.ts"],
    output_file="docs/ARCHITECTURE.md",
    auto_execute=True
)

# Check status without blocking
status = check_worker_status(task_id)
# Returns: { status: "running"|"completed"|"failed", result?: string, error?: string }
```

---

## Golden Rules

1. **ALWAYS pass `workspace_path`** - Every tool needs it to locate `.codebase/`
2. **Use `search_summaries` for discovery** - Faster than reading files manually
3. **Use `spawn_worker_agent` for heavy lifting** - Don't block; queue it
4. **Use `list_stale_summaries` before trusting old data** - Git-aware staleness detection
5. **Use `get_dependency_graph` to understand impact** - Before suggesting changes
6. **File paths are relative to workspace root** - No absolute paths, no workspace_path prepending

---

## Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Tool returns empty/error | Verify `workspace_path` is correct and `.codebase/` exists |
| Summaries seem outdated | Run `list_stale_summaries` to check, suggest regeneration if needed |
| API endpoints missing | Some frameworks may not be detected; check `get_api_reference` output |
| Worker agent not executing | Ensure `auto_execute=True` if files should be created/modified |
