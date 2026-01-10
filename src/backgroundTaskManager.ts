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

        // Build the worker prompt with structured output requirements
        const systemPrompt = `You are an AI worker agent executing a delegated task.

Task Type: ${task.taskType}
Auto-Execute: ${task.autoExecute ? 'YES - Your output will be automatically saved to files' : 'NO - Return suggestions only'}
${task.outputFile ? `Output File: ${task.outputFile}` : ''}

${fileContext}

## CRITICAL: Output Format
You MUST return your response with valid JSON. Use \\n for newlines, escape quotes as \\", and escape backslashes as \\\\.

Example:
\`\`\`json
{
  "summary": "Brief description of what you did",
  "files": [
    {
      "path": "docs/example.md",
      "content": "# Title\\n\\nThis is content with \\"quotes\\" and newlines."
    }
  ]
}
\`\`\`

If creating multiple files, add more objects to the "files" array.
Always include "summary" describing what you accomplished.`;

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
        
        // If autoExecute is enabled, parse response and create files
        if (task.autoExecute) {
            await this.executeWorkerOutput(task, result);
        }
    }

    private async executeWorkerOutput(task: BackgroundTask, result: string): Promise<void> {
        try {
            // Extract JSON from response (handle markdown code blocks)
            const jsonMatch = result.match(/```json\s*([\s\S]*?)\s*```/);
            if (!jsonMatch) {
                this.log(`Worker ${task.id}: No structured output found, skipping file operations`);
                return;
            }

            let output;
            try {
                output = JSON.parse(jsonMatch[1]);
            } catch (parseError) {
                // JSON parsing failed - likely due to unescaped characters in content
                // Try to extract using a more lenient approach
                this.log(`Worker ${task.id}: JSON parse failed, attempting lenient extraction`);
                
                // Try to extract the structure manually
                const summaryMatch = jsonMatch[1].match(/"summary"\s*:\s*"([^"]*?)"/);
                const pathMatch = jsonMatch[1].match(/"path"\s*:\s*"([^"]*?)"/);
                
                // Find content - it's everything between "content": " and the next "}
                const contentStart = jsonMatch[1].indexOf('"content"');
                if (contentStart === -1 || !pathMatch) {
                    throw new Error(`Could not extract file content from malformed JSON: ${parseError}`);
                }
                
                // Extract content more carefully
                const afterContent = jsonMatch[1].substring(contentStart);
                const contentMatch = afterContent.match(/"content"\s*:\s*"([\s\S]*?)"\s*\}/);
                
                if (!contentMatch) {
                    throw new Error(`Could not extract content field: ${parseError}`);
                }
                
                // Unescape the content
                const unescapedContent = contentMatch[1]
                    .replace(/\\n/g, '\n')
                    .replace(/\\t/g, '\t')
                    .replace(/\\"/g, '"')
                    .replace(/\\\\/g, '\\');
                
                output = {
                    summary: summaryMatch ? summaryMatch[1] : 'Worker completed',
                    files: [{
                        path: pathMatch[1],
                        content: unescapedContent
                    }]
                };
            }
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                throw new Error('No workspace folder open');
            }

            // Execute file operations
            const filesModified: string[] = [];
            
            if (output.files && Array.isArray(output.files)) {
                for (const file of output.files) {
                    if (!file.path || !file.content) {
                        continue;
                    }

                    const filePath = vscode.Uri.joinPath(workspaceFolder.uri, file.path);
                    const content = new TextEncoder().encode(file.content);
                    
                    // Create directory if needed
                    const dirPath = vscode.Uri.joinPath(filePath, '..');
                    try {
                        await vscode.workspace.fs.createDirectory(dirPath);
                    } catch (error) {
                        // Directory might already exist
                    }

                    // Write file
                    await vscode.workspace.fs.writeFile(filePath, content);
                    filesModified.push(file.path);
                    this.log(`Worker ${task.id}: Created/updated ${file.path}`);
                }
            }

            task.filesModified = filesModified;

            // Update result with execution confirmation
            task.result = `${output.summary}\n\nFiles modified: ${filesModified.join(', ') || 'none'}${output.analysis ? `\n\nAnalysis:\n${output.analysis}` : ''}`;
            
        } catch (error) {
            this.log(`Worker ${task.id}: Failed to execute file operations: ${error}`);
            // Don't fail the task, just log the error
        }
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
