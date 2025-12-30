import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface QAResult {
    verified: boolean;
    confidence: number;
    issues: string[];
    corrections: Record<string, any>;
}

interface DeadCodeQAResult {
    export: string;
    file: string;
    flaggedAsDead: boolean;
    verifiedUnused: boolean;
    reason: string;
    confidence: number;
}

interface ComplexityQAResult {
    file: string;
    originalScore: number;
    adjustedScore: number;
    reason: string;
    confidence: number;
}

interface StalenessQAResult {
    file: string;
    requiresResummarization: boolean;
    reason: string;
    changeType: 'semantic' | 'syntactic' | 'formatting';
}

export class QualityAssuranceValidator {
    private model: vscode.LanguageModelChat | null = null;

    constructor() {}

    /**
     * Check if AI QA is enabled (from VS Code settings only)
     */
    static isEnabled(workspacePath: string): boolean {
        // Check VS Code global setting
        const config = vscode.workspace.getConfiguration('luna-encyclopedia');
        return config.get<boolean>('enableCopilotQA', true);
    }

    /**
     * Initialize the Copilot model for QA
     */
    private async ensureModel(): Promise<vscode.LanguageModelChat | null> {
        if (this.model) {
            return this.model;
        }

        const config = vscode.workspace.getConfiguration('luna-encyclopedia');
        const modelFamily = config.get<string>('copilotModel', 'gpt-4o');
        
        const models = await vscode.lm.selectChatModels({
            vendor: 'copilot',
            family: modelFamily
        });

        if (models.length > 0) {
            this.model = models[0];
        }

        return this.model;
    }

    /**
     * QA for Dead Code Analysis - Verify if exports are truly unused
     */
    async validateDeadCode(
        deadCodeAnalysis: any,
        workspacePath: string,
        progress?: vscode.Progress<{ message?: string }>
    ): Promise<DeadCodeQAResult[]> {
        const model = await this.ensureModel();
        if (!model) {
            console.warn('No Copilot model available for QA');
            return [];
        }

        const results: DeadCodeQAResult[] = [];
        const orphanedExports = deadCodeAnalysis.orphanedExports || [];

        // Batch process to reduce API calls (groups of 5)
        const batchSize = 5;
        for (let i = 0; i < orphanedExports.length; i += batchSize) {
            const batch = orphanedExports.slice(i, i + batchSize);
            
            progress?.report({ 
                message: `QA: Validating dead code (${i + 1}-${Math.min(i + batchSize, orphanedExports.length)}/${orphanedExports.length})...` 
            });

            const prompt = `You are a code quality analyst. Review these exports flagged as "dead code" (unused).

For each export, determine if it's TRULY unused or if it might be:
1. Used via framework magic (decorators, middleware, plugins)
2. Exported for external consumers (API, library interface)
3. Called via reflection or dynamic import
4. Part of a class that's instantiated elsewhere
5. Used in test files not analyzed

Exports to verify:
${JSON.stringify(batch, null, 2)}

Workspace: ${path.basename(workspacePath)}

Respond with JSON array:
\`\`\`json
[
  {
    "export": "export_name",
    "file": "file_path",
    "verifiedUnused": true/false,
    "reason": "Explanation",
    "confidence": 0.0-1.0
  }
]
\`\`\``;

            try {
                const messages = [vscode.LanguageModelChatMessage.User(prompt)];
                const response = await model.sendRequest(messages, {});
                
                let responseText = '';
                for await (const chunk of response.text) {
                    responseText += chunk;
                }

                // Extract JSON from response
                const jsonMatch = responseText.match(/```json\s*([\s\S]*?)```/);
                if (jsonMatch) {
                    const qaResults = JSON.parse(jsonMatch[1]);
                    for (const result of qaResults) {
                        results.push({
                            export: result.export,
                            file: result.file,
                            flaggedAsDead: true,
                            verifiedUnused: result.verifiedUnused,
                            reason: result.reason,
                            confidence: result.confidence
                        });
                    }
                }
            } catch (error) {
                console.error('Dead code QA failed for batch:', error);
            }
        }

        return results;
    }

