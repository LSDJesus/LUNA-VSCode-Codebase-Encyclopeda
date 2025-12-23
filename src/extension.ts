import * as vscode from 'vscode';
import * as path from 'path';
import { SummaryTreeProvider } from './summaryTreeProvider';
import { SummaryPanel } from './summaryPanel';
import { CodebaseAnalyzer } from './codebaseAnalyzer';
import { CodeNavigationHandler } from './codeNavigationHandler';

let summaryTreeProvider: SummaryTreeProvider;

export async function activate(context: vscode.ExtensionContext) {
    console.log('LUNA Codebase Encyclopedia is now active');

    // Auto-register MCP server on first activation
    await registerMCPServer(context);

    // Initialize providers
    summaryTreeProvider = new SummaryTreeProvider(context);
    const codebaseAnalyzer = new CodebaseAnalyzer(context);

    // Register URI handler for code navigation
    const uriHandler = CodeNavigationHandler.register(context);

    // Register tree view
    const treeView = vscode.window.registerTreeDataProvider('luna-encyclopedia.summaryTree', summaryTreeProvider);

    // Register commands
    const initCommand = vscode.commands.registerCommand('luna-encyclopedia.initialize', async () => {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Initializing LUNA...",
            cancellable: false
        }, async (progress, token) => {
            try {
                await codebaseAnalyzer.initializeWorkspace(progress, token);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to initialize LUNA: ${error}`);
            }
        });
    });

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

    const updateStaleCommand = vscode.commands.registerCommand('luna-encyclopedia.updateStale', async () => {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Updating stale summaries...",
            cancellable: true
        }, async (progress, token) => {
            try {
                await codebaseAnalyzer.updateStaleSummaries(progress, token);
                summaryTreeProvider.refresh();
                vscode.window.showInformationMessage('✅ Stale summaries updated!');
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to update summaries: ${error}`);
            }
        });
    });

    const showSummaryCommand = vscode.commands.registerCommand('luna-encyclopedia.showSummary', (summaryPath?: string) => {
        SummaryPanel.createOrShow(context.extensionUri, summaryPath);
    });

    const refreshCommand = vscode.commands.registerCommand('luna-encyclopedia.refreshTree', () => {
        summaryTreeProvider.refresh();
    });

    context.subscriptions.push(
        initCommand,
        generateCommand, 
        updateStaleCommand, 
        showSummaryCommand, 
        refreshCommand, 
        treeView,
        uriHandler
    );

    // Check if workspace needs initialization (AFTER commands are registered)
    await checkAndPromptInitialization(codebaseAnalyzer);
}

async function checkAndPromptInitialization(codebaseAnalyzer: any) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        return; // No workspace open
    }

    const fs = require('fs');
    const codebasePath = path.join(workspaceFolder.uri.fsPath, '.codebase');
    
    // Check if .codebase directory exists
    if (!fs.existsSync(codebasePath)) {
        const action = await vscode.window.showInformationMessage(
            '🚀 Welcome to LUNA! Would you like to set up your codebase encyclopedia?',
            'Initialize Now',
            'Not Now',
            'Learn More'
        );

        if (action === 'Initialize Now') {
            vscode.commands.executeCommand('luna-encyclopedia.initialize');
        } else if (action === 'Learn More') {
            vscode.env.openExternal(vscode.Uri.parse('https://github.com/yourusername/LUNA-VSCode-Codebase-Encyclopeda#readme'));
        }
    }
}

async function registerMCPServer(context: vscode.ExtensionContext) {
    const mcpServerPath = path.join(context.extensionPath, 'mcp-server', 'dist', 'index.js');
    const config = vscode.workspace.getConfiguration();
    const mcpServers = config.get<Record<string, any>>('mcp.servers', {});

    // Check if LUNA MCP server is already registered
    if (!mcpServers['lunaEncyclopedia']) {
        try {
            await config.update('mcp.servers', {
                ...mcpServers,
                lunaEncyclopedia: {
                    type: 'stdio',
                    command: 'node',
                    args: [mcpServerPath]
                }
            }, vscode.ConfigurationTarget.Global);

            vscode.window.showInformationMessage(
                '✅ LUNA MCP Server registered! Copilot Agent Mode can now query your codebase summaries.',
                'Open Copilot Chat'
            ).then(selection => {
                if (selection === 'Open Copilot Chat') {
                    vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
                }
            });
        } catch (error) {
            console.error('Failed to register LUNA MCP server:', error);
            vscode.window.showWarningMessage(
                'LUNA: Could not auto-register MCP server. You may need to manually add it to your VS Code settings.',
                'Show Instructions'
            ).then(selection => {
                if (selection === 'Show Instructions') {
                    vscode.env.openExternal(vscode.Uri.parse('https://github.com/yourusername/LUNA-VSCode-Codebase-Encyclopeda#mcp-setup'));
                }
            });
        }
    }
}

export function deactivate() {}
