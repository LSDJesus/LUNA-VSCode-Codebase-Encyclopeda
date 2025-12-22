#!/usr/bin/env python3
"""
LUNA Codebase Encyclopedia - Summary Generator
Analyzes source files and generates structured Markdown summaries with LLM assistance.
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import List, Dict, Any
import anthropic

class SummaryGenerator:
    def __init__(self, workspace_path: str, api_key: str):
        self.workspace_path = Path(workspace_path)
        self.docs_path = self.workspace_path / "docs" / "codebase"
        self.client = anthropic.Anthropic(api_key=api_key)
        
    def generate_summaries(self, file_paths: List[str]) -> None:
        """Generate summaries for all provided files."""
        self.docs_path.mkdir(parents=True, exist_ok=True)
        
        total = len(file_paths)
        for idx, file_path in enumerate(file_paths, 1):
            try:
                rel_path = Path(file_path).relative_to(self.workspace_path)
                print(f"Processing {idx}/{total}: {rel_path}")
                
                summary = self.generate_single_summary(file_path)
                self.save_summary(rel_path, summary)
                
            except Exception as e:
                print(f"ERROR: Failed to process {file_path}: {e}", file=sys.stderr)
                continue
    
    def generate_single_summary(self, file_path: str) -> str:
        """Generate a structured summary for a single file."""
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        rel_path = Path(file_path).relative_to(self.workspace_path)
        file_ext = Path(file_path).suffix
        
        prompt = self.build_analysis_prompt(str(rel_path), file_ext, content)
        
        message = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            temperature=0,
            messages=[{"role": "user", "content": prompt}]
        )
        
        return message.content[0].text
    
    def build_analysis_prompt(self, rel_path: str, file_ext: str, content: str) -> str:
        """Build the LLM prompt for code analysis."""
        return f"""Analyze this source file and generate a structured Markdown summary optimized for AI consumption.

**File**: `{rel_path}`

**Your task**: Create a clear, structured summary that will help an AI assistant quickly understand this file's purpose, structure, and dependencies.

**Required sections** (use this exact format):

# {Path(rel_path).stem}

## Purpose
One concise paragraph explaining what this file does and why it exists.

## Key Components
List the main classes, functions, or exports with brief descriptions:
- `ComponentName`: What it does
- `functionName()`: What it does

## Dependencies
### Internal (from this codebase)
- `path/to/file.py` - What you use from it
- `another/file.ts` - What you use from it

### External (libraries/packages)
- `library-name` - What features you use

## Public API
What this file exposes for other files to use:
- `export function doThing()`: Description
- `class MyClass`: Description

## Code Links
Direct references to key definitions (use format `[symbol_name](code:{rel_path}#symbol=symbol_name)`):
- [main_function](code:{rel_path}#symbol=main_function)
- [ClassName](code:{rel_path}#symbol=ClassName)

## Implementation Notes
Any important patterns, algorithms, or gotchas an AI should know about.

---

**Source code**:
```{file_ext[1:] if file_ext else 'txt'}
{content[:8000]}  {('...[truncated]' if len(content) > 8000 else '')}
```

Generate the summary now. Be precise and focused on information that would help an AI understand the codebase architecture."""
    
    def save_summary(self, rel_path: Path, summary: str) -> None:
        """Save the generated summary to the docs directory."""
        # Create matching directory structure
        summary_path = self.docs_path / rel_path.with_suffix('.md')
        summary_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(summary_path, 'w', encoding='utf-8') as f:
            f.write(summary)
        
        # Also save JSON metadata
        metadata = {
            "source_file": str(rel_path),
            "summary_file": str(rel_path.with_suffix('.md')),
            "generated_at": __import__('datetime').datetime.now().isoformat()
        }
        
        metadata_path = summary_path.with_suffix('.json')
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2)

def main():
    parser = argparse.ArgumentParser(description='Generate codebase summaries')
    parser.add_argument('--workspace', required=True, help='Workspace root path')
    parser.add_argument('--files', required=True, help='Path to file list (one per line)')
    parser.add_argument('--api-key', help='Anthropic API key (or set ANTHROPIC_API_KEY env var)')
    
    args = parser.parse_args()
    
    # Get API key
    api_key = args.api_key or os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        print("ERROR: API key required. Set ANTHROPIC_API_KEY or use --api-key", file=sys.stderr)
        sys.exit(1)
    
    # Read file list
    with open(args.files, 'r') as f:
        files = [line.strip() for line in f if line.strip()]
    
    if not files:
        print("ERROR: No files to process", file=sys.stderr)
        sys.exit(1)
    
    # Generate summaries
    generator = SummaryGenerator(args.workspace, api_key)
    generator.generate_summaries(files)
    
    print(f"\n✅ Successfully generated {len(files)} summaries")
    print(f"📁 Output location: {generator.docs_path}")

if __name__ == '__main__':
    main()
