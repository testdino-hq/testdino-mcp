---
name: update-docs
description: Update documentation after tool changes — TOOLS.md, SKILL.md, README, INSTALLATION.md
argument-hint: '[tool-name or "all" to audit all docs]'
---

Update documentation: $ARGUMENTS

## Workflow

### Step 1 — Determine Scope

If a specific tool is named:

- Read the tool's source file to understand current behavior
- Check `docs/TOOLS.md` for the tool's existing documentation
- Check `docs/SKILL.md` for any references

If "all" is specified:

- Read all tool source files
- Compare against `docs/TOOLS.md` for drift
- Check tool count in `README.md`

### Step 2 — Check for Drift

For each tool in scope, verify:

1. **TOOLS.md**
   - Does the documented tool name match `toolDefinition.name`?
   - Does the parameter list match `inputSchema.properties`?
   - Are required/optional fields correctly documented?
   - Do example requests match the actual schema?
   - Are enum values listed and up to date?

2. **SKILL.md**
   - Are workflow references to tools still accurate?
   - Do decision trees point to the right tools?
   - Are parameter quick-reference tables current?

3. **README.md**
   - Is the tool count correct?
   - Are all tool names listed?
   - Do feature descriptions match reality?

4. **INSTALLATION.md**
   - Are setup instructions still valid?
   - Is the package name and version reference correct?

### Step 3 — Update

Fix any drift found. Follow the existing documentation style — don't reinvent the format.

For TOOLS.md, each tool section should include:

- Tool name and description
- Parameters table (name, type, required/optional, description)
- Example usage (request + response)
- Notes on when to use vs similar tools

### Step 4 — Verify

- Read the updated docs to confirm they're accurate
- Check for broken markdown formatting
- Run `npm run format` to ensure consistent formatting

## Rules

- Don't rewrite documentation that's already correct — only fix drift
- Match existing documentation style and structure
- Tool descriptions in docs should be more detailed than the inputSchema description (docs are for humans, schema is for AI agents)
- If a tool was removed, remove its documentation section entirely — don't leave stubs
- Keep SKILL.md focused on AI agent patterns, not human-readable reference
