import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

interface FileSummary {
    purpose: string;
    keyComponents: Array<{ name: string; description: string }>;
    dependencies: {
        internal: Array<{ path: string; usage: string }>;
        external: Array<{ package: string; usage: string }>;
    };
    publicAPI: Array<{ signature: string; description: string }>;
    codeLinks: Array<{ symbol: string; path: string }>;
    implementationNotes: string;
}

export class CodebaseAnalyzer {
    private getModelSelector(): vscode.LanguageModelChatSelector {
        const config = vscode.workspace.getConfiguration('luna-encyclopedia');
        const modelFamily = config.get<string>('copilotModel', 'gpt-4o');
        
        return { 
            vendor: 'copilot', 
            family: modelFamily 
        };
    }
    
    constructor(private context: vscode.ExtensionContext) {}

    async generateSummaries(
        progress: vscode.Progress<{ message?: string; increment?: number }>,
        token: vscode.CancellationToken
    ): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder open');
        }

        // Check if Language Model API is available
        const modelSelector = this.getModelSelector();
        const models = await vscode.lm.selectChatModels(modelSelector);
        if (models.length === 0) {
            const modelName = modelSelector.family || 'unknown';
            throw new Error(`No Copilot model "${modelName}" available. Please ensure GitHub Copilot is installed and active, or try a different model in settings.`);
        }

        // Discover files
        progress.report({ message: 'Discovering files...' });
        const files = await this.discoverFiles(workspaceFolder.uri.fsPath);
        
        if (files.length === 0) {
            throw new Error('No source files found');
        }

        // Create .codebase directory
        const codebasePath = path.join(workspaceFolder.uri.fsPath, '.codebase');
        if (!fs.existsSync(codebasePath)) {
            fs.mkdirSync(codebasePath, { recursive: true });
        }

        // Process files
        const total = files.length;
        for (let i = 0; i < total; i++) {
            if (token.isCancellationRequested) {
                throw new Error('Cancelled by user');
            }

            const file = files[i];
            const relPath = path.relative(workspaceFolder.uri.fsPath, file);
            progress.report({ 
                message: `Analyzing ${relPath} (${i + 1}/${total})...`,
                increment: (100 / total)
            });

            try {
                await this.analyzeSingleFile(file, workspaceFolder.uri.fsPath, models[0]);
            } catch (error) {
                console.error(`Failed to analyze ${relPath}:`, error);
                // Continue with next file
            }
        }
    }

    private async discoverFiles(workspacePath: string): Promise<string[]> {
        const files: string[] = [];
        
        // File patterns to include
        const includePatterns = [
            '**/*.py',
            '**/*.ts',
            '**/*.js',
            '**/*.tsx',
            '**/*.jsx',
            '**/*.java',
            '**/*.cs',
            '**/*.go',
            '**/*.rs',
            '**/*.cpp',
            '**/*.c',
            '**/*.h'
        ];

        // Directories to exclude
        const excludePatterns = [
            '**/node_modules/**',
            '**/.venv/**',
            '**/venv/**',
            '**/dist/**',
            '**/build/**',
            '**/out/**',
            '**/__pycache__/**',
            '**/.*',
            '**/docs/**'
        ];

        for (const pattern of includePatterns) {
            const foundFiles = await vscode.workspace.findFiles(pattern, `{${excludePatterns.join(',')}}`);
            files.push(...foundFiles.map(f => f.fsPath));
        }

        return [...new Set(files)]; // Remove duplicates
    }

    private async analyzeSingleFile(
        filePath: string,
        workspacePath: string,
        model: vscode.LanguageModelChat
    ): Promise<void> {
        const content = fs.readFileSync(filePath, 'utf-8');
        const relPath = path.relative(workspacePath, filePath);
        const fileExt = path.extname(filePath);
        
        const prompt = this.buildAnalysisPrompt(relPath, fileExt, content);
        
        const config = vscode.workspace.getConfiguration('luna-encyclopedia');
        const maxTokens = config.get<number>('maxTokens', 4096);
        const temperature = config.get<number>('temperature', 0);
        
        const messages = [
            vscode.LanguageModelChatMessage.User(prompt)
        ];
        
        const response = await model.sendRequest(messages, {
            justification: 'Generating codebase summary for LUNA Encyclopedia'
        });
        
        let fullResponse = '';
        for await (const chunk of response.text) {
            fullResponse += chunk;
        }
        
        // Parse the response to extract both MD and JSON
        const { markdown, json } = this.parseResponse(fullResponse, relPath);
        
        // Save both formats
        this.saveSummary(workspacePath, relPath, markdown, json);
    }
    
    private buildAnalysisPrompt(relPath: string, fileExt: string, content: string): string {
        const truncatedContent = content.length > 8000 ? content.substring(0, 8000) + '\n...[truncated]' : content;
        
        return `Analyze this source file and generate BOTH a Markdown summary AND a JSON structure.

**File**: \`${relPath}\`

**Task**: Create a structured analysis optimized for AI consumption.

**Output Format**: Return your response in TWO parts:

1. First, output JSON wrapped in \`\`\`json markers:
\`\`\`json
{
  "purpose": "One sentence describing what this file does",
  "keyComponents": [
    {"name": "ComponentName", "description": "What it does"},
    {"name": "functionName", "description": "What it does"}
  ],
  "dependencies": {
    "internal": [{"path": "path/to/file.ts", "usage": "What you use from it"}],
    "external": [{"package": "library-name", "usage": "What features you use"}]
  },
  "publicAPI": [
    {"signature": "export function doThing()", "description": "Description"}
  ],
  "codeLinks": [
    {"symbol": "main_function", "path": "${relPath}"}
  ],
  "implementationNotes": "Important patterns, algorithms, or gotchas"
}
\`\`\`

2. Then, output Markdown:
\`\`\`markdown
# ${path.basename(relPath, path.extname(relPath))}

## Purpose
One concise paragraph.

## Key Components
- \`ComponentName\`: Description
- \`functionName()\`: Description

## Dependencies
### Internal
- \`path/to/file.ts\` - Usage

### External
- \`library-name\` - Usage

## Public API
- \`export function doThing()\`: Description

## Code Links
- [main_function](code:${relPath}#symbol=main_function)

## Implementation Notes
Important details.
\`\`\`

**Source code**:
\`\`\`${fileExt.substring(1) || 'txt'}
${truncatedContent}
\`\`\`

Generate the analysis now. Be precise and focus on information useful for AI codebase navigation.`;
    }
    
    private parseResponse(response: string, relPath: string): { markdown: string; json: FileSummary } {
        // Extract JSON block
        const jsonMatch = response.match(/```json\s*([\s\S]*?)```/);
        let json: FileSummary;
        
        if (jsonMatch) {
            try {
                json = JSON.parse(jsonMatch[1].trim());
            } catch {
                // Fallback to empty structure
                json = this.createEmptyStructure();
            }
        } else {
            json = this.createEmptyStructure();
        }
        
        // Extract Markdown block
        const mdMatch = response.match(/```markdown\s*([\s\S]*?)```/);
        let markdown = mdMatch ? mdMatch[1].trim() : response;
        
        // If no markdown block found, use the whole response
        if (!mdMatch) {
            markdown = `# ${path.basename(relPath, path.extname(relPath))}\n\n${response}`;
        }
        
        return { markdown, json };
    }
    
    private createEmptyStructure(): FileSummary {
        return {
            purpose: '',
            keyComponents: [],
            dependencies: { internal: [], external: [] },
            publicAPI: [],
            codeLinks: [],
            implementationNotes: ''
        };
    }
    
    private saveSummary(
        workspacePath: string,
        relPath: string,
        markdown: string,
        json: FileSummary
    ): void {
        const codebasePath = path.join(workspacePath, '.codebase');
        const summaryPath = path.join(codebasePath, relPath);
        const summaryDir = path.dirname(summaryPath);
        
        // Create directory structure
        if (!fs.existsSync(summaryDir)) {
            fs.mkdirSync(summaryDir, { recursive: true });
        }
        
        // Save Markdown
        const mdPath = summaryPath.replace(/\.[^.]+$/, '.md');
        fs.writeFileSync(mdPath, markdown, 'utf-8');
        
        // Save JSON
        const jsonPath = summaryPath.replace(/\.[^.]+$/, '.json');
        const metadata = {
            sourceFile: relPath,
            generatedAt: new Date().toISOString(),
            summary: json
        };
        fs.writeFileSync(jsonPath, JSON.stringify(metadata, null, 2), 'utf-8');
    }
}
