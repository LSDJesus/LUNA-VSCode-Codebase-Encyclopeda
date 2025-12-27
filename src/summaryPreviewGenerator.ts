import * as fs from 'fs';
import * as path from 'path';
import { SummaryIncludeMatcher } from './summaryIncludeMatcher';

interface FileTreeNode {
    name: string;
    isDirectory: boolean;
    children?: FileTreeNode[];
    path: string;
}

export class SummaryPreviewGenerator {
    private includeMatcher: SummaryIncludeMatcher;
    private workspacePath: string;

    constructor(workspacePath: string) {
        this.workspacePath = workspacePath;
        this.includeMatcher = new SummaryIncludeMatcher(workspacePath);
    }

    /**
     * Generate a preview of files that will be included in summarization
     */
    public async generatePreview(): Promise<string> {
        const includedFiles = this.getIncludedFiles();
        const summary = this.generateSummaryStats(includedFiles);

        const output = this.buildPreviewText(includedFiles, summary);
        
        return output;
    }

    /**
     * Save preview to file
     */
    public async savePreview(outputPath: string): Promise<void> {
        const preview = await this.generatePreview();
        const dir = path.dirname(outputPath);
        
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(outputPath, preview, 'utf-8');
    }

    private getIncludedFiles(): string[] {
        const files: string[] = [];
        const dirs = this.includeMatcher.getIncludeDirectories();

        for (const dir of dirs) {
            const fullPath = path.join(this.workspacePath, dir);
            if (fs.existsSync(fullPath)) {
                this.walkDirectory(fullPath, files);
            }
        }

        // Also include explicit files
        const explicitFiles = this.includeMatcher.getIncludeFiles();
        for (const file of explicitFiles) {
            const fullPath = path.join(this.workspacePath, file);
            if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
                files.push(fullPath);
            }
        }

