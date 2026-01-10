import * as vscode from 'vscode';
import * as crypto from 'crypto';

export interface BackgroundTask {
    id: string;
    taskType: 'documentation' | 'analysis' | 'testing' | 'refactoring' | 'research' | 'other';
    prompt: string;
    contextFiles: string[];
    model: string;
    status: 'queued' | 'running' | 'completed' | 'failed';
    result?: string;
    filesModified?: string[];
    error?: string;
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    metadata?: Record<string, any>;
    outputFile?: string;
    autoExecute: boolean; // Allow worker to edit/create files
}

export class BackgroundTaskManager {
    private tasks: Map<string, BackgroundTask> = new Map();
    private runningTasks: Set<string> = new Set();
    private outputChannel?: vscode.OutputChannel;

    constructor(outputChannel?: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
    }

    private log(message: string): void {
        if (this.outputChannel) {
            this.outputChannel.appendLine(`[BackgroundTaskManager] ${message}`);
        }
        console.log(`[BackgroundTaskManager] ${message}`);
    }

    private getConfig() {
        const config = vscode.workspace.getConfiguration('luna-encyclopedia');
        return {
            concurrencyLimit: config.get<number>('workerConcurrencyLimit', 3),
            defaultWorkerModel: config.get<string>('defaultWorkerModel', 'gpt-4o'),
            workerTimeout: config.get<number>('workerTimeoutSeconds', 300),
            autoCleanupAfter: config.get<number>('workerAutoCleanupHours', 24)
        };
    }

    async submitTask(
        taskType: BackgroundTask['taskType'],
        prompt: string,
        options: {
            contextFiles?: string[];
            model?: string;
            metadata?: Record<string, any>;
            outputFile?: string;
            autoExecute?: boolean;
        } = {}
    ): Promise<string> {
        const config = this.getConfig();
        const taskId = crypto.randomUUID();
        
        const task: BackgroundTask = {
            id: taskId,
            taskType,
            prompt,
            contextFiles: options.contextFiles || [],
            model: options.model || config.defaultWorkerModel,
            status: 'queued',
            createdAt: new Date(),
            metadata: options.metadata,
            outputFile: options.outputFile,
            autoExecute: options.autoExecute ?? true
        };
        
        this.tasks.set(taskId, task);
        this.log(`Task ${taskId} queued: ${taskType} using model ${task.model}`);
        
        // Start processing queue (non-blocking)
        this.processQueue();
        
        return taskId;
    }

    private async processQueue(): Promise<void> {
        const config = this.getConfig();
        
        // Find queued tasks and start them if we have capacity
        while (this.runningTasks.size < config.concurrencyLimit) {
            const nextTask = this.getNextQueuedTask();
            if (!nextTask) {
                break;
            }
            
            this.runningTasks.add(nextTask.id);
            nextTask.status = 'running';
            nextTask.startedAt = new Date();
            
            this.log(`Starting task ${nextTask.id} (${this.runningTasks.size}/${config.concurrencyLimit} slots)`);
            
            // Fire and forget - doesn't block
            this.executeTask(nextTask).finally(() => {
                this.runningTasks.delete(nextTask.id);
                this.log(`Task ${nextTask.id} finished (${this.runningTasks.size}/${config.concurrencyLimit} slots)`);
                this.processQueue(); // Check for more work
            });
        }
    }

    private getNextQueuedTask(): BackgroundTask | undefined {
        for (const task of this.tasks.values()) {
            if (task.status === 'queued') {
                return task;
            }
        }
        return undefined;
    }

