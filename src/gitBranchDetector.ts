import * as vscode from 'vscode';
import { execSync } from 'child_process';

export class GitBranchDetector {
    /**
     * Get current git branch name for a workspace
     * Returns null if not in a git repository
     */
    static getCurrentBranch(workspacePath: string): string | null {
        try {
            const branch = execSync('git rev-parse --abbrev-ref HEAD', {
                cwd: workspacePath,
                encoding: 'utf-8',
                stdio: ['pipe', 'pipe', 'ignore'] // Suppress errors
            }).trim();
            
            return branch || null;
        } catch (error) {
            // Not a git repo or git not available
            return null;
        }
    }

    /**
     * Check if current branch is a main/master branch
     */
    static isMainBranch(branch: string | null): boolean {
        if (!branch) {
            return true; // Treat non-git as "main"
        }
        
        const mainBranches = ['main', 'master', 'develop', 'dev'];
        return mainBranches.includes(branch.toLowerCase());
    }

    /**
     * Sanitize branch name for use in filenames
     * Replaces special characters with underscores
     */
    static sanitizeBranchName(branch: string): string {
        return branch
            .replace(/[^a-zA-Z0-9-_]/g, '_')
            .replace(/_{2,}/g, '_')
            .toLowerCase();
    }

    /**
     * Get branch-aware filename suffix
     * Returns empty string if branch-aware mode is disabled or on main branch
     */
    static getBranchSuffix(workspacePath: string, enabled: boolean): string {
        if (!enabled) {
            return '';
        }

        const branch = this.getCurrentBranch(workspacePath);
        
        if (!branch || this.isMainBranch(branch)) {
            return '';
        }

        return `.${this.sanitizeBranchName(branch)}`;
    }

    /**
     * Get all possible filenames to try (branch-specific first, then fallback)
     */
    static getFilenamesToTry(
        baseName: string,
        extension: string,
        workspacePath: string,
        enabled: boolean
    ): string[] {
        const files: string[] = [];
        
        if (enabled) {
            const branch = this.getCurrentBranch(workspacePath);
            if (branch && !this.isMainBranch(branch)) {
                // Try branch-specific first
                const sanitized = this.sanitizeBranchName(branch);
                files.push(`${baseName}.${sanitized}${extension}`);
            }
        }
        
        // Always include base filename as fallback
        files.push(`${baseName}${extension}`);
        
        return files;
    }
}
