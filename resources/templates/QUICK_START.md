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

Copy and paste this prompt into Copilot Chat:

```
@workspace I need you to help configure LUNA for this project. Please:

1. Read the README.md and LUNA_INSTRUCTIONS.md in the .codebase directory
2. Analyze this project's structure and file types
3. Edit the .lunasummarize configuration file to match this project:
   - Set the correct file extensions (includeExtensions)
   - Add any project-specific directories to exclude
   - Adjust settings based on the project type

When you're done configuring, let me know and I'll run the summary generation.
```

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