        return files.sort();
    }

    private walkDirectory(dirPath: string, results: string[]): void {
        try {
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                const relativePath = path.relative(this.workspacePath, fullPath);

                if (entry.isDirectory()) {
                    this.walkDirectory(fullPath, results);
                } else {
                    // Check if file should be included
                    if (this.includeMatcher.shouldInclude(fullPath, this.workspacePath)) {
                        if (!this.includeMatcher.shouldExclude(fullPath, this.workspacePath)) {
                            results.push(fullPath);
                        }
                    }
                }
            }
        } catch (error) {
            // Silently skip directories we can't read
        }
    }

    private generateSummaryStats(files: string[]): { total: number; byDirectory: Record<string, number> } {
        const byDirectory: Record<string, number> = {};

        for (const file of files) {
            const relativePath = path.relative(this.workspacePath, file);
            const parts = relativePath.split(/[\\/]/);
            const topDir = parts[0];

            byDirectory[topDir] = (byDirectory[topDir] || 0) + 1;
        }

        return {
            total: files.length,
            byDirectory
        };
    }

    private buildPreviewText(files: string[], summary: { total: number; byDirectory: Record<string, number> }): string {
        const lines: string[] = [];

        lines.push('INCLUDED FILES (will be analyzed for summaries)');
        lines.push('════════════════════════════════════════════════');
        lines.push('');

        // Build tree of included files by directory
        const fileTree = this.buildFileTree(files);
        lines.push(...this.renderTree(fileTree));

        lines.push('');
        lines.push(`Total: ${summary.total} files to be analyzed`);
        lines.push('');
        lines.push('');

        lines.push('GENERATED SUMMARIES (.codebase structure after generation)');
        lines.push('════════════════════════════════════════════════════════════');
        lines.push('');

        const codebaseTree = this.buildCodebaseTree(files);
        lines.push(...this.renderTree(codebaseTree));

        lines.push('');
        lines.push(`Total: ${summary.total} summary files + meta-analysis files:`);
        lines.push('  - .codebase/index.json');
        lines.push('  - .codebase/dependency-graph.json');
        lines.push('  - .codebase/dead-code-analysis.json');
        lines.push('  - .codebase/component-map.json');
        lines.push('  - .codebase/complexity-heatmap.json');
        lines.push('');

        return lines.join('\n');
    }

    private buildFileTree(files: string[]): FileTreeNode {
        const root: FileTreeNode = {
            name: '',
            isDirectory: true,
            children: [],
            path: this.workspacePath
        };

        for (const file of files) {
            const relativePath = path.relative(this.workspacePath, file);
            const parts = relativePath.split(/[\\/]/);

            let current = root;
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const isLast = i === parts.length - 1;

                let child = current.children?.find(c => c.name === part);
                if (!child) {
                    child = {
                        name: part,
                        isDirectory: !isLast,
                        children: isLast ? undefined : [],
                        path: path.join(current.path, part)
                    };
                    if (!current.children) {
                        current.children = [];
                    }
                    current.children.push(child);
                }

                current = child;
            }
        }

        // Sort children recursively
        this.sortTree(root);
        return root;
    }

    private buildCodebaseTree(files: string[]): FileTreeNode {
        const root: FileTreeNode = {
            name: '.codebase/',
            isDirectory: true,
            children: [],
            path: path.join(this.workspacePath, '.codebase')
        };

        const summariesDir: FileTreeNode = {
            name: 'summaries/',
            isDirectory: true,
            children: [],
            path: path.join(this.workspacePath, '.codebase', 'summaries')
        };

        root.children!.push(summariesDir);

        // Build summaries tree
        for (const file of files) {
            const relativePath = path.relative(this.workspacePath, file);
            const parts = relativePath.split(/[\\/]/);
            const fileName = parts[parts.length - 1];
            const summaryFileName = fileName.replace(/\.[^.]+$/, '.json');
            const dirParts = parts.slice(0, -1);

            let current = summariesDir;
            for (const part of dirParts) {
                let child = current.children?.find(c => c.name === part);
                if (!child) {
                    child = {
                        name: part,
                        isDirectory: true,
                        children: [],
                        path: path.join(current.path, part)
                    };
                    current.children!.push(child);
                }
                current = child;
            }

            current.children!.push({
                name: summaryFileName,
                isDirectory: false,
                path: path.join(current.path, summaryFileName)
            });
        }

        // Add meta-analysis files
        root.children!.push({
            name: 'index.json',
            isDirectory: false,
            path: path.join(root.path, 'index.json')
        });
        root.children!.push({
            name: 'dependency-graph.json',
            isDirectory: false,
            path: path.join(root.path, 'dependency-graph.json')
        });
        root.children!.push({
            name: 'dead-code-analysis.json',
            isDirectory: false,
            path: path.join(root.path, 'dead-code-analysis.json')
        });
        root.children!.push({
            name: 'component-map.json',
            isDirectory: false,
            path: path.join(root.path, 'component-map.json')
        });
        root.children!.push({
            name: 'complexity-heatmap.json',
            isDirectory: false,
            path: path.join(root.path, 'complexity-heatmap.json')
        });
        root.children!.push({
            name: 'preview-included-files.txt',
            isDirectory: false,
            path: path.join(root.path, 'preview-included-files.txt')
        });

        this.sortTree(root);
        return root;
    }

    private sortTree(node: FileTreeNode): void {
        if (!node.children) {
            return;
        }

        node.children.sort((a, b) => {
            // Directories first
            if (a.isDirectory !== b.isDirectory) {
                return a.isDirectory ? -1 : 1;
            }
            // Then alphabetically
            return a.name.localeCompare(b.name);
        });

        for (const child of node.children) {
            this.sortTree(child);
        }
    }

    private renderTree(root: FileTreeNode, prefix: string = ''): string[] {
        const lines: string[] = [];

        if (root.name) {
            lines.push(prefix + (root.isDirectory ? root.name : root.name));
        }

        if (!root.children || root.children.length === 0) {
            return lines;
        }

        for (let i = 0; i < root.children.length; i++) {
            const child = root.children[i];
            const isLast = i === root.children.length - 1;
            const childPrefix = prefix + (root.name ? (isLast ? '└── ' : '├── ') : '');
            const nextPrefix = prefix + (root.name ? (isLast ? '    ' : '│   ') : '');

            if (child.children && child.children.length > 0) {
                lines.push(childPrefix + child.name);
                lines.push(...this.renderTree(child, nextPrefix));
            } else {
                lines.push(childPrefix + child.name);
            }
        }

        return lines;
    }
}