    private async executeTask(task: BackgroundTask): Promise<void> {
        const config = this.getConfig();
        const timeout = config.workerTimeout * 1000; // Convert to ms
        
        try {
            // Set up timeout
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error(`Task timed out after ${config.workerTimeout}s`)), timeout);
            });
            
            // Execute with timeout
            await Promise.race([
                this.runWorkerAgent(task),
                timeoutPromise
            ]);
            
            task.status = 'completed';
            task.completedAt = new Date();
            this.log(`Task ${task.id} completed successfully`);
            
        } catch (error) {
            task.status = 'failed';
            task.error = error instanceof Error ? error.message : String(error);
            task.completedAt = new Date();
            this.log(`Task ${task.id} failed: ${task.error}`);
        }
    }

    private async runWorkerAgent(task: BackgroundTask): Promise<void> {
        // Select the appropriate model
        const models = await vscode.lm.selectChatModels({
            vendor: 'copilot',
            family: task.model
        });
        
        if (models.length === 0) {
            throw new Error(`Model ${task.model} not available. Check GitHub Copilot status.`);
        }

        const model = models[0];
        
        // Build context from files
        let fileContext = '';
        if (task.contextFiles.length > 0) {
            fileContext = '\n\n## Context Files:\n\n';
            
            for (const filePath of task.contextFiles) {
                try {
                    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                    if (!workspaceFolder) {
                        throw new Error('No workspace folder open');
                    }
                    
                    const fullPath = vscode.Uri.joinPath(workspaceFolder.uri, filePath);
                    const fileContent = await vscode.workspace.fs.readFile(fullPath);
                    const content = Buffer.from(fileContent).toString('utf8');
                    
                    fileContext += `### ${filePath}\n\`\`\`\n${content}\n\`\`\`\n\n`;
                } catch (error) {
                    this.log(`Warning: Could not read context file ${filePath}: ${error}`);
                }
            }
        }

        // Build the worker prompt
        const systemPrompt = `You are an AI worker agent executing a delegated task. You have full tool access (file editing, searching, terminal, etc.).

Task Type: ${task.taskType}
Auto-Execute: ${task.autoExecute ? 'YES - You can create/edit files autonomously' : 'NO - Return suggestions only'}
${task.outputFile ? `Output File: ${task.outputFile}` : ''}

Your goal is to complete the task efficiently and report what you did.
${fileContext}`;

        const fullPrompt = `${systemPrompt}\n\n## Task Instructions:\n${task.prompt}`;

        // Send request to model
        const messages = [vscode.LanguageModelChatMessage.User(fullPrompt)];
        const cancellationToken = new vscode.CancellationTokenSource().token;
        
        const response = await model.sendRequest(messages, {}, cancellationToken);
        
        // Collect response
        let result = '';
        for await (const fragment of response.text) {
            result += fragment;
        }
        
        task.result = result;
        
        // Note: In Agent Mode, the worker can actually execute file operations
        // The response will include what it did, which we capture here
        // We could parse the response to extract filesModified, but for now
        // we trust the worker's report
    }

    getTaskStatus(taskId: string): BackgroundTask | undefined {
        return this.tasks.get(taskId);
    }

    getAllTasks(statusFilter?: BackgroundTask['status']): BackgroundTask[] {
        const tasks = Array.from(this.tasks.values());
        
        if (!statusFilter) {
            return tasks;
        }
        
        return tasks.filter(t => t.status === statusFilter);
    }

    async waitForTasks(taskIds?: string[], timeoutSeconds: number = 60): Promise<BackgroundTask[]> {
        const tasksToWait = taskIds 
            ? taskIds.map(id => this.tasks.get(id)).filter(t => t !== undefined) as BackgroundTask[]
            : this.getAllTasks().filter(t => t.status === 'running' || t.status === 'queued');
        
        const startTime = Date.now();
        const timeoutMs = timeoutSeconds * 1000;
        
        while (Date.now() - startTime < timeoutMs) {
            const allDone = tasksToWait.every(t => 
                t.status === 'completed' || t.status === 'failed'
            );
            
            if (allDone) {
                return tasksToWait;
            }
            
            // Wait 100ms before checking again
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Timeout reached - return current state
        return tasksToWait;
    }

    cancelTask(taskId: string): boolean {
        const task = this.tasks.get(taskId);
        if (task && task.status === 'queued') {
            task.status = 'failed';
            task.error = 'Cancelled by user';
            task.completedAt = new Date();
            this.log(`Task ${taskId} cancelled`);
            return true;
        }
        return false;
    }

    clearCompletedTasks(): number {
        let cleared = 0;
        for (const [id, task] of this.tasks.entries()) {
            if (task.status === 'completed' || task.status === 'failed') {
                this.tasks.delete(id);
                cleared++;
            }
        }
        this.log(`Cleared ${cleared} completed/failed tasks`);
        return cleared;
    }

    autoCleanup(): void {
        const config = this.getConfig();
        const cutoffTime = new Date(Date.now() - config.autoCleanupAfter * 60 * 60 * 1000);
        
        let cleaned = 0;
        for (const [id, task] of this.tasks.entries()) {
            if ((task.status === 'completed' || task.status === 'failed') && 
                task.completedAt && task.completedAt < cutoffTime) {
                this.tasks.delete(id);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            this.log(`Auto-cleanup removed ${cleaned} old tasks`);
        }
    }

    getStats(): {
        total: number;
        queued: number;
        running: number;
        completed: number;
        failed: number;
    } {
        const tasks = this.getAllTasks();
        return {
            total: tasks.length,
            queued: tasks.filter(t => t.status === 'queued').length,
            running: tasks.filter(t => t.status === 'running').length,
            completed: tasks.filter(t => t.status === 'completed').length,
            failed: tasks.filter(t => t.status === 'failed').length
        };
    }
}
