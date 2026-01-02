# LUNA Codebase Encyclopedia

🚀 **Agent-First Context API** - Generate structured summaries of your codebase for instant, zero-token Copilot Agent queries, plus educational code breakdowns for learning.

## What It Does

LUNA analyzes your code and generates **two types of documentation**:

### 1. Encyclopedia Summaries (For AI Agents)
Structured summaries (Markdown + JSON) that Copilot agents can query instantly without burning tokens.

```
1. Generate summaries once → Structured MD + JSON in .codebase/
2. Open Copilot Chat (Ctrl+I)
3. Ask: "What does extension.ts do?"
4. Copilot queries summaries (instant, zero tokens!) ✨
```

### 2. Code Breakdowns (For YOU - New!)
Line-by-line educational explanations that teach you how your code works. Perfect for onboarding or learning new codebases.

```
Right-click any file → "LUNA: Explain This Code"
→ Generates detailed breakdown with explanations, examples, and gotchas
→ Adjustable verbosity (Beginner/Intermediate/Expert)
```

**What you get:**
- 📝 Human-readable markdown summaries with line numbers
- 🤖 Machine-readable JSON for AI agent queries  
- 📚 Educational code breakdowns
- 🔗 Bidirectional dependency graphs ("uses X" + "used by Y")
- 📊 Code complexity analysis + refactoring guidance
- 🧹 Dead code detection with AI verification
- 🏗️ Smart architecture component mapping
- ✅ Quality assurance reviews

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

### 4. Learn Your Code (NEW!)
```
Right-click any file → "LUNA: Explain This Code"
Choose verbosity: Beginner (full detail) / Intermediate / Expert
Get a complete educational breakdown saved as filename.breakdown.md
```

### 5. Keep Summaries Fresh
```
After committing code changes:
Command Palette → "LUNA: Update Stale Summaries"
(Only regenerates modified files - much faster!)
```

**Pro Tip**: LUNA automatically watches for git commits from ANY source (terminal, GitHub extension, VS Code UI, etc.) and prompts you to update summaries. No manual setup needed! 🌙

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

### Code Breakdowns - Educational Feature
Generate detailed, educational explanations of your code:
```
Right-click file → "LUNA: Explain This Code"
```

**Verbosity Levels:**
- **Beginner** 📚: Full code included, line-by-line explanations, analogies, diagrams, common mistakes
- **Intermediate** 📖: Key snippets, clear explanations, patterns, and gotchas
- **Expert** ⚡: Architecture, design decisions, tricky sections only

**Output:** `filename.breakdown.md` - A complete learning document with:
- Table of contents
- Sectioned explanations (imports, classes, functions)
- Code snippets with annotations
- Real-world analogies and examples
- Common mistakes and gotchas

Perfect for onboarding new developers or learning unfamiliar code!

### Quality Assurance Reviews
After fast deterministic analysis, Copilot validates the results:

**Enabled by default** - Configure in Settings → `Enable Copilot QA`

**What gets reviewed:**
- ✅ Dead code detection (reduces false positives)
- ✅ Complexity scores (validates against actual patterns)
- ✅ Component categorization (checks groupings make sense)

**Results saved to:** `.codebase/QA_REPORT.json`

**Benefits:**
- Fewer false positive "dead code" warnings
- Framework-aware (ComfyUI, Django, FastAPI, etc.)
- More accurate refactoring recommendations

### Dead Code Analysis
Find unused exports with AI verification:
```
.codebase/dead-code-analysis.json
```

### Complexity Heatmap  
Refactoring candidates with AI-validated scores (0-10):
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

## Settings

Configure LUNA in VS Code Settings → Extensions → LUNA Encyclopedia:

**Analysis Settings:**
- **Copilot Model**: Choose which model to use (default: gpt-4o - FREE)
- **Concurrent Workers**: Parallel analysis (1-20, default: 5)
- **Max File Size**: Skip files larger than this (default: 500KB)
- **Enable Copilot QA**: AI reviews deterministic analysis (default: ON) ✨

**Breakdown Settings:**
- **Breakdown Verbosity**: How detailed code explanations should be
  - Beginner: Full detail with analogies and examples
  - Intermediate: Balanced explanations (default)
  - Expert: Quick architecture overview only

**Advanced:**
- **Branch Aware Summaries**: Separate summaries per git branch
- **File Types**: Which extensions to include/exclude

## Cost

- **Free**: Uses `gpt-4o` (standard Copilot model, no premium charges)
- **Optional**: Configure different models in settings if preferred

---

## Generated Files & Analysis

LUNA generates **structured summaries AND meta-analysis files** in the `.codebase/` folder:

### File Summaries
- **`src/file.md`** - Human-readable summary (purpose, components, dependencies, line numbers)
- **`src/file.json`** - Machine-readable summary (structured for AI agent queries)
- **`src/file.breakdown.md`** - Educational code breakdown (for learning) 📚
- **`src/foldername.index.md`** - Directory index with file listings
- **`src/foldername.index.json`** - Directory index (machine-readable)

### Meta-Analysis Files
- **`complexity-heatmap.json`** - File complexity scores (0-10) with QA validation
- **`component-map.json`** - Smart architectural grouping with QA review
- **`dependency-graph.json`** - Full dependency relationships
- **`dead-code-analysis.json`** - Unused exports with false positive detection
- **`QA_REPORT.json`** - Quality assurance validation results ✨
- **`SUMMARY_REPORT.md`** - Human-readable overview of issues

## Detailed Docs

- **[Setup Guide](docs/SETUP.md)** - Installation and configuration
- **[Custom Templates](docs/CUSTOM_TEMPLATES_GUIDE.md)** - Add domain-specific fields
- **[Analysis Tools](docs/ANALYSIS_GUIDE.md)** - Dead code, complexity, architecture
- **[Architecture](docs/HYBRID_ANALYSIS.md)** - How LUNA works internally

## Project Status

LUNA is in active development. Features:
- ✅ File summarization with precise line numbers
- ✅ Educational code breakdowns
- ✅ AI quality assurance reviews
- ✅ Bidirectional dependency tracking
- ✅ Complexity heatmap for refactoring guidance
- ✅ Dead code analysis with false positive detection
- ✅ Smart architecture component mapping
- ✅ Custom templates for domain-specific analysis
- ✅ Right-click file summarization
- ✅ Universal git commit detection (any git tool)
- ✅ Python-specific improvements
- ⚡ Performance optimizations ongoing

## Recent Updates (v1.1.3)

🗑️ **Removed Redundant Git Hook** - Universal watcher handles all commit sources  
🔔 **Universal Git Commit Watcher** - Detects commits from terminal, GitHub extension, VS Code UI, etc.  
✅ **MCP Server Auto-Update** - Extension automatically updates MCP path on version changes  
📚 **Code Breakdown Generator** - Line-by-line educational explanations with 3 verbosity levels  
🔍 **Quality Assurance Validator** - AI reviews deterministic analysis for accuracy

## License

MIT
