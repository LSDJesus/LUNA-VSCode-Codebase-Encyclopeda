import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { StalenessDetector } from './stalenessDetector';

export class SummaryTreeProvider implements vscode.TreeDataProvider<SummaryItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<SummaryItem | undefined | null | void> = new vscode.EventEmitter<SummaryItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<SummaryItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private context: vscode.ExtensionContext) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: SummaryItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: SummaryItem): Promise<SummaryItem[]> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return [];
        }

        const docsPath = path.join(workspaceFolder.uri.fsPath, '.codebase');
        
        if (!fs.existsSync(docsPath)) {
            return [];
        }

        if (!element) {
            // Root level
            return this.getDirectoryContents(docsPath, docsPath);
        } else {
            // Nested directory
            return this.getDirectoryContents(element.resourcePath, docsPath);
        }
    }

    private getDirectoryContents(dirPath: string, rootPath: string): SummaryItem[] {
        if (!fs.existsSync(dirPath)) {
            return [];
        }

        const items: SummaryItem[] = [];
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            
            if (entry.isDirectory()) {
                items.push(new SummaryItem(
                    entry.name,
                    fullPath,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    true
                ));
            } else if (entry.name.endsWith('.md')) {
                const displayName = entry.name.replace('.md', '');
                
                // Determine if stale
                let isStale = false;
                const workspaceFolder = vscode.workspace.getWorkspaceFolders()?.[0];
                if (workspaceFolder) {
                    const branchAware = vscode.workspace.getConfiguration('luna-encyclopedia').get<boolean>('branchAwareSummaries', false);
                    const relativePath = path.relative(path.join(workspaceFolder.uri.fsPath, '.codebase'), fullPath);
                    // We don't know the exact extension, so we might need to check common ones or look at the JSON
                    // For now, let's assume the StalenessDetector can handle it if we find the source file
                    // A better way is to check the .json file which has the sourceFile path
                    const jsonPath = fullPath.replace('.md', '.json');
                    if (fs.existsSync(jsonPath)) {
                        try {
                            const metadata = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
                            const sourcePath = path.join(workspaceFolder.uri.fsPath, metadata.sourceFile);
                            if (fs.existsSync(sourcePath)) {
                                const report = StalenessDetector.isStale(workspaceFolder.uri.fsPath, sourcePath, branchAware);
                                isStale = report.isStale;
                            }
                        } catch (e) {}
                    }
                }

                items.push(new SummaryItem(
                    displayName,
                    fullPath,
                    vscode.TreeItemCollapsibleState.None,
                    false,
                    isStale
                ));
            }
        }

        return items.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.label.toString().localeCompare(b.label.toString());
        });
    }
}

class SummaryItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly resourcePath: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly isDirectory: boolean,
        public readonly isStale: boolean = false
    ) {
        super(label, collapsibleState);
        
        this.tooltip = resourcePath;
        this.contextValue = isDirectory ? 'directory' : 'summary';
        
        if (!isDirectory) {
            this.command = {
                command: 'luna-encyclopedia.showSummary',
                title: 'Open Summary',
                arguments: [resourcePath]
            };
            
            if (isStale) {
                this.description = '(stale)';
                this.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('list.warningForeground'));
                this.tooltip = `${resourcePath} (Out of date)`;
            } else {
                this.iconPath = new vscode.ThemeIcon('file-text');
            }
        } else {
            this.iconPath = new vscode.ThemeIcon('folder');
        }
    }
}
