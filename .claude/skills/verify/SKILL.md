---
name: verify
description: Run the full quality gate — format, typecheck, lint, test, build
argument-hint: '[scope: "quick" for typecheck+lint only, or empty for full gate]'
---

Run verification for the TestDino MCP project.

## Scopes

### Quick Gate (after each code change)

Use when: you just modified code and want a fast check.

```bash
npm run typecheck && npm run lint
```

### Full Gate (before commit/PR)

Use when: work is complete, ready to commit.

```bash
npm run format && npm run typecheck && npm run lint && npm run test && npm run build
```

### Publish Gate (before npm publish)

Use when: preparing a release.

```bash
npm run format && npm run typecheck && npm run lint && npm run test && npm run build
```

Then verify:

- Version is consistent across `package.json`, `server.json`, and `src/index.ts`
- `dist/` is up to date (check `git diff dist/`)
- No `.env` or secrets in staged files

## Detection

If `$ARGUMENTS` is "quick" or "fast" → run Quick Gate.
If `$ARGUMENTS` is "publish" or "release" → run Publish Gate.
Otherwise → run Full Gate.

## Report Format

```
Scope:      quick / full / publish
format:     PASS/FAIL/SKIPPED
typecheck:  PASS/FAIL
lint:       PASS/FAIL
test:       PASS/FAIL (N tests, N passed, N failed)
build:      PASS/FAIL/SKIPPED
version:    CONSISTENT/MISMATCH (publish only)
```

## Rules

- If any check fails: report specific errors with file:line references
- Fix issues before continuing — don't skip failing checks
- format is skipped in quick gate (it modifies files, which may not be desired mid-work)
- build is skipped in quick gate (typecheck catches most issues faster)
- Never suppress warnings to make checks pass
