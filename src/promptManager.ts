import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Prompt configuration schema
 */
export interface PromptConfig {
    version: string;
    name: string;
    description: string;
    extends?: string;  // Path to parent prompt (e.g., "base/file-summary")
    userPromptTemplate?: string;
    additionalInstructions?: string[];
    temperature?: number;
    maxTokens?: number;
}

/**
 * Framework detection pattern
 */
interface FrameworkPattern {
    pattern: RegExp;
    name: string;
}

/**
 * Manages externalized prompts for code analysis.
 * Handles language detection, framework detection, and prompt composition.
 */
export class PromptManager {
    private static instance: PromptManager | null = null;
    private cache: Map<string, PromptConfig> = new Map();
    private promptsDir: string;

    private constructor(extensionUri: vscode.Uri) {
        this.promptsDir = path.join(extensionUri.fsPath, 'resources', 'prompts');
    }

    /**
     * Initialize the singleton instance
     */
    static initialize(extensionUri: vscode.Uri): void {
        if (!PromptManager.instance) {
            PromptManager.instance = new PromptManager(extensionUri);
        }
    }

    /**
     * Get the singleton instance
     */
    static getInstance(): PromptManager {
        if (!PromptManager.instance) {
            throw new Error('PromptManager not initialized. Call initialize() first.');
        }
        return PromptManager.instance;
    }

    /**
     * Get a complete prompt for analyzing a file
     */
    async getPromptForFile(
        type: 'file-summary' | 'structure-analysis' | 'section-explanation' | 'api-extraction',
        filePath: string,
        variables: { [key: string]: any }
    ): Promise<string> {
        // Detect language from file extension
        const language = this.detectLanguage(filePath);

        // Detect frameworks from content (if available)
        const frameworks = variables.content
            ? this.detectFrameworks(variables.content, language)
            : [];

        // Load and merge prompts
        const basePrompt = await this.loadPrompt(`base/${type}`);
        const langPrompt = await this.loadPrompt(`languages/${language}`);
        const frameworkPrompts = await Promise.all(
            frameworks.map(fw => this.loadPrompt(`frameworks/${language}-${fw}`))
        );

        // Merge all prompts
        const merged = this.mergePrompts(basePrompt, langPrompt, ...frameworkPrompts);

        // Add detected language/frameworks to variables
        const enhancedVars = {
            ...variables,
            language,
            frameworks: frameworks.join(', ')
        };

        // Render the final prompt
        return this.renderTemplate(merged, enhancedVars);
    }

    /**
     * Get a QA validation prompt
     */
    async getQAPrompt(
        type: 'dead-code' | 'complexity' | 'component' | 'staleness',
        variables: { [key: string]: any }
    ): Promise<string> {
        const basePrompt = await this.loadPrompt(`qa/${type}-validation`);
        return this.renderTemplate(basePrompt, variables);
    }

    /**
     * Detect programming language from file extension
     */
    private detectLanguage(filePath: string): string {
        const ext = path.extname(filePath).toLowerCase();

        const mapping: { [key: string]: string } = {
            '.py': 'python',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.java': 'java',
            '.cs': 'csharp',
            '.go': 'go',
            '.rs': 'rust',
            '.cpp': 'cpp',
            '.c': 'c',
            '.h': 'c',
            '.hpp': 'cpp'
        };

        return mapping[ext] || 'generic';
    }

