# .vscode/ — VS Code Configuration

## Purpose

VS Code extension and workspace configuration files. Handles extension activation, debugging, build tasks, and MCP server registration.

## Contents

- [**mcp.json**](mcp.json) — MCP server registration for Copilot Agent Mode
- [**launch.json**](launch.json) — Debug configuration for extension development
- [**tasks.json**](tasks.json) — Build tasks (compile TypeScript)
- [**settings.json**](settings.json) — Workspace settings (if present)

## File Details

### mcp.json
**Registers MCP server with Copilot Chat.**

```json
{
  "servers": {
    "lunaEncyclopedia": {
      "type": "stdio",
      "command": "node",
      "args": ["mcp-server/dist/index.js"]
    }
  }
}
```

- **Auto-configured** — Generated during extension development
- **Scope**: This workspace only
- **Purpose**: Tells VS Code to spawn MCP server and register its tools

### launch.json
**Debug configuration for extension development.**

```json
{
  "configurations": [
    {
      "name": "Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": ["--extensionDevelopmentPath=${workspaceFolder}"],
      "preLaunchTask": "${defaultBuildTask}"
    }
  ]
}
```

- **Press F5** to use this configuration
- **Launches**: Extension Development Host (isolated VS Code window)
- **Pre-task**: Auto-compiles TypeScript before launching

### tasks.json
**Build and test tasks.**

- **npm: compile** — TypeScript → JavaScript (marked as default build task)
- **Problem matcher**: $tsc — parses TypeScript errors

Run with `Ctrl+Shift+B` (default build task) or `Ctrl+Shift+P` > "Run Task"

## Activation Events

Extension activates on:
- `onCommand:luna-encyclopedia.*` — Any LUNA command
- Automatically when user runs a LUNA command

## Contribution Points

(Defined in [../package.json](../package.json) but used by VS Code)

- **Commands**: `luna-encyclopedia.generateSummaries`, `luna-encyclopedia.showSummary`
- **Tree Views**: `luna-encyclopedia.summaryTree`
- **Configuration**: `luna-encyclopedia.*` settings
- **Icons**: LUNA icon for sidebar

## Notes

- All paths are relative to workspace root
- MCP server must be built (`npm run build` in mcp-server/) before it's available
- Launch config includes auto-compile pre-task
- No need to manually edit these files — auto-generated on setup
