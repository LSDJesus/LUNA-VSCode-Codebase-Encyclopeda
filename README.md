# LUNA Codebase Encyclopedia

🚀 **Agent-First Context API** - Generate structured summaries of your codebase for instant, zero-token Copilot Agent queries, plus educational code breakdowns and complete API reference documentation.

## What It Does

LUNA analyzes your code and generates **three types of documentation**:

### 1. Encyclopedia Summaries (For AI Agents)
Structured summaries (Markdown + JSON) that Copilot agents can query instantly without burning tokens.

```
1. Generate summaries once → Structured MD + JSON in .codebase/
2. Open Copilot Chat (Ctrl+I)
3. Ask: "What does extension.ts do?"
4. Copilot queries summaries (instant, zero tokens!) ✨
```

### 2. API Reference (For Development Speed - NEW!)
Automatic extraction of ALL API endpoints with complete request/response schemas.

```
After generation:
Ask Copilot: "What's the endpoint for updating characters?"
→ Instantly get: path, method, request schema, response schema, auth requirements
No more grep → read → guess → grep again!
```

### 3. Code Breakdowns (For Learning)
Line-by-line educational explanations that teach you how your code works.

```
Right-click any file → "LUNA: Explain This Code"
→ Generates detailed breakdown with explanations, examples, and gotchas
→ Adjustable verbosity (Beginner/Intermediate/Expert)
```

