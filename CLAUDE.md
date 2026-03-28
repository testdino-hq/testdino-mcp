# CLAUDE.md — TestDino MCP Server

You are working on an MCP (Model Context Protocol) server that connects TestDino to AI agents (Cursor, Claude Code, VS Code, etc.). This is an npm package published as `testdino-mcp`. Users install it and configure it in their AI tool to interact with TestDino's test data via natural language.

Read this file fully before doing anything. Follow it without deviation.

---

## Project Identity

- **What**: MCP server (stdio transport, not HTTP)
- **Language**: TypeScript (strict mode, ES modules)
- **Runtime**: Node.js >= 20
- **Published to**: npm (`testdino-mcp`)
- **API**: Talks to `https://api.testdino.com` using Bearer token auth (PAT)
- **Users**: Developers and QA engineers using AI coding tools

---

## Before You Write Any Code

1. Read this file completely
2. Understand the tool you're modifying — read its source file and the corresponding section in `docs/TOOLS.md`
3. Check existing patterns in `src/tools/` — follow them exactly, don't invent new conventions
4. If adding a new tool, use `src/tools/testruns/list-testruns.ts` as the reference implementation

---

## Architecture

```
src/
├── index.ts              ← Server entry point (registers tools + resources)
├── lib/
│   ├── env.ts            ← API URL + PAT resolution
│   ├── endpoints.ts      ← All API endpoint URL builders (centralized)
│   ├── request.ts        ← HTTP fetch wrapper (apiRequest / apiRequestJson)
│   └── file-utils.ts     ← Local file reading, base64 encoding, step validation
└── tools/
    ├── health.ts         ← PAT validation + account info
    ├── index.ts          ← Barrel export for all tools
    ├── testruns/         ← list-testruns, get-run-details
    ├── testcases/        ← list-testcase, get-testcase-details, debug-testcase
    ├── manual-testcases/ ← CRUD for manual test cases
    └── manual-testsuites/← list + create test suites
```

**Data flow for every tool call:**

```
AI agent calls tool → index.ts routes by name → handler validates args
→ getApiKey() resolves PAT → endpoints.X() builds URL → apiRequestJson() fetches
→ handler formats response → returns { content: [{ type: "text", text: ... }] }
```

---

## Tool Development Conventions

Every tool file exports exactly two things:

1. **Tool definition** — `export const xyzTool = { name, description, inputSchema }`
2. **Handler function** — `export async function handleXyz(args) { ... }`

### Tool Definition Rules

- `name`: snake_case (e.g., `list_testruns`, `get_run_details`)
- `description`: Write for AI agents, not humans. Be specific about what the tool returns and when to use it. Include usage hints
- `inputSchema`: JSON Schema format. Every property MUST have a `description`. Use `enum` for known values. Mark `required` fields accurately
- Descriptions are the AI's only guide — vague descriptions = wrong tool usage

### Handler Rules

1. **Auth first**: Always call `getApiKey(args)` and throw if missing
2. **Validate required params**: Check presence, throw with specific message
3. **Build URL via endpoints.ts**: Never construct URLs manually in handlers
4. **Type conversions**: Use `String()` for string params, `Number()` for numeric. Be consistent
5. **Response format**: Return `{ content: [{ type: "text", text: JSON.stringify(response, null, 2) }] }`
6. **Error handling**: Wrap in try/catch, prefix errors with context: `throw new Error("Failed to [action]: [detail]")`

### Adding a New Tool — Checklist

1. Add endpoint URL builder in `src/lib/endpoints.ts`
2. Create tool file in the appropriate `src/tools/<category>/` directory
3. Export from `src/tools/index.ts`
4. Register in `src/index.ts` (add to tools array + add routing if-block)
5. Update `docs/TOOLS.md` with full documentation
6. Update `docs/skill.md` if it affects AI agent workflows
7. Run full verify: `npm run typecheck && npm run lint && npm run test`

---

## Code Rules

### TypeScript

- Strict mode enabled — no `any` unless absolutely necessary (use `Record<string, unknown>`)
- All imports use `.js` extensions (ES module requirement)
- Use named exports only — no default exports
- Keep handler functions focused: auth → validate → fetch → format → return

### Naming

- Tool files: `kebab-case.ts` (e.g., `list-testruns.ts`)
- Tool names (MCP): `snake_case` (e.g., `list_testruns`)
- Tool definition exports: `camelCaseTool` (e.g., `listTestRunsTool`)
- Handler exports: `handleCamelCase` (e.g., `handleListTestRuns`)
- Interfaces/types: `PascalCase` (e.g., `ListTestRunsArgs`)

### Error Messages

