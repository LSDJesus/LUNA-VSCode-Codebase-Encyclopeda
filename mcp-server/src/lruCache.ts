/**
 * Simple LRU (Least Recently Used) Cache for MCP tool responses
 * No external dependencies - just uses native Map with size limits
 */
export class LRUCache<K, V> {
    private cache: Map<K, V>;
    private maxSize: number;

    constructor(maxSize: number = 100) {
        this.cache = new Map();
        this.maxSize = maxSize;
    }

    get(key: K): V | undefined {
        if (!this.cache.has(key)) {
            return undefined;
        }

        // Move to end (most recently used)
        const value = this.cache.get(key)!;
        this.cache.delete(key);
        this.cache.set(key, value);

        return value;
    }

    set(key: K, value: V): void {
        // Delete if exists (to move to end)
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }

        // Add to end
        this.cache.set(key, value);

        // Remove least recently used if over capacity
        if (this.cache.size > this.maxSize) {
            const firstKey = this.cache.keys().next().value as K;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }
    }

    has(key: K): boolean {
        return this.cache.has(key);
    }

    clear(): void {
        this.cache.clear();
    }

    size(): number {
        return this.cache.size;
    }
}

/**
 * Cache key generator for tool responses
 */
export class CacheKeyGenerator {
    static fileSummaryKey(workspacePath: string, filePath: string): string {
        return `file-summary:${workspacePath}:${filePath}`;
    }

    static searchKey(
        workspacePath: string,
        query: string,
        searchType: string
    ): string {
        return `search:${workspacePath}:${query}:${searchType}`;
    }
}
