import * as path from 'path';

export interface DependencyInfo {
    path: string;
    usage: string;
    lines?: string;
}

export interface StaticAnalysisResult {
    internal: DependencyInfo[];
    external: DependencyInfo[];
}

export class StaticImportAnalyzer {
    /**
     * Extract imports from source code using static analysis (regex-based)
     * Returns reliable dependency information regardless of LLM quality
     */
    static analyzeImports(content: string, filePath: string, workspacePath: string): StaticAnalysisResult {
        const fileExt = path.extname(filePath).toLowerCase();
        
        switch (fileExt) {
            case '.py':
                return this.analyzePythonImports(content, filePath, workspacePath);
            case '.ts':
            case '.tsx':
            case '.js':
            case '.jsx':
                return this.analyzeTypeScriptImports(content, filePath, workspacePath);
            case '.java':
                return this.analyzeJavaImports(content, filePath, workspacePath);
            case '.cs':
                return this.analyzeCSharpImports(content, filePath, workspacePath);
            case '.go':
                return this.analyzeGoImports(content, filePath, workspacePath);
            default:
                return { internal: [], external: [] };
        }
    }
    
    private static analyzePythonImports(content: string, filePath: string, workspacePath: string): StaticAnalysisResult {
        const internal: DependencyInfo[] = [];
        const external: DependencyInfo[] = [];
        const lines = content.split('\n');
        
        // Standard library modules (common ones)
        const stdLibModules = new Set([
            'os', 'sys', 'json', 're', 'math', 'datetime', 'time', 'random',
            'collections', 'itertools', 'functools', 'typing', 'pathlib',
            'asyncio', 'threading', 'multiprocessing', 'subprocess', 'logging',
            'unittest', 'pytest', 'argparse', 'configparser', 'io', 'csv',
            'pickle', 'sqlite3', 'http', 'urllib', 'socket', 'email', 'uuid',
            'hashlib', 'base64', 'tempfile', 'shutil', 'glob', 'fnmatch'
        ]);
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const lineNum = i + 1;
            
            // Skip comments and docstrings
            if (line.startsWith('#') || line.startsWith('"""') || line.startsWith("'''")) {
                continue;
            }
            
            // Match: import module
            // Match: import module as alias
            const importMatch = line.match(/^import\s+([a-zA-Z0-9_\.]+)(?:\s+as\s+\w+)?/);
            if (importMatch) {
                const module = importMatch[1];
                const topLevel = module.split('.')[0];
                
                if (stdLibModules.has(topLevel)) {
                    external.push({
                        path: module,
                        usage: `import ${module}`,
                        lines: lineNum.toString()
                    });
                } else {
                    // Convert Python module to file path (e.g., "core.services" → "core/services")
                    const modulePath = module.replace(/\./g, '/');
                    internal.push({
                        path: modulePath,
                        usage: `import ${module}`,
                        lines: lineNum.toString()
                    });
                }
                continue;
            }
            
            // Match: from module import something
            const fromMatch = line.match(/^from\s+([a-zA-Z0-9_\.]+)\s+import\s+(.+)/);
            if (fromMatch) {
                const module = fromMatch[1];
                const imports = fromMatch[2];
                const topLevel = module.split('.')[0];
                
                // Relative imports (from . or from ..)
                if (module.startsWith('.')) {
                    const sourceDir = path.dirname(filePath);
                    const resolvedPath = this.resolvePythonRelativeImport(sourceDir, module, workspacePath);
                    internal.push({
                        path: resolvedPath,
                        usage: `from ${module} import ${imports}`,
                        lines: lineNum.toString()
                    });
                } else if (stdLibModules.has(topLevel)) {
                    external.push({
                        path: module,
                        usage: `from ${module} import ${imports}`,
                        lines: lineNum.toString()
                    });
                } else {
                    // Project module
                    const modulePath = module.replace(/\./g, '/');
                    internal.push({
                        path: modulePath,
                        usage: `from ${module} import ${imports}`,
                        lines: lineNum.toString()
                    });
                }
            }
        }
        
