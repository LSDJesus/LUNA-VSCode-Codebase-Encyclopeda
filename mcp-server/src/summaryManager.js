"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummaryManager = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
class SummaryManager {
    getDocsPath(workspacePath) {
        return path.join(workspacePath, '.codebase');
    }
    getSummaryPaths(workspacePath, filePath) {
        const docsPath = this.getDocsPath(workspacePath);
        const basePath = path.join(docsPath, filePath);
        const basePathWithoutExt = basePath.replace(/\.[^.]+$/, '');
        return {
            json: basePathWithoutExt + '.json',
            md: basePathWithoutExt + '.md',
        };
    }
    async getSummary(workspacePath, filePath) {
        const { json, md } = this.getSummaryPaths(workspacePath, filePath);
        try {
            const [jsonContent, mdContent] = await Promise.all([
                fs.readFile(json, 'utf-8'),
                fs.readFile(md, 'utf-8'),
            ]);
            const parsed = JSON.parse(jsonContent);
            return {
                ...parsed,
                markdown: mdContent,
            };
        }
        catch {
            return null;
        }
    }
    async saveSummary(workspacePath, filePath, summary) {
        const { json: jsonPath, md: mdPath } = this.getSummaryPaths(workspacePath, filePath);
        // Ensure directory exists
        await fs.mkdir(path.dirname(jsonPath), { recursive: true });
        // Save both formats
        await Promise.all([
            fs.writeFile(jsonPath, JSON.stringify(summary.json, null, 2), 'utf-8'),
            fs.writeFile(mdPath, summary.markdown, 'utf-8'),
        ]);
    }
    async listSummaries(workspacePath) {
        const docsPath = this.getDocsPath(workspacePath);
        try {
            const files = await this.findJsonFiles(docsPath);
            const summaries = [];
            for (const file of files) {
                try {
                    const content = await fs.readFile(file, 'utf-8');
                    const parsed = JSON.parse(content);
                    summaries.push({
                        file: parsed.sourceFile || path.relative(docsPath, file),
                        generatedAt: parsed.generatedAt || 'unknown',
                    });
                }
                catch {
                    // Skip invalid files
                }
            }
            return summaries;
        }
        catch {
            return [];
        }
    }
    async searchSummaries(workspacePath, query, searchType) {
        const docsPath = this.getDocsPath(workspacePath);
        const files = await this.findJsonFiles(docsPath);
        const results = [];
        for (const file of files) {
            try {
                const content = await fs.readFile(file, 'utf-8');
                const summary = JSON.parse(content);
                const matches = [];
                switch (searchType) {
                    case 'dependency':
                        // Search in dependencies
                        if (summary.summary?.dependencies) {
                            const { internal, external } = summary.summary.dependencies;
                            if (internal.some((d) => d.path.includes(query))) {
                                matches.push('Internal dependency');
                            }
                            if (external.some((d) => d.package.includes(query))) {
                                matches.push('External dependency');
                            }
                        }
                        break;
                    case 'component':
                        // Search in key components
                        if (summary.summary?.keyComponents) {
                            const found = summary.summary.keyComponents.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
                            matches.push(...found.map((c) => `Component: ${c.name}`));
                        }
                        break;
                    case 'exports':
                        // Search in public API
                        if (summary.summary?.publicAPI) {
                            const found = summary.summary.publicAPI.filter((api) => api.signature.toLowerCase().includes(query.toLowerCase()));
                            matches.push(...found.map((api) => `Export: ${api.signature}`));
                        }
                        break;
                    default: // keyword
                        const jsonStr = JSON.stringify(summary).toLowerCase();
                        if (jsonStr.includes(query.toLowerCase())) {
                            matches.push('Found in summary');
                        }
                }
                if (matches.length > 0) {
                    results.push({
                        file: summary.sourceFile || path.relative(docsPath, file),
                        matches,
                    });
                }
            }
            catch {
                // Skip invalid files
            }
        }
        return results;
    }
    async getDependencyGraph(workspacePath, filePath) {
        const docsPath = this.getDocsPath(workspacePath);
        const files = await this.findJsonFiles(docsPath);
        const nodes = [];
        const edges = [];
        for (const file of files) {
            try {
                const content = await fs.readFile(file, 'utf-8');
                const summary = JSON.parse(content);
                const sourceFile = summary.sourceFile;
                // If specific file requested, filter
                if (filePath && sourceFile !== filePath) {
                    continue;
                }
                nodes.push({
                    id: sourceFile,
                    purpose: summary.summary?.purpose || '',
                });
                // Add edges for dependencies
                if (summary.summary?.dependencies?.internal) {
                    for (const dep of summary.summary.dependencies.internal) {
                        edges.push({
                            from: sourceFile,
                            to: dep.path,
                            type: 'depends_on',
                            usage: dep.usage,
                        });
                    }
                }
            }
            catch {
                // Skip invalid files
            }
        }
        return { nodes, edges };
    }
    async findJsonFiles(dir) {
        const files = [];
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    files.push(...(await this.findJsonFiles(fullPath)));
                }
                else if (entry.name.endsWith('.json')) {
                    files.push(fullPath);
                }
            }
        }
        catch {
            // Directory doesn't exist or not readable
        }
        return files;
    }
}
exports.SummaryManager = SummaryManager;
//# sourceMappingURL=summaryManager.js.map