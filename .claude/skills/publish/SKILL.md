---
name: publish
description: Guided npm publish workflow — version bump, quality gate, build, publish, tag
argument-hint: '[version: "patch", "minor", "major", or explicit like "1.1.0"]'
---

Prepare and publish a new version: $ARGUMENTS

This skill guides through the full release process. It does NOT auto-publish — it pauses for user confirmation at key points.

## Workflow

### Step 1 — Determine Version

- Read current version from `package.json`
- Calculate new version based on `$ARGUMENTS` (default: patch)
- Show: `Current: X.Y.Z → New: A.B.C`

**Get user confirmation before proceeding.**

### Step 2 — Pre-flight Checks

Verify the codebase is ready:

1. `git status` — working tree should be clean (no uncommitted changes)
2. `git branch` — should be on `main` branch
3. Check version consistency across `package.json`, `server.json`, `src/index.ts`
4. `npm run format:check` — formatting is clean
5. `npm run typecheck` — no type errors
6. `npm run lint` — no lint errors
7. `npm run test` — all tests pass
8. `npm run build` — build succeeds

If ANY check fails, stop and report. Do not continue with a broken build.

### Step 3 — Bump Version

Update version in all 3 locations:

1. `package.json` → `version`
2. `server.json` → `version` and `packages[0].version`
3. `src/index.ts` → server constructor version

### Step 4 — Rebuild

```bash
npm run build
```

The `dist/` directory must reflect the new version.

### Step 5 — Review Changes

Show `git diff` so the user can verify:

- Only version numbers changed (plus rebuilt dist/)
- No accidental modifications

**Get user confirmation before committing.**

### Step 6 — Commit & Tag

```bash
git add package.json server.json src/index.ts dist/
git commit -m "chore: Bump version to A.B.C"
git tag vA.B.C
```

### Step 7 — Publish

Show the command but DO NOT run it automatically:

```bash
npm publish
git push origin main --tags
```

**Tell the user to run these commands themselves.**

## Rules

- Never publish from a dirty working tree
- Never publish from a branch other than main (unless user explicitly says so)
- Never skip the quality gate
- Always pause for user confirmation before commit and publish
- The version must be consistent across all 3 files before and after the bump