    /**
     * Detect frameworks/libraries used in the code
     */
    private detectFrameworks(content: string, language: string): string[] {
        const patterns: { [key: string]: FrameworkPattern[] } = {
            python: [
                { pattern: /from fastapi import|@app\.|@router\./m, name: 'fastapi' },
                { pattern: /from flask import|@app\.route/m, name: 'flask' },
                { pattern: /from django\.|models\.Model/m, name: 'django' },
                { pattern: /from pydantic import BaseModel/m, name: 'pydantic' },
                { pattern: /@pytest\.|import pytest/m, name: 'pytest' }
            ],
            typescript: [
                { pattern: /from ['"]react['"]|import.*React/m, name: 'react' },
                { pattern: /from ['"]vue['"]|import.*Vue/m, name: 'vue' },
                { pattern: /@Component|@angular\/core/m, name: 'angular' },
                { pattern: /from ['"]express['"]|import.*express/m, name: 'express' }
            ],
            javascript: [
                { pattern: /from ['"]react['"]|require\(['"]react['"]\)/m, name: 'react' },
                { pattern: /from ['"]vue['"]|require\(['"]vue['"]\)/m, name: 'vue' },
                { pattern: /from ['"]express['"]|require\(['"]express['"]\)/m, name: 'express' }
            ],
            java: [
                { pattern: /@SpringBootApplication|@Service|@RestController|@Controller/m, name: 'spring' },
                { pattern: /@Entity|import javax\.persistence|import jakarta\.persistence/m, name: 'jpa' }
            ],
            csharp: [
                { pattern: /\[ApiController\]|\[HttpGet\]|using Microsoft\.AspNetCore/m, name: 'aspnet' },
                { pattern: /DbContext|DbSet|using Microsoft\.EntityFrameworkCore/m, name: 'efcore' }
            ]
        };

        return (patterns[language] || [])
            .filter(p => p.pattern.test(content))
            .map(p => p.name);
    }

    /**
     * Load a prompt configuration from disk
     */
    private async loadPrompt(promptPath: string): Promise<PromptConfig> {
        const cacheKey = promptPath;

        // Check cache first
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!;
        }

        const filePath = path.join(this.promptsDir, `${promptPath}.json`);

        // Return empty config if file doesn't exist (graceful fallback)
        if (!fs.existsSync(filePath)) {
            return {
                version: '1.0.0',
                name: 'empty',
                description: 'Empty prompt',
                userPromptTemplate: '',
                additionalInstructions: []
            };
        }

        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const config: PromptConfig = JSON.parse(content);

            // Handle inheritance
            if (config.extends) {
                const parent = await this.loadPrompt(config.extends);
                config.userPromptTemplate = parent.userPromptTemplate + '\\n\\n' + (config.userPromptTemplate || '');
                config.additionalInstructions = [
                    ...(parent.additionalInstructions || []),
                    ...(config.additionalInstructions || [])
                ];
            }

            this.cache.set(cacheKey, config);
            return config;
        } catch (error) {
            console.error(`Failed to load prompt ${promptPath}:`, error);
            return {
                version: '1.0.0',
                name: 'error',
                description: 'Failed to load',
                userPromptTemplate: '',
                additionalInstructions: []
            };
        }
    }

    /**
     * Merge multiple prompt configurations
     */
    private mergePrompts(...prompts: PromptConfig[]): PromptConfig {
        const base = prompts[0];

        return {
            ...base,
            additionalInstructions: prompts.flatMap(p => p.additionalInstructions || []),
            temperature: prompts.find(p => p.temperature !== undefined)?.temperature ?? 0,
            maxTokens: prompts.find(p => p.maxTokens !== undefined)?.maxTokens ?? 2000
        };
    }

    /**
     * Render a template with variable substitution
     */
    private renderTemplate(config: PromptConfig, variables: { [key: string]: any }): string {
        let rendered = config.userPromptTemplate || '';

        // Replace {{placeholders}} with actual values
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = new RegExp(`{{${key}}}`, 'g');
            rendered = rendered.replace(placeholder, String(value));
        }

        // Append additional instructions if present
        if (config.additionalInstructions && config.additionalInstructions.length > 0) {
            rendered += '\\n\\n**Additional Language/Framework-Specific Instructions:**\\n';
            rendered += config.additionalInstructions.map(i => `- ${i}`).join('\\n');
        }

        return rendered;
    }

    /**
     * Clear the prompt cache (useful for hot-reloading during development)
     */
    clearCache(): void {
        this.cache.clear();
    }
}
