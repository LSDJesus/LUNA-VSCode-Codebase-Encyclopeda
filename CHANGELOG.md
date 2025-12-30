# Changelog

All notable changes to the LUNA Codebase Encyclopedia extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- Enhanced LUNA_INSTRUCTIONS.md for AI agents
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
- Git post-commit hook support
- Staleness detection for incremental updates

---

[1.1.0]: https://github.com/LSDJesus/LUNA-VSCode-Codebase-Encyclopeda/compare/v1.0.8...v1.1.0
[1.0.8]: https://github.com/LSDJesus/LUNA-VSCode-Codebase-Encyclopeda/compare/v1.0.0...v1.0.8
[1.0.0]: https://github.com/LSDJesus/LUNA-VSCode-Codebase-Encyclopeda/releases/tag/v1.0.0
