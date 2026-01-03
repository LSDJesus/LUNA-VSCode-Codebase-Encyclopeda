import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

interface FileSummary {
    purpose: string;
    keyComponents: Array<{ name: string; description: string; lines: string }>;
    dependencies: {
        internal: Array<{ path: string; lines?: string }>;
        external: Array<{ name: string; version?: string }>;
    };
    publicAPI: Array<{
        name: string;
        signature: string;
        description: string;
        inputTypes?: Record<string, string>;
        returnType?: string;
        lines?: string;
    }>;
}

interface ExportInfo {
    name: string;
    type: 'class' | 'function' | 'interface' | 'type' | 'const' | 'variable' | 'unknown';
    file: string;
    line?: number;
}

interface ImportInfo {
    importedName: string;
    fromPath: string;
    file: string;
    line?: number;
}

interface OrphanedExport {
    file: string;
    export: string;
    type: string;
    reason?: string;
}

export class EnhancedDeadCodeDetector {
    private exports: Map<string, ExportInfo[]> = new Map(); // file -> exports
    private imports: Map<string, ImportInfo[]> = new Map(); // file -> imports
    private summaries: Map<string, FileSummary> = new Map(); // file -> JSON summary
    private workspacePath: string = '';

    /**
     * Analyze dead code using JSON summaries + AST parsing
     */
    async analyze(codebasePath: string, workspacePath: string): Promise<OrphanedExport[]> {
        this.workspacePath = workspacePath;

        // Step 1: Load all JSON summaries
        await this.loadSummaries(codebasePath);

        // Step 2: Extract exports and imports via AST
        await this.extractExportsAndImports(codebasePath);

        // Step 3: Find orphaned exports
        return this.findOrphanedExports();
    }

