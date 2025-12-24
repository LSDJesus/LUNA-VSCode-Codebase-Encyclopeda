# 🚀 LUNA Quick Start

Welcome to LUNA! Follow these 3 simple steps to get your codebase encyclopedia up and running.

---

## Step 1: Add .codebase to Copilot Chat

1. Open **Copilot Chat** (Ctrl+I / Cmd+I)
2. Toggle **Agent Mode** (switch in top-right corner)
3. Click the **📎 (attach)** button
4. Select **Add Context** → **Attach Folder**
5. Choose the `.codebase` folder in your workspace

---

## Step 2: Ask Copilot Agent to Configure LUNA

Copy and paste this prompt into Copilot Chat (make sure you're in Agent Mode):

```
@workspace YOU MUST EDIT the .lunasummarize file directly. Do NOT just suggest changes in chat - you must actually edit the file.

Follow these steps carefully:

1. Read .codebase/LUNA_INSTRUCTIONS.md completely to understand how LUNA works
2. Analyze the entire project structure by exploring the workspace:
   - What programming languages are used?
   - What are ALL the source file extensions? (don't miss any!)
   - Are there multiple languages? (TypeScript + Python? JavaScript + Go?)
3. Identify directories to EXCLUDE (node_modules, build outputs, .git, etc.)
4. Identify files to EXCLUDE (tests, generated code, lock files, etc.)
5. DIRECTLY EDIT .codebase/.lunasummarize with your configuration:
   - includeExtensions: List EVERY source code file type you found
   - excludePatterns: Add project-specific directories to skip
   - excludeFiles: Add project-specific temp/generated/config files
6. SHOW me the edited .lunasummarize file in the chat to verify your changes were saved
7. Reply "CONFIGURATION COMPLETE" when done

Remember: You must EDIT the file, not just describe what should be edited. I will run the summary generation immediately after.
```

**Important**: You MUST see the edited file contents in the chat before proceeding to the next step.

---

## Step 3: Generate Summaries

After Copilot Agent confirms the configuration is ready:

1. Press **Ctrl+Shift+P** (Cmd+Shift+P on Mac)
2. Type: **"LUNA: Generate Codebase Summaries"**
3. Press Enter

LUNA will analyze your codebase (this may take a few minutes for large projects).

---

## What Happens Next?

- ✅ Summaries are generated in `.codebase/`
- ✅ MCP server is already registered
- ✅ Copilot Agent Mode can now query your code instantly!

### Try These Queries in Agent Mode:

- "What's the architecture of this project?"
- "Which files handle user authentication?"
- "Show me the dependency graph for [filename]"
- "Are any summaries out of date?"

---

## Need Help?

- Review `.codebase/LUNA_INSTRUCTIONS.md` for complete documentation
- Edit `.codebase/.lunasummarize` to customize what gets analyzed
- Run **"LUNA: Update Stale Summaries"** after making code changes

---

**Pro Tip**: Keep summaries fresh by running "Update Stale Summaries" after each coding session. It only regenerates changed files!
