---
name: fix
description: Structured bug fix workflow — find issue in tracker, root-cause, fix, test, verify, document
argument-hint: "[ISS-NNN or bug description]"
---

Fix the bug: $ARGUMENTS

## Workflow

### 0. Check Tracking + Memory

- Check auto-memory for prior lessons matching this bug type
- Read `ISSUES.md` — find the relevant tracked issue by ID or description
- If the issue isn't tracked yet, add it to `ISSUES.md` first (assign next ISS-NNN ID)
- Update issue status to `IN PROGRESS`

### 1. Verify the Issue Exists

- Read the code at the reported location
- Confirm the bug is real, not a false alarm
- If already fixed or no longer applies: update `ISSUES.md` status to `FIXED` and stop

### 2. Root-Cause Analysis

1. **Read the code** — understand what it does, not what you think it does
2. **Trace the data flow** — for tool issues: schema → handler → endpoint → request → response
3. **Never stop at the first failure** — ask "why did THIS fail?" and trace backward
4. **Check Known Patterns & Pitfalls** in CLAUDE.md — is this a known pattern?

### 3. Implement the Fix

- Fix the **root cause** — not the symptom
- Minimal change — don't refactor surrounding code
- Follow the project's conventions (CLAUDE.md)
- If the fix changes tool behavior or params, note what docs need updating

### 4. Test

1. Can an existing test be updated to cover the fix? Update it
2. Does the fix change observable behavior no test covers? Add a regression test
3. The test must **fail before the fix and pass after** — verify this mentally or actually

### 5. Verify

Run the quality gate immediately after the fix:

```bash
npm run typecheck && npm run lint && npm run test -- --passWithNoTests
```

All must pass. `git diff` — confirm only intentional changes.

### 6. Document

This step is **not optional**. The fix is incomplete until:

1. `ISSUES.md` is updated with:
   - Status: `FIXED` with date
   - Root cause (file:line — one sentence)
   - Fix description
   - Files changed
   - Tests added/updated
2. `docs/TOOLS.md` updated if the fix changes tool behavior
3. `CLAUDE.md` Known Patterns & Pitfalls updated if the pattern is generalizable
4. Auto-memory lesson written if anything went wrong during the fix process

## Output

```
Issue:         ISS-NNN — [title]
Severity:      [level]
Root Cause:    [file:line — one sentence]
Status:        FIXED
Files changed: [list]
Tests:         [added N / updated N / none needed]
Docs updated:  [list or "none"]
```

## Rules

- Always update `ISSUES.md` — fixes without tracking are invisible
- Fix the root cause, not the symptom
- Don't refactor surrounding code during a bug fix
- DO NOT commit automatically — wait for explicit user approval
