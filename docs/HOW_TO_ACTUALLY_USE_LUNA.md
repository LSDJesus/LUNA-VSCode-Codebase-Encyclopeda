# LUNA Quick Reference - How to Actually Use It

## ❌ Wrong Way (What You Did)
```
1. Generate summaries
2. Open .codebase/src/file.json
3. Read JSON manually
4. Search for information
```

**Problem**: Defeats the purpose! You're reading raw files like documentation.

---

## ✅ Right Way (Use MCP Tools in Copilot Chat)

### Step 1: Generate Summaries (One-Time)
```
Cmd+Shift+P → "LUNA: Initialize Workspace"
Edit .lunasummarize (exclude tests, docs, scripts)
Cmd+Shift+P → "LUNA: Generate Codebase Summaries"
```

### Step 2: Query via Copilot Agent Mode

**Open Copilot Chat** (`Ctrl+I`)  
**Enable Agent Mode** (toggle in top-right)

Now ask questions:

#### Find Data Models
```
You: "What Pydantic models are used for inter-agent communication?"

Copilot uses #mcp_lunaencyclope_search_summaries
Returns:
- StrategistBriefing (lines 18-129 in data_models.py)
- PreprocessorOutput (lines 45-89 in preprocessor.py)
- Fields: user_intent, entities, semantic_tags, etc.
```

#### Show Dependencies
```
You: "What does PreprocessorAgent depend on?"

Copilot uses #mcp_lunaencyclope_get_dependency_graph
Returns:
- StoryContextRAG (for vector search)
- DreamerAssetLibrary (for asset retrieval)
- DatabaseManager (for database connections)
```

#### Find Usage
```
You: "Which files use StrategistBriefing?"

Copilot uses #mcp_lunaencyclope_search_summaries with search_type=exports
Returns:
- lead_strategist.py (line 45)
- preprocessor.py (line 12)
- tests/test_strategist.py (line 3)
```

#### Check Architecture
```
You: "Show me the architecture of the Strategist agent"

Copilot uses #mcp_lunaencyclope_get_file_summary for lead_strategist.py
Returns complete structure with line numbers
```

---

## Key Differences

| Manual File Reading | MCP Tools (Copilot Chat) |
|---------------------|--------------------------|
| Slow (open files, search) | Instant (cached queries) |
| Manual JSON parsing | Structured responses |
| No line number links | Clickable line references |
| Static | Dynamic (ask follow-ups) |
| Miss connections | Agent discovers relationships |

---

## Real Example Comparison

### Manual Way (Slow)
```
1. Open .codebase/core/services/agents/pipeline/preprocessor.json
2. Read dependencies.internal array
3. See "story_context_rag" mentioned
4. Open .codebase/core/services/rag/story_context_rag.json
5. Read to find index_compressed_turn method
6. Note line 153
7. Open actual source file to see implementation
```

**Time**: 5-10 minutes

### MCP Way (Fast)
```
You: "Where is index_compressed_turn defined and how does Preprocessor use it?"

Copilot:
"index_compressed_turn is defined in StoryContextRAG at lines 153-178.
PreprocessorAgent calls it at line 89 to index conversation turns into the vector database."
```

**Time**: 5 seconds

---

## Common Queries You Should Be Using

```
"What are all the Pydantic models?"
"Show me the dependency graph starting from DatabaseManager"
"Which files import ChainManager?"
"Are there any TODOs in the codebase?"
"What does Strategist.execute() return?"
"Show me all files that depend on PostgresManager"
"What's the purpose of DreamerAssetLibrary?"
"Which agents use StoryContextRAG?"
```

---

## Pro Tips

1. **Always use Agent Mode** - Regular chat doesn't use MCP tools
2. **Ask follow-up questions** - Agent has full context from first query
3. **Click line number links** - Jumps to exact location in editor
4. **Use natural language** - Agent picks the right tool automatically
5. **Check SUMMARY_REPORT.md** - Shows files that were too large/failed

---

## Why This Matters

LUNA's value is **instant structured queries**, not static documentation.

Reading `.json` files manually is like:
- Using grep instead of an IDE's "Find References"
- Reading assembly instead of using a debugger
- Parsing HTML instead of using a browser

**The whole point**: Let the agent handle file reading/searching for you!

---

## Next Time

1. ✅ Generate summaries with optimized .lunasummarize
2. ❌ ~~Read .json files~~
3. ✅ Open Copilot Chat → Agent Mode
4. ✅ Ask questions naturally
5. ✅ Let MCP tools do the heavy lifting
6. ✅ Click line numbers to jump to code

**You'll go 10x faster.**
