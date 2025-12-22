#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const summaryManager_js_1 = require("./summaryManager.js");
const copilotAnalyzer_js_1 = require("./copilotAnalyzer.js");
const server = new index_js_1.Server({
    name: 'luna-encyclopedia',
    version: '0.1.0',
}, {
    capabilities: {
        tools: {},
    },
});
// Initialize managers
const summaryManager = new summaryManager_js_1.SummaryManager();
const copilotAnalyzer = new copilotAnalyzer_js_1.CopilotAnalyzer();
// Define available tools
const tools = [
    {
        name: 'get_file_summary',
        description: 'Retrieve cached summary (MD + JSON) for a specific file. Returns immediately if available, null if not cached.',
        inputSchema: {
            type: 'object',
            properties: {
                workspace_path: {
                    type: 'string',
                    description: 'Absolute path to workspace root',
                },
                file_path: {
                    type: 'string',
                    description: 'Relative path to source file (e.g., "src/extension.ts")',
                },
            },
            required: ['workspace_path', 'file_path'],
        },
    },
    {
        name: 'analyze_file',
        description: 'Generate or update summary for a file using Copilot Chat API. Returns both MD and JSON. Use this when summary is missing or stale.',
        inputSchema: {
            type: 'object',
            properties: {
                workspace_path: {
                    type: 'string',
                    description: 'Absolute path to workspace root',
                },
                file_path: {
                    type: 'string',
                    description: 'Relative path to source file',
                },
                force_regenerate: {
                    type: 'boolean',
                    description: 'Force regeneration even if summary exists',
                    default: false,
                },
            },
            required: ['workspace_path', 'file_path'],
        },
    },
    {
        name: 'search_summaries',
        description: 'Search across all cached summaries for specific patterns, dependencies, or components. Useful for finding "who uses X" or "files that depend on Y".',
        inputSchema: {
            type: 'object',
            properties: {
                workspace_path: {
                    type: 'string',
                    description: 'Absolute path to workspace root',
                },
                query: {
                    type: 'string',
                    description: 'Search query (can be keyword, dependency name, component name)',
                },
                search_type: {
                    type: 'string',
                    enum: ['keyword', 'dependency', 'component', 'exports'],
                    description: 'Type of search to perform',
                    default: 'keyword',
                },
            },
            required: ['workspace_path', 'query'],
        },
    },
    {
        name: 'list_summaries',
        description: 'Get a list of all cached summaries in the workspace with basic metadata. Useful for understanding what has been analyzed.',
        inputSchema: {
            type: 'object',
            properties: {
                workspace_path: {
                    type: 'string',
                    description: 'Absolute path to workspace root',
                },
            },
            required: ['workspace_path'],
        },
    },
    {
        name: 'get_dependency_graph',
        description: 'Get dependency relationships for a file or entire workspace. Shows what a file depends on and what depends on it.',
        inputSchema: {
            type: 'object',
            properties: {
                workspace_path: {
                    type: 'string',
                    description: 'Absolute path to workspace root',
                },
                file_path: {
                    type: 'string',
                    description: 'Optional: specific file to analyze. If omitted, returns full workspace graph.',
                },
            },
            required: ['workspace_path'],
        },
    },
];
// Handle tool listing
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => ({
    tools,
}));
// Handle tool execution
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case 'get_file_summary': {
                const { workspace_path, file_path } = args;
                const summary = await summaryManager.getSummary(workspace_path, file_path);
                return {
                    content: [
                        {
                            type: 'text',
                            text: summary
                                ? JSON.stringify(summary, null, 2)
                                : 'Summary not found. Use analyze_file to generate it.',
                        },
                    ],
                };
            }
            case 'analyze_file': {
                const { workspace_path, file_path, force_regenerate } = args;
                // Check if summary exists and is fresh
                if (!force_regenerate) {
                    const existing = await summaryManager.getSummary(workspace_path, file_path);
                    if (existing) {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(existing, null, 2),
                                },
                            ],
                        };
                    }
                }
                // Generate new summary using Copilot
                const summary = await copilotAnalyzer.analyzeFile(workspace_path, file_path);
                // Save to cache
                await summaryManager.saveSummary(workspace_path, file_path, summary);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(summary, null, 2),
                        },
                    ],
                };
            }
            case 'search_summaries': {
                const { workspace_path, query, search_type } = args;
                const results = await summaryManager.searchSummaries(workspace_path, query, search_type || 'keyword');
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(results, null, 2),
                        },
                    ],
                };
            }
            case 'list_summaries': {
                const { workspace_path } = args;
                const summaries = await summaryManager.listSummaries(workspace_path);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(summaries, null, 2),
                        },
                    ],
                };
            }
            case 'get_dependency_graph': {
                const { workspace_path, file_path } = args;
                const graph = await summaryManager.getDependencyGraph(workspace_path, file_path);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(graph, null, 2),
                        },
                    ],
                };
            }
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error: ${error instanceof Error ? error.message : String(error)}`,
                },
            ],
            isError: true,
        };
    }
});
// Start server
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error('LUNA Encyclopedia MCP Server running on stdio');
}
main().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map