- Missing PAT: `"Missing TESTDINO_PAT environment variable. Please configure it in your .cursor/mcp.json file under the 'env' section."`
- Missing required param: `"[paramName] is required"`
- API failure: `"Failed to [action]: [error detail]"`
- Keep messages actionable — tell the user what to do, not just what went wrong

### What NOT to Do

- Don't construct API URLs directly in tool handlers — always use `endpoints.ts`
- Don't add new dependencies without strong justification
- Don't use `console.log` — MCP uses stdio. Use `console.error` or `logError`/`logInfo` for debug output
- Don't change the response shape (`{ content: [{ type: "text", text }] }`) — it's the MCP protocol
- Don't duplicate utility code — if `file-utils.ts` has what you need, import it

---

## Version Management

Version appears in THREE places and must stay in sync:

1. `package.json` → `version`
2. `server.json` → `version` (and `packages[0].version`)
3. `src/index.ts` → server constructor `version`

When bumping version, update all three. Use `/bump-version` command.

---

## Build & Quality Commands

```bash
npm run build          # TypeScript compilation (tsc)
npm run dev            # Run from source (tsx src/index.ts)
npm run typecheck      # Type check without emitting (tsc --noEmit)
npm run lint           # ESLint
npm run lint:fix       # ESLint with auto-fix
npm run format         # Prettier write
npm run format:check   # Prettier check
npm run test           # Jest (ESM mode)
npm run test:coverage  # Jest with coverage report
```

**Quality gate (run before every commit):**

```bash
npm run typecheck && npm run lint && npm run test
```

**Full gate (before publish/PR):**

```bash
npm run format && npm run typecheck && npm run lint && npm run test && npm run build
```

---

## Testing Strategy

- Framework: Jest with `ts-jest` (ESM preset)
- Test location: `__tests__/` directory (mirroring src structure)
- Test pattern: `*.test.ts`
- Every tool handler should have tests covering:
  - Missing PAT → error
  - Missing required params → error
  - Successful API call → formatted response
  - API error → wrapped error message
- Utility functions (`lib/`) should have unit tests for edge cases
- Mock `fetch` for API calls — never hit the real API in tests

---

## Documentation

Three docs files serve different purposes:

| File                   | Audience    | Purpose                                            |
| ---------------------- | ----------- | -------------------------------------------------- |
| `docs/TOOLS.md`        | Human users | Comprehensive tool reference with examples         |
| `docs/skill.md`        | AI agents   | Patterns, workflows, decision trees for tool usage |
| `docs/INSTALLATION.md` | Human users | Setup instructions for different AI tools          |

When modifying tools, update `docs/TOOLS.md`. If the change affects how an AI agent should choose or use tools, also update `docs/skill.md`.

---

## Issue Tracking

All bugs, regressions, and technical debt are tracked in `ISSUES.md` at the project root.

**Format:** Each issue has an `ISS-NNN` ID with: severity, status, symptoms, root cause (file:line), fix description, files changed, tests added.

**Status flow:** `FOUND` → `IN PROGRESS` → `FIXED` (with resolution summary and date)

**Severity levels:** `CRITICAL` | `HIGH` | `IMPORTANT` | `MEDIUM` | `LOW`

**When to write issues:**

- `/review` skill finds Critical/Important bugs → logs them to `ISSUES.md`
- `/fix` skill starts from an `ISSUES.md` entry and updates it on completion
- `/retro` skill checks if bugs were found during the task and logs new ones
- Any time a bug is discovered during development → add it before you forget

**Rules:**

- Every issue must have a specific file:line reference
- Every issue must have a concrete fix suggestion
- Fixes without `ISSUES.md` updates are incomplete — tracking is not optional
- Generalizable patterns get promoted to the Known Patterns & Pitfalls table in this file

---

## Publishing

This is a public npm package. Before publishing:

1. Bump version in all 3 locations (use `/bump-version`)
2. Run full quality gate
3. Run `npm run build` to regenerate `dist/`
4. Commit with message: `chore: Bump version to X.Y.Z`
5. `npm publish`
6. Create GitHub release tag

---

## Known Patterns & Pitfalls

| Pattern                 | Rule                                                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| stdio transport         | MCP servers communicate via stdin/stdout. `console.log` will corrupt the protocol. Always use `console.error` for debug output |
| PAT resolution          | `getApiKey()` checks `args.token` first, then `process.env.TESTDINO_PAT`. Both paths must work                                 |
| Endpoint centralization | All API URLs live in `endpoints.ts`. Tool handlers never build URLs. This makes API changes a single-file edit                 |
| Query param filtering   | `buildQueryString()` in endpoints.ts skips `undefined`/`null` values automatically                                             |
| File attachments        | Only manual test case tools use file attachments. `file-utils.ts` handles base64 encoding. Max 10MB per file                   |
| Response wrapping       | The TestDino API sometimes wraps responses in `{ success, data }`. Health tool handles this — check if new endpoints do too    |
| Boolean params          | Some API params expect string `"true"`/`"false"`, not boolean. Use `String()` when passing to query params                     |
| Version sync            | Version in 3 places. Forgetting one causes confusion. Always update all three                                                  |

