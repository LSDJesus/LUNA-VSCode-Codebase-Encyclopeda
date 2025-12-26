import * as fs from 'fs';
import * as path from 'path';

interface FileMetadata {
    filePath: string;
    exports: string[];
    dependencies: {
        internal: string[];
        external: string[];
    };
    fileSize: number;
}

interface OrphanedExport {
    file: string;
    export: string;
    type: string;
}

interface ComponentGroup {
    name: string;
    description: string;
    files: string[];
}

interface ComplexityScore {
    file: string;
    coupling: number;
    impact: number;
    volatility: number;
    totalScore: number;
    recommendation: string;
}

export class DependencyAnalyzer {
    private metadata: Map<string, FileMetadata> = new Map();
    private importMap: Map<string, Set<string>> = new Map(); // file -> imports this file

    async analyze(workspacePath: string): Promise<void> {
        const codebasePath = path.join(workspacePath, '.codebase');

        // Step 1: Load all file JSON summaries
        await this.loadMetadata(codebasePath);

        // Step 2: Generate analyses
        const deadCode = this.analyzeDeadCode();
        const components = this.generateComponentMap();
        const complexity = this.analyzeComplexity();

        // Step 3: Write output files
        fs.writeFileSync(
            path.join(codebasePath, 'dead-code-analysis.json'),
            JSON.stringify({
                generated: new Date().toISOString(),
                summary: {
                    totalExports: Array.from(this.metadata.values()).reduce((sum, m) => sum + m.exports.length, 0),
                    orphanedExports: deadCode.length,
                    orphanageRate: deadCode.length > 0 ? '⚠️ Found dead code' : '✅ No dead code detected'
                },
                orphanedExports: deadCode,
                notes: 'Exports that are defined but never imported elsewhere. Consider removing or making internal.'
            }, null, 2),
            'utf-8'
        );

        fs.writeFileSync(
            path.join(codebasePath, 'component-map.json'),
            JSON.stringify({
                generated: new Date().toISOString(),
                components,
                notes: 'Suggested logical grouping of files. Use to understand architecture and refactoring opportunities.'
            }, null, 2),
            'utf-8'
        );

        fs.writeFileSync(
            path.join(codebasePath, 'complexity-heatmap.json'),
            JSON.stringify({
                generated: new Date().toISOString(),
                summary: {
                    totalFiles: this.metadata.size,
                    highComplexity: complexity.filter(c => c.totalScore > 7).length,
                    recommendedForRefactoring: complexity.filter(c => c.recommendation === 'REFACTOR').length
                },
                complexity: complexity.sort((a, b) => b.totalScore - a.totalScore),
                recommendations: this.generateRefactoringRecommendations(complexity),
                scoring: {
                    coupling: 'Number of internal dependencies (0-3 points)',
                    impact: 'Number of files that depend on this file (0-3 points)',
                    volatility: 'File size in KB normalized (0-4 points)',
                    totalScore: 'Sum of all scores (0-10 points)'
                }
            }, null, 2),
            'utf-8'
        );
    }

    private async loadMetadata(codebasePath: string): Promise<void> {
        const walkDir = (dir: string, basePath: string) => {
            const files = fs.readdirSync(dir);
            
            for (const file of files) {
                if (file.endsWith('.json') && !file.includes('.index.json')) {
                    const filePath = path.join(dir, file);
                    try {
                        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                        const relPath = path.relative(codebasePath, filePath).replace(/\.json$/, '');
                        
                        if (content.publicAPI && content.dependencies) {
                            const exports = content.publicAPI.map((api: any) => api.signature.split('(')[0].trim());
                            const internalDeps = content.dependencies.internal || [];
                            const externalDeps = content.dependencies.external || [];
                            
                            const metadata: FileMetadata = {
                                filePath: relPath,
                                exports,
                                dependencies: {
                                    internal: internalDeps,
                                    external: externalDeps
                                },
                                fileSize: 0 // Could enhance by reading actual file
                            };
                            
                            this.metadata.set(relPath, metadata);
                            
                            // Build reverse dependency map
                            for (const dep of internalDeps) {
                                if (!this.importMap.has(dep)) {
                                    this.importMap.set(dep, new Set());
                                }
                                this.importMap.get(dep)!.add(relPath);
                            }
                        }
                    } catch (error) {
                        console.warn(`Failed to parse ${filePath}:`, error);
                    }
                }
                
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory() && !file.startsWith('.')) {
                    walkDir(fullPath, basePath);
                }
            }
        };
        
