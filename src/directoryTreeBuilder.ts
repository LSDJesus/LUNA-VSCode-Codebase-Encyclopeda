import * as fs from 'fs';
import * as path from 'path';

export interface DirectoryNode {
    path: string;
    name: string;
    depth: number;
    files: string[];
    subdirs: DirectoryNode[];
}

export class DirectoryTreeBuilder {
    /**
     * Builds a tree of all directories and files matching include/exclude criteria
     */
    static buildTree(
        workspacePath: string,
        includedFiles: string[],
        excludePatterns: string[]
    ): DirectoryNode {
        const root: DirectoryNode = {
            path: workspacePath,
            name: path.basename(workspacePath),
            depth: 0,
            files: [],
            subdirs: []
        };

        // Organize files by directory
        const dirMap = new Map<string, DirectoryNode>();
        dirMap.set(workspacePath, root);

        for (const filePath of includedFiles) {
            const dirPath = path.dirname(filePath);
            const fileName = path.basename(filePath);

            // Ensure directory exists in tree
            if (!dirMap.has(dirPath)) {
                const relDir = path.relative(workspacePath, dirPath);
                const depth = relDir.split(path.sep).length;
                const node: DirectoryNode = {
                    path: dirPath,
                    name: path.basename(dirPath),
                    depth,
                    files: [],
                    subdirs: []
                };
                dirMap.set(dirPath, node);
            }

            // Add file to directory
            dirMap.get(dirPath)!.files.push(filePath);
        }

        // Build parent-child relationships
        for (const [dirPath, node] of dirMap.entries()) {
            if (dirPath === workspacePath) continue;

            const parentPath = path.dirname(dirPath);
            const parentNode = dirMap.get(parentPath);

            if (parentNode && !parentNode.subdirs.includes(node)) {
                parentNode.subdirs.push(node);
            }
        }

        // Sort children at each level
        const sortNodes = (node: DirectoryNode) => {
            node.subdirs.sort((a, b) => a.name.localeCompare(b.name));
            node.files.sort();
            node.subdirs.forEach(sortNodes);
        };
        sortNodes(root);

        return root;
    }

    /**
     * Get all files sorted by depth (deepest first) for bottom-up processing
     */
    static getFilesBottomUp(root: DirectoryNode): string[] {
        const allFiles: { depth: number; path: string }[] = [];

        const traverse = (node: DirectoryNode) => {
            node.files.forEach(file => {
                allFiles.push({
                    depth: node.depth,
                    path: file
                });
            });
            node.subdirs.forEach(traverse);
        };

        traverse(root);

        // Sort by depth descending (deepest first)
        allFiles.sort((a, b) => b.depth - a.depth);

        return allFiles.map(f => f.path);
    }

    /**
     * Get all directories sorted by depth (deepest first) for INDEX generation
     */
    static getDirectoriesBottomUp(root: DirectoryNode): DirectoryNode[] {
        const allDirs: DirectoryNode[] = [];

        const traverse = (node: DirectoryNode) => {
            if (node !== root) {
                allDirs.push(node);
            }
            node.subdirs.forEach(traverse);
        };

        traverse(root);

        // Sort by depth descending (deepest first)
        allDirs.sort((a, b) => b.depth - a.depth);

        return allDirs;
    }

    /**
     * Create placeholder .md and .json files for all discovered files
     */
    static createPlaceholders(
        workspacePath: string,
        tree: DirectoryNode,
        includedFiles: string[]
    ): void {
        const codebasePath = path.join(workspacePath, '.codebase');

        // Create .codebase directory if needed
        if (!fs.existsSync(codebasePath)) {
            fs.mkdirSync(codebasePath, { recursive: true });
        }

        // Create placeholders for each file
        for (const filePath of includedFiles) {
            const relativePath = path.relative(workspacePath, filePath);
            const summaryBase = path.join(codebasePath, relativePath);
            const summaryDir = path.dirname(summaryBase);

            // Create directory structure
            if (!fs.existsSync(summaryDir)) {
                fs.mkdirSync(summaryDir, { recursive: true });
            }

            // Create placeholder .md if doesn't exist
            const mdPath = summaryBase.replace(/\.[^.]+$/, '.md');
            if (!fs.existsSync(mdPath)) {
                fs.writeFileSync(mdPath, `# ${path.basename(filePath)}\n\n[Generating...]\n`, 'utf-8');
            }

            // Create placeholder .json if doesn't exist
            const jsonPath = summaryBase.replace(/\.[^.]+$/, '.json');
            if (!fs.existsSync(jsonPath)) {
                const placeholder = {
                    sourceFile: relativePath,
                    generatedAt: new Date().toISOString(),
                    summary: {
                        purpose: '[Generating...]',
                        keyComponents: [],
                        dependencies: { internal: [], external: [] },
                        publicAPI: [],
                        codeLinks: [],
                        implementationNotes: ''
                    }
                };
                fs.writeFileSync(jsonPath, JSON.stringify(placeholder, null, 2), 'utf-8');
            }
        }

        // Create placeholder INDEX.md files for directories
    }
}
