#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { SummaryManager } from './summaryManager.js';
import { CopilotAnalyzer } from './copilotAnalyzer.js';
import { StalenessChecker } from './stalenessChecker.js';
import { LRUCache, CacheKeyGenerator } from './lruCache.js';

const server = new Server(
  {
    name: 'luna-encyclopedia',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize managers
const summaryManager = new SummaryManager();
const copilotAnalyzer = new CopilotAnalyzer();

// Extension bridge configuration (HTTP server running in VS Code extension)
// Port is dynamically assigned and stored in a file by the extension
let extensionBridgePort: number | null = null;

// Helper to call extension HTTP bridge
async function callExtensionBridge(endpoint: string, method: 'GET' | 'POST', body?: any): Promise<any> {
  if (!extensionBridgePort) {
    // Try to load the port from the extension's config file
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    
    const bridgeConfigPath = path.join(os.homedir(), '.luna-bridge-port');
    
    try {
      const portStr = fs.readFileSync(bridgeConfigPath, 'utf8').trim();
      extensionBridgePort = parseInt(portStr, 10);
    } catch (error) {
      throw new Error('Extension bridge not available. Make sure LUNA extension is running in VS Code.');
    }
  }

  const url = `http://127.0.0.1:${extensionBridgePort}${endpoint}`;
  
  const options: any = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    throw new Error(`Bridge call failed: ${response.statusText}`);
  }

  return await response.json();
}


// Initialize caches (100 entries each, auto-LRU)
const fileSummaryCache = new LRUCache<string, any>(100);
const searchResultsCache = new LRUCache<string, any>(100);

// Define available tools
const tools: Tool[] = [
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
    name: 'list_stale_summaries',
    description: 'Check which summaries are out-of-date based on git history. Returns files that have been modified since their summaries were generated.',
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
  {
    name: 'get_api_reference',
    description: 'Get complete API reference with all endpoints, request/response schemas, authentication, etc. Instantly know: path, method, request body fields, response fields, auth requirements.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_path: {
          type: 'string',
          description: 'Absolute path to workspace root',
        },
        filter_path: {
          type: 'string',
          description: 'Optional: filter by path pattern (e.g., "/api/characters")',
        },
        filter_method: {
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
          description: 'Optional: filter by HTTP method',
        },
        filter_tag: {
          type: 'string',
          description: 'Optional: filter by tag (e.g., "characters", "auth")',
        },
      },
      required: ['workspace_path'],
    },
  },
  {
    name: 'search_endpoints',
    description: 'Search API endpoints by pattern, description, or schema fields. Find: "endpoints that return User objects", "POST endpoints with file uploads", "authenticated endpoints".',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_path: {
          type: 'string',
          description: 'Absolute path to workspace root',
        },
        query: {
          type: 'string',
          description: 'Search query (path pattern, response type, description keyword)',
        },
        search_in: {
          type: 'string',
          enum: ['all', 'path', 'description', 'response_schema', 'request_schema'],
          description: 'Where to search',
          default: 'all',
        },
      },
      required: ['workspace_path', 'query'],
    },
  },
  {
    name: 'get_complexity_heatmap',
    description: 'Get code complexity scores and refactoring candidates. Returns files ranked by complexity (0-10 scale).',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_path: {
          type: 'string',
          description: 'Absolute path to workspace root',
        },
        min_score: {
          type: 'number',
          description: 'Optional: filter files with score >= min_score (0-10)',
          default: 0,
        },
      },
      required: ['workspace_path'],
    },
  },
  {
    name: 'get_dead_code',
    description: 'Get unused exports and dead code analysis results.',
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
    name: 'get_component_map',
    description: 'Get architectural component grouping and file organization.',
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
    name: 'spawn_worker_agent',
    description: 'Spawn an async AI worker to handle a subtask (documentation, analysis, testing, etc.). Worker runs in Agent Mode with full tool access. Returns task ID immediately. Use this to parallelize grunt work and speed up complex multi-step requests. Workers use cheaper models (Haiku @ 0.33x or free models) for cost optimization.',
    inputSchema: {
      type: 'object',
      properties: {
        task_type: {
          type: 'string',
          enum: ['documentation', 'analysis', 'testing', 'refactoring', 'research', 'other'],
          description: 'Type of work: documentation, analysis, testing, refactoring, research, or other',
        },
        prompt: {
          type: 'string',
          description: 'Detailed instructions for the worker agent. Be specific about expected output format and any files to create/edit.',
        },
        context_files: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of file paths (relative to workspace) the worker needs access to. Files will be read and injected into context.',
        },
        model: {
          type: 'string',
          enum: ['gpt-4o', 'gpt-4.1', 'gpt-5-mini', 'raptor-mini', 'claude-3.5-haiku', 'o1-preview', 'o1-mini'],
          description: 'Copilot model to use. Recommended: "gpt-4o" or "gpt-4.1" (FREE), "claude-3.5-haiku" (0.33x cost). Default from settings.',
        },
        output_file: {
          type: 'string',
          description: 'Optional: File path (relative to workspace) to write worker results to (e.g., "docs/ARCHITECTURE.md"). Worker will create/update this file.',
        },
        auto_execute: {
          type: 'boolean',
          description: 'Allow worker to autonomously create/edit files. If false, worker returns suggestions only. Default: true',
          default: true,
        },
      },
      required: ['task_type', 'prompt'],
    },
  },
  {
    name: 'check_worker_status',
    description: 'Check status of background worker agent(s). Returns current state, progress, and results if completed. Use this to poll for completion without blocking.',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'Specific task ID to check. If omitted, returns status of all workers.',
        },
      },
    },
  },
  {
    name: 'wait_for_workers',
    description: 'Block until specified worker(s) complete. Use when you need results before proceeding with next steps. Returns completed tasks with full results.',
    inputSchema: {
      type: 'object',
      properties: {
        task_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Task IDs to wait for. If omitted, waits for ALL active workers.',
        },
        timeout_seconds: {
          type: 'number',
          description: 'Max wait time in seconds. Returns partial results if timeout reached. Default: 60',
          default: 60,
        },
      },
    },
  },
  {
    name: 'get_qa_report',
    description: 'Get quality assurance validation results for analysis accuracy.',
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
];

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_file_summary': {
        const { workspace_path, file_path } = args as {
          workspace_path: string;
          file_path: string;
        };
        
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
        const { workspace_path, file_path, force_regenerate } = args as {
          workspace_path: string;
          file_path: string;
          force_regenerate?: boolean;
        };
        
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
        
        // Invalidate related caches
        const summaryKey = CacheKeyGenerator.fileSummaryKey(workspace_path, file_path);
        fileSummaryCache.clear(); // Clear all summaries (conservative, ensures freshness)
        searchResultsCache.clear(); // Clear all searches (dependency graph changed)
        
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
        const { workspace_path, query, search_type } = args as {
          workspace_path: string;
          query: string;
          search_type?: string;
        };
        
        // Check cache first
        const cacheKey = CacheKeyGenerator.searchKey(workspace_path, query, search_type || 'keyword');
        const cachedResults = searchResultsCache.get(cacheKey);
        if (cachedResults) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(cachedResults, null, 2),
              },
            ],
          };
        }
        
        // Perform search
        const results = await summaryManager.searchSummaries(
          workspace_path,
          query,
          search_type || 'keyword'
        );
        
        // Cache results
        searchResultsCache.set(cacheKey, results);
        
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
        const { workspace_path } = args as { workspace_path: string };
        
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

      case 'list_stale_summaries': {
        const { workspace_path } = args as { workspace_path: string };
        
        const staleFiles = StalenessChecker.getStaleFiles(workspace_path);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                total_stale: staleFiles.length,
                stale_files: staleFiles
              }, null, 2),
            },
          ],
        };
      }

      case 'get_api_reference': {
        const { workspace_path, filter_path, filter_method, filter_tag } = args as {
          workspace_path: string;
          filter_path?: string;
          filter_method?: string;
          filter_tag?: string;
        };
        
        const apiRef = summaryManager.getAPIReference(workspace_path);
        if (!apiRef) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: 'API reference not found. Run "LUNA: Generate Codebase Summaries" first.'
                }, null, 2),
              },
            ],
          };
        }

        // Apply filters
        let endpoints = apiRef.endpoints;
        
        if (filter_path) {
          endpoints = endpoints.filter((ep: any) => 
            ep.path.toLowerCase().includes(filter_path.toLowerCase())
          );
        }
        
        if (filter_method) {
          endpoints = endpoints.filter((ep: any) => 
            ep.method.toUpperCase() === filter_method.toUpperCase()
          );
        }
        
        if (filter_tag) {
          endpoints = endpoints.filter((ep: any) => 
            ep.tags?.some((tag: string) => tag.toLowerCase() === filter_tag.toLowerCase())
          );
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                total_endpoints: endpoints.length,
                frameworks: apiRef.frameworks,
                endpoints: endpoints
              }, null, 2),
            },
          ],
        };
      }

      case 'search_endpoints': {
        const { workspace_path, query, search_in } = args as {
          workspace_path: string;
          query: string;
          search_in?: string;
        };
        
        const apiRef = summaryManager.getAPIReference(workspace_path);
        if (!apiRef) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: 'API reference not found. Run "LUNA: Generate Codebase Summaries" first.'
                }, null, 2),
              },
            ],
          };
        }

        const searchTarget = search_in || 'all';
        const queryLower = query.toLowerCase();
        
        const results = apiRef.endpoints.filter((ep: any) => {
          if (searchTarget === 'all') {
            return (
              ep.path?.toLowerCase().includes(queryLower) ||
              ep.description?.toLowerCase().includes(queryLower) ||
              ep.handler?.toLowerCase().includes(queryLower) ||
              ep.responseSchema?.type?.toLowerCase().includes(queryLower) ||
              ep.requestSchema?.type?.toLowerCase().includes(queryLower)
            );
          }
          
          if (searchTarget === 'path') {
            return ep.path.toLowerCase().includes(queryLower);
          }
          
          if (searchTarget === 'description') {
            return ep.description?.toLowerCase().includes(queryLower) || false;
          }
          
          if (searchTarget === 'response_schema') {
            return ep.responseSchema?.type.toLowerCase().includes(queryLower) || false;
          }
          
          if (searchTarget === 'request_schema') {
            return ep.requestSchema?.type?.toLowerCase().includes(queryLower) || false;
          }
          
          return false;
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                total_results: results.length,
                query,
                search_in: searchTarget,
                endpoints: results
              }, null, 2),
            },
          ],
        };
      }

      case 'get_dependency_graph': {
        const { workspace_path, file_path } = args as {
          workspace_path: string;
          file_path?: string;
        };

        // Load the actual dependency-graph.json file if no specific file requested
        if (!file_path) {
          const graph = summaryManager.getDependencyGraphFile(workspace_path);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(graph, null, 2),
              },
            ],
          };
        }

        // If specific file requested, compute filtered graph
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

      case 'get_complexity_heatmap': {
        const { workspace_path, min_score } = args as {
          workspace_path: string;
          min_score?: number;
        };
        
        const heatmap = summaryManager.getComplexityHeatmap(workspace_path);
        
        if (!heatmap) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: 'Complexity heatmap not found. Run "LUNA: Generate Codebase Summaries" first.'
                }, null, 2),
              },
            ],
          };
        }
        
        // Filter by min_score if provided
        if (min_score !== undefined && min_score > 0 && heatmap.complexity) {
          heatmap.complexity = heatmap.complexity.filter((item: any) => item.totalScore >= min_score);
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(heatmap, null, 2),
            },
          ],
        };
      }

      case 'get_dead_code': {
        const { workspace_path } = args as {
          workspace_path: string;
        };
        
        const deadCode = summaryManager.getDeadCodeAnalysis(workspace_path);
        
        if (!deadCode) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: 'Dead code analysis not found. Run "LUNA: Generate Codebase Summaries" first.'
                }, null, 2),
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(deadCode, null, 2),
            },
          ],
        };
      }

      case 'spawn_worker_agent': {
        const { task_type, prompt, context_files, model, output_file, auto_execute } = args as {
          task_type: string;
          prompt: string;
          context_files?: string[];
          model?: string;
          output_file?: string;
          auto_execute?: boolean;
        };
        
        // Call extension bridge to spawn worker
        const result = await callExtensionBridge('/api/spawn-worker', 'POST', {
          taskType: task_type,
          prompt,
          contextFiles: context_files,
          model,
          outputFile: output_file,
          autoExecute: auto_execute
        });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'check_worker_status': {
        const { task_id } = args as { task_id?: string };
        
        if (task_id) {
          // Get specific task status
          const task = await callExtensionBridge(`/api/worker-status?taskId=${task_id}`, 'GET');
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(task, null, 2),
              },
            ],
          };
        } else {
          // Get all tasks
          const result = await callExtensionBridge('/api/list-workers', 'GET');
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }
      }

      case 'wait_for_workers': {
        const { task_ids, timeout_seconds } = args as {
          task_ids?: string[];
          timeout_seconds?: number;
        };
        
        const result = await callExtensionBridge('/api/wait-for-workers', 'POST', {
          taskIds: task_ids,
          timeoutSeconds: timeout_seconds || 60
        });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_component_map': {
        const { workspace_path } = args as {
          workspace_path: string;
        };
        
        const componentMap = summaryManager.getComponentMap(workspace_path);
        
        if (!componentMap) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: 'Component map not found. Run "LUNA: Generate Codebase Summaries" first.'
                }, null, 2),
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(componentMap, null, 2),
            },
          ],
        };
      }

      case 'get_qa_report': {
        const { workspace_path } = args as {
          workspace_path: string;
        };
        
        const qaReport = summaryManager.getQAReport(workspace_path);
        
        if (!qaReport) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: 'QA report not found. Run "LUNA: Generate Codebase Summaries" first.'
                }, null, 2),
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(qaReport, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
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
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('LUNA Encyclopedia MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
