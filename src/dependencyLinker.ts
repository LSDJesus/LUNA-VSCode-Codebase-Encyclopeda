import * as fs from 'fs';
import * as path from 'path';

interface UsedByEntry {
    file: string;
    usage: string;
    lines?: string;
}

interface FileSummaryMetadata {
    sourceFile: string;
    generatedAt: string;
    summary: {
        dependencies?: {
            internal?: Array<{ path: string; usage: string; lines?: string }>;
        };
        usedBy?: UsedByEntry[];
        [key: string]: any;
    };
}

export class DependencyLinker {
    /**
     * Compute bidirectional "Used By" relationships after all summaries are generated
     */
    static computeUsedByRelationships(workspacePath: string, codebasePath: string): void {
        // Find all JSON summary files
        const jsonFiles = this.findAllJsonFiles(codebasePath);
        
        // Build a map of file -> dependents
        const usedByMap = new Map<string, UsedByEntry[]>();
        
        // First pass: scan all dependencies
        for (const jsonPath of jsonFiles) {
            try {
                const content = fs.readFileSync(jsonPath, 'utf-8');
                const metadata: FileSummaryMetadata = JSON.parse(content);
                
                const sourceFile = metadata.sourceFile;
                const dependencies = metadata.summary?.dependencies?.internal || [];
                
                for (const dep of dependencies) {
                    // Normalize the dependency path
                    const depPath = this.normalizePath(sourceFile, dep.path);
                    
                    // Add to usedBy map
                    if (!usedByMap.has(depPath)) {
                        usedByMap.set(depPath, []);
                    }
                    
                    usedByMap.get(depPath)!.push({
                        file: sourceFile,
                        usage: dep.usage,
                        lines: dep.lines
                    });
                }
            } catch (error) {
                console.error(`Failed to process ${jsonPath}:`, error);
            }
        }
        
        // Second pass: update all JSON files with usedBy information
        for (const jsonPath of jsonFiles) {
            try {
                const content = fs.readFileSync(jsonPath, 'utf-8');
                const metadata: FileSummaryMetadata = JSON.parse(content);
                
                const sourceFile = metadata.sourceFile;
                const usedBy = usedByMap.get(sourceFile) || [];
                
                // Update the summary with usedBy
                metadata.summary.usedBy = usedBy;
                
                // Write back
                fs.writeFileSync(jsonPath, JSON.stringify(metadata, null, 2), 'utf-8');
            } catch (error) {
                console.error(`Failed to update ${jsonPath}:`, error);
            }
        }
    }
    
    /**
     * Find all .json files in .codebase directory
     */
    private static findAllJsonFiles(dir: string): string[] {
        const results: string[] = [];
        
        if (!fs.existsSync(dir)) {
            return results;
        }
        
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
                results.push(...this.findAllJsonFiles(fullPath));
            } else if (entry.isFile() && entry.name.endsWith('.json') && !entry.name.startsWith('INDEX')) {
                results.push(fullPath);
            }
        }
        
        return results;
    }
    
    /**
     * Normalize a dependency path relative to source file
     */
    private static normalizePath(sourceFile: string, depPath: string): string {
        // Remove file extension from dependency if present
        const depWithoutExt = depPath.replace(/\.(ts|js|tsx|jsx|py|java|cs|go|rs|cpp|c|h|hpp)$/, '');
        
        // If it's a relative import (starts with ./ or ../)
        if (depPath.startsWith('.')) {
            const sourceDir = path.dirname(sourceFile);
            const resolvedPath = path.join(sourceDir, depWithoutExt);
            return resolvedPath.replace(/\\/g, '/');
        }
        
        // Otherwise, it's likely an absolute or package import
        return depWithoutExt.replace(/\\/g, '/');
    }
}
