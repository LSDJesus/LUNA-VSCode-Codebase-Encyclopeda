import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { IgnorePatternMatcher } from './ignorePatternMatcher';
import { BootstrapGuideGenerator } from './bootstrapGuideGenerator';
import { DirectoryTreeBuilder } from './directoryTreeBuilder';
import { StalenessDetector } from './stalenessDetector';
import { DependencyLinker } from './dependencyLinker';

interface FileSummary {
    purpose: string;
    keyComponents: Array<{ 
        name: string; 
        description: string;
        lines?: string; // e.g., "123-168" or "42"
    }>;
    dependencies: {
        internal: Array<{ 
            path: string; 
            usage: string;
            lines?: string; // Where the import/usage occurs
        }>;
        external: Array<{ 
            package: string; 
            usage: string;
            lines?: string; // Where the import/usage occurs
        }>;
    };
    publicAPI: Array<{ 
        signature: string; 
        description: string;
        lines?: string; // Where this API is defined
    }>;
    codeLinks: Array<{ 
        symbol: string; 
        path: string;
        lines?: string; // Line range for this symbol
    }>;
    usedBy?: Array<{
        file: string;
        usage: string;
        lines?: string; // Where this file is used by the other file
    }>;
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

    async updateStaleSummaries(
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
            throw new Error(`No Copilot model "${modelName}" available.`);
        }

        // Discover files
        progress.report({ message: 'Discovering files...' });
        const files = await this.discoverFiles(workspaceFolder.uri.fsPath);
        
        if (files.length === 0) {
            throw new Error('No source files found');
        }

        // Check staleness
        progress.report({ message: 'Checking for stale summaries...' });
        const report = StalenessDetector.getStalenessReport(workspaceFolder.uri.fsPath, files);

        if (report.staleFiles.length === 0) {
            vscode.window.showInformationMessage(`All ${report.total} summaries are up-to-date! ✅`);
            return;
        }

        const updateConfirm = await vscode.window.showInformationMessage(
            `Found ${report.staleFiles.length} stale summaries (${report.missing} missing, ${report.stale} outdated). Update?`,
            'Yes', 'No'
        );

        if (updateConfirm !== 'Yes') {
            return;
        }