**What you get:**
- 📝 Human-readable markdown summaries with line numbers
- 🤖 Machine-readable JSON for AI agent queries  
- 📡 **Complete API reference (endpoints, schemas, auth)** ← NEW!
- 📚 Educational code breakdowns
- 🔗 Bidirectional dependency graphs ("uses X" + "used by Y")
- 📊 Code complexity analysis + refactoring guidance
- 🧹 Dead code detection with AST-based analysis
- 🏗️ Smart architecture component mapping
- ✅ Quality assurance reviews
- 🌍 **Multi-language support (Python, TypeScript, Java, C#, Go, JavaScript)** ← NEW!
- 🔄 **Reset command** to start fresh ← NEW!
- 🤖 **Async worker agents for parallel task delegation** ← NEW in v1.1.15!

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

### 4. Query API Endpoints (NEW!)
```
Ask Copilot: "Show me all POST endpoints"
→ #get_api_reference filter_method="POST"

Ask: "What's the endpoint for updating characters?"
→ #search_endpoints query="update" search_in="description"
→ Instant: path, method, request schema, response schema, auth
```

### 5. Learn Your Code
```
Right-click any file → "LUNA: Explain This Code"
Choose verbosity: Beginner (full detail) / Intermediate / Expert
Get a complete educational breakdown saved as filename.breakdown.md
```

### 6. Keep Summaries Fresh
```
After committing code changes:
Command Palette → "LUNA: Update Stale Summaries"
(Only regenerates modified files - much faster!)
```

### 7. Reset If Needed (NEW!)
```
Command Palette → "LUNA: Reset .codebase Directory"
→ Safely delete all summaries and start fresh
```

**Pro Tip**: LUNA automatically watches for git commits from ANY source (terminal, GitHub extension, VS Code UI, etc.) and prompts you to update summaries. No manual setup needed! 🌙

## 🤖 Async Worker Agent System (v1.1.21) - FULLY AUTONOMOUS & PRODUCTION-READY!

LUNA now features **fully autonomous worker agents** with complete tool access and proven reliability in production.

**How it works:**
- Main AI agent (like Luna in Copilot Chat) spawns background workers
- **Workers have FULL tool access** - they can read files, write files, search code, and use ANY VS Code tool
- Workers run multi-turn conversations (up to 20 turns) to complete complex tasks autonomously
- Workers see results of their actions and can adapt, retry, or fix issues
- **File creation works flawlessly** via intelligent JSON output parsing
- All while using **FREE models** (gpt-4o, gpt-4.1, raptor-mini)!

**What Workers Can Do (Autonomously!):**
- 🔍 **Read files** - Workers can examine any code they need
- ✍️ **Write files** - Intelligent JSON parsing with automatic escape sequence handling
- 🔎 **Search codebase** - Find patterns, dependencies, usage examples
- 🛠️ **Multi-step workflows** - Read → Analyze → Create → Verify → Document
- 🔄 **Error recovery** - Workers see tool results and can retry/fix issues
- 📊 **Query LUNA summaries** - Workers can use all LUNA tools for context
- 🚀 **Parallel task delegation** - Spawn multiple workers for massive speedup

**Key Benefits:**
- ⚡ **True autonomy** - Workers complete complex tasks without supervision
- 💰 **Zero cost** - FREE models (gpt-4o) with full agent capabilities
- ✅ **Production-proven** - Tested and working with complex workflows
- 🔄 **Multi-turn reasoning** - Workers can make 20+ sequential decisions
- 📝 **Smart file creation** - JSON blocks with automatic newline/escape handling
- ⚙️ **Automatic** - No setup needed, works out of the box

**How File Creation Works (The Secret Sauce):**
Worker returns this in their response:
```json
{
  "action": "create_file",
  "path": "docs/output.md",
  "content": "# Title\n\nContent here with \\n for newlines"
}
```

LUNA automatically:
1. Detects the JSON block (```json...```)
2. Parses the content field
3. Unescapes `\n`, `\t`, `\r`, `\\` sequences
4. Creates file at the specified path
5. Logs completion with full path

**Result:** File created perfectly formatted ✨

**Example: Autonomous Architecture Documentation**
```javascript
// In Copilot Chat (Agent Mode):
const task = await spawn_worker_agent({
    task_type: 'documentation',
    prompt: `Create architecture summary:
    1. Call mcp_lunaencyclope_get_component_map
    2. Format as markdown
    3. Return JSON block for file creation`,
    model: 'gpt-4o', // FREE!
    auto_execute: true
});

// Worker autonomously:
// - Calls get_component_map (tool call)
// - Formats data into markdown
// - Returns JSON block with markdown content
// - Extension parses and creates docs/ARCHITECTURE_SUMMARY.md
// 
// Total cost: $0 | Total time: 10-30 seconds | Result: Professional documentation
```

## MCP Tools for AI Agents

LUNA provides these tools for Copilot Agent Mode:

**File & Code Tools:**
- `#get_file_summary` - Get cached summary for a specific file
- `#search_summaries` - Search across all summaries (keywords, dependencies, components)
- `#list_summaries` - List all cached summaries
- `#get_dependency_graph` - Get bidirectional dependency relationships

**API Reference Tools:**
- `#get_api_reference` - Get all endpoints (filter by path/method/tag)
- `#search_endpoints` - Search endpoints (by path, description, schema types)

**Meta-Analysis Tools (NEW!):**
- `#get_complexity_heatmap` - Get complexity scores and refactoring candidates (0-10 scale)
- `#get_dead_code` - Get unused exports and dead code analysis
- `#get_component_map` - Get architectural component grouping
- `#get_qa_report` - Get quality assurance validation results

**Maintenance Tools:**
- `#list_stale_summaries` - Check which files need re-summarization
- `#analyze_file` - Generate/update summary for specific file

**Worker Agent Tools (NEW in v1.1.15!):**
- `#spawn_worker_agent` - Delegate tasks to background AI workers (FREE models!)
- `#check_worker_status` - Poll for worker task completion
- `#wait_for_workers` - Block until workers finish

**Example Queries:**
```
"Show me the most complex files"
→ #get_complexity_heatmap min_score=7

"What are the unused exports?"
→ #get_dead_code

"What's the architecture?"
→ #get_component_map

"Show me all POST endpoints"
→ #get_api_reference filter_method="POST"
```

**Example Queries:**
```
"Show me all API endpoints that return Character objects"
→ Uses #search_endpoints query="Character" search_in="response_schema"

"Which files use the StaticImportAnalyzer?"
→ Uses #search_summaries query="StaticImportAnalyzer" search_type="dependency"

"What are the most complex files?"
→ Reads complexity-heatmap.json and shows top files
```

## Agent Instructions (Recommended)

To maximize accuracy, teach Copilot to prioritize LUNA summaries. Add this to your system prompt or create a custom agent:

```markdown
# LUNA-First Protocol

When answering questions about code:

1. **ALWAYS check LUNA summaries first** before reading source files
   - Use #search_summaries to find relevant files
   - Use #get_file_summary for detailed analysis
   - Use #get_dependency_graph for relationships
   - **Use #get_api_reference for API questions** ← NEW!
   - **Use #search_endpoints to find specific endpoints** ← NEW!

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
   - 📡 **Complete API documentation at your fingertips** ← NEW!

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

LUNA is **production-ready** with all major features implemented and tested:

**Core Features:**
- ✅ File summarization with precise line numbers
- ✅ Educational code breakdowns (3 verbosity levels)
- ✅ AI quality assurance reviews (reduces false positives)
- ✅ Bidirectional dependency tracking
- ✅ Complexity heatmap for refactoring guidance
- ✅ Dead code analysis with false positive detection
- ✅ Smart architecture component mapping
- ✅ Custom templates for domain-specific analysis
- ✅ Right-click file summarization
- ✅ Universal git commit detection (any git tool)
- ✅ Python-specific improvements

**Worker Agent System (v1.1.21):**
- ✅ Fully autonomous worker agents
- ✅ Multi-turn tool-calling conversations (20+ turns)
- ✅ File creation via intelligent JSON parsing
- ✅ Automatic escape sequence handling (`\n`, `\t`, etc.)
- ✅ Parallel task delegation
- ✅ Complete LUNA tool access
- ✅ Complete VS Code tool access (read, write, search, etc.)
- ✅ FREE model support (gpt-4o, gpt-4.1, raptor-mini)
- ✅ Production-tested and proven reliable

**MCP Server Integration:**
- ✅ MCP server auto-registers on first activation
- ✅ All LUNA analysis tools exposed as MCP tools
- ✅ Full Copilot Agent Mode integration
- ✅ Instant cached queries (zero tokens for summaries)

## Recent Updates (v1.1.21)

🤖 **Worker Agent System - PRODUCTION READY** - Fully autonomous agents with complete tool access, multi-turn conversations, and intelligent file creation  
📝 **Smart File Creation** - JSON-based output with automatic escape sequence handling (`\n`, `\t`, `\r`, `\\`)  
🔧 **Tool Calling Infrastructure** - Discovered and mapped all VS Code Language Model API tools (copilot_* prefix)  
⚙️ **Multi-turn Tool Loop** - Workers can make 20+ sequential decisions, see results, and adapt  
💰 **Parallel Task Delegation** - Spawn multiple workers for massive speedup with FREE models  
✅ **Production-Tested** - Worker system battle-tested with complex documentation and analysis tasks

## License

MIT
