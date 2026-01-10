import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { StalenessDetector, StalenessInfo } from './stalenessDetector';

/**
 * Watches for git commits from ANY source (terminal, VS Code UI, GitHub extension, etc.)
 * and prompts user to update stale summaries
 */
export class GitCommitWatcher {
    private disposable: vscode.Disposable | null = null;
    private lastHeadRef: string = '';
    private workspacePath: string;

    constructor(workspacePath: string) {
        this.workspacePath = workspacePath;
    }

    /**
     * Start watching for git commits
     */
    start(): void {
        if (this.disposable) {
            return; // Already watching
        }

        const gitDir = path.join(this.workspacePath, '.git');

        // Get initial HEAD ref
        this.updateLastHeadRef();

        // Watch .git directory for changes (commits update refs)
        const watcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(gitDir, 'refs/heads/**'),
            false,
            false,
            false
        );

        // Listen for file changes (new commits update the current branch ref)
        watcher.onDidChange(() => this.onGitChange());
        watcher.onDidCreate(() => this.onGitChange());

        // Also watch HEAD file (for branch switches)
        const headWatcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(gitDir, 'HEAD'),
            false,
            false,
            false
        );

        headWatcher.onDidChange(() => this.onGitChange());

        // Store disposable
        this.disposable = vscode.Disposable.from(watcher, headWatcher);

        console.log('[LUNA] Git commit watcher started');
    }

    /**
     * Stop watching for commits
     */
    stop(): void {
        if (this.disposable) {
            this.disposable.dispose();
            this.disposable = null;
        }
    }

    /**
     * Called when git directory changes
     */
    private async onGitChange(): Promise<void> {
        // Use a small delay to ensure git operation is fully complete
        await this.delay(500);

        const currentRef = this.getCurrentHeadRef();
        
        // Only trigger if HEAD actually changed (new commit or branch switch)
        if (currentRef !== this.lastHeadRef) {
            this.lastHeadRef = currentRef;
            console.log('[LUNA] Git commit detected, checking for stale summaries');
            
            await this.checkAndNotifyStale();
        }
    }

    /**
     * Get the current git HEAD reference
     */
    private getCurrentHeadRef(): string {
        try {
            const headPath = path.join(this.workspacePath, '.git', 'HEAD');
            if (fs.existsSync(headPath)) {
                return fs.readFileSync(headPath, 'utf-8').trim();
            }
        } catch (error) {
            console.error('[LUNA] Error reading git HEAD:', error);
        }
        return '';
    }

    /**
     * Update the last known HEAD ref
     */
    private updateLastHeadRef(): void {
        this.lastHeadRef = this.getCurrentHeadRef();
    }

    /**
     * Check for stale summaries and notify user
     */
    private async checkAndNotifyStale(): Promise<void> {
        try {
            const codebasePath = path.join(this.workspacePath, '.codebase');
            
            // Check if codebase directory exists
            if (!fs.existsSync(codebasePath)) {
                return;
            }

            // Discover source files in the workspace
            const sourceFiles = await this.discoverSourceFiles();
            
            if (sourceFiles.length === 0) {
                return; // No files to check
            }

            // Use StalenessDetector to check for stale summaries
            const staleInfo = StalenessDetector.getStaleFiles(this.workspacePath, sourceFiles);

            if (staleInfo.length > 0) {
                const fileList = staleInfo.slice(0, 5).map(f => path.basename(f.filePath)).join(', ');
                const moreText = staleInfo.length > 5 ? ` (and ${staleInfo.length - 5} more)` : '';
                
                const action = await vscode.window.showInformationMessage(
                    `📝 ${staleInfo.length} summary/summaries may be outdated${moreText}`,
                    '🔄 Update Summaries',
                    '⏭️ Later'
                );

                if (action === '🔄 Update Summaries') {
                    vscode.commands.executeCommand('luna-encyclopedia.updateStale');
                }
            }
        } catch (error) {
            console.error('[LUNA] Error checking for stale summaries:', error);
        }
    }

    /**
     * Discover source files in the workspace
     */
    private async discoverSourceFiles(): Promise<string[]> {
        const files: string[] = [];
        const extensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.cs', '.go', '.cpp', '.c', '.rb', '.php'];
        
        const walkDir = (dir: string, maxDepth: number = 10, currentDepth: number = 0): void => {
            if (currentDepth > maxDepth) return;
            if (!fs.existsSync(dir)) return;

            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                
                for (const entry of entries) {
                    // Skip common exclusions
                    if (['node_modules', '.git', 'dist', 'build', 'out', '.codebase', '.vscode', '.idea'].includes(entry.name)) {
                        continue;
                    }

                    const fullPath = path.join(dir, entry.name);
                    
                    if (entry.isDirectory()) {
                        walkDir(fullPath, maxDepth, currentDepth + 1);
                    } else if (entry.isFile()) {
                        const ext = path.extname(entry.name);
                        if (extensions.includes(ext)) {
                            files.push(fullPath);
                        }
                    }
                }
            } catch (error) {
                // Skip directories we can't read
            }
        };

        walkDir(this.workspacePath);
        return files;
    }

    /**
     * Simple async delay
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
