import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

export class GitHookManager {
    static async installPostCommitHook(workspacePath: string): Promise<void> {
        const gitPath = path.join(workspacePath, '.git');
        if (!fs.existsSync(gitPath)) {
            throw new Error('Not a git repository. Please initialize git first.');
        }

        const hooksPath = path.join(gitPath, 'hooks');
        if (!fs.existsSync(hooksPath)) {
            fs.mkdirSync(hooksPath, { recursive: true });
        }

        const postCommitPath = path.join(hooksPath, 'post-commit');
        
        const hookScript = `#!/bin/sh
# LUNA Codebase Encyclopedia - Post-commit reminder
# This hook checks for stale summaries after a commit.

echo ""
echo "🌙 LUNA: Checking for stale summaries..."

# We use a simple check: if there are modified files that aren't in .codebase/
# and we have a .codebase directory, remind the user.
if [ -d ".codebase" ]; then
    # Get list of files changed in the last commit
    CHANGED_FILES=$(git diff-tree --no-commit-id --name-only -r HEAD | grep -v "^.codebase/")
    
    if [ ! -z "$CHANGED_FILES" ]; then
        echo "⚠️  You have modified source files. Don't forget to update your LUNA summaries!"
        echo "👉 Run: Command Palette -> 'LUNA: Update Stale Summaries'"
    fi
fi
`;

        try {
            if (fs.existsSync(postCommitPath)) {
                const existingContent = fs.readFileSync(postCommitPath, 'utf-8');
                if (existingContent.includes('LUNA Codebase Encyclopedia')) {
                    vscode.window.showInformationMessage('LUNA Git hook is already installed! ✅');
                    return;
                }
                
                // Append to existing hook
                fs.appendFileSync(postCommitPath, `\n\n${hookScript}`);
            } else {
                // Create new hook
                fs.writeFileSync(postCommitPath, hookScript, { mode: 0o755 });
            }

            // Ensure it's executable (especially for Linux/macOS)
            if (process.platform !== 'win32') {
                execSync(`chmod +x "${postCommitPath}"`);
            }

            vscode.window.showInformationMessage('✅ LUNA Git post-commit hook installed successfully!');
        } catch (error) {
            throw new Error(`Failed to install git hook: ${error}`);
        }
    }
}
