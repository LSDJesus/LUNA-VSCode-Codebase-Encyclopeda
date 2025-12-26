# LUNA Codebase Encyclopedia

🚀 **Agent-First Context API** - Generate structured summaries of your codebase for instant, zero-token Copilot Agent queries.

## What It Does

LUNA analyzes your code and generates **structured summaries** (Markdown + JSON) that Copilot agents can query instantly without burning tokens.

```
1. Generate summaries once → Structured MD + JSON in .codebase/
2. Open Copilot Chat (Ctrl+I)
3. Ask: "What does extension.ts do?"
4. Copilot queries summaries (instant, zero tokens!) ✨
```

**What you get:**
- 📝 Human-readable markdown summaries with line numbers
- 🤖 Machine-readable JSON for AI agent queries  
- 🔗 Bidirectional dependency graphs ("uses X" + "used by Y")
- 📊 Code complexity analysis + refactoring guidance
- 🧹 Dead code detection
- 🏗️ Architecture component mapping

## Quick Start

### 1. Initialize
```
Command Palette (Ctrl+Shift+P) → "LUNA: Initialize Workspace"
```

### 2. Generate Summaries
```
"LUNA: Generate Codebase Summaries"
(takes 2-10 minutes depending on project size)
```

### 3. Query with Copilot
```
Open Copilot Chat (Ctrl+I) → Switch to Agent Mode
Ask: "What's the architecture?" or "Which files are most complex?"
Copilot instantly answers from your summaries
```

### 4. Keep Summaries Fresh
```
After committing code changes:
Command Palette → "LUNA: Update Stale Summaries"
(Only regenerates modified files - much faster!)
```

**Pro Tip**: Run `LUNA: Install Git Post-Commit Hook` to get automatic reminders in your terminal whenever you commit changes without updating your summaries! 🌙

## Agent Instructions (Recommended)

To maximize accuracy, teach Copilot to prioritize LUNA summaries. Add this to your system prompt or create a custom agent:

```markdown
# LUNA-First Protocol

When answering questions about code:

1. **ALWAYS check LUNA summaries first** before reading source files
   - Use #search_summaries to find relevant files
   - Use #get_file_summary for detailed analysis
   - Use #get_dependency_graph for relationships

2. **Only read source code** for:
   - Critical security/business logic verification
   - Implementation details not in summary
   - Debugging specific issues

3. **Self-Maintenance**:
   - If you perform a significant refactor or notice a summary is stale, **suggest that the user run the "LUNA: Summarize File" command** to update the encyclopedia.
   - This keeps the user in the loop and ensures the encyclopedia remains a source of truth.

4. **Benefits**:
   - ⚡ Instant answers (summaries are cached)
   - 💰 Zero token waste (no re-reading files)
   - 🎯 Focus on higher-level architecture
   - 🔄 Always up-to-date (summaries track git history)

This protocol maximizes efficiency and accuracy.
```

**How to use**:
- Create a file: `.github/copilot-instructions.md` and paste the protocol there (VS Code workspace standard!)
- Or create a custom Copilot agent with these instructions
- Or add to your personal system prompt
- Share with your team for consistent behavior

**Pro tip**: After setup, ask Copilot "Are my summaries up to date?" to see LUNA in action! 🎯

## Advanced Features

### Dead Code Analysis
Find unused exports:
```
.codebase/dead-code-analysis.json
```

### Complexity Heatmap  
Refactoring candidates (scores 0-10):
```
.codebase/complexity-heatmap.json
```
- 🔴 8-10: Needs refactoring
- ⚠️ 6-7: Monitor quality
- ✅ 0-5: Good

### Custom Templates (Power User)
Add domain-specific fields to summaries:
```json
{
  "template": {
    "securityConsiderations": "Note security issues",
    "vibeCheck": "3 emojis describing code energy"
  }
}
```
Copy to `.codebase/.luna-template.json` to enable.

## Installation

1. Install from VS Code Marketplace
2. MCP server auto-registers on first activation ✅
3. No manual configuration needed!

## Cost

- **Free**: Uses `gpt-4o` (standard Copilot model, no premium charges)
- **Optional**: Configure different models in settings if preferred

---

## Generated Files & Analysis

LUNA generates **structured summaries AND meta-analysis files** in the `.codebase/` folder:

### File Summaries
- **`src/file.md`** - Human-readable summary (purpose, components, dependencies, line numbers)
- **`src/file.json`** - Machine-readable summary (structured for AI agent queries)
- **`src/foldername.index.md`** - Directory index with file listings
- **`src/foldername.index.json`** - Directory index (machine-readable)
## Detailed Docs

- **[Setup Guide](docs/SETUP.md)** - Installation and configuration
- **[Custom Templates](docs/CUSTOM_TEMPLATES_GUIDE.md)** - Add domain-specific fields
- **[Analysis Tools](docs/ANALYSIS_GUIDE.md)** - Dead code, complexity, architecture
- **[Architecture](docs/HYBRID_ANALYSIS.md)** - How LUNA works internally

## Project Status

LUNA is in active development. Features:
- ✅ File summarization with precise line numbers
- ✅ Bidirectional dependency tracking
- ✅ Complexity heatmap for refactoring guidance
- ✅ Dead code analysis
- ✅ Architecture component mapping
- ✅ Custom templates for domain-specific analysis
- ✅ Right-click file summarization
- ⚡ Performance optimizations in progress

## License

MIT