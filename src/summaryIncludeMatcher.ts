import * as fs from 'fs';
import * as path from 'path';
import { minimatch } from 'minimatch';

interface LunaSummarizeConfig {
    include?: {
        directories?: string[];
        files?: string[];
        filetypes?: string[];
    };
    exclude?: {
        patterns?: string[];
    };
}

export class SummaryIncludeMatcher {
    private includeDirectories: string[] = [];
    private includeFiles: string[] = [];
    private includeFiletypes: string[] = [];
    private excludePatterns: string[] = [];
    private apiRoutes: string[] = [];

    constructor(workspacePath: string) {
        // Look for .lunasummarize inside .codebase directory
        const lunasummarizePath = path.join(workspacePath, '.codebase', '.lunasummarize');
        
        if (fs.existsSync(lunasummarizePath)) {
            const content = fs.readFileSync(lunasummarizePath, 'utf-8');
            this.parseYamlConfig(content);
        }
    }

    private parseYamlConfig(content: string): void {
        const lines = content.split('\n');
        let currentSection: 'include-directories' | 'include-files' | 'include-filetypes' | 'exclude-patterns' | 'api-routes' | null = null;
        
        for (let line of lines) {
            // Remove comments
            const commentIndex = line.indexOf('#');
            if (commentIndex !== -1) {
                line = line.substring(0, commentIndex);
            }
            line = line.trim();
            
            if (!line) {
                continue;
            }
            
            // Detect top-level section headers
            if (line === 'include:') {
                currentSection = null; // Reset, waiting for subsection
                continue;
            } else if (line === 'exclude:') {
                currentSection = null; // Reset, waiting for subsection
                continue;
            } else if (line === 'apiRoutes:') {
                currentSection = 'api-routes';
                continue;
            } else if (line === 'directories:') {
                currentSection = 'include-directories';
                continue;
            } else if (line === 'files:') {
                currentSection = 'include-files';
                continue;
            } else if (line === 'filetypes:') {
                currentSection = 'include-filetypes';
                continue;
            } else if (line === 'patterns:') {
                currentSection = 'exclude-patterns';
                continue;
            } else if (line.match(/^[a-zA-Z]+:\s*$/)) {
                // Unrecognized top-level section - reset and skip
                currentSection = null;
                continue;
            }
            
            // Parse array items (lines starting with '- ')
            if (line.startsWith('- ')) {
                const value = line.substring(2).trim();
                // Remove quotes if present
                const cleanValue = value.replace(/^["']|["']$/g, '');
                
                if (currentSection === 'include-directories') {
                    this.includeDirectories.push(cleanValue);
                } else if (currentSection === 'include-files') {
                    this.includeFiles.push(cleanValue);
                } else if (currentSection === 'include-filetypes') {
                    this.includeFiletypes.push(cleanValue);
                } else if (currentSection === 'exclude-patterns') {
                    this.excludePatterns.push(cleanValue);
                } else if (currentSection === 'api-routes') {
                    this.apiRoutes.push(cleanValue);
                }
                // If currentSection is null (unrecognized section), silently skip the item
            }
        }
    }

    public hasIncludePatterns(): boolean {
        return this.includeDirectories.length > 0 || this.includeFiles.length > 0;
    }

    public getIncludeDirectories(): string[] {
        return this.includeDirectories;
    }

    public getIncludeFiles(): string[] {
        return this.includeFiles;
    }

    public getIncludeFiletypes(): string[] {
        return this.includeFiletypes;
    }

    public getApiRoutes(): string[] {
        return this.apiRoutes;
    }

    /**
     * Determines if a file should be included for analysis
     * Flow: Check if file is in included directories + matches filetypes
     * Note: This does NOT check exclude patterns - use shouldExclude() separately
     */
    public shouldInclude(filePath: string, workspacePath: string): boolean {
        // Opt-in model: If no include patterns specified, reject all files
        // This forces users to explicitly declare what should be analyzed
        if (!this.hasIncludePatterns()) {
            return false;
        }

        const relativePath = path.relative(workspacePath, filePath);
        const normalizedPath = relativePath.replace(/\\/g, '/');
        const fileName = path.basename(filePath);
        const fileExt = path.extname(filePath).toLowerCase();
        
        // Check if file matches any specific include file pattern
        for (const pattern of this.includeFiles) {
            if (minimatch(fileName, pattern) || 
                minimatch(normalizedPath, pattern)) {
                // Check filetype filter if specified
                if (this.includeFiletypes.length > 0) {
                    if (!this.includeFiletypes.some(type => {
                        const normalizedType = type.startsWith('.') ? type : `.${type}`;
                        return fileExt === normalizedType;
                    })) {
                        continue;
                    }
                }
                return true;
            }
        }
        
        // Check if file is within any included directory
        for (const dirPattern of this.includeDirectories) {
            // Remove trailing slash for consistency
            const cleanPattern = dirPattern.replace(/\/$/, '');
            
            // Match files directly in the directory or subdirectories
            if (minimatch(normalizedPath, `${cleanPattern}/**`) ||
                minimatch(normalizedPath, cleanPattern) ||
                normalizedPath.startsWith(`${cleanPattern}/`)) {
                
                // Check filetype filter if specified
                if (this.includeFiletypes.length > 0) {
                    if (!this.includeFiletypes.some(type => {
                        const normalizedType = type.startsWith('.') ? type : `.${type}`;
                        return fileExt === normalizedType;
                    })) {
                        continue;
                    }
                }
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
            // Quick check for simple directory patterns (obj/, bin/, etc.)
            // Strip trailing slash if present
            const cleanPattern = pattern.replace(/\/$/, '');
            
            // Check if pattern is a simple directory name (no wildcards, no slashes)
            if (!cleanPattern.includes('*') && !cleanPattern.includes('/')) {
                // Match if path contains /dirname/ anywhere
                if (normalizedPath.includes(`/${cleanPattern}/`) || 
                    normalizedPath.startsWith(`${cleanPattern}/`)) {
                    return true;
                }
            }
            
            // Use minimatch for glob patterns
            if (minimatch(normalizedPath, pattern)) {
                return true;
            }
            
            // Try common variations
            if (minimatch(normalizedPath, `**/${pattern}`)) {
                return true;
            }
            
            if (minimatch(normalizedPath, `${pattern}/**`)) {
                return true;
            }
            
            if (minimatch(normalizedPath, `**/${pattern}/**`)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Checks if a file is within an API route directory (for API extraction metadata)
     * This is separate from inclusion - API route files are ALSO included in normal summaries
     */
    public isApiRouteFile(filePath: string, workspacePath: string): boolean {
        const relativePath = path.relative(workspacePath, filePath);
        const normalizedPath = relativePath.replace(/\\/g, '/');
        
        for (const routeDir of this.apiRoutes) {
            const cleanPattern = routeDir.replace(/\/$/, '');
            
            if (minimatch(normalizedPath, `${cleanPattern}/**`) ||
                normalizedPath.startsWith(`${cleanPattern}/`)) {
                return true;
            }
        }
        
        return false;
    }
}
