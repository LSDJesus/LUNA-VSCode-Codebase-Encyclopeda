# LUNA Prompt Templates

This directory contains all prompts used by LUNA for code analysis. Prompts are externalized as JSON files for easy editing without code changes.

## Directory Structure

```
prompts/
  base/                    # Generic prompts for all languages
    file-summary.json
    structure-analysis.json
    section-explanation.json
    
  languages/               # Language-specific enhancements
    python.json
    typescript.json
    javascript.json
    java.json
    csharp.json
    go.json
    
  frameworks/              # Framework-specific additions
    python-fastapi.json
    python-django.json
    python-flask.json
    typescript-react.json
    typescript-vue.json
    
  qa/                      # Quality assurance prompts
    dead-code-validation.json
    complexity-validation.json
```

## Prompt Schema

Each prompt file follows this structure:

```json
{
  "version": "1.0.0",
  "name": "prompt-name",
  "description": "What this prompt does",
  "extends": "base/parent-prompt",  // Optional: inherit from another prompt
  "userPromptTemplate": "Template with {{variables}}",
  "additionalInstructions": [
    "Instruction 1",
    "Instruction 2"
  ],
  "temperature": 0,
  "maxTokens": 2000
}
```

## Template Variables

Available variables for substitution in prompts:

- `{{relativePath}}` - File path relative to workspace
- `{{fileName}}` - Just the filename
- `{{fileExtension}}` - File extension (e.g., `.ts`)
- `{{content}}` - Full file content
- `{{language}}` - Detected language (python, typescript, etc.)
- `{{frameworks}}` - Detected frameworks (comma-separated)

## Inheritance

Prompts can extend others using the `extends` field. Instructions are merged:

```json
// base/file-summary.json
{
  "additionalInstructions": ["Note all exports"]
}

// languages/python.json
{
  "extends": "base/file-summary",
  "additionalInstructions": ["List all decorators"]
}

// Result: Both instructions are included
```

## Framework Detection

The system automatically detects frameworks by scanning file content:

**Python:**
- `fastapi` - Detects `from fastapi import` or `@app.` decorators
- `django` - Detects `from django` or `models.Model`
- `flask` - Detects `from flask import` or `@app.route`

**TypeScript:**
- `react` - Detects `from "react"` or `import React`
- `vue` - Detects `from "vue"`
- `angular` - Detects `@Component` or `@angular/core`

## Creating New Prompts

1. Copy an existing prompt as a template
2. Update `name` and `description`
3. Modify `userPromptTemplate` and `additionalInstructions`
4. Test by regenerating summaries
5. Commit to version control

## Best Practices

- Keep base prompts generic and language-agnostic
- Put language-specific details in language prompts
- Put framework-specific details in framework prompts
- Use specific, actionable instructions
- Include examples when helpful
- Version prompts when making significant changes
