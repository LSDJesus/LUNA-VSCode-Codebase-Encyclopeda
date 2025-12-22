import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface StalenessInfo {
  file: string;
  summaryTimestamp: string | null;
  fileLastModified: string | null;
  isStale: boolean;
  reason: string;
}

export class StalenessChecker {
  /**
   * Get last commit timestamp for a file using git
   */
  static getGitTimestamp(workspacePath: string, filePath: string): Date | null {
    try {
      const gitCommand = `git log -1 --format=%cI -- "${filePath}"`;
      const result = execSync(gitCommand, {
        cwd: workspacePath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore']
      }).trim();

      if (result) {
        return new Date(result);
      }
    } catch (error) {
      // Not a git repo or file not tracked
    }

    // Fallback to file system timestamp
    return this.getFileSystemTimestamp(path.join(workspacePath, filePath));
  }

  /**
   * Get file system modification timestamp
   */
  static getFileSystemTimestamp(fullPath: string): Date | null {
    try {
      const stats = fs.statSync(fullPath);
      return stats.mtime;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get summary generation timestamp from JSON metadata
   */
  static getSummaryTimestamp(workspacePath: string, filePath: string): Date | null {
    const jsonPath = path.join(workspacePath, '.codebase', filePath.replace(/\.[^.]+$/, '.json'));

    if (!fs.existsSync(jsonPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(jsonPath, 'utf-8');
      const metadata = JSON.parse(content);

      if (metadata.generatedAt) {
        return new Date(metadata.generatedAt);
      }
    } catch (error) {
      // Corrupt or invalid JSON
    }

    return null;
  }

  /**
   * Check if a file's summary is stale
   */
  static isStale(workspacePath: string, filePath: string): StalenessInfo {
    const summaryTimestamp = this.getSummaryTimestamp(workspacePath, filePath);
    const gitTimestamp = this.getGitTimestamp(workspacePath, filePath);

    if (!summaryTimestamp) {
      return {
        file: filePath,
        summaryTimestamp: null,
        fileLastModified: gitTimestamp?.toISOString() || null,
        isStale: true,
        reason: 'No summary exists'
      };
    }

    if (!gitTimestamp) {
      return {
        file: filePath,
        summaryTimestamp: summaryTimestamp.toISOString(),
        fileLastModified: null,
        isStale: false,
        reason: 'Cannot determine file modification time'
      };
    }

    const isStale = gitTimestamp > summaryTimestamp;

    return {
      file: filePath,
      summaryTimestamp: summaryTimestamp.toISOString(),
      fileLastModified: gitTimestamp.toISOString(),
      isStale,
      reason: isStale
        ? `File modified after summary (file: ${gitTimestamp.toISOString()}, summary: ${summaryTimestamp.toISOString()})`
        : 'Summary is up-to-date'
    };
  }

  /**
   * Get all stale summaries in a workspace
   */
  static getStaleFiles(workspacePath: string): StalenessInfo[] {
    const staleFiles: StalenessInfo[] = [];
    const codebasePath = path.join(workspacePath, '.codebase');

    if (!fs.existsSync(codebasePath)) {
      return [];
    }

    // Find all .json summary files
    const findJsonFiles = (dir: string): string[] => {
      const results: string[] = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && entry.name !== '.codebase' && !entry.name.startsWith('.')) {
          results.push(...findJsonFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          const relPath = path.relative(codebasePath, fullPath);
          results.push(relPath.replace(/\.json$/, ''));
        }
      }

      return results;
    };

    const summaryFiles = findJsonFiles(codebasePath);

    for (const filePath of summaryFiles) {
      const info = this.isStale(workspacePath, filePath);
      if (info.isStale) {
        staleFiles.push(info);
      }
    }

    return staleFiles;
  }
}
