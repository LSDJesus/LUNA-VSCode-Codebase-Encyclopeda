import * as vscode from 'vscode';
import { SummaryTreeProvider } from './summaryTreeProvider';
import { SummaryPanel } from './summaryPanel';
import { CodebaseAnalyzer } from './codebaseAnalyzer';

export function activate(context: vscode.ExtensionContext) {
    console.log('LUNA Codebase Encyclopedia is now active');

    // Initialize providers
    const summaryTreeProvider = new SummaryTreeProvider(context);
    const codebaseAnalyzer = new CodebaseAnalyzer(context);

    // Register tree view
    vscode.window.registerTreeDataProvider('luna-encyclopedia.summaryTree', summaryTreeProvider);

    // Register commands
    const generateCommand = vscode.commands.registerCommand('luna-encyclopedia.generateSummaries', async () => {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Generating codebase summaries...",
            cancellable: true
        }, async (progress, token) => {
            try {
                await codebaseAnalyzer.generateSummaries(progress, token);
                summaryTreeProvider.refresh();
                vscode.window.showInformationMessage('✅ Summaries generated successfully!');
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to generate summaries: ${error}`);
            }
        });
    });

    const showSummaryCommand = vscode.commands.registerCommand('luna-encyclopedia.showSummary', (summaryPath?: string) => {
        SummaryPanel.createOrShow(context.extensionUri, summaryPath);
    });

    context.subscriptions.push(generateCommand, showSummaryCommand);
}

export function deactivate() {}