        walkDir(codebasePath, codebasePath);
    }

    private analyzeDeadCode(): OrphanedExport[] {
        const orphaned: OrphanedExport[] = [];

        for (const [filePath, metadata] of this.metadata) {
            for (const exportName of metadata.exports) {
                // Check if this export is used anywhere
                const isUsed = Array.from(this.metadata.values()).some(m => 
                    m.dependencies.internal.some(dep => 
                        dep.includes(exportName) || dep.includes(filePath)
                    )
                );

                if (!isUsed && exportName !== 'activate' && exportName !== 'deactivate') {
                    orphaned.push({
                        file: filePath,
                        export: exportName,
                        type: 'unused_export'
                    });
                }
            }
        }

        return orphaned;
    }

    private generateComponentMap(): ComponentGroup[] {
        const components: ComponentGroup[] = [
            {
                name: 'Core Analysis',
                description: 'Main codebase analysis and summary generation',
                files: Array.from(this.metadata.keys()).filter(f => 
                    f.includes('codebaseAnalyzer') || f.includes('dependencyLinker') || f.includes('staticImportAnalyzer')
                )
            },
            {
                name: 'UI Components',
                description: 'VS Code UI integration (panels, tree views)',
                files: Array.from(this.metadata.keys()).filter(f => 
                    f.includes('summaryPanel') || f.includes('summaryTreeProvider')
                )
            },
            {
                name: 'Configuration & Discovery',
                description: 'File discovery, ignore patterns, bootstrap',
                files: Array.from(this.metadata.keys()).filter(f => 
                    f.includes('summaryIncludeMatcher') || f.includes('directoryTreeBuilder') || f.includes('bootstrapGuideGenerator') || f.includes('gitBranchDetector')
                )
            },
            {
                name: 'Utilities & Helpers',
                description: 'Reusable utilities and helper functions',
                files: Array.from(this.metadata.keys()).filter(f => 
                    f.includes('concurrencyLimiter') || f.includes('stalenessDetector') || f.includes('summaryIssueTracker')
                )
            },
            {
                name: 'Integration & Navigation',
                description: 'Code navigation, URI handlers, MCP integration',
                files: Array.from(this.metadata.keys()).filter(f => 
                    f.includes('codeNavigationHandler') || f.includes('extension')
                )
            }
        ];

        return components;
    }

    private analyzeComplexity(): ComplexityScore[] {
        const scores: ComplexityScore[] = [];

        for (const [filePath, metadata] of this.metadata) {
            // Coupling: how many internal dependencies does this file have?
            const coupling = Math.min(3, metadata.dependencies.internal.length);

            // Impact: how many files depend on this file?
            const impact = Math.min(3, this.importMap.get(filePath)?.size || 0);

            // Volatility: file size (larger files more likely to need changes)
            // Estimate from dependency graph and exports
            const volatility = Math.min(4, Math.floor((metadata.exports.length + metadata.dependencies.internal.length) / 2));

            const totalScore = coupling + impact + volatility;
            
            let recommendation = 'OK';
            if (totalScore >= 8) {
                recommendation = 'REFACTOR';
            } else if (totalScore >= 6) {
                recommendation = 'CONSIDER_REFACTOR';
            }

            scores.push({
                file: filePath,
                coupling,
                impact,
                volatility,
                totalScore,
                recommendation
            });
        }

        return scores;
    }

    private generateRefactoringRecommendations(complexity: ComplexityScore[]): string[] {
        const recommendations: string[] = [];
        const refactorCandidates = complexity.filter(c => c.recommendation === 'REFACTOR');

        if (refactorCandidates.length > 0) {
            const topFile = refactorCandidates[0];
            recommendations.push(
                `🔴 HIGH PRIORITY: ${topFile.file} (score: ${topFile.totalScore}/10)`,
                `   - High coupling: depends on ${topFile.coupling * 3}-${topFile.coupling * 4} modules`,
                `   - High impact: ${topFile.impact * 3}-${topFile.impact * 4} files depend on it`,
                `   - Consider splitting into smaller, focused modules`
            );
        }

        const considerCandidates = complexity.filter(c => c.recommendation === 'CONSIDER_REFACTOR');
        if (considerCandidates.length > 0) {
            recommendations.push(`⚠️  CONSIDER: ${considerCandidates.slice(0, 3).map(c => c.file).join(', ')}`);
        }

        if (refactorCandidates.length === 0) {
            recommendations.push('✅ All files have reasonable complexity. Good job!');
        }

        return recommendations;
    }
}
