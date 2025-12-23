# .codebase Directory

This directory contains LUNA-generated summaries and configuration for your project.

## ⚠️ First Time Setup

1. **Review .lunasummarize** - The ONLY file you should customize
2. **Run "LUNA: Generate Codebase Summaries"** - Populates this directory
3. **Check SUMMARY_REPORT.md** - Review any errors or skipped files
4. **Use Copilot Agent Mode** - Ask questions about your code

**⚠️ Don't edit**: .md and .json files regenerate on every update!

## For AI Assistants

This directory contains structured summaries optimized for zero-token agent queries.
See **LUNA_INSTRUCTIONS.md** for MCP tool usage patterns and query guidelines.

## After Generation Completes

You'll see:
- ✅ **file.md** - Human-readable summaries
- ✅ **file.json** - Machine-readable data for MCP tools
- ✅ **INDEX.md** - Directory navigation
- ✅ **SUMMARY_REPORT.md** - Generation results and errors

Next steps:
1. Review SUMMARY_REPORT.md for any issues
2. Open Copilot Chat → Toggle Agent Mode (top-right)
3. Ask: "What's the architecture of this project?"

## Files

- **LUNA_INSTRUCTIONS.md** - Complete guide for using LUNA
- **.lunasummarize** - Configuration file (customize this before generating!)
- **LUNA_GUIDE.md** - Auto-generated guide specific to your project
- **INDEX.md** - Navigation index for all summaries
- **src/file.md** - Human-readable summary for each source file
- **src/file.json** - Machine-readable summary for each source file
- **src/INDEX.md** - Directory indexes

## Quick Start

1. Review and customize **.lunasummarize** to control what files are analyzed
2. Run "LUNA: Generate Codebase Summaries" to populate this directory
3. Open Copilot Chat in Agent Mode and ask about your code
4. Run "LUNA: Update Stale Summaries" after making changes

## How to Use

See LUNA_INSTRUCTIONS.md for complete documentation.

## What Not to Edit

- **.lunasummarize** - You can edit this before generation
- **LUNA_GUIDE.md** - Auto-generated, will be overwritten
- All .md and .json files - Auto-generated, will be overwritten on updates

The only file you should customize is **.lunasummarize** before running summaries!
