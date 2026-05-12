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
    private findRouteDecoratorLines(lines: string[]): number[] {
        const patterns: RegExp[] = [
            /^\s*@[\w]+(?:\.\w+)*\.(get|post|put|patch|delete|head|options|api_route)\s*\(/i,
            /^\s*@[\w]+(?:\.\w+)*\.route\s*\(/i,
            /^\s*@(Get|Post|Put|Patch|Delete|Head|Options)\s*\(/,
            /^\s*@(GetMapping|PostMapping|PutMapping|DeleteMapping|PatchMapping|RequestMapping)\s*[\(@]/,
            /^\s*\[(HttpGet|HttpPost|HttpPut|HttpDelete|HttpPatch|Route)\]/,
        ];
        const hits: number[] = [];
        for (let i = 0; i < lines.length; i++) {
            if (patterns.some(p => p.test(lines[i]))) { hits.push(i); }
        }
        return hits;
    }

    /**
     * Deterministically extract the router prefix from the file content.
     * Returns the prefix string (e.g. "/narrates") or null if not found.
     */
    private detectRouterPrefix(content: string): string | null {
        // Python FastAPI / Starlette: APIRouter(prefix="/foo") or APIRouter(prefix='/foo')
        const fastapiMatch = content.match(/APIRouter\s*\([^)]*prefix\s*=\s*["']([^"']+)["']/);
        if (fastapiMatch) { return fastapiMatch[1]; }

        // NestJS: @Controller('/prefix') or @Controller("prefix")
        const nestMatch = content.match(/@Controller\s*\(\s*["']([^"']+)["']\s*\)/);
        if (nestMatch) { return nestMatch[1].startsWith('/') ? nestMatch[1] : '/' + nestMatch[1]; }

        // Spring Boot: @RequestMapping("/prefix")
        const springMatch = content.match(/@RequestMapping\s*\(\s*["']([^"']+)["']\s*\)/);
        if (springMatch) { return springMatch[1]; }

        // Express: router.use('/prefix', ...) or app.use('/prefix', router)
        const expressMatch = content.match(/\.use\s*\(\s*["']([/][^"']+)["']/);
        if (expressMatch) { return expressMatch[1]; }

        return null;
    }

    /**
     * Build a map of (normalised path + method) → 1-based line number by
     * regex-parsing every route decorator in the file. This is used post-LLM
     * to fill missing `lines` fields without relying on the model.
     *
     * Key format: "METHOD /in-router-path" (e.g. "GET /stories/{story_id}")
     */
    private buildDecoratorLineMap(lines: string[]): Map<string, number> {
        const map = new Map<string, number>();
        // Matches: @<var>.<method>("/path"  or  @<var>.<method>('/path'
        const decoratorRe = /^\s*@[\w.]+\.(get|post|put|patch|delete|head|options|api_route)\s*\(\s*["']([^"']+)["']/i;
        // NestJS: @Get("/path") @Post('/path')
        const nestRe = /^\s*@(Get|Post|Put|Patch|Delete|Head|Options)\s*\(\s*["']([^"']+)["']/;
        // Spring: @GetMapping("/path")
        const springRe = /^\s*@(GetMapping|PostMapping|PutMapping|DeleteMapping|PatchMapping)\s*\(\s*["']([^"']+)["']/;

        const springMethodMap: Record<string, string> = {
            GetMapping: 'GET', PostMapping: 'POST', PutMapping: 'PUT',
            DeleteMapping: 'DELETE', PatchMapping: 'PATCH'
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            let m = line.match(decoratorRe);
            if (m) {
                const method = (m[1] === 'api_route' ? 'GET' : m[1]).toUpperCase();
                const p = m[2].startsWith('/') ? m[2] : '/' + m[2];
                map.set(`${method} ${p}`, i + 1); // 1-based
                continue;
            }
            m = line.match(nestRe);
            if (m) {
                const p = m[2].startsWith('/') ? m[2] : '/' + m[2];
                map.set(`${m[1].toUpperCase()} ${p}`, i + 1);
                continue;
            }
            m = line.match(springRe);
            if (m) {
                const p = m[2].startsWith('/') ? m[2] : '/' + m[2];
                map.set(`${springMethodMap[m[1]] ?? 'GET'} ${p}`, i + 1);
            }
        }
        return map;
    }

    /**
     * Parse the JSON response from one LLM call and return raw endpoint objects.
     */
    private parseEndpointResponse(responseText: string, relativePath: string): any[] {
        let jsonText: string | null = null;
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonText = jsonMatch[1];
        } else {
            const s = responseText.indexOf('{');
            const e = responseText.lastIndexOf('}');
            if (s !== -1 && e !== -1) { jsonText = responseText.substring(s, e + 1); }
        }
        if (!jsonText) { return []; }

        let parsed: any;
        try {
            parsed = JSON.parse(jsonText);
        } catch {
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
                    } catch { return []; }
                } else { return []; }
            }
        }
        return parsed.endpoints || [];
    }

    /**
     * Send one chunk of content to the LLM and return raw (unprefixed) endpoint objects.
     */
    private async extractEndpointsFromChunk(
        filePath: string,
        relativePath: string,
        chunk: string,
        lineOffset: number,   // 1-based line number of first line in this chunk
        framework: string | null,
        model: vscode.LanguageModelChat,
        isPartial: boolean = false
    ): Promise<any[]> {
        const fileExt = path.extname(filePath);
        const promptManager = PromptManager.getInstance();

        const header = isPartial
            ? `[EXCERPT of ${relativePath} — lines ${lineOffset}+ of the full file. Use these offsets for the \`lines\` field.]\n\n`
            : '';

        const prompt = await promptManager.getPromptForFile('api-extraction', filePath, {
            relativePath,
            fileName: path.basename(filePath),
            fileExtension: fileExt.substring(1) || 'txt',
            content: header + chunk,
            framework: framework || 'unknown'
        });

        const messages = [vscode.LanguageModelChatMessage.User(prompt)];
        const response = await model.sendRequest(messages, {
            justification: 'Extracting API endpoints for LUNA API Reference'
        });

        let responseText = '';
        for await (const part of response.text) { responseText += part; }

        return this.parseEndpointResponse(responseText, relativePath);
    }

    /**
     * Extract endpoints from a file using Copilot.
     *
     * Post-processing (all deterministic, no LLM):
     *   1. Apply router prefix to every path that is missing it.
     *   2. Fill null/missing `lines` from the decorator line map.
     *   3. Deduplicate within the file by method+path.
     */
    private async extractEndpoints(
        filePath: string,
        relativePath: string,
        content: string,
        model: vscode.LanguageModelChat
    ): Promise<APIEndpoint[]> {
        const fileExt = path.extname(filePath);
        const language = this.detectLanguage(fileExt);

        const framework = this.detectFramework(content, language);
        if (framework) { this.frameworks.add(framework); }

        // Deterministic metadata extracted before any LLM call
        const prefix = this.detectRouterPrefix(content);          // e.g. "/narrates"
        const lines = content.split('\n');
        const decoratorLineMap = this.buildDecoratorLineMap(lines); // method+path → line

        if (prefix) {
            this.log(`[${relativePath}] Router prefix detected: ${prefix}`);
        }

        const CHUNK_CHARS = 24000;
        const ROUTES_PER_BATCH = 8;
        const rawEndpoints: any[] = [];

        if (content.length <= CHUNK_CHARS) {
            rawEndpoints.push(...await this.extractEndpointsFromChunk(
                filePath, relativePath, content, 1, framework, model, false
            ));
        } else {
            const routeLineIndices = this.findRouteDecoratorLines(lines);
            this.log(`[${relativePath}] ${routeLineIndices.length} route decorators found`);

            if (routeLineIndices.length === 0) {
                this.log(`[${relativePath}] No route decorators via regex; sending first ${CHUNK_CHARS} chars`);
                rawEndpoints.push(...await this.extractEndpointsFromChunk(
                    filePath, relativePath, content.substring(0, CHUNK_CHARS), 1, framework, model, true
                ));
            } else {
                for (let i = 0; i < routeLineIndices.length; i += ROUTES_PER_BATCH) {
                    const batchFirstLine = routeLineIndices[i];
                    const batchLastIdx = Math.min(i + ROUTES_PER_BATCH - 1, routeLineIndices.length - 1);
                    const chunkEndLine = (batchLastIdx + 1 < routeLineIndices.length)
                        ? routeLineIndices[batchLastIdx + 1]
                        : lines.length;
                    const contextStart = Math.max(0, batchFirstLine - 30);
                    const chunk = lines.slice(contextStart, chunkEndLine).join('\n');
                    const batchNum = Math.floor(i / ROUTES_PER_BATCH) + 1;
                    this.log(`[${relativePath}] Batch ${batchNum}: lines ${batchFirstLine + 1}–${chunkEndLine}`);
                    try {
                        rawEndpoints.push(...await this.extractEndpointsFromChunk(
                            filePath, relativePath, chunk,
                            contextStart + 1,  // pass absolute line offset to the LLM
                            framework, model, true
                        ));
                    } catch (err) {
                        this.log(`[${relativePath}] Batch ${batchNum} failed: ${err}`);
                    }
                }
            }
        }

        // ── Post-processing ─────────────────────────────────────────────────────

        const normalized: APIEndpoint[] = rawEndpoints.map((ep: any) => {
            let epPath: string = (ep.path || '').trim();
            if (!epPath.startsWith('/')) { epPath = '/' + epPath; }

            // 1. Apply router prefix if the path doesn't already include it
            if (prefix) {
                const normalizedPrefix = prefix.replace(/\/$/, '');
                if (!epPath.startsWith(normalizedPrefix + '/') && epPath !== normalizedPrefix) {
                    epPath = normalizedPrefix + epPath;
                }
            }

            // 2. Fill missing line number from decorator map
            //    Try both prefixed and unprefixed path forms so lookup works regardless
            //    of whether the LLM included the prefix in its returned path.
            let lines = ep.lines ?? ep.line ?? null;
            if (!lines) {
                const method = (ep.method || 'GET').toUpperCase();
                // Try un-prefixed path (in-router path as written in decorator)
                const inRouterPath = (prefix && epPath.startsWith(prefix))
                    ? epPath.slice(prefix.length) || '/'
                    : epPath;
                const lineNum = decoratorLineMap.get(`${method} ${inRouterPath}`);
                if (lineNum !== undefined) { lines = String(lineNum); }
            }

            return { ...ep, path: epPath, lines, file: relativePath };
        });

        // 3. Deduplicate by method+path within this file
        const seen = new Set<string>();
        const deduped = normalized.filter(ep => {
            const key = `${(ep.method || '').toUpperCase()}:${ep.path}`;
            if (seen.has(key)) { return false; }
            seen.add(key);
            return true;
        });

        if (deduped.length < normalized.length) {
            this.log(`[${relativePath}] Deduped ${normalized.length} → ${deduped.length} endpoints`);
        }
        this.log(`[${relativePath}] Extracted ${deduped.length} endpoints${prefix ? ` (prefix: ${prefix})` : ''}`);

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
