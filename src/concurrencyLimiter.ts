/**
 * Simple concurrency limiter for parallel async operations
 * Executes N operations concurrently, queuing the rest
 */
export class ConcurrencyLimiter {
    private running = 0;
    private queue: Array<() => void> = [];
    private maxConcurrent: number;

    constructor(maxConcurrent: number = 5) {
        this.maxConcurrent = maxConcurrent;
    }

    /**
     * Add an async operation to the queue
     * Returns a promise that resolves when the operation completes
     */
    async run<T>(fn: () => Promise<T>): Promise<T> {
        // If we're at capacity, wait
        if (this.running >= this.maxConcurrent) {
            await new Promise<void>(resolve => this.queue.push(resolve));
        }

        this.running++;
        try {
            return await fn();
        } finally {
            this.running--;
            const next = this.queue.shift();
            if (next) {
                next();
            }
        }
    }

    /**
     * Run multiple operations in parallel with concurrency limit
     */
    async runAll<T>(fns: Array<() => Promise<T>>): Promise<T[]> {
        return Promise.all(fns.map(fn => this.run(fn)));
    }

    /**
     * Get current number of running operations
     */
    getRunning(): number {
        return this.running;
    }

    /**
     * Get number of queued operations
     */
    getQueued(): number {
        return this.queue.length;
    }
}
