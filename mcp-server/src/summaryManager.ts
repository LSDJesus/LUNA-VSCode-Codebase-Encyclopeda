import * as fs from 'fs/promises';
import * as path from 'path';

interface FileSummary {
  sourceFile: string;
  generatedAt: string;
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

export class SummaryManager {
  private getDocsPath(workspacePath: string): string {
    return path.join(workspacePath, '.codebase');
  }

  private getSummaryPaths(workspacePath: string, filePath: string) {
    const docsPath = this.getDocsPath(workspacePath);
    const basePath = path.join(docsPath, filePath);
    const basePathWithoutExt = basePath.replace(/\.[^.]+$/, '');
    
    return {
      json: basePathWithoutExt + '.json',
      md: basePathWithoutExt + '.md',
    };
  }

  async getSummary(workspacePath: string, filePath: string): Promise<FileSummary | null> {
    const { json, md } = this.getSummaryPaths(workspacePath, filePath);
    
    try {
      const [jsonContent, mdContent] = await Promise.all([
        fs.readFile(json, 'utf-8'),
        fs.readFile(md, 'utf-8'),
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
              if (internal.some((d: any) => d.path.includes(query))) {
                matches.push('Internal dependency');
              }
              if (external.some((d: any) => d.package.includes(query))) {
                matches.push('External dependency');
              }
            }
            break;
            
          case 'component':
            // Search in key components
            if (summary.summary?.keyComponents) {
              const found = summary.summary.keyComponents.filter((c: any) =>
                c.name.toLowerCase().includes(query.toLowerCase())
              );
              matches.push(...found.map((c: any) => `Component: ${c.name}`));
            }
            break;
            
          case 'exports':
            // Search in public API
            if (summary.summary?.publicAPI) {
              const found = summary.summary.publicAPI.filter((api: any) =>
                api.signature.toLowerCase().includes(query.toLowerCase())
              );
              matches.push(...found.map((api: any) => `Export: ${api.signature}`));
            }
            break;
            
          default: // keyword
            const jsonStr = JSON.stringify(summary).toLowerCase();
            if (jsonStr.includes(query.toLowerCase())) {
              matches.push('Found in summary');
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
    const docsPath = this.getDocsPath(workspacePath);
    const files = await this.findJsonFiles(docsPath);
    
    const nodes = [];
    const edges = [];
    
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const summary = JSON.parse(content);
        const sourceFile = summary.sourceFile;
        
        // If specific file requested, filter
        if (filePath && sourceFile !== filePath) {
          continue;
        }
        
        nodes.push({
          id: sourceFile,
          purpose: summary.summary?.purpose || '',
        });
        
        // Add edges for dependencies
        if (summary.summary?.dependencies?.internal) {
          for (const dep of summary.summary.dependencies.internal) {
            edges.push({
              from: sourceFile,
              to: dep.path,
              type: 'depends_on',
              usage: dep.usage,
            });
          }
        }
      } catch {
        // Skip invalid files
      }
    }
    
    return { nodes, edges };
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
