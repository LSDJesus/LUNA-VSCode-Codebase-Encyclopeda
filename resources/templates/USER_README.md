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
See **COPILOT_INSTRUCTIONS.md** for MCP tool usage patterns and query guidelines.

## After Generation Completes

You'll see:
- ✅ **file.md** - Human-readable summaries
- ✅ **file.json** - Machine-readable data for MCP tools
- ✅ **api-reference.json** - Complete API endpoint documentation (NEW!)
- ✅ **INDEX.md** - Directory navigation
- ✅ **SUMMARY_REPORT.md** - Generation results and errors

Next steps:
1. Review SUMMARY_REPORT.md for any issues
2. Open Copilot Chat → Toggle Agent Mode (top-right)
3. Ask: "What's the architecture of this project?"
4. Ask: "Show me all POST endpoints" (if you have an API)

## Files

- **COPILOT_INSTRUCTIONS.md** - Complete guide for using LUNA
- **.lunasummarize** - Configuration file (customize this before generating!)
- **QUICK_START.md** - Quick reference guide
- **INDEX.md** - Navigation index for all summaries
- **api-reference.json** - Complete API documentation (NEW!)
- **dead-code-analysis.json** - Unused exports analysis
- **component-map.json** - Architecture groupings
- **complexity-heatmap.json** - Refactoring candidates
- **dependency-graph.json** - Full relationship map
- **src/file.md** - Human-readable summary for each source file
- **src/file.json** - Machine-readable summary for each source file
- **src/INDEX.md** - Directory indexes

## Quick Start

1. Review and customize **.lunasummarize** to control what files are analyzed
2. Run "LUNA: Generate Codebase Summaries" to populate this directory
3. Open Copilot Chat in Agent Mode and ask about your code
4. Use #get_api_reference to see all API endpoints (if applicable)
5. Run "LUNA: Update Stale Summaries" after making changes

## How to Use

See COPILOT_INSTRUCTIONS.md for complete documentation.

## What Not to Edit

- **QUICK_START.md** - Auto-generated, will be overwritten
- **api-reference.json** - Auto-generated, will be overwritten (NEW!)
- **dead-code-analysis.json** - Auto-generated, will be overwritten
- **component-map.json** - Auto-generated, will be overwritten
- **complexity-heatmap.json** - Auto-generated, will be overwritten
- All `.md` and `.json` file summaries - Auto-generated, will be overwritten on updates

## What You CAN Edit

- **`.lunasummarize`** - Configure which files to analyze (file types, exclusions)
- **`.luna-template.json`** - Add custom fields to all summaries (power user feature)
