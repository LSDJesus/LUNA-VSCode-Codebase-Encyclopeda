import * as vscode from 'vscode';
import * as path from 'path';
import { SummaryTreeProvider } from './summaryTreeProvider';
import { SummaryPanel } from './summaryPanel';
import { CodebaseAnalyzer } from './codebaseAnalyzer';
import { CodeNavigationHandler } from './codeNavigationHandler';
import { SummaryPreviewGenerator } from './summaryPreviewGenerator';
import { CodeBreakdownGenerator } from './codeBreakdownGenerator';
import { GitCommitWatcher } from './gitCommitWatcher';

let summaryTreeProvider: SummaryTreeProvider;
let gitCommitWatcher: GitCommitWatcher | null = null;

export async function activate(context: vscode.ExtensionContext) {
    console.log('LUNA Codebase Encyclopedia is now active');

    // Auto-register MCP server on first activation
    await registerMCPServer(context);

    // Initialize providers
    summaryTreeProvider = new SummaryTreeProvider(context);
    const codebaseAnalyzer = new CodebaseAnalyzer(context);

    // Register URI handler for code navigation
    const uriHandler = CodeNavigationHandler.register(context);

    // Start git commit watcher (works with terminal, GitHub extension, etc.)
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
        gitCommitWatcher = new GitCommitWatcher(workspaceFolder.uri.fsPath);
        gitCommitWatcher.start();
    }

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

    const summarizeFileCommand = vscode.commands.registerCommand('luna-encyclopedia.summarizeFile', async (fileUri?: vscode.Uri) => {
        // Get the file URI from context menu or active editor
        const targetUri = fileUri || vscode.window.activeTextEditor?.document.uri;
        
        if (!targetUri) {
            vscode.window.showErrorMessage('No file selected. Please right-click a file or open one in the editor.');
            return;
        }

        const workspaceFolder = vscode.workspace.getWorkspaceFolder(targetUri);
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('File is not in the current workspace.');
            return;
        }

        // Get relative path from workspace root
        const relativePath = path.relative(workspaceFolder.uri.fsPath, targetUri.fsPath);

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Summarizing ${path.basename(targetUri.fsPath)}...`,
            cancellable: true
        }, async (progress, token) => {
            try {
                await codebaseAnalyzer.summarizeSingleFile(relativePath, workspaceFolder.uri.fsPath, progress, token);
                summaryTreeProvider.refresh();
                vscode.window.showInformationMessage(`✅ Summary generated for ${path.basename(targetUri.fsPath)}`);
                
                // Show the summary in the summary panel
                const summaryPath = path.join(workspaceFolder.uri.fsPath, '.codebase', relativePath.replace(/\.[^.]+$/, '.md'));
                SummaryPanel.createOrShow(context.extensionUri, summaryPath);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to summarize file: ${error}`);
            }
        });
    });

    const previewFilesCommand = vscode.commands.registerCommand('luna-encyclopedia.previewFiles', async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder open.');
            return;
        }

        try {
            const generator = new SummaryPreviewGenerator(workspaceFolder.uri.fsPath);
            const previewPath = path.join(workspaceFolder.uri.fsPath, '.codebase', 'preview-included-files.txt');
            
            await generator.savePreview(previewPath);
            
            // Open the preview file
            const doc = await vscode.workspace.openTextDocument(previewPath);
            await vscode.window.showTextDocument(doc);
            
            vscode.window.showInformationMessage('✅ Preview generated! Check preview-included-files.txt');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to generate preview: ${error}`);
        }
    });

    // Generate detailed code breakdown
    const generateBreakdownCommand = vscode.commands.registerCommand('luna-encyclopedia.generateBreakdown', async (fileUri?: vscode.Uri) => {
        // Get file from context menu or active editor
        let targetUri = fileUri;
        if (!targetUri) {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                targetUri = activeEditor.document.uri;
            }
        }

        if (!targetUri) {
            vscode.window.showErrorMessage('No file selected. Right-click a file or open one in the editor.');
            return;
        }

        const filePath = targetUri.fsPath;
        const fileName = path.basename(filePath);

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Generating code breakdown for ${fileName}...`,
            cancellable: true
        }, async (progress, token) => {
            try {
                const breakdownGenerator = new CodeBreakdownGenerator(context);
                
                progress.report({ message: '🚀 Starting breakdown generation...' });
                
                const breakdown = await breakdownGenerator.generateBreakdown(filePath, progress, token);
                const savedPath = await breakdownGenerator.saveBreakdown(filePath, breakdown);
                
                // Open the breakdown file
                const doc = await vscode.workspace.openTextDocument(savedPath);
                await vscode.window.showTextDocument(doc, { preview: false });
                
                const verbosity = vscode.workspace.getConfiguration('luna-encyclopedia').get<string>('breakdownVerbosity', 'intermediate');
                vscode.window.showInformationMessage(`✅ Code breakdown generated (${verbosity} mode)! See ${path.basename(savedPath)}`);
            } catch (error) {
                if (token.isCancellationRequested) {
                    vscode.window.showInformationMessage('Breakdown generation cancelled.');
                } else {
                    vscode.window.showErrorMessage(`Failed to generate breakdown: ${error}`);
                }
            }
        });
    });

    // Watch for file changes to refresh the tree
    const watcher = vscode.workspace.createFileSystemWatcher('**/*');
    watcher.onDidChange(() => summaryTreeProvider.refresh());
    watcher.onDidCreate(() => summaryTreeProvider.refresh());
    watcher.onDidDelete(() => summaryTreeProvider.refresh());

    context.subscriptions.push(
        initCommand,
        generateCommand, 
        updateStaleCommand, 
        showSummaryCommand, 
        refreshCommand,
        summarizeFileCommand,
        previewFilesCommand,
        generateBreakdownCommand,
        treeView,
        uriHandler,
        watcher
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

    // Check if LUNA MCP server needs registration or update
    const existingServer = mcpServers['lunaEncyclopedia'];
    const needsUpdate = !existingServer || 
                       existingServer.args?.[0] !== mcpServerPath;

    if (needsUpdate) {
        try {
            await config.update('mcp.servers', {
                ...mcpServers,
                lunaEncyclopedia: {
                    type: 'stdio',
                    command: 'node',
                    args: [mcpServerPath]
                }
            }, vscode.ConfigurationTarget.Global);

            if (!existingServer) {
                // First-time registration
                vscode.window.showInformationMessage(
                    '✅ LUNA MCP Server registered! Copilot Agent Mode can now query your codebase summaries.',
                    'Open Copilot Chat'
                ).then(selection => {
                    if (selection === 'Open Copilot Chat') {
                        vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
                    }
                });
            } else {
                // Updated to new version
                console.log('LUNA MCP server path updated to:', mcpServerPath);
            }
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

export function deactivate() {
    // Stop git commit watcher on deactivation
    if (gitCommitWatcher) {
        gitCommitWatcher.stop();
    }
}

