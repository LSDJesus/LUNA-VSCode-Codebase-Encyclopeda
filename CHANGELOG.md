# Changelog

All notable changes to the LUNA Codebase Encyclopedia extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **Exclude Patterns Not Working**: Fixed critical bug where `exclude.patterns` in `.lunasummarize` were completely ignored
  - Patterns like `obj/`, `bin/`, and `**/GlobalUsings.cs` now properly exclude files
  - Simple directory names (e.g., `obj/`) now correctly match files at any depth
  - Refactored pattern matching to use direct string checks before complex glob matching
  - Reduced file count significantly by properly excluding build artifacts
  
- **apiRoutes Treated as Exclude Patterns**: Fixed bug where files in `apiRoutes` directories were excluded from summaries
  - `apiRoutes` is now properly parsed as metadata for API extraction only
  - Controllers and route files are now BOTH summarized AND flagged for API endpoint extraction
  - Added `isApiRouteFile()` method to separate API metadata from inclusion logic
  
- **YAML Parser Section Confusion**: Fixed parser bug where unrecognized sections caused following items to be misclassified
  - Parser now properly resets section context when encountering unknown top-level keys
  - Items under `apiRoutes:` no longer accidentally added to exclude patterns
  - More robust handling of future config additions

### Changed
- **Include/Exclude Logic Refactored**: Cleaner separation of concerns
  - `shouldInclude()` - Checks if file is in included directories + matches filetypes
  - `shouldExclude()` - Checks if file matches exclude patterns (independent of include)
  - `isApiRouteFile()` - Metadata flag for API extraction (doesn't affect inclusion)
  - `getApiRoutes()` - Exposes API route directories for reference generator

- **Component Map Intelligence Improved**: Now detects project boundaries properly
  - **C# Projects**: Detects `.csproj` boundaries (e.g., `src/LUNA.Diffusion.Service/` becomes separate component)
  - No longer lumps everything into generic "Src" component
  - Recognizes dotted namespace patterns (Project.Module) as project boundaries
  - Better component names from directory structure (e.g., "LUNA Diffusion Service" instead of "Src")
  - Future-ready for Node.js (package.json) and Python (__init__.py) boundary detection

## [1.1.3] - 2025-12-30

### Removed
- **Git Post-Commit Hook Command**: Removed `LUNA: Install Git Post-Commit Hook` command
  - Universal Git Commit Watcher now covers all commit sources (terminal, GitHub extension, VS Code UI, etc.)
  - Hook installation is no longer necessary
  - Cleaner, simpler user experience

### Changed
- Documentation updated to reflect universal watcher as the primary commit detection method
- Removed GitHookManager dependency from extension core

## [1.1.2] - 2025-12-30

### Added
- **Universal Git Commit Watcher**: Detects commits from ANY source
  - Terminal commits
  - GitHub VSCode extension
  - VS Code Source Control UI
  - Git GUI clients
  - Any other git tool
- Auto-detects stale summaries after any commit type
## [1.1.2] - 2025-12-30

### Added - Major Feature 🎉
- **Universal Git Commit Watcher**: Detects commits from ANY source (terminal, GitHub extension, VS Code UI, etc.)
  - Watches `.git/refs/` directory for changes instead of relying on git hooks
  - Works with terminal commits, GitHub VSCode extension, git GUI clients, and more
  - Auto-detects stale summaries after any commit
  - Shows intuitive notification: "📝 X summaries may be outdated"
  - User can click to update or dismiss
  - Silent updates - no spam notifications

### Fixed
- **Git Hook Behavior**: Clarified that git hooks only work with terminal `git commit` commands
  - Added alternative: Universal watcher catches commits from all sources
  - Documentation now explains the difference

## [1.1.1] - 2025-12-30

### Fixed
- **MCP Server Auto-Update**: Extension now automatically updates MCP server path when upgrading versions
  - Fixes issue where MCP server still pointed to old version after extension update
  - MCP server path now dynamically updates to match installed extension version
  - No manual configuration needed after updates

## [1.1.0] - 2025-12-29

### Added - Major Features 🎉
- **Code Breakdown Generator**: Revolutionary educational feature that generates line-by-line explanations of code
  - Multi-agent pipeline (Structure Analyzer → Section Explainer → Accuracy Validator → Stitcher)
  - Three verbosity levels: Beginner (full detail), Intermediate (balanced), Expert (quick overview)
  - Outputs saved as `filename.breakdown.md` with table of contents
  - Accessible via right-click context menu: "LUNA: Explain This Code"
  - Perfect for onboarding new developers or learning unfamiliar codebases
  
- **Quality Assurance Validator**: AI reviews deterministic analysis results for accuracy
  - Validates dead code detection to reduce false positives
  - Verifies complexity scores against actual code patterns
  - Reviews component categorization for architectural accuracy
  - Framework-aware (ComfyUI, Django, FastAPI, etc.)
  - Results saved to `QA_REPORT.json`
  - Configurable via `enableCopilotQA` setting (enabled by default)

### Added - Settings & Configuration
- **Breakdown Verbosity** setting: Control detail level of code explanations
- **Enable Copilot QA** setting: Toggle AI quality assurance reviews
- **Max File Size** setting: Skip files larger than specified KB limit
- All settings now properly documented in package.json with descriptions

### Improved - Python Support
- Fixed relative import resolution (`from .module` now correctly resolved)
- Better handling of Python-specific import patterns
- Framework-aware dead code detection (decorators, magic methods)
- Improved component categorization for Python projects

### Improved - Accuracy & Reliability
- Conservative line number reporting (only when highly confident)
- Enhanced Copilot prompts for better function call tracking
- Type-safe dependency extraction (handles objects and strings)
- Smart component grouping based on actual project structure (no more hardcoded categories)

### Improved - Documentation
- Complete README.md overhaul with new features
- Updated QUICK_START.md template with learning features
- Enhanced COPILOT_INSTRUCTIONS.md for AI agents
- Added comprehensive changelog

### Changed
- Removed unused import detection from Copilot prompts (handled by static analysis instead)
- Simplified `.lunasummarize` configuration (removed copilot_qa setting, moved to global settings)
- Updated extension description to highlight both encyclopedia and educational features

### Fixed
- Dependency analyzer now handles mixed dependency formats (string/object)
- Dead code analysis no longer throws `.includes()` errors on object dependencies
- Python relative imports correctly resolve to project directories
- Component map categories adapt to project language instead of assuming TypeScript/JavaScript

## [1.0.8] - 2025-12-26

### Added
- Initial MCP server integration with auto-registration
- Directory tree builder with parent directory creation
- Bidirectional dependency tracking ("used by" relationships)
- Dead code analysis
- Complexity heatmap generation
- Component architecture mapping
- Custom template support via `.luna-template.json`

### Changed
- Switched to opt-in `.lunasummarize` configuration model
- Improved file discovery and tree building logic

### Fixed
- Directory tree now correctly builds parent directories
- Static import analyzer handles workspace-relative paths

## [1.0.0] - 2025-12-20

### Added
- Initial release
- File summarization with Copilot integration
- Markdown and JSON summary generation
- Line number tracking in summaries
- MCP server for Copilot Agent Mode
- Staleness detection for incremental updates

---

[1.1.3]: https://github.com/LSDJesus/LUNA-VSCode-Codebase-Encyclopeda/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/LSDJesus/LUNA-VSCode-Codebase-Encyclopeda/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/LSDJesus/LUNA-VSCode-Codebase-Encyclopeda/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/LSDJesus/LUNA-VSCode-Codebase-Encyclopeda/compare/v1.0.8...v1.1.0
[1.0.8]: https://github.com/LSDJesus/LUNA-VSCode-Codebase-Encyclopeda/compare/v1.0.0...v1.0.8
[1.0.0]: https://github.com/LSDJesus/LUNA-VSCode-Codebase-Encyclopeda/releases/tag/v1.0.0