    /**
     * QA for Complexity Scores - Validate if scores match actual code patterns
     */
    async validateComplexity(
        complexityHeatmap: any,
        workspacePath: string,
        progress?: vscode.Progress<{ message?: string }>
    ): Promise<ComplexityQAResult[]> {
        const model = await this.ensureModel();
        if (!model) {
            return [];
        }

        const results: ComplexityQAResult[] = [];
        const highComplexityFiles = (complexityHeatmap.complexity || [])
            .filter((c: any) => c.totalScore >= 6);

        // Sample top 10 for QA (to limit API calls)
        const filesToCheck = highComplexityFiles.slice(0, 10);

        progress?.report({ 
            message: `QA: Validating complexity scores (${filesToCheck.length} files)...` 
        });

        for (const fileData of filesToCheck) {
            const filePath = path.join(workspacePath, fileData.file);
            if (!fs.existsSync(filePath)) continue;

            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const truncated = content.length > 3000 ? content.substring(0, 3000) + '\n...[truncated]' : content;

                const prompt = `You are a code complexity analyst. Review this file's complexity score.

File: ${fileData.file}
Current Scores:
- Coupling: ${fileData.coupling}/3 (dependencies count)
- Impact: ${fileData.impact}/3 (files that depend on it)
- Volatility: ${fileData.volatility}/4 (likely to change)
- Total: ${fileData.totalScore}/10
- Recommendation: ${fileData.recommendation}

Code:
\`\`\`
${truncated}
\`\`\`

Evaluate:
1. Does this score seem accurate?
2. Is the recommendation (${fileData.recommendation}) appropriate?
3. Should the score be adjusted?

Respond with JSON:
\`\`\`json
{
  "originalScore": ${fileData.totalScore},
  "adjustedScore": <your recommended score 0-10>,
  "reason": "Explanation",
  "confidence": 0.0-1.0
}
\`\`\``;

                const messages = [vscode.LanguageModelChatMessage.User(prompt)];
                const response = await model.sendRequest(messages, {});
                
                let responseText = '';
                for await (const chunk of response.text) {
                    responseText += chunk;
                }

                const jsonMatch = responseText.match(/```json\s*([\s\S]*?)```/);
                if (jsonMatch) {
                    const qaResult = JSON.parse(jsonMatch[1]);
                    results.push({
                        file: fileData.file,
                        originalScore: fileData.totalScore,
                        adjustedScore: qaResult.adjustedScore,
                        reason: qaResult.reason,
                        confidence: qaResult.confidence
                    });
                }
            } catch (error) {
                console.error(`Complexity QA failed for ${fileData.file}:`, error);
            }
        }