        // Update only stale files
        const total = report.staleFiles.length;
        for (let i = 0; i < total; i++) {
            if (token.isCancellationRequested) {
                throw new Error('Cancelled by user');
            }

            const staleInfo = report.staleFiles[i];
            const relPath = path.relative(workspaceFolder.uri.fsPath, staleInfo.filePath);
            progress.report({ 
                message: `[${i + 1}/${total}] ${relPath}`,
                increment: (100 / total)
            });

            try {
                await this.analyzeSingleFile(staleInfo.filePath, workspaceFolder.uri.fsPath, models[0]);
            } catch (error) {
                console.error(`Failed to update ${relPath}:`, error);
                // Continue with next file
            }
        }
    }

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
        
        // Generate bootstrap guide
        const guideContent = BootstrapGuideGenerator.generateGuide(workspaceFolder.uri.fsPath);
        const guidePath = path.join(codebasePath, 'LUNA_GUIDE.md');
        fs.writeFileSync(guidePath, guideContent, 'utf-8');

        // Build directory tree and create placeholders
        progress.report({ message: `Building directory tree (${files.length} files)...` });
        const ignoreMatcher = new IgnorePatternMatcher(workspaceFolder.uri.fsPath);
        const tree = DirectoryTreeBuilder.buildTree(workspaceFolder.uri.fsPath, files, []);

        progress.report({ message: 'Creating file structure...' });
        DirectoryTreeBuilder.createPlaceholders(workspaceFolder.uri.fsPath, tree, files);

        // Get files in bottom-up order (deepest first)
        const orderedFiles = DirectoryTreeBuilder.getFilesBottomUp(tree);

        // Analyze files (bottom-up)
        const total = orderedFiles.length;
        for (let i = 0; i < total; i++) {
            if (token.isCancellationRequested) {
                throw new Error('Cancelled by user');
            }

            const file = orderedFiles[i];
            const relPath = path.relative(workspaceFolder.uri.fsPath, file);
            progress.report({ 
                message: `[${i + 1}/${total}] ${relPath}`,
                increment: (100 / total)
            });

            try {
                await this.analyzeSingleFile(file, workspaceFolder.uri.fsPath, models[0]);
            } catch (error) {
                console.error(`Failed to analyze ${relPath}:`, error);
                // Continue with next file
            }
        }

        // Generate INDEX.md files for directories (bottom-up)
        progress.report({ message: 'Generating directory indices...' });
        const directories = DirectoryTreeBuilder.getDirectoriesBottomUp(tree);
        for (const dir of directories) {
            if (token.isCancellationRequested) {
                throw new Error('Cancelled by user');
            }
            await this.generateDirectoryIndex(dir, workspaceFolder.uri.fsPath, tree);
        }

        // Generate root INDEX.md
        progress.report({ message: 'Generating root index...' });
        await this.generateRootIndex(tree, workspaceFolder.uri.fsPath);

        // Compute bidirectional "Used By" relationships
        progress.report({ message: 'Computing dependency relationships...' });
        DependencyLinker.computeUsedByRelationships(workspaceFolder.uri.fsPath, codebasePath);
    }

    private async discoverFiles(workspacePath: string): Promise<string[]> {
        const files: string[] = [];
        const ignoreMatcher = new IgnorePatternMatcher(workspacePath);
        
        // Get configured file types
        const config = vscode.workspace.getConfiguration('luna-encyclopedia');
        const includeExtensions = config.get<string[]>('fileTypesToInclude', [
            'ts', 'tsx', 'js', 'jsx', 'py', 'java', 'cs', 'go', 'rs', 'cpp', 'c', 'h', 'hpp'
        ]);
        const excludePatterns = config.get<string[]>('fileTypesToExclude', [
            'd.ts', 'test.ts', 'spec.ts', 'test.js', 'spec.js', 'min.js', 'min.css'
        ]);
        
        // Build include patterns from configured extensions
        const includeGlobPatterns = includeExtensions.map(ext => `**/*.${ext}`);

        // Directories to exclude (baseline)
        const excludeDirPatterns = [
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

        for (const pattern of includeGlobPatterns) {
            const foundFiles = await vscode.workspace.findFiles(pattern, `{${excludeDirPatterns.join(',')}}`);
            for (const file of foundFiles) {
                const filePath = file.fsPath;
                const fileName = path.basename(filePath);
                
                // Check if file should be included (respects [include] section)
                if (!ignoreMatcher.shouldInclude(filePath, workspacePath)) {
                    continue;
                }
                
                // Check against .lunasummarize [exclude] patterns
                if (ignoreMatcher.shouldExclude(filePath, workspacePath)) {
                    continue;
                }
                
                // Check against file type exclusions
                let shouldExclude = false;
                for (const excludePattern of excludePatterns) {
                    if (fileName.endsWith(excludePattern)) {
                        shouldExclude = true;
                        break;
                    }
                }
                
                if (!shouldExclude) {
                    files.push(filePath);
                }
            }
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

**CRITICAL**: For EVERY component, function, class, and dependency, you MUST include the exact line numbers where they appear in the source code. Use the format "lines": "123-168" for ranges or "lines": "42" for single lines.

**Task**: Create a structured analysis optimized for AI agent consumption.

**Output Format**: Return your response in TWO parts:

1. First, output JSON wrapped in \`\`\`json markers:
\`\`\`json
{
  "purpose": "One sentence describing what this file does",
  "keyComponents": [
    {"name": "ComponentName", "description": "What it does", "lines": "10-45"},
    {"name": "functionName", "description": "What it does", "lines": "50"}
  ],
  "dependencies": {
    "internal": [{"path": "path/to/file.ts", "usage": "What you use from it", "lines": "3"}],
    "external": [{"package": "library-name", "usage": "What features you use", "lines": "1-2"}]
  },
  "publicAPI": [
    {"signature": "export function doThing()", "description": "Description", "lines": "100-120"}
  ],
  "codeLinks": [
    {"symbol": "main_function", "path": "${relPath}", "lines": "100-120"}
  ],
  "implementationNotes": "Important patterns, algorithms, or gotchas"
}
\`\`\`

2. Then, output Markdown with navigation links:
\`\`\`markdown
# ${path.basename(relPath, path.extname(relPath))}

## Purpose
One concise paragraph.

## Key Components
- [\`ComponentName\`](vscode://file/${relPath}?line=10) (lines 10-45): Description
- [\`functionName()\`](vscode://file/${relPath}?line=50) (line 50): Description

## Dependencies
### Internal
- [\`path/to/file.ts\`](vscode://file/path/to/file.ts) (line 3) - Usage

### External
- \`library-name\` (lines 1-2) - Usage

## Public API
- [\`export function doThing()\`](vscode://file/${relPath}?line=100) (lines 100-120): Description

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

    private async generateDirectoryIndex(
        dir: any,  // DirectoryNode
        workspacePath: string,
        tree: any  // DirectoryNode
    ): Promise<void> {
        const relativePath = path.relative(workspacePath, dir.path);
        const codebasePath = path.join(workspacePath, '.codebase');
        const indexPath = path.join(codebasePath, relativePath, 'INDEX.md');

        // Build directory summary
        const dirName = dir.name;
        let indexContent = `# ${dirName}/\n\n## Overview\n\n`;

        // List files in this directory
        if (dir.files && dir.files.length > 0) {
            indexContent += `### Files\n\n`;
            for (const filePath of dir.files.sort()) {
                const fileName = path.basename(filePath);
                const fileRelPath = path.relative(workspacePath, filePath);
                const summaryRelPath = path.relative(dir.path, filePath).replace(/\.[^.]+$/, '.md');
                
                // Try to read the file's summary for description
                const mdPath = path.join(codebasePath, fileRelPath.replace(/\.[^.]+$/, '.md'));
                let description = '(auto-generated summary)';
                
                if (fs.existsSync(mdPath)) {
                    const content = fs.readFileSync(mdPath, 'utf-8');
                    const purposeMatch = content.match(/## Purpose\n\n(.+?)(?:\n|$)/);
                    if (purposeMatch) {
                        description = purposeMatch[1];
                    }
                }

                indexContent += `- [${fileName}](${summaryRelPath}) — ${description}\n`;
            }
        }

        // List subdirectories
        if (dir.subdirs && dir.subdirs.length > 0) {
            indexContent += `\n### Subdirectories\n\n`;
            for (const subdir of dir.subdirs) {
                const subdirRelPath = path.relative(dir.path, subdir.path);
                indexContent += `- [${subdir.name}/](${subdirRelPath}/INDEX.md) — (${subdir.files.length} files)\n`;
            }
        }

        indexContent += `\n## Notes\n\nAuto-generated directory index. See [../INDEX.md](../INDEX.md) for project overview.\n`;

        // Write INDEX.md
        const indexDir = path.dirname(indexPath);
        if (!fs.existsSync(indexDir)) {
            fs.mkdirSync(indexDir, { recursive: true });
        }
        fs.writeFileSync(indexPath, indexContent, 'utf-8');
    }

    private async generateRootIndex(
        tree: any,  // DirectoryNode
        workspacePath: string
    ): Promise<void> {
        const codebasePath = path.join(workspacePath, '.codebase');
        const indexPath = path.join(codebasePath, 'INDEX.md');

        let indexContent = `# Codebase Summaries Index\n\n`;
        indexContent += `**Project**: ${path.basename(workspacePath)}\n`;
        indexContent += `**Generated**: ${new Date().toISOString()}\n\n`;

        indexContent += `## Structure\n\n`;

        // List top-level subdirectories
        if (tree.subdirs && tree.subdirs.length > 0) {
            for (const subdir of tree.subdirs) {
                const fileCounts = `(${subdir.files.length} files`;
                const subCounts = subdir.subdirs.length > 0 ? `, ${subdir.subdirs.length} subdirs` : '';
                indexContent += `- [${subdir.name}/](${subdir.name}/INDEX.md) ${fileCounts}${subCounts})\n`;
            }
        }

        indexContent += `\n## Quick Navigation\n\n`;
        indexContent += `See individual INDEX.md files in each directory for detailed file listings and descriptions.\n`;
        indexContent += `Start with [../README.md](../README.md) for project documentation.\n`;

        fs.writeFileSync(indexPath, indexContent, 'utf-8');
    }
}

