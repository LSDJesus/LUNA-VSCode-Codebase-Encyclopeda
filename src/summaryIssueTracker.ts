export interface SummaryIssue {
    file: string;
    type: 'file-too-large' | 'parse-error' | 'api-error' | 'timeout' | 'excluded';
    message: string;
    size?: number; // File size in KB if applicable
    timestamp: string;
}

export class SummaryIssueTracker {
    private issues: SummaryIssue[] = [];

    addIssue(file: string, type: SummaryIssue['type'], message: string, size?: number): void {
        this.issues.push({
            file,
            type,
            message,
            size,
            timestamp: new Date().toISOString()
        });
    }

    getIssues(): SummaryIssue[] {
        return [...this.issues];
    }

    hasIssues(): boolean {
        return this.issues.length > 0;
    }

    clear(): void {
        this.issues = [];
    }

    /**
     * Generate a human-readable markdown report
     */
    generateReport(): string {
        if (this.issues.length === 0) {
            return `# Summarization Report\n\n✅ No issues detected! All files summarized successfully.\n`;
        }

        // Group issues by type
        const grouped = this.groupByType();

        let report = `# Summarization Issues Report\n\n`;
        report += `**Generated**: ${new Date().toISOString()}\n`;
        report += `**Total Issues**: ${this.issues.length}\n\n`;

        // File too large section
        if (grouped['file-too-large'].length > 0) {
            report += `## 🚨 Files Too Large (${grouped['file-too-large'].length})\n\n`;
            report += `These files exceeded the \`maxFileSize\` setting and were skipped.\n\n`;
            for (const issue of grouped['file-too-large']) {
                const size = issue.size ? ` (${issue.size} KB)` : '';
                report += `- **\`${issue.file}\`**${size}\n`;
                report += `  - ${issue.message}\n`;
                report += `  - Consider splitting this file or increasing \`maxFileSize\` in .lunasummarize\n\n`;
            }
        }

        // Parse errors section
        if (grouped['parse-error'].length > 0) {
            report += `## ⚠️ Parse Errors (${grouped['parse-error'].length})\n\n`;
            report += `These files have syntax errors and couldn't be analyzed:\n\n`;
            for (const issue of grouped['parse-error']) {
                report += `- **\`${issue.file}\`**\n`;
                report += `  - ${issue.message}\n`;
                report += `  - Check file syntax and fix errors\n\n`;
            }
        }

        // API/Timeout errors section
        if (grouped['api-error'].length > 0 || grouped['timeout'].length > 0) {
            report += `## 🔴 API & Timeout Errors (${grouped['api-error'].length + grouped['timeout'].length})\n\n`;
            report += `These files failed due to API or timeout issues. Retry with "LUNA: Update Stale Summaries":\n\n`;
            for (const issue of [...grouped['api-error'], ...grouped['timeout']]) {
                report += `- **\`${issue.file}\`**\n`;
                report += `  - ${issue.message}\n\n`;
            }
        }

        // Excluded files section
        if (grouped['excluded'].length > 0) {
            report += `## ℹ️ Excluded Files (${grouped['excluded'].length})\n\n`;
            report += `These files matched your exclude patterns in .lunasummarize:\n\n`;
            const exampleIssues = grouped['excluded'].slice(0, 10);
            for (const issue of exampleIssues) {
                report += `- \`${issue.file}\`\n`;
            }
            if (grouped['excluded'].length > 10) {
                report += `- ... and ${grouped['excluded'].length - 10} more\n`;
            }
            report += `\n(Edit .lunasummarize to include these files if needed)\n\n`;
        }

        // Action items
        report += `## Action Items\n\n`;
        if (grouped['file-too-large'].length > 0) {
            report += `1. **Large Files**: Consider refactoring or increase \`maxFileSize\` in .lunasummarize\n`;
        }
        if (grouped['parse-error'].length > 0) {
            report += `2. **Syntax Errors**: Fix errors in files listed above, then re-run summarization\n`;
        }
        if ((grouped['api-error'].length > 0 || grouped['timeout'].length > 0) && this.issues.length < 20) {
            report += `3. **API Errors**: Run "LUNA: Update Stale Summaries" to retry\n`;
        }

        report += `\n---\n`;
        report += `💡 **Tip**: This file helps you find modules that need attention or refactoring!\n`;

        return report;
    }

    /**
     * Generate JSON report for programmatic access
     */
    generateJSON(): {
        timestamp: string;
        totalIssues: number;
        byType: Record<SummaryIssue['type'], SummaryIssue[]>;
    } {
        return {
            timestamp: new Date().toISOString(),
            totalIssues: this.issues.length,
            byType: this.groupByType()
        };
    }

    private groupByType(): Record<SummaryIssue['type'], SummaryIssue[]> {
        const result: Record<SummaryIssue['type'], SummaryIssue[]> = {
            'file-too-large': [],
            'parse-error': [],
            'api-error': [],
            'timeout': [],
            'excluded': []
        };

        for (const issue of this.issues) {
            result[issue.type].push(issue);
        }

        return result;
    }
}