---

## Debugging

### Testing locally during development

```bash
# Run the server in dev mode (auto-restarts on changes)
npm run dev

# The server reads from stdin and writes to stdout
# You can pipe MCP JSON-RPC messages to test
```

### Common issues

| Symptom                       | Likely cause                                                                |
| ----------------------------- | --------------------------------------------------------------------------- |
| Server crashes silently       | `console.log` used instead of `console.error` (corrupts stdio)              |
| "Unknown tool" error          | Tool not registered in `src/index.ts` (missing from tools array or routing) |
| Auth always fails             | PAT not in env, or handler not calling `getApiKey(args)`                    |
| Empty API response            | Wrong endpoint URL — check `endpoints.ts` query string building             |
| Type errors after adding tool | Missing `.js` extension in import path                                      |

---

## Protocols

### Session Lifecycle (automated via hooks)

These fire automatically — no manual invocation needed:

| Event                                 | Hook                                  | What it does                                                                     |
| ------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------- |
| **New session / resume / compaction** | `SessionStart` → `session-context.sh` | Injects git state, version consistency, memory count, and key rules into context |
| **Before compaction**                 | `PreCompact` → `pre-compact.sh`       | Captures uncommitted changes and prompts to save lessons before context is lost  |
| **Turn ends**                         | `Stop` → `stop-check.sh`              | If 3+ files changed, reminds to run `/retro` to capture lessons                  |

On **compaction specifically**, the session-context hook re-anchors critical rules:

- Check CLAUDE.md protocols
- Check auto-memory for relevant lessons
- Tool pattern reference (list-testruns.ts)
- Quality gate after every change
- Version sync across 3 files
- No console.log (stdio corruption)

### Before Any Non-Trivial Change

1. **CHECK MEMORY** — Read auto-memory for lessons relevant to this area. If a prior lesson matches, follow its rule — it exists because something went wrong before
2. **UNDERSTAND** — Restate what's being asked in one sentence
3. **READ** — Read the affected files. Don't assume you know how they work
4. **PLAN** — List files to modify, changes needed, what NOT to touch
5. **IMPLEMENT** — Small incremental steps. Run typecheck after each change
6. **VERIFY** — Run quality gate. Fix issues before moving on
7. **DOCUMENT** — Update docs if the change is user-facing

### When Something Goes Wrong

1. **STOP** — Don't retry the same thing
2. **READ THE ERROR** — Understand what actually failed
3. **TRACE** — Follow the error to its source (don't fix symptoms)
4. **FIX** — Fix the root cause
5. **VERIFY** — Confirm the fix and that nothing else broke

### Self-Correction Protocol

When told you're wrong, your approach is rejected, or verification fails on second attempt:

1. **STOP** — Halt the current approach. Don't "just try one more thing"
2. **ANALYZE** — List 3 specific reasons why your approach might be wrong. Reference actual code, not abstract possibilities
3. **IDENTIFY** — State the gap: "I did X because I assumed Y, but the actual constraint is Z"
4. **LEARN** — Write a lesson to auto-memory (feedback type) with:
   - What triggered it
   - What was wrong and why
   - What should have been done instead
   - The reusable rule (one sentence)
5. **ACT** — Proceed with the corrected approach. If still uncertain, ask before acting

### Reinforcement Protocol (always active)

Learning rules that compound across sessions:

**Before starting any task:**

1. Check auto-memory for lessons matching the current task type (tool changes, endpoint work, docs, publishing)
2. If a prior lesson matches, follow its rule — don't repeat past mistakes

**After completing any non-trivial task:**

1. Did anything go wrong? (rework, user correction, failed verification, wrong approach)
2. If yes → write a lesson to auto-memory (feedback type) with: trigger, what was wrong, what should have been done, and the reusable rule
3. If no → move on. Don't write lessons for things that went smoothly

**After user corrections or rework → run `/retro`**

**Promotion to permanent rules:**
When the same lesson pattern appears 3+ times in auto-memory:

- It's no longer a one-off — it's a pattern
- Propose adding it to the Known Patterns & Pitfalls table in this CLAUDE.md
- Get user approval before modifying

---

## What This Project is NOT

- Not an HTTP server (it's stdio)
- Not a CLI tool for end users (it's a server that AI tools spawn)
- Not a monorepo (single package, single concern)
- Not a framework (it's a concrete implementation with 12 specific tools)

Keep it simple. Every tool follows the same pattern. Consistency is more important than cleverness.
