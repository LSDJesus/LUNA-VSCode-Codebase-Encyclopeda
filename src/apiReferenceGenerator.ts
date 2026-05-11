import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { PromptManager } from './promptManager';

/**
 * API Endpoint metadata
 */
export interface APIEndpoint {
    path: string;
    method: string;
    handler: string;
    file: string;
    lines?: string;
    requestSchema?: {
        type: string;
        fields?: Array<{ name: string; type: string; required: boolean; description?: string }>;
    };
    responseSchema?: {
        type: string;
        fields?: Array<{ name: string; type: string; description?: string }>;
        statusCode?: number;
    };
    queryParams?: Array<{ name: string; type: string; required: boolean; description?: string }>;
    pathParams?: Array<{ name: string; type: string; description?: string }>;
    authentication?: string;
    rateLimit?: string;
    description?: string;
    tags?: string[];
}

export interface APIReference {
    generated: string;
    totalEndpoints: number;
    endpoints: APIEndpoint[];
    frameworks: string[];
}

/**
 * Extracts API endpoints from route files and generates comprehensive API documentation
 */
export class APIReferenceGenerator {
    private endpoints: APIEndpoint[] = [];
    private frameworks: Set<string> = new Set();
    private logger?: (msg: string) => void;

    /**
     * Set logger for debugging
     */
    setLogger(logger: (msg: string) => void): void {
        this.logger = logger;
    }

    private log(message: string): void {
        if (this.logger) {
            this.logger(message);
        }
        console.log(message);
    }

