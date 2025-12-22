import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { marked } from 'marked';

export class SummaryPanel {
    public static currentPanel: SummaryPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'openCode':
                        this.handleCodeLink(message.uri);
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    public static createOrShow(extensionUri: vscode.Uri, summaryPath?: string) {
        const column = vscode.ViewColumn.Two;

        if (SummaryPanel.currentPanel) {
            SummaryPanel.currentPanel._panel.reveal(column);
            if (summaryPath) {
                SummaryPanel.currentPanel.updateContent(summaryPath);
            }
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'lunaSummary',
            'LUNA Summary',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        SummaryPanel.currentPanel = new SummaryPanel(panel, extensionUri);
        
        if (summaryPath) {
            SummaryPanel.currentPanel.updateContent(summaryPath);
        }
    }

    public updateContent(summaryPath: string) {
        if (!fs.existsSync(summaryPath)) {
            this._panel.webview.html = this.getErrorHtml('Summary file not found');
            return;
        }

        const markdown = fs.readFileSync(summaryPath, 'utf-8');
        
        // Also try to load JSON metadata for enhanced display
        const jsonPath = summaryPath.replace(/\.md$/, '.json');
        let metadata = null;
        if (fs.existsSync(jsonPath)) {
            try {
                metadata = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
            } catch {
                // Ignore JSON parse errors
            }
        }
        
        const html = marked(markdown) as string;
        
        this._panel.title = path.basename(summaryPath, '.md');
        this._panel.webview.html = this.getWebviewContent(html, metadata);
    }

    private handleCodeLink(uri: string) {
        // Parse code: URI format: code:path/to/file.py#symbol=method_name
        const match = uri.match(/^code:(.+?)(?:#symbol=(.+))?$/);
        if (!match) {
            return;
        }

        const [, filePath, symbol] = match;
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return;
        }

        const fullPath = path.join(workspaceFolder.uri.fsPath, filePath);
        vscode.workspace.openTextDocument(fullPath).then(doc => {
            vscode.window.showTextDocument(doc, vscode.ViewColumn.One).then(editor => {
                if (symbol) {
                    // Try to find the symbol in the document
                    const text = doc.getText();
                    const regex = new RegExp(`(def|class|function|const|let|var)\\s+${symbol}`, 'g');
                    const match = regex.exec(text);
                    if (match) {
                        const position = doc.positionAt(match.index);
                        editor.selection = new vscode.Selection(position, position);
                        editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
                    }
                }
            });
        });
    }

    private getWebviewContent(htmlContent: string, metadata?: any): string {
        const metadataSection = metadata ? `
        <div style="background-color: var(--vscode-textBlockQuote-background); padding: 12px; border-radius: 6px; margin-bottom: 20px; font-size: 12px;">
            <strong>📄 Source:</strong> <code>${metadata.sourceFile || 'Unknown'}</code><br>
            <strong>🕒 Generated:</strong> ${metadata.generatedAt ? new Date(metadata.generatedAt).toLocaleString() : 'Unknown'}
        </div>` : '';
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LUNA Summary</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            line-height: 1.6;
        }
        h1, h2, h3, h4, h5, h6 {
            color: var(--vscode-foreground);
            margin-top: 24px;
            margin-bottom: 16px;
            font-weight: 600;
        }
        h1 { border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 8px; }
        h2 { border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 6px; }
        code {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 2px 6px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
        }
        pre {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 16px;
            border-radius: 6px;
            overflow-x: auto;
        }
        pre code {
            background-color: transparent;
            padding: 0;
        }
        a {
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        ul, ol {
            padding-left: 30px;
        }
        li {
            margin: 4px 0;
        }
        blockquote {
            border-left: 4px solid var(--vscode-textBlockQuote-border);
            padding-left: 16px;
            color: var(--vscode-textBlockQuote-foreground);
            margin: 16px 0;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 16px 0;
        }
        th, td {
            border: 1px solid var(--vscode-panel-border);
            padding: 8px 12px;
            text-align: left;
        }
        th {
            background-color: var(--vscode-editor-background);
            font-weight: 600;
        }
    </style>
</head>
<body>
    ${metadataSection}
    ${htmlContent}
    <script>
        const vscode = acquireVsCodeApi();
        
        // Intercept code: links
        document.addEventListener('click', (e) => {
            const target = e.target;
            if (target.tagName === 'A' && target.href.startsWith('code:')) {
                e.preventDefault();
                vscode.postMessage({
                    command: 'openCode',
                    uri: target.href
                });
            }
        });
    </script>
</body>
</html>`;
    }

    private getErrorHtml(message: string): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-errorForeground);
            padding: 20px;
        }
    </style>
</head>
<body>
    <h2>⚠️ ${message}</h2>
</body>
</html>`;
    }

    public dispose() {
        SummaryPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
