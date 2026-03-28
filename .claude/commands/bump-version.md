Bump the project version across all locations where it's defined.

**Input:** $ARGUMENTS — the new version number (e.g., "1.0.8") or a semver bump type ("patch", "minor", "major")

---

## Steps

1. **Determine current version** — Read `package.json` to get the current version

2. **Calculate new version** — If the argument is "patch", "minor", or "major", calculate the next version. If it's an explicit version like "1.0.8", use it directly. If no argument is provided, default to "patch"

3. **Update all 3 locations:**
   - `package.json` → `"version": "X.Y.Z"`
   - `server.json` → `"version": "X.Y.Z"` AND `packages[0].version`
   - `src/index.ts` → server constructor `version: "X.Y.Z"`

4. **Verify** — Read all three files and confirm the version is consistent

5. **Report** — Show the old version, new version, and all files changed

## Rules

- Do NOT commit automatically — let the user decide when to commit
- Do NOT run npm publish — that's a separate step
- If the version argument is invalid (not semver), stop and ask for clarification