    /**
     * Analyze all route files and generate API reference
     * Scans apiRoutes directories directly and checks file contents for API frameworks
     */
    async generateAPIReference(
        workspacePath: string,
        _files: string[], // Ignored - we scan apiRoutes directories directly
        model: vscode.LanguageModelChat,
        progress?: vscode.Progress<{ message?: string }>
    ): Promise<void> {
        this.endpoints = [];
        this.frameworks = new Set();

        // Load .lunasummarize config for API routes
        const configPath = path.join(workspacePath, '.codebase', '.lunasummarize');
        let configuredApiRoutes: string[] = [];
        
        try {
            if (fs.existsSync(configPath)) {
                const configContent = fs.readFileSync(configPath, 'utf-8');
                this.log('Loading .lunasummarize config...');
                
                // Try JSON first, then YAML
                let config: any;
                try {
                    config = JSON.parse(configContent);
                } catch {
                    // YAML parsing - extract apiRoutes section
                    const apiRoutesSection = configContent.match(/apiRoutes:\s*([\s\S]*?)(?=\n[a-zA-Z#]|\n\n|$)/);
                    if (apiRoutesSection && apiRoutesSection[1]) {
                        const lines = apiRoutesSection[1].split('\n');
                        const items = lines
                            .filter(line => line.match(/^\s*-\s+/))
                            .map(line => line.replace(/^\s*-\s+/, '').trim().replace(/^["']|["']$/g, ''));
                        
                        config = { apiRoutes: items.length > 0 ? items : [] };
                    } else {
                        config = {};
                    }
                }
                
                configuredApiRoutes = config.apiRoutes || [];
                this.log('Loaded apiRoutes: ' + JSON.stringify(configuredApiRoutes));
            }
        } catch (error) {
            this.log('Failed to load .lunasummarize config: ' + String(error));
        }

        // If no apiRoutes configured, skip API reference generation
        if (configuredApiRoutes.length === 0) {
            this.log('No apiRoutes configured in .lunasummarize. Skipping API reference generation.');
            this.log('To enable: add apiRoutes section with your route directories');
            this.saveAPIReference(workspacePath);
            return;
        }

        // Scan apiRoutes directories directly (independent of summary file discovery)
        this.log('Scanning configured apiRoutes directories...');
        const apiFiles = await this.scanApiRoutesDirectories(workspacePath, configuredApiRoutes);
        this.log('Found ' + apiFiles.length + ' files in apiRoutes directories');

        if (apiFiles.length === 0) {
            this.log('No files found in configured apiRoutes directories');
            this.saveAPIReference(workspacePath);
            return;
        }

        // Filter to only files that contain API framework imports
        progress?.report({ message: 'Scanning ' + apiFiles.length + ' files for API frameworks...' });
        const routeFiles: Array<{ fullPath: string; relativePath: string; framework: string }> = [];
        
        for (const f of apiFiles) {
            try {
                const content = fs.readFileSync(f.fullPath, 'utf-8');
                const framework = this.detectFramework(content, this.detectLanguage(path.extname(f.fullPath)));
                if (framework) {
                    this.log('  Found: ' + f.relativePath + ' (' + framework + ')');
                    routeFiles.push({ ...f, framework });
                }
            } catch {
                // Skip files that can't be read
            }
        }

        this.log('Found ' + routeFiles.length + ' files with API frameworks');

        if (routeFiles.length === 0) {
            this.log('No files with API frameworks found. Looking for: FastAPI, Flask, Django, Express, NestJS, Spring, ASP.NET');
            this.saveAPIReference(workspacePath);
            return;
        }

        progress?.report({ message: 'Extracting endpoints from ' + routeFiles.length + ' API files...' });

        // Process files concurrently with limit (5 at a time)
        const concurrencyLimit = 5;
        const results: APIEndpoint[] = [];
        
        for (let i = 0; i < routeFiles.length; i += concurrencyLimit) {
            const batch = routeFiles.slice(i, i + concurrencyLimit);
            const batchPromises = batch.map(async ({ fullPath, relativePath }) => {
                progress?.report({ 
                    message: 'Extracting endpoints (' + (i + 1) + '-' + Math.min(i + concurrencyLimit, routeFiles.length) + '/' + routeFiles.length + '): ' + path.basename(relativePath) 
                });

                try {
                    const content = fs.readFileSync(fullPath, 'utf-8');
                    const endpoints = await this.extractEndpointsWithRetry(fullPath, relativePath, content, model, 2);
                    this.log('[' + relativePath + '] Extracted ' + endpoints.length + ' endpoints');
                    return endpoints;
                } catch (error) {
                    this.log('[' + relativePath + '] Failed after retries: ' + String(error));
                    return [];
                }
            });

            const batchResults = await Promise.all(batchPromises);
            for (const endpoints of batchResults) {
                results.push(...endpoints);
            }
        }

        this.endpoints.push(...results);

        // Save API reference
        this.saveAPIReference(workspacePath);
        
        progress?.report({ 
            message: 'API Reference: ' + this.endpoints.length + ' endpoints documented' 
        });
    }

    /**
     * Recursively scan directories specified in apiRoutes
     */
    private async scanApiRoutesDirectories(
        workspacePath: string, 
        apiRoutes: string[]
    ): Promise<Array<{ fullPath: string; relativePath: string }>> {
        const files: Array<{ fullPath: string; relativePath: string }> = [];
        
        for (const routeDir of apiRoutes) {
            const fullDir = path.join(workspacePath, routeDir);
            this.log('  Scanning: ' + routeDir);
            
            if (!fs.existsSync(fullDir)) {
                this.log('  Directory not found: ' + routeDir);
                continue;
            }

            // Recursively find all files
            const scanDir = (dir: string) => {
                try {
                    const entries = fs.readdirSync(dir, { withFileTypes: true });
                    for (const entry of entries) {
                        const fullPath = path.join(dir, entry.name);
                        if (entry.isDirectory()) {
                            // Skip __pycache__, node_modules, etc.
                            if (!entry.name.startsWith('__') && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                                scanDir(fullPath);
                            }
                        } else if (entry.isFile()) {
                            // Only include source files
                            const ext = path.extname(entry.name).toLowerCase();
                            if (['.py', '.ts', '.js', '.tsx', '.jsx', '.java', '.cs', '.go'].includes(ext)) {
                                files.push({
                                    fullPath,
                                    relativePath: path.relative(workspacePath, fullPath)
                                });
                            }
                        }
                    }
                } catch (error) {
                    this.log('  Error scanning ' + dir + ': ' + String(error));
                }
            };

            scanDir(fullDir);
        }
        
        return files;
    }

    /**
     * Extract endpoints with retry logic
     */
    private async extractEndpointsWithRetry(
        filePath: string,
        relativePath: string,
        content: string,
        model: vscode.LanguageModelChat,
        maxRetries: number
    ): Promise<APIEndpoint[]> {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const endpoints = await this.extractEndpoints(filePath, relativePath, content, model);
                if (endpoints.length > 0 || attempt === maxRetries) {
                    return endpoints;
                }
                // If no endpoints found and not last attempt, retry
                this.log('[' + relativePath + '] No endpoints found, retrying (' + attempt + '/' + maxRetries + ')');
            } catch (error) {
                if (attempt === maxRetries) {
                    throw error;
                }
                this.log('[' + relativePath + '] Parse error on attempt ' + attempt + ', retrying...');
                // Wait a bit before retrying
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        return [];
    }

    /**
     * Return line indices (0-based) where route decorator patterns start.
     * Uses framework-agnostic patterns so any router variable name is matched
     * (e.g. @router., @app., @characters_router., @api_router., etc.)
     */
    private findRouteDecoratorLines(lines: string[], framework: string | null): number[] {
        // Universal HTTP-method decorator patterns.
        // `@[\w]+(?:\.\w+)*` matches any chained identifier: router, app, characters_router,
        // api_router, app.router, etc. — regardless of what the variable is named.
        const patterns: RegExp[] = [
            // Python FastAPI / Flask / any @<var>.<method>(
            /^\s*@[\w]+(?:\.\w+)*\.(get|post|put|patch|delete|head|options|api_route)\s*\(/i,
            // Python Flask explicit blueprint.route(
            /^\s*@[\w]+(?:\.\w+)*\.route\s*\(/i,
            // NestJS / TypeScript class-level decorators @Get( @Post( etc.
            /^\s*@(Get|Post|Put|Patch|Delete|Head|Options)\s*\(/,
            // Spring Boot @GetMapping @PostMapping etc.
            /^\s*@(GetMapping|PostMapping|PutMapping|DeleteMapping|PatchMapping|RequestMapping)\s*[\(@]/,
            // ASP.NET Core [HttpGet] [HttpPost] etc.
            /^\s*\[(HttpGet|HttpPost|HttpPut|HttpDelete|HttpPatch|Route)\]/,
        ];

        const hits: number[] = [];
        for (let i = 0; i < lines.length; i++) {
            if (patterns.some(p => p.test(lines[i]))) {
                hits.push(i);
            }
        }
        return hits;
    }

    /**
     * Send one chunk of content to the LLM and return parsed endpoints.
     * The chunk may be a complete file or a route-boundary slice of a larger file.
     */
    private async extractEndpointsFromChunk(
        filePath: string,
        relativePath: string,
        chunk: string,
        framework: string | null,
        model: vscode.LanguageModelChat,
        isPartial: boolean = false
    ): Promise<APIEndpoint[]> {
        const fileExt = path.extname(filePath);

        const promptManager = PromptManager.getInstance();
        const baseContent = isPartial
            ? `[EXCERPT — this is a partial slice of ${relativePath}; extract only the endpoints visible in this excerpt]\n\n${chunk}`
            : chunk;

        const prompt = await promptManager.getPromptForFile('api-extraction', filePath, {
            relativePath,
            fileName: path.basename(filePath),
            fileExtension: fileExt.substring(1) || 'txt',
            content: baseContent,
            framework: framework || 'unknown'
        });

        const messages = [vscode.LanguageModelChatMessage.User(prompt)];
        const response = await model.sendRequest(messages, {
            justification: 'Extracting API endpoints for LUNA API Reference'
        });

        let responseText = '';
        for await (const chunk of response.text) {
            responseText += chunk;
        }

        // Parse JSON from response
        let jsonText: string | null = null;
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonText = jsonMatch[1];
        } else {
            const s = responseText.indexOf('{');
            const e = responseText.lastIndexOf('}');
            if (s !== -1 && e !== -1) { jsonText = responseText.substring(s, e + 1); }
        }

        if (!jsonText) {
            this.log('[' + relativePath + '] No JSON found in response');
            return [];
        }

        let parsed: any;
        try {
            parsed = JSON.parse(jsonText);
        } catch {
            // Repair common LLM JSON mistakes
            let fixed = jsonText
                .replace(/,(\s*[}\]])/g, '$1')
                .replace(/}(\s*){/g, '},$1{')
                .replace(/](\s*)\[/g, '],$1[')
                .replace(/,+/g, ',');
            try {
                parsed = JSON.parse(fixed);
                this.log('[' + relativePath + '] Auto-repaired malformed JSON');
            } catch {
                const em = jsonText.match(/"endpoints"\s*:\s*\[([\s\S]*?)\]/);
                if (em) {
                    try {
                        parsed = JSON.parse('{"endpoints":[' + em[1].replace(/,(\s*)\]/g, '$1]') + ']}');
                        this.log('[' + relativePath + '] Salvaged endpoints array from malformed JSON');
                    } catch {
                        return [];
                    }
                } else {
                    return [];
                }
            }
        }

        return (parsed.endpoints || []).map((ep: any) => ({ ...ep, file: relativePath }));
    }

    /**
     * Extract endpoints from a file using Copilot.
     * For large files, splits at route-decorator boundaries and runs the LLM
     * on each batch separately, then merges and deduplicates by method+path.
     */
    private async extractEndpoints(
        filePath: string,
        relativePath: string,
        content: string,
        model: vscode.LanguageModelChat
    ): Promise<APIEndpoint[]> {
        const fileExt = path.extname(filePath);
        const language = this.detectLanguage(fileExt);

        // Detect framework
        const framework = this.detectFramework(content, language);
        if (framework) {
            this.frameworks.add(framework);
        }

        // Max chars per LLM call (~24 KB ≈ 6 000 tokens, well inside all model limits)
        const CHUNK_CHARS = 24000;
        const ROUTES_PER_BATCH = 8;

        if (content.length <= CHUNK_CHARS) {
            // Small file — single pass, full content
            return this.extractEndpointsFromChunk(filePath, relativePath, content, framework, model, false);
        }

        // Large file: find all route decorator positions first
        const lines = content.split('\n');
        const routeLineIndices = this.findRouteDecoratorLines(lines, framework);
        this.log(`[${relativePath}] ${routeLineIndices.length} route decorators found at lines: ${routeLineIndices.slice(0, 10).map(l => l + 1).join(', ')}${routeLineIndices.length > 10 ? '...' : ''}`);

        if (routeLineIndices.length === 0) {
            // No route decorators found via regex — single pass with first CHUNK_CHARS
            this.log(`[${relativePath}] No route decorators via regex; sending first ${CHUNK_CHARS} chars`);
            return this.extractEndpointsFromChunk(filePath, relativePath, content.substring(0, CHUNK_CHARS), framework, model, content.length > CHUNK_CHARS);
        }

        // Slice the file into batches aligned to route boundaries
        const allEndpoints: APIEndpoint[] = [];

        for (let i = 0; i < routeLineIndices.length; i += ROUTES_PER_BATCH) {
            const batchFirstLine = routeLineIndices[i];
            const batchLastIdx = Math.min(i + ROUTES_PER_BATCH - 1, routeLineIndices.length - 1);
            // Chunk ends at the start of the NEXT batch (or EOF)
            const chunkEndLine = (batchLastIdx + 1 < routeLineIndices.length)
                ? routeLineIndices[batchLastIdx + 1]
                : lines.length;

            // Include up to 30 lines of leading context (imports, shared vars)
            const contextStart = Math.max(0, batchFirstLine - 30);
            const chunk = lines.slice(contextStart, chunkEndLine).join('\n');

            this.log(`[${relativePath}] Batch ${Math.floor(i / ROUTES_PER_BATCH) + 1}: lines ${batchFirstLine + 1}–${chunkEndLine} (${routeLineIndices.slice(i, i + ROUTES_PER_BATCH).length} routes)`);

            try {
                const batchEndpoints = await this.extractEndpointsFromChunk(
                    filePath, relativePath, chunk, framework, model, true
                );
                allEndpoints.push(...batchEndpoints);
            } catch (err) {
                this.log(`[${relativePath}] Batch ${Math.floor(i / ROUTES_PER_BATCH) + 1} failed: ${err}`);
            }
        }

        // Deduplicate by method+path (keep first occurrence)
        const seen = new Set<string>();
        const deduped = allEndpoints.filter(ep => {
            const key = `${(ep.method || '').toUpperCase()}:${ep.path}`;
            if (seen.has(key)) { return false; }
            seen.add(key);
            return true;
        });

        if (deduped.length < allEndpoints.length) {
            this.log(`[${relativePath}] Deduped ${allEndpoints.length} → ${deduped.length} endpoints`);
        }

        return deduped;
    }

    /**
     * Detect programming language
     */
    private detectLanguage(ext: string): string {
        const mapping: { [key: string]: string } = {
            '.py': 'python',
            '.ts': 'typescript',
            '.js': 'javascript',
            '.java': 'java',
            '.cs': 'csharp',
            '.go': 'go'
        };
        return mapping[ext.toLowerCase()] || 'unknown';
    }

    /**
     * Detect API framework from file content
     */
    private detectFramework(content: string, language: string): string | null {
        const patterns: { [key: string]: { pattern: RegExp; name: string }[] } = {
            python: [
                { pattern: /from fastapi import|@app\.|@router\./m, name: 'FastAPI' },
                { pattern: /from flask import|@app\.route/m, name: 'Flask' },
                { pattern: /from django\./m, name: 'Django' }
            ],
            typescript: [
                { pattern: /from ['"]express['"]|import.*express/m, name: 'Express' },
                { pattern: /@Controller|@nestjs\/common/m, name: 'NestJS' }
            ],
            javascript: [
                { pattern: /require\(['"]express['"]\)/m, name: 'Express' }
            ],
            java: [
                { pattern: /@RestController|@RequestMapping|@GetMapping/m, name: 'Spring' }
            ],
            csharp: [
                { pattern: /\[ApiController\]|\[HttpGet\]|using Microsoft\.AspNetCore/m, name: 'ASP.NET Core' }
            ]
        };

        const langPatterns = patterns[language] || [];
        for (const { pattern, name } of langPatterns) {
            if (pattern.test(content)) {
                return name;
            }
        }

        return null;
    }

    /**
     * Save API reference to file
     */
    private saveAPIReference(workspacePath: string): void {
        const codebasePath = path.join(workspacePath, '.codebase');
        const apiRefPath = path.join(codebasePath, 'api-reference.json');

        const reference: APIReference = {
            generated: new Date().toISOString(),
            totalEndpoints: this.endpoints.length,
            endpoints: this.endpoints,
            frameworks: Array.from(this.frameworks)
        };

        fs.writeFileSync(apiRefPath, JSON.stringify(reference, null, 2), 'utf-8');
        this.log('API Reference saved: ' + this.endpoints.length + ' endpoints');
    }

    /**
     * Load existing API reference
     */
    static loadAPIReference(workspacePath: string): APIReference | null {
        const apiRefPath = path.join(workspacePath, '.codebase', 'api-reference.json');
        
        if (!fs.existsSync(apiRefPath)) {
            return null;
        }

        try {
            const content = fs.readFileSync(apiRefPath, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            console.error('Failed to load API reference:', error);
            return null;
        }
    }
}
