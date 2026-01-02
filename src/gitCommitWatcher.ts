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

            // Get list of summary files
            const summaryFiles = fs.readdirSync(codebasePath)
                .filter(f => f.endsWith('.md') || f.endsWith('.json'));

            if (summaryFiles.length === 0) {
                return; // No summaries yet
            }

            // Detect stale files
            const staleInfo: StalenessInfo[] = [];
            for (const summaryFile of summaryFiles) {
                const summaryPath = path.join(codebasePath, summaryFile);
                
                // Find corresponding source file
                const isIndexFile = summaryFile.includes('.index.');
                if (isIndexFile) {
                    continue; // Skip index files
                }

                const sourceFileName = summaryFile
                    .replace('.md', '').replace('.json', '')
                    .replace('.summary', '');
                
                // Search for source file (simplified - looks in common locations)
                const possibleSourcePaths = [
                    path.join(this.workspacePath, sourceFileName),
                    path.join(this.workspacePath, 'src', sourceFileName),
                    path.join(this.workspacePath, 'lib', sourceFileName)
                ];

                for (const sourcePath of possibleSourcePaths) {
                    if (fs.existsSync(sourcePath)) {
                        const summaryStats = fs.statSync(summaryPath);
                        const sourceStats = fs.statSync(sourcePath);
                        
                        if (sourceStats.mtime > summaryStats.mtime) {
                            staleInfo.push({
                                filePath: sourceFileName,
                                summaryTimestamp: summaryStats.mtime,
                                fileLastModified: sourceStats.mtime,
                                isStale: true,
                                reason: 'File modified after summary'
                            });
                        }
                        break;
                    }
                }
            }

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
     * Simple async delay
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
