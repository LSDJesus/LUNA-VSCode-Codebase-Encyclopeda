import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

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
                items.push(new SummaryItem(
                    displayName,
                    fullPath,
                    vscode.TreeItemCollapsibleState.None,
                    false
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
        public readonly isDirectory: boolean
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
            this.iconPath = new vscode.ThemeIcon('file-text');
        } else {
            this.iconPath = new vscode.ThemeIcon('folder');
        }
    }
}
