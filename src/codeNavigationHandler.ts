import * as vscode from 'vscode';
import * as path from 'path';

export class CodeNavigationHandler {
    /**
     * Register URI handler for vscode://file/ links
     */
    static register(context: vscode.ExtensionContext): vscode.Disposable {
        return vscode.window.registerUriHandler({
            handleUri: async (uri: vscode.Uri) => {
                if (uri.path.startsWith('/file/')) {
                    await this.handleFileNavigation(uri);
                }
            }
        });
    }

    /**
     * Handle vscode://file/path/to/file.ts?line=123 links
     */
    private static async handleFileNavigation(uri: vscode.Uri): Promise<void> {
        // Extract file path from URI
        const filePath = uri.path.replace('/file/', '');
        const query = this.parseQuery(uri.query);
        
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        const fullPath = path.join(workspaceFolder.uri.fsPath, filePath);
        
        // Open the file
        const document = await vscode.workspace.openTextDocument(fullPath);
        const editor = await vscode.window.showTextDocument(document);

        // Navigate to line if specified
        if (query.line) {
            const lineNumber = parseInt(query.line, 10) - 1; // VS Code uses 0-based line numbers
            const endLine = query.endLine ? parseInt(query.endLine, 10) - 1 : lineNumber;
            
            const range = new vscode.Range(
                new vscode.Position(lineNumber, 0),
                new vscode.Position(endLine, Number.MAX_VALUE)
            );
            
            editor.selection = new vscode.Selection(range.start, range.end);
            editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
        }
    }

    /**
     * Parse query string into key-value pairs
     */
    private static parseQuery(queryString: string): Record<string, string> {
        const result: Record<string, string> = {};
        
        if (!queryString) {
            return result;
        }

        const pairs = queryString.split('&');
        for (const pair of pairs) {
            const [key, value] = pair.split('=');
            if (key && value) {
                result[key] = decodeURIComponent(value);
            }
        }

        return result;
    }
}