        return results;
    }

    /**
     * QA for Staleness Detection - Determine if change requires re-summarization
     */
    async validateStaleness(
        changedFiles: { filePath: string; oldContent: string; newContent: string }[],
        progress?: vscode.Progress<{ message?: string }>
    ): Promise<StalenessQAResult[]> {
        const model = await this.ensureModel();
        if (!model) {
            return [];
        }

        const results: StalenessQAResult[] = [];

        // Batch process
        const batchSize = 3;
        for (let i = 0; i < changedFiles.length; i += batchSize) {
            const batch = changedFiles.slice(i, i + batchSize);
            
            progress?.report({ 
                message: `QA: Analyzing change semantics (${i + 1}-${Math.min(i + batchSize, changedFiles.length)}/${changedFiles.length})...` 
            });

            for (const file of batch) {
                try {
                    // Create a diff summary (simplified)
                    const oldLines = file.oldContent.split('\n').length;
                    const newLines = file.newContent.split('\n').length;
                    const lineDiff = Math.abs(newLines - oldLines);

                    const prompt = `You are a code change analyzer. Determine if this file change requires re-summarization.

File: ${file.filePath}
Lines changed: ~${lineDiff}

Old content (first 1000 chars):
\`\`\`
${file.oldContent.substring(0, 1000)}
\`\`\`

New content (first 1000 chars):
\`\`\`
${file.newContent.substring(0, 1000)}
\`\`\`

Classify the change:
- "semantic": Logic changed, API changed, behavior different - NEEDS re-summary
- "syntactic": Variable renames, refactoring same logic - MIGHT need re-summary
- "formatting": Whitespace, comments only - NO re-summary needed

Respond with JSON:
\`\`\`json
{
  "requiresResummarization": true/false,
  "changeType": "semantic|syntactic|formatting",
  "reason": "Explanation"
}
\`\`\``;

                    const messages = [vscode.LanguageModelChatMessage.User(prompt)];
                    const response = await model.sendRequest(messages, {});
                    
                    let responseText = '';
                    for await (const chunk of response.text) {
                        responseText += chunk;
                    }

                    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)```/);
                    if (jsonMatch) {
                        const qaResult = JSON.parse(jsonMatch[1]);
                        results.push({
                            file: file.filePath,
                            requiresResummarization: qaResult.requiresResummarization,
                            reason: qaResult.reason,
                            changeType: qaResult.changeType
                        });
                    }
                } catch (error) {
                    console.error(`Staleness QA failed for ${file.filePath}:`, error);
                }
            }
        }

        return results;
    }

    /**
     * QA for Component Categorization - Validate file groupings make sense
     */
    async validateComponentMap(
        componentMap: any,
        workspacePath: string,
        progress?: vscode.Progress<{ message?: string }>
    ): Promise<QAResult> {
        const model = await this.ensureModel();
        if (!model) {
            return { verified: false, confidence: 0, issues: ['No Copilot model available'], corrections: {} };
        }

        progress?.report({ message: 'QA: Validating component categorization...' });

        const prompt = `You are a software architect. Review this component grouping for a codebase.

Project: ${path.basename(workspacePath)}

Current Component Map:
${JSON.stringify(componentMap.components, null, 2)}

Evaluate:
1. Do these groupings make architectural sense?
2. Are files in the right categories?
3. Are there files that should be moved?
4. Are any categories misnamed or redundant?

Respond with JSON:
\`\`\`json
{
  "verified": true/false,
  "confidence": 0.0-1.0,
  "issues": ["list of problems"],
  "corrections": {
    "misplacedFiles": [{"file": "path", "currentGroup": "X", "suggestedGroup": "Y"}],
    "suggestedRenames": [{"from": "Old Name", "to": "Better Name"}]
  }
}
\`\`\``;

        try {
            const messages = [vscode.LanguageModelChatMessage.User(prompt)];
            const response = await model.sendRequest(messages, {});
            
            let responseText = '';
            for await (const chunk of response.text) {
                responseText += chunk;
            }

            const jsonMatch = responseText.match(/```json\s*([\s\S]*?)```/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[1]);
            }
        } catch (error) {
            console.error('Component map QA failed:', error);
        }

        return { verified: false, confidence: 0, issues: ['QA check failed'], corrections: {} };
    }

    /**
     * Write QA results to a separate file for transparency
     */
    static writeQAReport(
        workspacePath: string,
        deadCodeQA: DeadCodeQAResult[],
        complexityQA: ComplexityQAResult[],
        componentQA: QAResult
    ): void {
        const codebasePath = path.join(workspacePath, '.codebase');
        const reportPath = path.join(codebasePath, 'QA_REPORT.json');

        const report = {
            generated: new Date().toISOString(),
            enabled: true,
            deadCodeAnalysis: {
                reviewed: deadCodeQA.length,
                falsePositives: deadCodeQA.filter(r => !r.verifiedUnused).length,
                results: deadCodeQA
            },
            complexityAnalysis: {
                reviewed: complexityQA.length,
                adjustments: complexityQA.filter(r => r.originalScore !== r.adjustedScore).length,
                results: complexityQA
            },
            componentCategorization: componentQA
        };

        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    }
}