    /**
     * Load all .json summary files from .codebase directory
     */
    private async loadSummaries(codebasePath: string): Promise<void> {
        const loadFromDir = (dir: string) => {
            if (!fs.existsSync(dir)) return;

            const items = fs.readdirSync(dir);
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory() && !item.startsWith('.')) {
                    loadFromDir(fullPath);
                } else if (item.endsWith('.json') && !item.endsWith('.index.json')) {
                    // Skip meta files
                    if (['dead-code-analysis.json', 'complexity-heatmap.json', 
                         'component-map.json', 'dependency-graph.json', 'QA_REPORT.json'].includes(item)) {
                        continue;
                    }

                    try {
                        const content = fs.readFileSync(fullPath, 'utf-8');
                        const summary: FileSummary = JSON.parse(content);
                        
                        // Get relative path from .codebase
                        const relPath = path.relative(codebasePath, fullPath).replace(/\.json$/, '');
                        this.summaries.set(relPath, summary);
                    } catch (error) {
                        console.warn(`Failed to load summary: ${fullPath}`, error);
                    }
                }
            }
        };

        loadFromDir(codebasePath);
    }

    /**
     * Extract exports and imports from source files using TypeScript AST
     */
    private async extractExportsAndImports(codebasePath: string): Promise<void> {
        for (const [relPath, summary] of this.summaries) {
            const sourceFile = path.join(this.workspacePath, relPath);
            
            if (!fs.existsSync(sourceFile)) continue;

            const fileExt = path.extname(sourceFile).toLowerCase();
            
            // Use appropriate parser
            if (fileExt === '.ts' || fileExt === '.tsx' || fileExt === '.js' || fileExt === '.jsx') {
                this.extractTypeScriptExportsImports(sourceFile, relPath);
            } else if (fileExt === '.py') {
                this.extractPythonExportsImports(sourceFile, relPath);
            }
        }
    }

    /**
     * Extract TypeScript/JavaScript exports and imports using TS compiler API
     */
    private extractTypeScriptExportsImports(sourceFile: string, relPath: string): void {
        try {
            const content = fs.readFileSync(sourceFile, 'utf-8');
            const sourceFileNode = ts.createSourceFile(
                sourceFile,
                content,
                ts.ScriptTarget.Latest,
                true
            );

            const fileExports: ExportInfo[] = [];
            const fileImports: ImportInfo[] = [];

            const visit = (node: ts.Node) => {
                // Extract exports
                if (ts.isExportDeclaration(node)) {
                    if (node.exportClause && ts.isNamedExports(node.exportClause)) {
                        for (const element of node.exportClause.elements) {
                            fileExports.push({
                                name: element.name.text,
                                type: 'unknown',
                                file: relPath,
                                line: sourceFileNode.getLineAndCharacterOfPosition(node.getStart()).line + 1
                            });
                        }
                    }
                } else if (ts.isFunctionDeclaration(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
                    if (node.name) {
                        fileExports.push({
                            name: node.name.text,
                            type: 'function',
                            file: relPath,
                            line: sourceFileNode.getLineAndCharacterOfPosition(node.getStart()).line + 1
                        });
                    }
                } else if (ts.isClassDeclaration(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
                    if (node.name) {
                        fileExports.push({
                            name: node.name.text,
                            type: 'class',
                            file: relPath,
                            line: sourceFileNode.getLineAndCharacterOfPosition(node.getStart()).line + 1
                        });
                    }
                } else if (ts.isInterfaceDeclaration(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
                    fileExports.push({
                        name: node.name.text,
                        type: 'interface',
                        file: relPath,
                        line: sourceFileNode.getLineAndCharacterOfPosition(node.getStart()).line + 1
                    });
                } else if (ts.isTypeAliasDeclaration(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
                    fileExports.push({
                        name: node.name.text,
                        type: 'type',
                        file: relPath,
                        line: sourceFileNode.getLineAndCharacterOfPosition(node.getStart()).line + 1
                    });
                } else if (ts.isVariableStatement(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
                    for (const declaration of node.declarationList.declarations) {
                        if (ts.isIdentifier(declaration.name)) {
                            fileExports.push({
                                name: declaration.name.text,
                                type: ts.getCombinedNodeFlags(node.declarationList) & ts.NodeFlags.Const ? 'const' : 'variable',
                                file: relPath,
                                line: sourceFileNode.getLineAndCharacterOfPosition(node.getStart()).line + 1
                            });
                        }
                    }
                }

                // Extract imports
                if (ts.isImportDeclaration(node)) {
                    const moduleSpecifier = node.moduleSpecifier;
                    if (ts.isStringLiteral(moduleSpecifier)) {
                        const fromPath = moduleSpecifier.text;
                        const line = sourceFileNode.getLineAndCharacterOfPosition(node.getStart()).line + 1;

                        if (node.importClause) {
                            // Default import
                            if (node.importClause.name) {
                                fileImports.push({
                                    importedName: node.importClause.name.text,
                                    fromPath,
                                    file: relPath,
                                    line
                                });
                            }

                            // Named imports
                            if (node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
                                for (const element of node.importClause.namedBindings.elements) {
                                    fileImports.push({
                                        importedName: element.name.text,
                                        fromPath,
                                        file: relPath,
                                        line
                                    });
                                }
                            }
                        }
                    }
                }

                ts.forEachChild(node, visit);
            };

            visit(sourceFileNode);

            if (fileExports.length > 0) {
                this.exports.set(relPath, fileExports);
            }
            if (fileImports.length > 0) {
                this.imports.set(relPath, fileImports);
            }
        } catch (error) {
            console.warn(`Failed to parse TypeScript file: ${sourceFile}`, error);
        }
    }

    /**
     * Extract Python exports and imports using regex (fallback for Python)
     */
    private extractPythonExportsImports(sourceFile: string, relPath: string): void {
        try {
            const content = fs.readFileSync(sourceFile, 'utf-8');
            const lines = content.split('\n');
            
            const fileExports: ExportInfo[] = [];
            const fileImports: ImportInfo[] = [];

            lines.forEach((line, index) => {
                const lineNum = index + 1;

                // Extract class definitions
                const classMatch = line.match(/^class\s+(\w+)/);
                if (classMatch) {
                    fileExports.push({
                        name: classMatch[1],
                        type: 'class',
                        file: relPath,
                        line: lineNum
                    });
                }

                // Extract function definitions
                const funcMatch = line.match(/^def\s+(\w+)/);
                if (funcMatch && !funcMatch[1].startsWith('_')) { // Skip private functions
                    fileExports.push({
                        name: funcMatch[1],
                        type: 'function',
                        file: relPath,
                        line: lineNum
                    });
                }

                // Extract imports: from X import Y
                const fromImportMatch = line.match(/^from\s+([.\w]+)\s+import\s+(.+)/);
                if (fromImportMatch) {
                    const fromPath = fromImportMatch[1];
                    const imports = fromImportMatch[2].split(',').map(s => s.trim());
                    
                    for (const imp of imports) {
                        const name = imp.split(' as ')[0].trim();
                        fileImports.push({
                            importedName: name,
                            fromPath,
                            file: relPath,
                            line: lineNum
                        });
                    }
                }

                // Extract imports: import X
                const importMatch = line.match(/^import\s+([.\w]+)/);
                if (importMatch) {
                    fileImports.push({
                        importedName: importMatch[1],
                        fromPath: importMatch[1],
                        file: relPath,
                        line: lineNum
                    });
                }
            });

            if (fileExports.length > 0) {
                this.exports.set(relPath, fileExports);
            }
            if (fileImports.length > 0) {
                this.imports.set(relPath, fileImports);
            }
        } catch (error) {
            console.warn(`Failed to parse Python file: ${sourceFile}`, error);
        }
    }

    /**
     * Find exports that are never imported
     */
    private findOrphanedExports(): OrphanedExport[] {
        const orphaned: OrphanedExport[] = [];
        
        // Build a map of all imported symbols
        const importedSymbols = new Map<string, Set<string>>(); // file -> set of imported names

        for (const [file, imports] of this.imports) {
            for (const imp of imports) {
                // Resolve relative import path
                const resolvedPath = this.resolveImportPath(file, imp.fromPath);
                
                if (resolvedPath) {
                    if (!importedSymbols.has(resolvedPath)) {
                        importedSymbols.set(resolvedPath, new Set());
                    }
                    importedSymbols.get(resolvedPath)!.add(imp.importedName);
                }
            }
        }

        // Check each export
        for (const [file, exports] of this.exports) {
            const imported = importedSymbols.get(file) || new Set();

            for (const exp of exports) {
                // Skip framework entry points and common patterns
                if (this.isFrameworkEntryPoint(exp.name, file)) {
                    continue;
                }

                // Check if this export is imported anywhere
                if (!imported.has(exp.name)) {
                    orphaned.push({
                        file,
                        export: exp.name,
                        type: exp.type,
                        reason: `Export "${exp.name}" is never imported by any file in the workspace`
                    });
                }
            }
        }

        return orphaned;
    }

    /**
     * Resolve import path relative to importer file
     */
    private resolveImportPath(importerFile: string, importPath: string): string | null {
        // Skip external packages
        if (!importPath.startsWith('.')) {
            return null;
        }

        const importerDir = path.dirname(importerFile);
        let resolved = path.normalize(path.join(importerDir, importPath));

        // Try with common extensions
        const extensions = ['.ts', '.tsx', '.js', '.jsx', '.py', ''];
        for (const ext of extensions) {
            const candidate = resolved + ext;
            if (this.summaries.has(candidate) || this.exports.has(candidate)) {
                return candidate;
            }
        }

        // Try index files
        for (const ext of ['.ts', '.js', '.py']) {
            const indexFile = path.join(resolved, 'index' + ext);
            if (this.summaries.has(indexFile) || this.exports.has(indexFile)) {
                return indexFile;
            }
        }

        return resolved; // Return normalized path even if not found
    }

    /**
     * Check if export name matches framework entry point patterns
     */
    private isFrameworkEntryPoint(exportName: string, file: string): boolean {
        // VS Code extension entry points
        if (exportName === 'activate' || exportName === 'deactivate') {
            return true;
        }

        // React components (capitalized)
        if (/^[A-Z]/.test(exportName) && (file.endsWith('.tsx') || file.endsWith('.jsx'))) {
            return true;
        }

        // Django/FastAPI models and views (common patterns)
        if (file.includes('models.py') || file.includes('views.py') || file.includes('routes.py')) {
            return true;
        }

        // Test files (exports are test cases)
        if (file.includes('test') || file.includes('spec')) {
            return true;
        }

        return false;
    }

    /**
     * Save analysis results to file
     */
    static async saveResults(
        codebasePath: string,
        orphanedExports: OrphanedExport[]
    ): Promise<void> {
        const outputPath = path.join(codebasePath, 'dead-code-analysis.json');
        
        const output = {
            generated: new Date().toISOString(),
            summary: {
                totalExports: 0, // Will be computed by caller if needed
                orphanedExports: orphanedExports.length,
                orphanageRate: orphanedExports.length > 0 ? '⚠️ Found dead code' : '✅ No dead code detected'
            },
            orphanedExports,
            notes: 'Exports detected via AST parsing that are never imported elsewhere. Verified using JSON summaries and import resolution.'
        };

        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
    }
}
