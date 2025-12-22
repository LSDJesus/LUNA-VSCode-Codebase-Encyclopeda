import * as fs from 'fs';
import * as path from 'path';
import { minimatch } from 'minimatch';

export class IgnorePatternMatcher {
    private includePatterns: string[] = [];
    private excludePatterns: string[] = [];

    constructor(workspacePath: string) {
        // Look for .lunasummarize inside .codebase directory
        const lunasummarizePath = path.join(workspacePath, '.codebase', '.lunasummarize');
        
        if (fs.existsSync(lunasummarizePath)) {
            const content = fs.readFileSync(lunasummarizePath, 'utf-8');
            this.parsePatterns(content);
        }
    }

    private parsePatterns(content: string): void {
        const lines = content.split('\n');
        let currentSection = '';
        
        for (let line of lines) {
            // Remove comments
            line = line.replace(/#.*$/, '').trim();
            
            if (!line) {
                continue;
            }
            
            // Detect section headers
            if (line === '[include]') {
                currentSection = 'include';
                continue;
            } else if (line === '[exclude]') {
                currentSection = 'exclude';
                continue;
            }
            
            // Add pattern to appropriate section
            if (currentSection === 'include') {
                this.includePatterns.push(line);
            } else if (currentSection === 'exclude') {
                this.excludePatterns.push(line);
            }
        }
    }

    public hasIncludePatterns(): boolean {
        return this.includePatterns.length > 0;
    }

    public getIncludePatterns(): string[] {
        return this.includePatterns;
    }

    public shouldInclude(filePath: string, workspacePath: string): boolean {
        // If no include patterns specified, include all files
        if (!this.hasIncludePatterns()) {
            return true;
        }

        const relativePath = path.relative(workspacePath, filePath);
        const normalizedPath = relativePath.replace(/\\/g, '/');
        
        // Check if file matches any include pattern
        for (const pattern of this.includePatterns) {
            if (minimatch(normalizedPath, pattern) || 
                minimatch(normalizedPath, `${pattern}/**`) ||
                minimatch(normalizedPath, `**/${pattern}/**`)) {
                return true;
            }
        }
        
        return false;
    }

    public shouldExclude(filePath: string, workspacePath: string): boolean {
        const relativePath = path.relative(workspacePath, filePath);
        const normalizedPath = relativePath.replace(/\\/g, '/');
        
        // Check exclusion patterns
        for (const pattern of this.excludePatterns) {
            if (minimatch(normalizedPath, pattern) || 
                minimatch(normalizedPath, `**/${pattern}`) ||
                minimatch(normalizedPath, `${pattern}/**`) ||
                minimatch(normalizedPath, `**/${pattern}/**`)) {
                return true;
            }
        }
        
        return false;
    }
}
