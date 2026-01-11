import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface FileSummary {
  sourceFile: string;
  generatedAt: string;
  gitBranch?: string | null;
  summary: {
    purpose: string;
    keyComponents: Array<{ name: string; description: string }>;
    dependencies: {
      internal: Array<{ path: string; usage: string }>;
      external: Array<{ package: string; usage: string }>;
    };
    publicAPI: Array<{ signature: string; description: string }>;
    codeLinks: Array<{ symbol: string; path: string }>;
    implementationNotes: string;
  };
  markdown: string;
}

interface SummaryPaths {
  json: string;
  md: string;
  fallbackJson?: string;
  fallbackMd?: string;
}

export class SummaryManager {
  /**
   * Get current git branch, returns null if not in a git repo
   */
  private getCurrentBranch(workspacePath: string): string | null {
    try {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: workspacePath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore']
      }).trim();
      return branch || null;
    } catch {
      return null;
    }
  }

  /**
   * Sanitize branch name for filenames
   */
  private sanitizeBranchName(branch: string): string {
    return branch
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
  }

  /**
   * Check if branch is a main branch
   */
  private isMainBranch(branch: string | null): boolean {
    if (!branch) {return true;}
    const mainBranches = ['main', 'master', 'develop', 'dev'];
    return mainBranches.includes(branch.toLowerCase());
  }

  private getDocsPath(workspacePath: string): string {
    return path.join(workspacePath, '.codebase');
  }

  private getSummaryPaths(workspacePath: string, filePath: string): SummaryPaths {
    const docsPath = this.getDocsPath(workspacePath);
    const basePath = path.join(docsPath, filePath);
    const basePathWithoutExt = basePath.replace(/\.[^.]+$/, '');
    
    // Try branch-specific file first, then fall back to main
    const branch = this.getCurrentBranch(workspacePath);
    
    if (branch && !this.isMainBranch(branch)) {
      const sanitized = this.sanitizeBranchName(branch);
      return {
        json: `${basePathWithoutExt}.${sanitized}.json`,
        md: `${basePathWithoutExt}.${sanitized}.md`,
        fallbackJson: `${basePathWithoutExt}.json`,
        fallbackMd: `${basePathWithoutExt}.md`,
      };
    }
    
    return {
      json: basePathWithoutExt + '.json',
      md: basePathWithoutExt + '.md',
    };
  }

  async getSummary(workspacePath: string, filePath: string): Promise<FileSummary | null> {
    // Normalize path separators to platform-specific (handles forward/backward slash mismatch)
    const normalizedFilePath = filePath.replace(/\//g, path.sep).replace(/\\/g, path.sep);
    const paths = this.getSummaryPaths(workspacePath, normalizedFilePath);
    
    // Try branch-specific files first
    try {
      const [jsonContent, mdContent] = await Promise.all([
        fs.readFile(paths.json, 'utf-8'),
        fs.readFile(paths.md, 'utf-8'),
      ]);
      
      const parsed = JSON.parse(jsonContent);
      return {
        ...parsed,
        markdown: mdContent,
      };
    } catch {
      // Fall back to main branch files if branch-specific don't exist
      if (paths.fallbackJson && paths.fallbackMd) {
        try {
          const [jsonContent, mdContent] = await Promise.all([
            fs.readFile(paths.fallbackJson, 'utf-8'),
            fs.readFile(paths.fallbackMd, 'utf-8'),
          ]);
          
          const parsed = JSON.parse(jsonContent);
          return {
            ...parsed,
            markdown: mdContent,
          };
        } catch {
          return null;
        }
      }
      return null;
    }
  }

  async saveSummary(
    workspacePath: string,
    filePath: string,
    summary: { json: any; markdown: string }
  ): Promise<void> {
    const { json: jsonPath, md: mdPath } = this.getSummaryPaths(workspacePath, filePath);
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(jsonPath), { recursive: true });
    
    // Save both formats
    await Promise.all([
      fs.writeFile(jsonPath, JSON.stringify(summary.json, null, 2), 'utf-8'),
      fs.writeFile(mdPath, summary.markdown, 'utf-8'),
    ]);
  }

  async listSummaries(workspacePath: string): Promise<Array<{ file: string; generatedAt: string }>> {
    const docsPath = this.getDocsPath(workspacePath);
    
    try {
      const files = await this.findJsonFiles(docsPath);
      const summaries = [];
      
      for (const file of files) {
        try {
          const content = await fs.readFile(file, 'utf-8');
          const parsed = JSON.parse(content);
          summaries.push({
            file: parsed.sourceFile || path.relative(docsPath, file),
            generatedAt: parsed.generatedAt || 'unknown',
          });
        } catch {
          // Skip invalid files
        }
      }
      
      return summaries;
    } catch {
      return [];
    }
  }

  async searchSummaries(
    workspacePath: string,
    query: string,
    searchType: string
  ): Promise<Array<{ file: string; matches: string[] }>> {
    const docsPath = this.getDocsPath(workspacePath);
    const files = await this.findJsonFiles(docsPath);
    const results = [];
    
    // Parse multi-word queries: split on spaces and filter empty
    const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 0);
    
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const summary = JSON.parse(content);
        const matches: string[] = [];
        
        switch (searchType) {
          case 'dependency':
            // Search in dependencies
            if (summary.summary?.dependencies) {
              const { internal, external } = summary.summary.dependencies;
              if (internal.some((d: any) => 
                keywords.some(k => d.path.toLowerCase().includes(k))
              )) {
                matches.push('Internal dependency');
              }
              if (external.some((d: any) => 
                keywords.some(k => (d.package || d.path || '').toLowerCase().includes(k))
              )) {
                matches.push('External dependency');
              }
            }
            break;
            
          case 'component':
            // Search in key components
            if (summary.summary?.keyComponents) {
              const found = summary.summary.keyComponents.filter((c: any) =>
                keywords.some(k => c.name.toLowerCase().includes(k))
              );
              matches.push(...found.map((c: any) => `Component: ${c.name}`));
            }
            break;
            
          case 'exports':
            // Search in public API
            if (summary.summary?.publicAPI) {
              const found = summary.summary.publicAPI.filter((api: any) =>
                keywords.some(k => api.signature.toLowerCase().includes(k))
              );
              matches.push(...found.map((api: any) => `Export: ${api.signature}`));
            }
            break;
            
          default: // keyword (enhanced with multi-word OR logic)
            const jsonStr = JSON.stringify(summary).toLowerCase();
            // Match if ANY keyword appears in the summary (OR logic)
            const matchedKeywords = keywords.filter(k => jsonStr.includes(k));
            if (matchedKeywords.length > 0) {
              matches.push(`Found ${matchedKeywords.length}/${keywords.length} keywords: ${matchedKeywords.join(', ')}`);
            }
        }
        
        if (matches.length > 0) {
          results.push({
            file: summary.sourceFile || path.relative(docsPath, file),
            matches,
          });
        }
      } catch {
        // Skip invalid files
      }
    }
    
    return results;
  }

  async getDependencyGraph(
    workspacePath: string,
    filePath?: string
  ): Promise<any> {
    const graphData = this.getDependencyGraphFile(workspacePath);
    
    if (!graphData) {
      return { nodes: [], edges: [] };
    }
    
    // Handle both flat and nested graph structures
    const graph = graphData.graph || graphData;
    
    // If specific file requested, return that file's dependencies and dependents
    if (filePath) {
      // Normalize path: convert backslashes to forward slashes, remove leading ./
      const normalizedPath = filePath.replace(/\\/g, '/').replace(/^\.\//, '');
      
      // Try exact match first
      let fileEntry = graph[normalizedPath];
      
      // If not found, try to find with fuzzy matching
      if (!fileEntry) {
        const searchKey = normalizedPath.split('/').pop();
        const matchedKey = Object.keys(graph).find(key => 
          key.endsWith(normalizedPath) || 
          key.includes(normalizedPath) ||
          key.split('/').pop() === searchKey
        );
        if (matchedKey) {
          fileEntry = graph[matchedKey];
          filePath = matchedKey; // Use the actual key from graph
        }
      }
      
      if (!fileEntry) {
        return { 
          nodes: [], 
          edges: [], 
          message: `File "${filePath}" not found in dependency graph. Available files: ${Object.keys(graph).slice(0, 5).join(', ')}...` 
        };
      }
      
      // Build nodes and edges for this file and its direct relations
      const nodes = [
        {
          id: filePath,
          exports: fileEntry.exports,
          dependencies: fileEntry.dependencies,
          dependents: fileEntry.dependents,
        }
      ];
      
      const edges = [];
      
      // Add edges for dependencies (what this file depends on)
      if (fileEntry.dependencies?.internal) {
        for (const dep of fileEntry.dependencies.internal) {
          edges.push({
            from: filePath,
            to: dep,
            type: 'depends_on',
          });
        }
      }
      
      // Add edges for dependents (what depends on this file)
      if (fileEntry.dependents) {
        for (const dependent of fileEntry.dependents) {
          edges.push({
            from: dependent,
            to: filePath,
            type: 'used_by',
          });
        }
      }
      
      return { nodes, edges };
    }
    
    // Return full graph if no specific file requested (include metadata)
    return graphData;
  }

  /**
   * Generic helper to load JSON files from .codebase directory
   */
  private loadCodebaseFile(workspacePath: string, filename: string, errorContext: string): any | null {
    const filePath = path.join(workspacePath, '.codebase', filename);
    
    try {
      if (!fsSync.existsSync(filePath)) {
        return null;
      }
      
      const content = fsSync.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`[MCP] Error loading ${errorContext}:`, error);
      return null;
    }
  }

  /**
   * Get API reference
   */
  getAPIReference(workspacePath: string): any | null {
    return this.loadCodebaseFile(workspacePath, 'api-reference.json', 'API reference');
  }

  /**
   * Get dependency graph (loaded from file)
   */
  getDependencyGraphFile(workspacePath: string): any | null {
    return this.loadCodebaseFile(workspacePath, 'dependency-graph.json', 'dependency graph');
  }

  /**
   * Get complexity heatmap
   */
  getComplexityHeatmap(workspacePath: string): any | null {
    return this.loadCodebaseFile(workspacePath, 'complexity-heatmap.json', 'complexity heatmap');
  }

  /**
   * Get dead code analysis
   */
  getDeadCodeAnalysis(workspacePath: string): any | null {
    return this.loadCodebaseFile(workspacePath, 'dead-code-analysis.json', 'dead code analysis');
  }

  /**
   * Get component map
   */
  getComponentMap(workspacePath: string): any | null {
    return this.loadCodebaseFile(workspacePath, 'component-map.json', 'component map');
  }

  /**
   * Get QA report
   */
  getQAReport(workspacePath: string): any | null {
    return this.loadCodebaseFile(workspacePath, 'QA_REPORT.json', 'QA report');
  }

  private async findJsonFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          files.push(...(await this.findJsonFiles(fullPath)));
        } else if (entry.name.endsWith('.json')) {
          files.push(fullPath);
        }
      }
    } catch {
      // Directory doesn't exist or not readable
    }
    
    return files;
  }
}
