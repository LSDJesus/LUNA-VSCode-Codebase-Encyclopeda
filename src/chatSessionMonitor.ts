import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Parsed representation of a single chat turn (user prompt + AI response)
 */
export interface ChatTurn {
    requestId: string;
    timestamp: number;
    userMessage: string;
    aiResponse: string;
    modelId?: string;
    /** File references mentioned in the turn */
    fileReferences: string[];
    /** Whether this turn involved tool calls (agent mode) */
    hadToolCalls: boolean;
}

/**
 * Parsed representation of a full chat session
 */
export interface ParsedChatSession {
    sessionId: string;
    title: string;
    creationDate: number;
    lastMessageDate: number;
    mode: string;
    selectedModel: string;
    turns: ChatTurn[];
}

/**
 * Tracking state for incremental processing
 */
interface SessionTrackingState {
    /** Number of requests we've already processed */
    processedRequestCount: number;
    /** Last modification time we saw */
    lastModified: number;
}

/**
 * Monitors VS Code's Copilot Chat session storage for new/updated conversations
 * and maintains backups + structured activity logs.
 */
export class ChatSessionMonitor {
    private watcher: vscode.FileSystemWatcher | null = null;
    private chatSessionsPath: string | null = null;
    private trackingState: Map<string, SessionTrackingState> = new Map();
    private outputChannel: vscode.OutputChannel;
    private backupPath: string;
    private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
    private disposables: vscode.Disposable[] = [];
    private isProcessing = false;

    constructor(
        private context: vscode.ExtensionContext,
        outputChannel: vscode.OutputChannel
    ) {
        this.outputChannel = outputChannel;
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        this.backupPath = workspaceFolder
            ? path.join(workspaceFolder.uri.fsPath, '.codebase', 'chat-history')
            : '';
    }

    /**
     * Start monitoring chat sessions for the current workspace
     */
    async start(): Promise<void> {
        const config = vscode.workspace.getConfiguration('luna-encyclopedia');
        if (!config.get<boolean>('chatBackup.enabled', true)) {
            this.log('Chat backup disabled in settings');
            return;
        }

        this.chatSessionsPath = await this.findChatSessionsPath();
        if (!this.chatSessionsPath) {
            this.log('Could not find chat sessions directory');
            return;
        }

        this.log(`Chat sessions directory: ${this.chatSessionsPath}`);

        // Ensure backup directory exists
        if (this.backupPath) {
            fs.mkdirSync(this.backupPath, { recursive: true });
        }

        // Load previous tracking state
        this.loadTrackingState();

        // Do an initial scan
        await this.scanAllSessions();

        // Watch for changes
        const pattern = new vscode.RelativePattern(
            vscode.Uri.file(this.chatSessionsPath),
            '*.json'
        );
        this.watcher = vscode.workspace.createFileSystemWatcher(pattern);

        this.watcher.onDidChange(uri => this.onSessionChanged(uri));
        this.watcher.onDidCreate(uri => this.onSessionChanged(uri));

        this.disposables.push(this.watcher);
        this.log('Chat session monitor started');
    }

    /**
     * Stop monitoring
     */
    stop(): void {
        for (const timer of this.debounceTimers.values()) {
            clearTimeout(timer);
        }
        this.debounceTimers.clear();

        for (const d of this.disposables) {
            d.dispose();
        }
        this.disposables = [];
        this.watcher = null;
        this.log('Chat session monitor stopped');
    }

    /**
     * Find the workspace storage path where VS Code stores chat sessions.
     * Uses context.storageUri to find our extension storage, then navigates
     * up to the workspace root to find chatSessions/.
     */
    private async findChatSessionsPath(): Promise<string | null> {
        // Method 1: Use extension storageUri (most reliable)
        // context.storageUri points to: workspaceStorage/<hash>/<extensionId>/
        // We need: workspaceStorage/<hash>/chatSessions/
        if (this.context.storageUri) {
            const extensionStoragePath = this.context.storageUri.fsPath;
            const workspaceStorageRoot = path.dirname(extensionStoragePath);
            const chatSessionsPath = path.join(workspaceStorageRoot, 'chatSessions');
            if (fs.existsSync(chatSessionsPath)) {
                return chatSessionsPath;
            }
        }

        // Method 2: Search workspaceStorage directories for matching workspace
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) { return null; }

