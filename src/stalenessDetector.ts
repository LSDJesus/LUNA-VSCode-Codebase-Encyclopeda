import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { GitBranchDetector } from './gitBranchDetector';

export interface StalenessInfo {
    filePath: string;
    summaryTimestamp: Date | null;
    fileLastModified: Date | null;
    isStale: boolean;
    reason: string;
}

export class StalenessDetector {
    /**
     * Get last commit timestamp for a file using git
     */
    static getGitTimestamp(workspacePath: string, filePath: string): Date | null {
        try {
            const relativePath = path.relative(workspacePath, filePath);
            const gitCommand = `git log -1 --format=%cI -- "${relativePath}"`;
            const result = execSync(gitCommand, { 
                cwd: workspacePath, 
                encoding: 'utf-8',
                stdio: ['pipe', 'pipe', 'ignore'] // Suppress stderr
            }).trim();
            
            if (result) {
                return new Date(result);
            }
        } catch (error) {
            // Not a git repo or file not tracked
        }
        
        // Fallback to file system timestamp
        return this.getFileSystemTimestamp(filePath);
    }

    /**
     * Get file system modification timestamp
     */
    static getFileSystemTimestamp(filePath: string): Date | null {
        try {
            const stats = fs.statSync(filePath);
            return stats.mtime;
        } catch (error) {
            return null;
        }
    }

    /**
     * Get summary generation timestamp from JSON metadata
     */
    static getSummaryTimestamp(workspacePath: string, filePath: string, branchAware: boolean = false): Date | null {
        const relativePath = path.relative(workspacePath, filePath);
        const basePath = path.join(workspacePath, '.codebase', relativePath.replace(/\.[^.]+$/, ''));
        const candidates = GitBranchDetector.getFilenamesToTry(basePath, '.json', workspacePath, branchAware);

        for (const candidate of candidates) {
            if (!fs.existsSync(candidate)) {
                continue;
            }

            try {
                const content = fs.readFileSync(candidate, 'utf-8');
                const metadata = JSON.parse(content);

                if (metadata.generatedAt) {
                    return new Date(metadata.generatedAt);
                }
            } catch {
                // Skip corrupt or invalid JSON
            }
        }

        return null;
    }

    /**
     * Check if a file's summary is stale
     */
    static isStale(workspacePath: string, filePath: string, branchAware: boolean = false): StalenessInfo {
        const summaryTimestamp = this.getSummaryTimestamp(workspacePath, filePath, branchAware);
        const gitTimestamp = this.getGitTimestamp(workspacePath, filePath);
        
        if (!summaryTimestamp) {
            return {
                filePath,
                summaryTimestamp: null,
                fileLastModified: gitTimestamp,
                isStale: true,
                reason: 'No summary exists'
            };
        }

        if (!gitTimestamp) {
            return {
                filePath,
                summaryTimestamp,
                fileLastModified: null,
                isStale: false,
                reason: 'Cannot determine file modification time'
            };
        }

        const isStale = gitTimestamp > summaryTimestamp;

        return {
            filePath,
            summaryTimestamp,
            fileLastModified: gitTimestamp,
            isStale,
            reason: isStale 
                ? `File modified ${gitTimestamp.toISOString()}, summary from ${summaryTimestamp.toISOString()}`
                : 'Summary is up-to-date'
        };
    }

    /**
     * Get all stale summaries in a workspace
     */
    static getStaleFiles(workspacePath: string, allFiles: string[], branchAware: boolean = false): StalenessInfo[] {
        const staleInfo: StalenessInfo[] = [];

        for (const filePath of allFiles) {
            const info = this.isStale(workspacePath, filePath, branchAware);
            if (info.isStale) {
                staleInfo.push(info);
            }
        }

        return staleInfo;
    }

    /**
     * Get summary of staleness status
     */
    static getStalenessReport(workspacePath: string, allFiles: string[], branchAware: boolean = false): {
        total: number;
        upToDate: number;
        stale: number;
        missing: number;
        staleFiles: StalenessInfo[];
    } {
        const staleFiles: StalenessInfo[] = [];
        let upToDate = 0;
        let stale = 0;
        let missing = 0;

        for (const filePath of allFiles) {
            const info = this.isStale(workspacePath, filePath, branchAware);
            
            if (!info.summaryTimestamp) {
                missing++;
                staleFiles.push(info);
            } else if (info.isStale) {
                stale++;
                staleFiles.push(info);
            } else {
                upToDate++;
            }
        }

        return {
            total: allFiles.length,
            upToDate,
            stale,
            missing,
            staleFiles
        };
    }
}
