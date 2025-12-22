# LUNA Codebase Encyclopedia

An AI-powered VS Code extension that generates structured summaries of your codebase to dramatically improve AI assistant efficiency.

## Quick Start

### 1. Install Dependencies

**TypeScript/Node.js**:
```bash
npm install
```

**Python**:
```bash
cd python
pip install -r requirements.txt
```

### 2. Set Up API Key

Set your Anthropic API key:
```bash
# Windows PowerShell
$env:ANTHROPIC_API_KEY = "your-api-key-here"

# Linux/Mac
export ANTHROPIC_API_KEY="your-api-key-here"
```

### 3. Run the Extension

Press `F5` to open a new VS Code window with the extension loaded.

### 4. Generate Summaries

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run: **"LUNA: Generate Codebase Summaries"**
3. Wait for processing to complete
4. View summaries in the LUNA sidebar

## Features

### 🔍 Intelligent Code Analysis
- Automatically discovers all source files in your workspace
- Generates structured Markdown summaries using Claude Sonnet 4
- Extracts dependencies, public APIs, and key components

### 📊 Summary Sidebar
- Tree view of all generated summaries
- Click any summary to view in a formatted panel
- Mirrors your codebase structure

### 🔗 Direct Code Navigation
- Click `(code)` links in summaries to jump to exact source locations
- Symbol-aware navigation to functions, classes, methods
- Seamless integration with VS Code editor

### 🤖 AI-Optimized Format
Summaries include:
- **Purpose**: What the file does
- **Key Components**: Classes, functions, exports
- **Dependencies**: Internal and external imports
- **Public API**: What other files can use
- **Code Links**: Direct navigation to definitions
- **Implementation Notes**: Important patterns and gotchas

## How It Works

1. **Discovery**: Extension scans workspace for source files (Python, TypeScript, JavaScript, etc.)
2. **Analysis**: Python script sends each file to Claude for analysis
3. **Output**: Structured Markdown summaries saved to `docs/codebase/`
4. **Navigation**: Browse summaries in sidebar, click links to jump to code

## File Structure

```
.
├── src/                      # Extension source (TypeScript)
│   ├── extension.ts          # Main activation
│   ├── summaryPanel.ts       # WebView for viewing summaries
│   ├── summaryTreeProvider.ts# Sidebar tree view
│   └── codebaseAnalyzer.ts   # File discovery & Python orchestration
├── python/
│   ├── summarizer_tool.py    # LLM-based summary generator
│   └── requirements.txt      # Python dependencies
└── docs/codebase/            # Generated summaries (gitignored)
```

## Commands

- **LUNA: Generate Codebase Summaries** - Analyze entire workspace
- **LUNA: Show Summary Panel** - Open summary viewer

## Configuration

No configuration needed! The extension automatically:
- Excludes `node_modules`, `.venv`, `dist`, `build` folders
- Supports Python, TypeScript, JavaScript, Java, C++, Go, Rust, C#
- Uses your workspace root as the base path

## Why This Exists

AI assistants (like me!) are much more effective when we can:
- Understand codebase architecture quickly
- Navigate dependencies without re-reading everything
- Jump directly to relevant code sections
- Have context persist across sessions

This extension builds that foundation automatically.

## Development

**Build**:
```bash
npm run compile
```

**Watch mode**:
```bash
npm run watch
```

**Debug**: Press `F5` to launch Extension Development Host

## License

MIT - See [LICENSE](LICENSE)

---

Built to make AI-assisted development 10x more efficient. 🚀