        const workspaceStorageBase = this.getWorkspaceStorageBase();
        if (!workspaceStorageBase || !fs.existsSync(workspaceStorageBase)) {
            return null;
        }

        const targetUri = workspaceFolder.uri.toString();
        try {
            const dirs = fs.readdirSync(workspaceStorageBase, { withFileTypes: true });
            for (const dir of dirs) {
                if (!dir.isDirectory()) { continue; }
                const wsFile = path.join(workspaceStorageBase, dir.name, 'workspace.json');
                if (!fs.existsSync(wsFile)) { continue; }
                try {
                    const wsData = JSON.parse(fs.readFileSync(wsFile, 'utf8'));
                    const folderUri = wsData.folder || '';
                    if (decodeURIComponent(folderUri) === decodeURIComponent(targetUri)) {
                        const chatPath = path.join(workspaceStorageBase, dir.name, 'chatSessions');
                        if (fs.existsSync(chatPath)) {
                            return chatPath;
                        }
                    }
                } catch { /* skip malformed */ }
            }
        } catch (err) {
            this.log(`Error searching workspace storage: ${err}`);
        }

        return null;
    }

    /**
     * Get the base workspaceStorage directory for the current platform
     */
    private getWorkspaceStorageBase(): string {
        const platform = os.platform();
        if (platform === 'win32') {
            return path.join(process.env.APPDATA || '', 'Code', 'User', 'workspaceStorage');
        } else if (platform === 'darwin') {
            return path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User', 'workspaceStorage');
        } else {
            return path.join(os.homedir(), '.config', 'Code', 'User', 'workspaceStorage');
        }
    }

    /**
     * Handle a session file being created or modified (debounced)
     */
    private onSessionChanged(uri: vscode.Uri): void {
        const sessionId = path.basename(uri.fsPath, '.json');

        // Debounce - VS Code may write multiple times in quick succession
        const existing = this.debounceTimers.get(sessionId);
        if (existing) { clearTimeout(existing); }

        this.debounceTimers.set(sessionId, setTimeout(async () => {
            this.debounceTimers.delete(sessionId);
            await this.processSession(uri.fsPath);
        }, 3000)); // 3 second debounce
    }

    /**
     * Scan all sessions on startup to catch anything missed
     */
    async scanAllSessions(): Promise<void> {
        if (!this.chatSessionsPath) { return; }

        try {
            const files = fs.readdirSync(this.chatSessionsPath)
                .filter(f => f.endsWith('.json'));

            for (const file of files) {
                const fullPath = path.join(this.chatSessionsPath, file);
                await this.processSession(fullPath);
            }
        } catch (err) {
            this.log(`Error scanning sessions: ${err}`);
        }
    }

    /**
     * Process a single session file — extract new turns and log them
     */
    private async processSession(sessionFilePath: string): Promise<void> {
        if (this.isProcessing) { return; } // Prevent re-entrancy
        this.isProcessing = true;

        try {
            const sessionId = path.basename(sessionFilePath, '.json');
            const stat = fs.statSync(sessionFilePath);
            const tracking = this.trackingState.get(sessionId);

            // Skip if file hasn't changed since last processing
            if (tracking && stat.mtimeMs <= tracking.lastModified) {
                return;
            }

            // Parse the session
            const raw = fs.readFileSync(sessionFilePath, 'utf8');
            let sessionData: any;
            try {
                sessionData = JSON.parse(raw);
            } catch {
                this.log(`Failed to parse session ${sessionId}`);
                return;
            }

            const requests = sessionData.requests || [];
            const alreadyProcessed = tracking?.processedRequestCount || 0;

            // Only process new turns
            if (requests.length <= alreadyProcessed) {
                // Update mtime tracking even if no new requests
                this.trackingState.set(sessionId, {
                    processedRequestCount: alreadyProcessed,
                    lastModified: stat.mtimeMs
                });
                return;
            }

            const parsed = this.parseSession(sessionData);
            const newTurns = parsed.turns.slice(alreadyProcessed);

            if (newTurns.length > 0) {
                // Append new turns to the activity log
                this.appendToActivityLog(parsed, newTurns);

                // Backup the session as markdown
                this.backupSessionMarkdown(parsed);

                this.log(`Processed ${newTurns.length} new turn(s) from "${parsed.title}"`);
            }

            // Update tracking
            this.trackingState.set(sessionId, {
                processedRequestCount: requests.length,
                lastModified: stat.mtimeMs
            });
            this.saveTrackingState();
        } catch (err) {
            this.log(`Error processing session: ${err}`);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Parse a raw session JSON object into our structured format
     */
    parseSession(raw: any): ParsedChatSession {
        const turns: ChatTurn[] = [];

        for (const req of (raw.requests || [])) {
            const userMessage = req.message?.text || '';
            let aiResponse = '';
            const fileReferences: string[] = [];
            let hadToolCalls = false;

            // Extract response parts
            if (Array.isArray(req.response)) {
                for (const part of req.response) {
                    if (part.kind === 'markdownContent' && part.content?.value) {
                        aiResponse += part.content.value;
                    } else if (part.kind === 'textEditGroup' || part.kind === 'codeblockUri') {
                        hadToolCalls = true;
                    } else if (part.kind === 'inlineReference') {
                        if (part.inlineReference?.uri?.path) {
                            fileReferences.push(part.inlineReference.uri.path);
                        }
                    } else if (part.kind === 'toolContent' || part.kind === 'mcpServersStarting') {
                        hadToolCalls = true;
                    } else if (part.value && typeof part.value === 'string') {
                        // Some response parts have a direct value string
                        aiResponse += part.value;
                    }
                }
            }

            turns.push({
                requestId: req.requestId || '',
                timestamp: req.timestamp || 0,
                userMessage,
                aiResponse: aiResponse.trim(),
                modelId: req.modelId || '',
                fileReferences,
                hadToolCalls
            });
        }

        return {
            sessionId: raw.sessionId || '',
            title: raw.customTitle || 'Untitled Session',
            creationDate: raw.creationDate || 0,
            lastMessageDate: raw.lastMessageDate || 0,
            mode: raw.mode?.id || raw.mode || 'unknown',
            selectedModel: raw.selectedModel?.identifier || '',
            turns
        };
    }

    /**
     * Append new turns to the structured activity log (JSONL)
     */
    private appendToActivityLog(session: ParsedChatSession, newTurns: ChatTurn[]): void {
        if (!this.backupPath) { return; }

        const logPath = path.join(this.backupPath, 'activity-log.jsonl');

        const lines: string[] = [];
        for (const turn of newTurns) {
            const entry = {
                type: 'chat_turn',
                timestamp: turn.timestamp || Date.now(),
                sessionId: session.sessionId,
                sessionTitle: session.title,
                mode: session.mode,
                model: turn.modelId || session.selectedModel,
                userMessage: turn.userMessage,
                aiResponseLength: turn.aiResponse.length,
                // Store a truncated preview for the log, full text goes in markdown backup
                aiResponsePreview: turn.aiResponse.substring(0, 500),
                fileReferences: turn.fileReferences,
                hadToolCalls: turn.hadToolCalls
            };
            lines.push(JSON.stringify(entry));
        }

        fs.appendFileSync(logPath, lines.join('\n') + '\n', 'utf8');
    }

    /**
     * Backup a full session as a readable markdown file
     */
    private backupSessionMarkdown(session: ParsedChatSession): void {
        if (!this.backupPath) { return; }

        const sessionsDir = path.join(this.backupPath, 'sessions');
        fs.mkdirSync(sessionsDir, { recursive: true });

        // Use title + session ID for unique, human-readable filenames
        const safeTitle = session.title
            .replace(/[\\/:*?"<>|]/g, '-')
            .replace(/\s+/g, '_')
            .substring(0, 80);
        const fileName = `${safeTitle}__${session.sessionId.substring(0, 8)}.md`;
        const filePath = path.join(sessionsDir, fileName);

        let md = `# ${session.title}\n\n`;
        md += `| Field | Value |\n|-------|-------|\n`;
        md += `| Session ID | \`${session.sessionId}\` |\n`;
        md += `| Created | ${new Date(session.creationDate).toLocaleString()} |\n`;
        md += `| Last Message | ${new Date(session.lastMessageDate).toLocaleString()} |\n`;
        md += `| Mode | ${session.mode} |\n`;
        md += `| Model | ${session.selectedModel} |\n`;
        md += `| Turns | ${session.turns.length} |\n\n`;
        md += `---\n\n`;

        for (let i = 0; i < session.turns.length; i++) {
            const turn = session.turns[i];
            const time = turn.timestamp ? new Date(turn.timestamp).toLocaleString() : '';

            md += `## Turn ${i + 1}`;
            if (time) { md += ` — ${time}`; }
            if (turn.hadToolCalls) { md += ` 🔧`; }
            md += `\n\n`;

            md += `### User\n\n${turn.userMessage}\n\n`;

            if (turn.fileReferences.length > 0) {
                md += `**Files referenced:** ${turn.fileReferences.map(f => `\`${f}\``).join(', ')}\n\n`;
            }

            md += `### Assistant (${turn.modelId || 'unknown model'})\n\n`;
            md += `${turn.aiResponse}\n\n`;
            md += `---\n\n`;
        }

        fs.writeFileSync(filePath, md, 'utf8');
    }

    /**
     * Get all sessions from the chat sessions directory
     */
    getAllSessions(): ParsedChatSession[] {
        if (!this.chatSessionsPath) { return []; }

        const sessions: ParsedChatSession[] = [];
        try {
            const files = fs.readdirSync(this.chatSessionsPath)
                .filter(f => f.endsWith('.json'));

            for (const file of files) {
                try {
                    const raw = JSON.parse(
                        fs.readFileSync(path.join(this.chatSessionsPath, file), 'utf8')
                    );
                    sessions.push(this.parseSession(raw));
                } catch { /* skip unparseable */ }
            }
        } catch { /* directory read failed */ }

        return sessions.sort((a, b) => b.lastMessageDate - a.lastMessageDate);
    }

    /**
     * Force a full backup of all sessions (manual trigger)
     */
    async backupAllSessions(): Promise<{ sessions: number; turns: number }> {
        const sessions = this.getAllSessions();
        let totalTurns = 0;

        for (const session of sessions) {
            this.backupSessionMarkdown(session);
            totalTurns += session.turns.length;
        }

        return { sessions: sessions.length, turns: totalTurns };
    }

    /**
     * Generate a session digest — a concise markdown summary of all recent activity
     */
    async generateSessionDigest(daysBack: number = 7): Promise<string> {
        if (!this.backupPath) { return 'No backup path configured.'; }

        const logPath = path.join(this.backupPath, 'activity-log.jsonl');
        if (!fs.existsSync(logPath)) { return 'No activity log found. Chat monitoring may not have captured any sessions yet.'; }

        const cutoff = Date.now() - (daysBack * 24 * 60 * 60 * 1000);
        const lines = fs.readFileSync(logPath, 'utf8').split('\n').filter(l => l.trim());
        const recentEntries: any[] = [];

        for (const line of lines) {
            try {
                const entry = JSON.parse(line);
                if (entry.timestamp >= cutoff) {
                    recentEntries.push(entry);
                }
            } catch { /* skip malformed */ }
        }

        if (recentEntries.length === 0) {
            return `No chat activity in the last ${daysBack} day(s).`;
        }

        // Group by session
        const bySession = new Map<string, any[]>();
        for (const entry of recentEntries) {
            const key = entry.sessionId || 'unknown';
            if (!bySession.has(key)) { bySession.set(key, []); }
            bySession.get(key)!.push(entry);
        }

        let digest = `# Chat Activity Digest (Last ${daysBack} Days)\n\n`;
        digest += `**Period:** ${new Date(cutoff).toLocaleDateString()} — ${new Date().toLocaleDateString()}\n`;
        digest += `**Total Turns:** ${recentEntries.length} across ${bySession.size} session(s)\n\n`;

        for (const [sessionId, entries] of bySession) {
            const title = entries[0]?.sessionTitle || 'Untitled';
            const models = [...new Set(entries.map((e: any) => e.model).filter(Boolean))];
            const files = [...new Set(entries.flatMap((e: any) => e.fileReferences || []))];
            const toolTurns = entries.filter((e: any) => e.hadToolCalls).length;

            digest += `## ${title}\n`;
            digest += `- **${entries.length} turns** | Models: ${models.join(', ') || 'unknown'}\n`;
            if (toolTurns > 0) { digest += `- **${toolTurns} agent turns** (tool calls)\n`; }
            if (files.length > 0) {
                digest += `- **Files touched:** ${files.slice(0, 10).map(f => `\`${path.basename(f)}\``).join(', ')}`;
                if (files.length > 10) { digest += ` +${files.length - 10} more`; }
                digest += '\n';
            }

            // Show user prompts as a summary of what was discussed
            digest += `- **Topics:**\n`;
            for (const entry of entries.slice(0, 10)) {
                const preview = entry.userMessage?.substring(0, 120)?.replace(/\n/g, ' ') || '';
                if (preview) {
                    digest += `  - ${preview}${entry.userMessage?.length > 120 ? '...' : ''}\n`;
                }
            }
            if (entries.length > 10) {
                digest += `  - ... and ${entries.length - 10} more turns\n`;
            }
            digest += '\n';
        }

        return digest;
    }

    /**
     * Query the activity log for entries matching criteria
     */
    queryActivityLog(options: {
        sessionId?: string;
        since?: number;
        filePattern?: string;
        searchText?: string;
        limit?: number;
    }): any[] {
        if (!this.backupPath) { return []; }

        const logPath = path.join(this.backupPath, 'activity-log.jsonl');
        if (!fs.existsSync(logPath)) { return []; }

        const lines = fs.readFileSync(logPath, 'utf8').split('\n').filter(l => l.trim());
        const results: any[] = [];

        for (const line of lines) {
            try {
                const entry = JSON.parse(line);

                if (options.sessionId && entry.sessionId !== options.sessionId) { continue; }
                if (options.since && entry.timestamp < options.since) { continue; }
                if (options.filePattern) {
                    const pattern = options.filePattern.toLowerCase();
                    const hasMatch = (entry.fileReferences || []).some(
                        (f: string) => f.toLowerCase().includes(pattern)
                    );
                    if (!hasMatch) { continue; }
                }
                if (options.searchText) {
                    const text = options.searchText.toLowerCase();
                    const inUser = entry.userMessage?.toLowerCase().includes(text);
                    const inAi = entry.aiResponsePreview?.toLowerCase().includes(text);
                    if (!inUser && !inAi) { continue; }
                }

                results.push(entry);
                if (options.limit && results.length >= options.limit) { break; }
            } catch { /* skip */ }
        }

        return results;
    }

    /**
     * Persist tracking state so we don't re-process on restart
     */
    private saveTrackingState(): void {
        if (!this.backupPath) { return; }

        const statePath = path.join(this.backupPath, '.tracking-state.json');
        const data: Record<string, SessionTrackingState> = {};
        for (const [k, v] of this.trackingState) {
            data[k] = v;
        }
        fs.writeFileSync(statePath, JSON.stringify(data, null, 2), 'utf8');
    }

    /**
     * Load tracking state from disk
     */
    private loadTrackingState(): void {
        if (!this.backupPath) { return; }

        const statePath = path.join(this.backupPath, '.tracking-state.json');
        if (!fs.existsSync(statePath)) { return; }

        try {
            const data = JSON.parse(fs.readFileSync(statePath, 'utf8'));
            for (const [k, v] of Object.entries(data)) {
                this.trackingState.set(k, v as SessionTrackingState);
            }
            this.log(`Loaded tracking state for ${this.trackingState.size} sessions`);
        } catch {
            this.log('Failed to load tracking state, starting fresh');
        }
    }

    private log(msg: string): void {
        this.outputChannel.appendLine(`[ChatMonitor] ${msg}`);
    }
}
