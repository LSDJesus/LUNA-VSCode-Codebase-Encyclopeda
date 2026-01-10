import * as http from 'http';
import { BackgroundTaskManager } from './backgroundTaskManager';

/**
 * HTTP bridge server that allows MCP server to communicate with the extension
 * Runs on localhost only for security
 */
export class ExtensionBridge {
    private server: http.Server | null = null;
    private port: number = 0;
    
    constructor(private taskManager: BackgroundTaskManager) {}

    /**
     * Start the HTTP bridge server
     * Returns the port number it's listening on
     */
    async start(): Promise<number> {
        return new Promise((resolve, reject) => {
            this.server = http.createServer((req, res) => {
                this.handleRequest(req, res).catch(err => {
                    console.error('Bridge request error:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: err.message }));
                });
            });

            // Listen on random available port (localhost only for security)
            this.server.listen(0, '127.0.0.1', () => {
                const address = this.server!.address();
                if (address && typeof address === 'object') {
                    this.port = address.port;
                    console.log(`[ExtensionBridge] Listening on http://127.0.0.1:${this.port}`);
                    resolve(this.port);
                } else {
                    reject(new Error('Failed to get server port'));
                }
            });

            this.server.on('error', reject);
        });
    }

    /**
     * Stop the HTTP bridge server
     */
    stop(): Promise<void> {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    console.log('[ExtensionBridge] Server stopped');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    getPort(): number {
        return this.port;
    }

    private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        // Enable CORS for localhost only
        res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        const url = new URL(req.url || '/', `http://${req.headers.host}`);
        const path = url.pathname;

        try {
            if (req.method === 'POST' && path === '/api/spawn-worker') {
                await this.handleSpawnWorker(req, res);
            } else if (req.method === 'GET' && path === '/api/worker-status') {
                await this.handleWorkerStatus(req, res);
            } else if (req.method === 'POST' && path === '/api/wait-for-workers') {
                await this.handleWaitForWorkers(req, res);
            } else if (req.method === 'GET' && path === '/api/list-workers') {
                await this.handleListWorkers(req, res);
            } else if (req.method === 'POST' && path === '/api/cancel-worker') {
                await this.handleCancelWorker(req, res);
            } else if (req.method === 'GET' && path === '/health') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok', port: this.port }));
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Not found' }));
            }
        } catch (error) {
            throw error;
        }
    }

    private async handleSpawnWorker(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        const body = await this.readBody(req);
        const { taskType, prompt, contextFiles, model, outputFile, autoExecute } = JSON.parse(body);

        const taskId = await this.taskManager.submitTask(taskType, prompt, {
            contextFiles,
            model,
            outputFile,
            autoExecute
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            taskId,
            message: `Worker agent spawned with ID ${taskId}`,
            model: model || 'default from settings',
            taskType
        }));
    }

    private async handleWorkerStatus(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        const url = new URL(req.url || '/', `http://${req.headers.host}`);
        const taskId = url.searchParams.get('taskId');

        if (taskId) {
            const task = this.taskManager.getTaskStatus(taskId);
            if (!task) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: `Task ${taskId} not found` }));
                return;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(task));
        } else {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'taskId parameter required' }));
        }
    }

    private async handleListWorkers(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        const url = new URL(req.url || '/', `http://${req.headers.host}`);
        const statusFilter = url.searchParams.get('status') as any;

        const tasks = this.taskManager.getAllTasks(statusFilter);
        const stats = this.taskManager.getStats();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ tasks, stats }));
    }

    private async handleWaitForWorkers(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        const body = await this.readBody(req);
        const { taskIds, timeoutSeconds } = JSON.parse(body);

        const tasks = await this.taskManager.waitForTasks(taskIds, timeoutSeconds);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            tasks,
            allCompleted: tasks.every(t => t.status === 'completed' || t.status === 'failed')
        }));
    }

    private async handleCancelWorker(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        const body = await this.readBody(req);
        const { taskId } = JSON.parse(body);

        const cancelled = this.taskManager.cancelTask(taskId);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: cancelled }));
    }

    private readBody(req: http.IncomingMessage): Promise<string> {
        return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', () => resolve(body));
            req.on('error', reject);
        });
    }
}