        return { internal: this.deduplicateDependencies(internal), external: this.deduplicateDependencies(external) };
    }
    
    private static analyzeTypeScriptImports(content: string, filePath: string, workspacePath: string): StaticAnalysisResult {
        const internal: DependencyInfo[] = [];
        const external: DependencyInfo[] = [];
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const lineNum = i + 1;
            
            // Skip comments
            if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) {
                continue;
            }
            
            // Match: import ... from 'module'
            // Match: import ... from "module"
            const importMatch = line.match(/import\s+(?:{[^}]+}|[\w*]+|\* as \w+)\s+from\s+['"]([^'"]+)['"]/);
            if (importMatch) {
                const modulePath = importMatch[1];
                
                if (modulePath.startsWith('.')) {
                    // Relative import - internal dependency
                    const sourceDir = path.dirname(filePath);
                    const resolvedPath = path.normalize(path.join(sourceDir, modulePath)).replace(/\\/g, '/');
                    internal.push({
                        path: resolvedPath,
                        usage: `import from '${modulePath}'`,
                        lines: lineNum.toString()
                    });
                } else {
                    // External package
                    external.push({
                        path: modulePath.split('/')[0], // Get package name (e.g., '@types/node' → '@types/node')
                        usage: `import from '${modulePath}'`,
                        lines: lineNum.toString()
                    });
                }
                continue;
            }
            
            // Match: require('module')
            const requireMatch = line.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
            if (requireMatch) {
                const modulePath = requireMatch[1];
                
                if (modulePath.startsWith('.')) {
                    const sourceDir = path.dirname(filePath);
                    const resolvedPath = path.normalize(path.join(sourceDir, modulePath)).replace(/\\/g, '/');
                    internal.push({
                        path: resolvedPath,
                        usage: `require('${modulePath}')`,
                        lines: lineNum.toString()
                    });
                } else {
                    external.push({
                        path: modulePath.split('/')[0],
                        usage: `require('${modulePath}')`,
                        lines: lineNum.toString()
                    });
                }
            }
        }
        
        return { internal: this.deduplicateDependencies(internal), external: this.deduplicateDependencies(external) };
    }
    
    private static analyzeJavaImports(content: string, filePath: string, workspacePath: string): StaticAnalysisResult {
        const internal: DependencyInfo[] = [];
        const external: DependencyInfo[] = [];
        const lines = content.split('\n');
        
        // Detect project package from file path
        const projectPackagePrefix = this.detectJavaProjectPackage(filePath, workspacePath);
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const lineNum = i + 1;
            
            // Match: import package.name.ClassName;
            const importMatch = line.match(/^import\s+(?:static\s+)?([a-zA-Z0-9_\.]+);?/);
            if (importMatch) {
                const importPath = importMatch[1];
                
                if (importPath.startsWith('java.') || importPath.startsWith('javax.')) {
                    // Standard library
                    external.push({
                        path: importPath,
                        usage: `import ${importPath}`,
                        lines: lineNum.toString()
                    });
                } else if (projectPackagePrefix && importPath.startsWith(projectPackagePrefix)) {
                    // Internal project import
                    internal.push({
                        path: importPath.replace(/\./g, '/'),
                        usage: `import ${importPath}`,
                        lines: lineNum.toString()
                    });
                } else {
                    // External library
                    external.push({
                        path: importPath,
                        usage: `import ${importPath}`,
                        lines: lineNum.toString()
                    });
                }
            }
        }
        
        return { internal: this.deduplicateDependencies(internal), external: this.deduplicateDependencies(external) };
    }
    
    private static analyzeCSharpImports(content: string, filePath: string, workspacePath: string): StaticAnalysisResult {
        const internal: DependencyInfo[] = [];
        const external: DependencyInfo[] = [];
        const lines = content.split('\n');
        
        // Detect project namespace
        const projectNamespace = this.detectCSharpProjectNamespace(content);
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const lineNum = i + 1;
            
            // Match: using Namespace.Name;
            const usingMatch = line.match(/^using\s+(?:static\s+)?([a-zA-Z0-9_\.]+);?/);
            if (usingMatch) {
                const namespace = usingMatch[1];
                
                if (namespace.startsWith('System')) {
                    // Standard library
                    external.push({
                        path: namespace,
                        usage: `using ${namespace}`,
                        lines: lineNum.toString()
                    });
                } else if (projectNamespace && namespace.startsWith(projectNamespace)) {
                    // Internal project
                    internal.push({
                        path: namespace.replace(/\./g, '/'),
                        usage: `using ${namespace}`,
                        lines: lineNum.toString()
                    });
                } else {
                    // External library
                    external.push({
                        path: namespace,
                        usage: `using ${namespace}`,
                        lines: lineNum.toString()
                    });
                }
            }
        }
        
        return { internal: this.deduplicateDependencies(internal), external: this.deduplicateDependencies(external) };
    }
    
    private static analyzeGoImports(content: string, filePath: string, workspacePath: string): StaticAnalysisResult {
        const internal: DependencyInfo[] = [];
        const external: DependencyInfo[] = [];
        const lines = content.split('\n');
        
        let inImportBlock = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const lineNum = i + 1;
            
            // Match: import "package"
            if (line.startsWith('import (')) {
                inImportBlock = true;
                continue;
            }
            
            if (inImportBlock && line === ')') {
                inImportBlock = false;
                continue;
            }
            
            const importMatch = line.match(/^(?:import\s+)?["']([^"']+)["']/);
            if (importMatch || inImportBlock) {
                const pkg = importMatch ? importMatch[1] : line.replace(/["']/g, '').trim();
                
                if (!pkg) {continue;}
                
                if (pkg.startsWith('.')) {
                    // Relative import
                    const sourceDir = path.dirname(filePath);
                    const resolvedPath = path.normalize(path.join(sourceDir, pkg)).replace(/\\/g, '/');
                    internal.push({
                        path: resolvedPath,
                        usage: `import "${pkg}"`,
                        lines: lineNum.toString()
                    });
                } else if (!pkg.includes('.') || pkg.startsWith('github.com')) {
                    // External or standard library
                    external.push({
                        path: pkg,
                        usage: `import "${pkg}"`,
                        lines: lineNum.toString()
                    });
                } else {
                    // Could be internal - check if it's in the workspace
                    internal.push({
                        path: pkg,
                        usage: `import "${pkg}"`,
                        lines: lineNum.toString()
                    });
                }
            }
        }
        
        return { internal: this.deduplicateDependencies(internal), external: this.deduplicateDependencies(external) };
    }
    
    /**
     * Resolve Python relative imports (from . or from ..)
     */
    private static resolvePythonRelativeImport(sourceDir: string, module: string, workspacePath: string): string {
        const levels = module.match(/^\.*/)![0].length;
        const moduleName = module.substring(levels);
        
        let targetDir = sourceDir;
        for (let i = 1; i < levels; i++) {
            targetDir = path.dirname(targetDir);
        }
        
        const resolvedPath = moduleName ? path.join(targetDir, moduleName.replace(/\./g, '/')) : targetDir;
        return path.relative(workspacePath, resolvedPath).replace(/\\/g, '/');
    }
    
    /**
     * Detect Java project package from file structure
     */
    private static detectJavaProjectPackage(filePath: string, workspacePath: string): string | null {
        // Look for src/main/java or src/
        const relativePath = path.relative(workspacePath, filePath);
        const srcMatch = relativePath.match(/src[/\\](?:main[/\\]java[/\\])?([a-z][a-z0-9_]*(?:[/\\][a-z][a-z0-9_]*)*)/);
        
        if (srcMatch) {
            return srcMatch[1].replace(/[/\\]/g, '.');
        }
        
        return null;
    }
    
    /**
     * Detect C# project namespace from code
     */
    private static detectCSharpProjectNamespace(content: string): string | null {
        const namespaceMatch = content.match(/namespace\s+([a-zA-Z0-9_\.]+)/);
        return namespaceMatch ? namespaceMatch[1].split('.')[0] : null;
    }
    
    /**
     * Deduplicate dependencies by path
     */
    private static deduplicateDependencies(deps: DependencyInfo[]): DependencyInfo[] {
        const seen = new Map<string, DependencyInfo>();
        
        for (const dep of deps) {
            if (!seen.has(dep.path)) {
                seen.set(dep.path, dep);
            } else {
                // Merge line numbers if same path appears multiple times
                const existing = seen.get(dep.path)!;
                if (existing.lines && dep.lines && existing.lines !== dep.lines) {
                    existing.lines = `${existing.lines}, ${dep.lines}`;
                }
            }
        }
        
        return Array.from(seen.values());
    }
}
