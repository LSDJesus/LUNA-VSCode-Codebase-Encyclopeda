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

1. Read .codebase/COPILOT_INSTRUCTIONS.md completely to understand how LUNA works
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

**Code Understanding:**
- "What's the architecture of this project?"
- "Which files handle user authentication?"
- "Show me the dependency graph for [filename]"
- "Are any summaries out of date?"
- "What are the most complex files?"

**API Queries (NEW!):**
- "Show me all POST endpoints"
- "What's the endpoint for updating characters?"
- "Which endpoints require authentication?"
- "What's the request schema for /api/users?"

### Try the NEW Learning Features:

- Right-click any file → **"LUNA: Explain This Code"**
- Choose verbosity level in Settings (Beginner/Intermediate/Expert)
- Get detailed educational breakdowns saved as `.breakdown.md` files

### Need to Start Over? (NEW!)

- Command Palette → **"LUNA: Reset .codebase Directory"**
- Safely deletes all summaries and allows fresh start

---

## Need Help?

- Review `.codebase/COPILOT_INSTRUCTIONS.md` for complete documentation
- Edit `.codebase/.lunasummarize` to customize what gets analyzed
- Run **"LUNA: Update Stale Summaries"** after making code changes
- Configure settings: Extensions → LUNA Encyclopedia
  - Enable/disable Copilot QA reviews
  - Set breakdown verbosity level
  - Adjust concurrent workers for speed

---

**Pro Tip**: Keep summaries fresh by running "Update Stale Summaries" after each coding session. It only regenerates changed files!

**Learning Tip**: Use "Explain This Code" on unfamiliar files to get line-by-line educational breakdowns - perfect for onboarding!
