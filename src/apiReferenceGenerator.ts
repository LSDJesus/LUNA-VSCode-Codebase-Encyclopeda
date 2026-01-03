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

    /**
     * Analyze all route files and generate API reference
     */
    async generateAPIReference(
        workspacePath: string,
        files: string[],
        model: vscode.LanguageModelChat,
        progress?: vscode.Progress<{ message?: string }>
    ): Promise<void> {
        this.endpoints = [];
        this.frameworks = new Set();

        // Filter files that likely contain routes
        const routeFiles = files.filter(f => this.isLikelyRouteFile(f));

        if (routeFiles.length === 0) {
            console.log('No route files detected');
            return;
        }

        progress?.report({ message: `🔍 Analyzing ${routeFiles.length} API route files...` });

        // Analyze each route file
        for (let i = 0; i < routeFiles.length; i++) {
            const filePath = path.join(workspacePath, routeFiles[i]);
            
            progress?.report({ 
                message: `📡 Extracting endpoints (${i + 1}/${routeFiles.length})...` 
            });

            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const endpoints = await this.extractEndpoints(filePath, routeFiles[i], content, model);
                this.endpoints.push(...endpoints);
            } catch (error) {
                console.error(`Failed to analyze ${routeFiles[i]}:`, error);
            }
        }

        // Save API reference
        this.saveAPIReference(workspacePath);
        
        progress?.report({ 
            message: `✅ API Reference: ${this.endpoints.length} endpoints documented` 
        });
    }

    /**
     * Check if file is likely to contain API routes
     */
    private isLikelyRouteFile(filePath: string): boolean {
        const fileName = path.basename(filePath).toLowerCase();
        const dirName = path.dirname(filePath).toLowerCase();

        // Common route file patterns
        const patterns = [
            /routes?\.(py|ts|js|java|cs)$/,
            /controllers?\.(py|ts|js|java|cs)$/,
            /endpoints?\.(py|ts|js)$/,
            /api\.(py|ts|js)$/,
            /views?\.(py|java|cs)$/,
            /handlers?\.(py|ts|js|go)$/
        ];

        const directoryPatterns = [
            /\/routes?\//,
            /\/api\//,
            /\/controllers?\//,
            /\/endpoints?\//,
            /\/handlers?\//
        ];

        return patterns.some(p => p.test(fileName)) || 
               directoryPatterns.some(p => p.test(dirName));
    }

    /**
     * Extract endpoints from a file using Copilot
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

        const promptManager = PromptManager.getInstance();
        const prompt = await promptManager.getPromptForFile('api-extraction', filePath, {
            relativePath,
            fileName: path.basename(filePath),
            fileExtension: fileExt.substring(1) || 'txt',
            content: content.length > 8000 ? content.substring(0, 8000) + '\n...[truncated]' : content,
            framework: framework || 'unknown'
        });

        try {
            const messages = [vscode.LanguageModelChatMessage.User(prompt)];
            const response = await model.sendRequest(messages, {
                justification: 'Extracting API endpoints for LUNA API Reference'
            });

            let responseText = '';
            for await (const chunk of response.text) {
                responseText += chunk;
            }

            // Parse JSON response
            const jsonMatch = responseText.match(/```json\s*([\s\S]*?)```/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[1]);
                const endpoints = (parsed.endpoints || []).map((ep: any) => ({
                    ...ep,
                    file: relativePath
                }));
                return endpoints;
            }
        } catch (error) {
            console.error(`Failed to extract endpoints from ${relativePath}:`, error);
        }

        return [];
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
     * Detect API framework
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
        console.log(`✅ API Reference saved: ${this.endpoints.length} endpoints`);
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
