# CLAUDE.md — TestDino MCP Server

You are working on an MCP (Model Context Protocol) server that connects TestDino to AI agents (Cursor, Claude Code, VS Code, etc.). This is an npm package published as `@testdino/mcp`. Users install it and configure it in their AI tool to interact with TestDino's test data via natural language.

Read this file fully before doing anything. Follow it without deviation.

---

## Project Identity

- **What**: MCP server (stdio transport, not HTTP)
- **Language**: TypeScript (strict mode, ES modules)
- **Runtime**: Node.js >= 20
- **Published to**: npm (`@testdino/mcp`)
- **API**: Talks to `https://mcp.testdino.com` using Bearer token auth (PAT)
- **Users**: Developers and QA engineers using AI coding tools
- **Source of truth**: the hosted TestDino MCP (`testdino-hq/microservices`, `services/mcp/node`). This package copies it — never the other way round

---

## Before You Write Any Code

1. Read this file completely
2. Understand the tool you're modifying — read its source file and the corresponding section in `docs/TOOLS.md`
3. Check existing patterns in `src/tools/` — follow them exactly, don't invent new conventions
4. If adding a new tool, use `src/tools/testruns/list-testruns.ts` as the reference implementation

---

## Staying Identical to the Hosted MCP

The package must expose exactly what the hosted MCP exposes and answer every call the same way:

- **Tool definitions** (`name`, `title`, `description`, `inputSchema`, `annotations`, `execution`) are copied from the hosted `tools/list`, in the hosted order. Never write or edit one by hand here; change it in microservices, then copy it.
- **Prompts** (`src/prompts/`) are the hosted builders and approval gate, copied. **`docs/skill.md`** is the hosted `skill.md` verbatim (excluded from prettier).
- **Results** go through `toolResultFromCaptured` (`src/lib/tool-result.ts`, a copy of the gateway's): compact JSON + `structuredContent`; a 4xx/5xx is `isError` with the body and `statusCode`. Handlers throw `ApiError` (or an `Error` whose `cause` is one); the dispatcher in `src/server.ts` shapes it. A refusal the hosted tool raises itself (not the route) is thrown as `ApiError` with the hosted status and body, word for word.
- **Validation** is `ajv` against the copied schema (`src/lib/validate.ts`), before any request; unknown arguments are dropped, as hosted zod does. Don't add local checks the hosted tool doesn't make.
- **Only package additions:** attachments given as local paths (converted before validation, `src/lib/local-files.ts`) and the audit `markdownReportPath` / `writeMarkdown` / `outputPath` arguments.
- **Guard:** `tests/fixtures/hosted-catalogue.json` is the hosted catalogue on sync day; `tests/unit/parity/` fails on any difference from it, on any declared argument that does not reach the request, and on the result / error / validation shapes.

**To re-sync:** in microservices, dump the hosted `tools/list`, `prompts/list`, the prompt samples and the guide from `buildMcpServer()` over an in-memory client; replace the changed tool definitions, copy `skill.md` and any changed prompt file, refresh `tests/fixtures/hosted-catalogue.json`, add handlers for new tools (and route support in microservices if a stdio route is missing), then run the full gate. Publish only after the microservices change is in production.

---

## Architecture

```
src/
├── index.ts              ← Stdio entry point (connects the server)
├── server.ts             ← Builds the server: tools, prompts, resources, the validating dispatcher
├── prompts/              ← fix_run / fix_case / fix_flake builders + approval gate (copied from hosted)
├── lib/
│   ├── env.ts            ← API URL + PAT resolution
│   ├── endpoints.ts      ← All API endpoint URL builders (centralized)
│   ├── request.ts        ← HTTP fetch wrapper (apiRequest / apiRequestJson, ApiError)
│   ├── tool-result.ts    ← toolResultFromCaptured (copy of the gateway's)
│   ├── validate.ts       ← ajv validation against each tool's schema
│   ├── local-files.ts    ← local attachment paths → file objects
│   └── file-utils.ts     ← Local file reading, base64 encoding, step validation
└── tools/
    ├── health.ts         ← PAT validation + account info
    ├── index.ts          ← Barrel export for all tools
    ├── testruns/         ← list, details, error clusters, re-run
    ├── testcases/        ← list-testcase, get-testcase-details, debug-testcase
    ├── manual-testcases/ ← CRUD for manual test cases
    ├── manual-testsuites/← list + create test suites
    ├── manual-runs/      ← CRUD for manual runs + per-case rows
    ├── releases/         ← CRUD for releases (milestones)
    ├── sessions/         ← CRUD for exploratory sessions
    ├── audits/           ← get + submit audit reports
    ├── integrations/     ← connect + issue tracker tools (Jira/Linear/Asana/monday)
    ├── test-controls/    ← quarantine, critical, assignee, watch
    └── testruns/         ← list, details, error clusters
```

**Data flow for every tool call:**

```
AI agent calls tool → server.ts converts local attachment paths → ajv validates
→ routes by name → handler: getApiKey() → endpoints.X() → apiRequestJson()
→ dispatcher shapes the body or ApiError with toolResultFromCaptured
```

---

## Tool Development Conventions

Every tool file exports exactly two things:

1. **Tool definition** — `export const xyzTool = { name, description, inputSchema }`
2. **Handler function** — `export async function handleXyz(args) { ... }`

### Tool Definition Rules

- `name`: snake_case (e.g., `list_testruns`, `get_run_details`)
- The whole definition is the hosted tool's, copied from the hosted `tools/list` — see Staying Identical. Don't reword a description or add a property here

### Handler Rules

1. **Auth first**: Always call `getApiKey(args)` and throw if missing
2. **Validate required params**: Check presence, throw with specific message
3. **Build URL via endpoints.ts**: Never construct URLs manually in handlers
4. **Type conversions**: Use `String()` for string params, `Number()` for numeric. Be consistent
5. **Response format**: Return `{ content: [{ type: "text", text: JSON.stringify(response, null, 2) }] }`
6. **Error handling**: Wrap in try/catch, prefix errors with context: `throw new Error("Failed to [action]: [detail]")`

### Adding a New Tool — Checklist

1. The tool must exist on the hosted MCP first, with a stdio route under `/api/mcp/*`
2. Add the endpoint URL builder in `src/lib/endpoints.ts`
3. Create the tool file in `src/tools/<category>/` with the hosted definition copied in
4. Export from `src/tools/index.ts`; register in `src/server.ts` (tools array in hosted order + routing if-block)
5. Refresh `tests/fixtures/hosted-catalogue.json` and copy the hosted `skill.md`
6. Run full verify: `npm run typecheck && npm run lint && npm run test`

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
3. `src/server.ts` → server constructor `version`

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

## Testing

### Setup

- Framework: Vitest with v8 coverage
- Config: `vitest.config.ts`
- Test pattern: `*.test.ts`
- Mock `fetch` via `tests/helpers/mockFetch.ts` — never hit the real API in tests
- Shared test factories in `tests/helpers/mockTypes.ts`

### Structure

```
tests/
├── setup.ts            ← Global setup (env cleanup between tests)
├── helpers/            ← Mock factories, shared types
├── unit/               ← Unit tests (mirror src/ structure)
│   ├── lib/            ← env, endpoints, request, file-utils
│   ├── tools/          ← All 54 tool handlers
│   └── parity/         ← Same catalogue, arguments, results and validation as hosted
├── fixtures/           ← hosted-catalogue.json (the hosted catalogue on sync day)
└── integration/        ← End-to-end MCP server tests
```

Unit tests in `tests/unit/` (mirror `src/`), integration in `tests/integration/`, helpers in `tests/helpers/`.

### Coverage Thresholds

| Metric     | Minimum |
| ---------- | ------- |
| Lines      | 80%     |
| Functions  | 80%     |
| Branches   | 60%     |
| Statements | 80%     |

### What to Test

- **Branching logic** — every if/else, switch case, ternary path
- **Boundary conditions** — empty arrays, undefined params, max limits, zero values
- **Async coordination** — concurrent calls, promise races, init ordering
- **Non-trivial data transforms** — query string building, response formatting, file encoding
- **Error recovery paths** — not just error detection, verify actual recovery behavior
- **Validation logic** — required params, enum values, type coercion edge cases
- **Every bug fix must include a regression test** that would have caught the bug

For tool handlers specifically:

- Missing PAT → correct error message
- Missing required params → specific error (not generic TypeError)
- API returns error → properly wrapped with context
- Params correctly forwarded to endpoint builder and API call

### What NOT to Test

- `expect(new Foo()).toBeDefined()` — constructor breaks → all tests break anyway
- `expect(typeof obj.method).toBe('function')` — TypeScript enforces this at compile time
- `expect(error.stack).toBeDefined()` — built-in JS Error behavior
- `expect(Enum.VALUE).toBe('value')` — asserts source code equals source code
- `resolves.not.toThrow()` with no state verification — proves nothing
- Duplicate invocations — same assertions called twice add noise, not coverage
- Code paths already exercised by another test — don't re-test what's covered
- Tests that only check the happy path when the fix is about failure recovery
- Runtime `readonly` checks — TS readonly is compile-time only

---

## Documentation

Three docs files serve different purposes:

| File                   | Audience    | Purpose                                            |
| ---------------------- | ----------- | -------------------------------------------------- |
| `docs/TOOLS.md`        | Human users | Comprehensive tool reference with examples         |
| `docs/skill.md`        | AI agents   | Patterns, workflows, decision trees for tool usage |
| `docs/INSTALLATION.md` | Human users | Setup instructions for different AI tools          |

`docs/skill.md` is the hosted guide verbatim — never edit it here; change it in microservices and copy it. When modifying tools, update `docs/TOOLS.md`.

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
- Not a framework (it's a concrete implementation with 45 specific tools)

Keep it simple. Every tool follows the same pattern. Consistency is more important than cleverness.
