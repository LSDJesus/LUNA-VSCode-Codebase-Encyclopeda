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

        // Step 2: Generate analyses (dead code analysis moved to EnhancedDeadCodeDetector)
        const components = this.generateComponentMap();
        const complexity = this.analyzeComplexity();

        // Step 3: Write output files
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

        // Step 4: Generate dependency graph
        const dependencyGraph = this.generateDependencyGraph();
        fs.writeFileSync(
            path.join(codebasePath, 'dependency-graph.json'),
            JSON.stringify({
                generated: new Date().toISOString(),
                fileCount: this.metadata.size,
                graph: dependencyGraph,
                notes: 'Complete dependency relationships between all files in the codebase.'
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
                        
                        // Summary data is nested under 'summary' field
                        const summary = content.summary || content;
                        
                        if (summary.publicAPI && summary.dependencies) {
                            const relPath = content.sourceFile || path.relative(codebasePath, filePath).replace(/\.json$/, '');
                            const exports = summary.publicAPI.map((api: any) => api.signature?.split('(')[0]?.trim() || '').filter(Boolean);
                            const internalDeps = (summary.dependencies.internal || []).map((dep: any) => {
                                if (typeof dep === 'string') return dep;
                                if (dep && typeof dep === 'object' && dep.path) return String(dep.path);
                                return String(dep || '');
                            }).filter(Boolean);
                            const externalDeps = (summary.dependencies.external || []).map((dep: any) => {
                                if (typeof dep === 'string') return dep;
                                if (dep && typeof dep === 'object') return String(dep.path || dep.package || dep.name || '');
                                return String(dep || '');
                            }).filter(Boolean);
                            
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

    // Dead code analysis moved to EnhancedDeadCodeDetector (uses AST + JSON summaries)
    
    private generateComponentMap(): ComponentGroup[] {
        const components: ComponentGroup[] = [];
        const filesByDirectory = new Map<string, string[]>();
        const uncategorized: string[] = [];
        
        // Group files by their project/component directory
        for (const filePath of this.metadata.keys()) {
            const componentDir = this.detectComponentBoundary(filePath);
            
            if (componentDir) {
                if (!filesByDirectory.has(componentDir)) {
                    filesByDirectory.set(componentDir, []);
                }
                filesByDirectory.get(componentDir)!.push(filePath);
            } else {
                uncategorized.push(filePath);
            }
        }
        
        // Create components from directory groups
        for (const [dirName, files] of filesByDirectory.entries()) {
            if (files.length > 0) {
                // Generate human-readable names
                const componentName = this.humanizeDirectoryName(dirName);
                const description = this.generateComponentDescription(dirName, files);
                
                components.push({
                    name: componentName,
                    description,
                    files
                });
            }
        }
        
        // Add uncategorized files if any
        if (uncategorized.length > 0) {
            components.push({
                name: 'Root Level',
                description: 'Top-level utility files and configurations',
                files: uncategorized
            });
        }
        
        // Sort by number of files (descending)
        components.sort((a, b) => b.files.length - a.files.length);
        
        return components;
    }

    /**
     * Detect component boundary based on project structure
     * For C#: Looks for .csproj project boundaries (e.g., src/MyProject/)
     * For Node: Looks for package.json boundaries
     * For Python: Looks for setup.py / pyproject.toml boundaries
     * Fallback: Top-level directory
     */
    private detectComponentBoundary(filePath: string): string | null {
        const pathParts = filePath.split(/[/\\]/);
        
        if (pathParts.length === 1) {
            return null; // Root file
        }
        
        // C# Project detection: Look for directories that likely contain .csproj
        // Pattern: src/LUNA.Diffusion.Service/... or MyProject.Service/...
        if (pathParts.length >= 2) {
            const secondLevel = pathParts[1];
            
            // C# project naming conventions (Project.Namespace or Solution.Project)
            if (secondLevel.includes('.') && !secondLevel.endsWith('.cs') && 
                !secondLevel.endsWith('.json') && !secondLevel.endsWith('.md')) {
                // Likely a C# project directory (e.g., LUNA.Diffusion.Service)
                return `${pathParts[0]}/${secondLevel}`;
            }
            
            // Check for common C# project patterns
            if (pathParts.length >= 3 && (pathParts[0] === 'src' || pathParts[0] === 'lib')) {
                // Pattern: src/ProjectName/...
                return `${pathParts[0]}/${pathParts[1]}`;
            }
        }
        
        // Node.js: Check if there's a package.json sibling
        // Python: Check for __init__.py or setup.py patterns
        // For now, use top-level as fallback
        return pathParts[0];
    }
    
    private humanizeDirectoryName(dirName: string): string {
        // Convert directory names to human-readable component names
        return dirName
            .split(/[-_]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    
    private generateComponentDescription(dirName: string, files: string[]): string {
        // Generate descriptions based on directory name and file patterns
        const fileNames = files.map(f => f.toLowerCase());
        
        // Common patterns
        if (dirName.includes('api') || dirName.includes('routes') || dirName.includes('controllers')) {
            return 'API endpoints and request handlers';
        }
        if (dirName.includes('models') || dirName.includes('schema')) {
            return 'Data models and database schemas';
        }
        if (dirName.includes('services') || dirName.includes('core')) {
            return 'Business logic and core services';
        }
        if (dirName.includes('utils') || dirName.includes('helpers')) {
            return 'Utility functions and helpers';
        }
        if (dirName.includes('auth') || dirName.includes('security')) {
            return 'Authentication and security';
        }
        if (dirName.includes('tests') || dirName.includes('test')) {
            return 'Test suites and test utilities';
        }
        if (dirName.includes('agents')) {
            return 'AI agents and autonomous components';
        }
        if (dirName.includes('ui') || dirName.includes('views') || dirName.includes('components')) {
            return 'User interface components';
        }
        if (dirName.includes('config')) {
            return 'Configuration and settings';
        }
        if (dirName.includes('mcp-server') || dirName.includes('server')) {
            return 'Server-side components and services';
        }
        
        // Check file contents for hints
        if (fileNames.some(f => f.includes('handler') || f.includes('controller'))) {
            return 'Request handlers and controllers';
        }
        if (fileNames.some(f => f.includes('manager') || f.includes('service'))) {
            return 'Management and service layer';
        }
        if (fileNames.some(f => f.includes('analyzer') || f.includes('parser'))) {
            return 'Analysis and parsing logic';
        }
        
        // Default description
        return `${this.humanizeDirectoryName(dirName)} module`;
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

    private generateDependencyGraph(): Record<string, any> {
        const graph: Record<string, any> = {};

        for (const [filePath, metadata] of this.metadata) {
            const normalizedPath = filePath.replace(/\\/g, '/');
            graph[normalizedPath] = {
                exports: metadata.exports,
                dependencies: metadata.dependencies,
                dependents: Array.from(this.importMap.get(filePath) || new Set())
            };
        }

        return graph;
    }
}
