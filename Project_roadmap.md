# Project Roadmap: VS Code Codebase Encyclopedia Extension

**Project Goal**: Create a VS Code extension that analyzes the current workspace, generates structured Markdown summaries for every file, builds a navigable dependency graph, and allows seamless linking between summaries and the actual source code for efficient AI/human code navigation.

**Target Environment**: VS Code Extension (TypeScript/JavaScript) + Python/LLM Backend for Analysis.

## Phase 0: Setup & Foundation (1-2 Days)

This phase focuses on getting the basic structure running and defining the core components.

| # | Task | Description | Success Criteria | Tech Focus |
| :--- | :--- | :--- | :--- | :--- |
| **0.1** | **VS Code Extension Boilerplate** | Scaffold a new extension project (using `yo code`). Define basic commands and a simple WebView panel. | Extension installs, displays a "Hello World" message in a side panel. | VS Code API, TypeScript |
| **0.2** | **LLM Orchestration Script (Python)** | Create a **standalone Python script** (`summarizer_tool.py`) that reads files from a specified directory and outputs the summaries (`.md` files) based on the provided template. | Script successfully generates one correct `.md` summary for a test file. | Python, LLM API Call |
| **0.3** | **API/IPC Definition** | Define the communication protocol between the Extension (client) and the Python script (server/worker). A simple HTTP endpoint or IPC mechanism. | Extension can successfully trigger the Python script and receive a file list. | Node.js/TypeScript, Python/FastAPI |
| **0.4** | **Summary View Integration** | Load the generated summary file (`docs/codebase/core/main.md`) into the extension's WebView panel. | WebView successfully renders the raw Markdown content for one file. | WebView API, Markdown Rendering Library |

## Phase 1: Core Analysis & Summary Generation (3-5 Days)

This phase focuses on automating the initial knowledge extraction.

| # | Task | Description | Success Criteria | Tech Focus |
| :--- | :--- | :--- | :--- | :--- |
| **1.1** | **Workspace File Discovery** | Update the extension to discover all relevant source files in the currently open workspace, excluding build folders (`.venv`, `node_modules`, `dist`). | The extension has an accurate, tree-structured list of all files to be summarized. | VS Code API (`workspace.findFiles`), File I/O |
| **1.2** | **Full Summary Execution** | Run the LLM process across *all* discovered files, generating all required `.md` summaries in the designated output directory (e.g., `docs/codebase/`). | All Phase 1 files from the LUNA plan are summarized and saved correctly. | Orchestration Script (Python) |
| **1.3** | **Dependency Extraction Logic** | Update the LLM prompt/parsing logic to **explicitly list all internal/external imports and method calls** in dedicated structured blocks within the `.md` file. | `.md` files contain clearly parsable blocks for "Requires" and "Calls." | Prompt Engineering, Regex/Text Parsing |
| **1.4** | **Index Generation** | Create a root `INDEX.md` or `SUMMARY_INDEX.json` file that lists every generated summary file for the frontend navigation. | Frontend can list and navigate to *any* summary file. | Python Scripting |

## Phase 2: Dependency Mapping & Graph Data (3-5 Days)

This is the core logic that turns text into a navigable graph structure.

| # | Task | Description | Success Criteria | Tech Focus |
| :--- | :--- | :--- | :--- | :--- |
| **2.1** | **Two-Way Linking Script** | Write a script to parse all generated `.md` files, extract the **"Requires"** block, and append a corresponding **"Used By"** block to the target file's summary. | Summary A now lists that it **Requires** Summary B, and Summary B now lists that it **Is Used By** Summary A. | Python Text Parsing, File Writing |
| **2.2** | **Graph Data Generation** | Create a final JSON file (e.g., `dependency_graph.json`) that defines the nodes (files) and edges (dependencies/calls) for visualization. | The JSON file contains all necessary data to render the entire codebase map. | Python Scripting (JSON output) |
| **2.3** | **Graph Visualization Integration** | In the extension's WebView, integrate a lightweight graph library (like **D3.js** or **Vis.js**) to render the `dependency_graph.json` as a force-directed graph. | The graph displays, and clicking a node highlights the corresponding summary file in the sidebar. | Vis.js/D3.js, TypeScript/WebView |

## Phase 3: Code Navigation & Polish (2-4 Days)

This phase integrates the encyclopedia with the actual IDE functionality.

| # | Task | Description | Success Criteria | Tech Focus |
| :--- | :--- | :--- | :--- | :--- |
| **3.1** | **Code Link Generation** | Modify the summary template/parsing to include a special link format (e.g., `[method_name](code:path/to/file.py#symbol=method_name)`). | Links in the `.md` output are formatted for VS Code URI handling. | Prompt Engineering, Python Scripting |
| **3.2** | **Code Navigation Handler** | Implement the logic in the extension to intercept clicks on the new `code:` URI scheme and use the VS Code API to open the file at the correct line/symbol. | Clicking the `(code)` link next to a function definition jumps the cursor directly to that function in the main VS Code editor. | VS Code API (`vscode.env.openExternal`), TypeScript |
| **3.3** | **In-Panel Search** | Add a simple search bar to the WebView to filter the visible summaries/nodes in the graph. | Searching the sidebar filters the list and highlights matching nodes on the graph. | TypeScript, WebView DOM Manipulation |
| **3.4** | **Final Polish & Readme** | Clean up the Python tool, update the extension's `README.md` with usage instructions, and ensure error handling is present. | Extension is stable, easily runnable, and has clear setup documentation. | General Refactoring |

---

### Recommended Tools & Dependencies

| Layer | Recommended Tool/Technology | Notes |
| :--- | :--- | :--- |
| **Orchestration** | Python 3.12+ | For running the LLM agent process. |
| **LLM Service** | OpenAI API, Anthropic API, or local Ollama | Use your fastest/cheapest model for summarization. |
| **Extension Language** | TypeScript | Standard for modern VS Code extensions. |
| **Graph Library** | Vis.js (Easier) or D3.js (More powerful) | For rendering the node/edge map. |
| **Documentation Output**| Standard Markdown (`.md`) | Highly compatible with LLMs and static site generators. |
| **Static Site Gen (Optional)** | MkDocs | If you decide to host the docs outside the extension, this is the easiest path. |

This roadmap should give you and your copilot a clear, actionable path to build your desired codebase encyclopedia! Good luck!