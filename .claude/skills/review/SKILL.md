---
name: review
description: Review code for bugs, MCP protocol violations, consistency issues, and convention adherence
argument-hint: '[file-path, or "staged" for git staged changes, or empty for all unstaged changes]'
---

Review `$ARGUMENTS` for bugs, correctness, and convention violations.

If `$ARGUMENTS` is "staged" or empty, review all staged/unstaged git changes.

## Process

1. **Read CLAUDE.md** — load project rules and conventions
2. **Read the target code** — understand before judging
3. **Check against each category below** — report only real issues with file:line references

## Categories

### MCP Protocol Compliance (highest priority)

- Does the tool return the correct response shape? `{ content: [{ type: "text", text: string }] }`
- Is `console.log` used anywhere? (corrupts stdio — must be `console.error`)
- Does the tool name match the routing in `index.ts`?
- Is the tool registered in both the `tools` array AND the routing if-blocks?
- Does `inputSchema` accurately describe what the handler expects?

### Tool Pattern Consistency

- Does the tool follow the same pattern as existing tools?
- Auth: `getApiKey(args)` called first with proper error?
- URL: Built via `endpoints.ts`, not inline?
- Response: Formatted with `JSON.stringify(response, null, 2)`?
- Error: Wrapped in try/catch with contextual message?
- Types: Consistent use of `String()`/`Number()` for conversions?

### Data Integrity

- Can any code path lose the API response silently?
- Are required parameters validated before the API call?
- Could a missing optional param cause the URL to be malformed?
- Are boolean params correctly converted to strings for query params?

### Tool Descriptions (critical for AI agent usability)

- Is the tool description specific enough for an AI to choose correctly?
- Does every `inputSchema` property have a `description`?
- Are `enum` values provided for fields with known options?
- Are `required` fields accurately marked?
- Would an AI know when NOT to use this tool based on the description?

### Security

- Is the PAT exposed in any error message or response?
- Are user inputs passed to URLs without sanitization?
- Are file paths validated before reading (for attachment tools)?

### Documentation Sync

- Do `docs/TOOLS.md` entries match the actual tool behavior?
- Does `docs/skill.md` reflect current tool capabilities?
- Is the version consistent across all 3 locations?

## Output

Report findings grouped by severity:

```
## Critical (must fix)
## Important (should fix)
## Suggestions (optional)
```

If no issues in a category, skip it. Don't pad the report.

Each finding must include:

- File:line reference
- What's wrong (one sentence)
- Specific fix (code snippet or instruction)

## Track Findings

After reporting, log all Critical and Important findings to `ISSUES.md`:

1. Check existing issues to avoid duplicates
2. Assign the next `ISS-NNN` ID for new findings
3. Add entry with: severity, status (`FOUND`), symptoms, root cause (file:line), fix suggestion
4. Update the summary table at the top

## Rules

- Don't report style issues that lint/prettier would catch
- Don't report type issues that typecheck would catch
- Focus on logic bugs, protocol violations, and consistency issues
- Verify findings against actual code before reporting — no false positives
- Tool descriptions are a first-class concern — bad descriptions = broken AI tool usage
- All Critical/Important findings MUST be logged to `ISSUES.md` — reviews without tracking are forgotten
