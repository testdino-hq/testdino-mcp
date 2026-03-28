---
name: debug-tool
description: Debug a malfunctioning MCP tool — trace the full request lifecycle to find the issue
argument-hint: "[tool-name and symptom description]"
---

Debug the tool issue: $ARGUMENTS

Do NOT guess. Trace systematically.

## Phase 1 — Identify

1. Which tool is affected?
2. What is the expected behavior?
3. What is the actual behavior? (error message, wrong data, empty response, crash)

## Phase 2 — Trace the Request Lifecycle

Read the code for each layer and check for issues:

### Layer 1: Tool Schema (`src/tools/<category>/<tool>.ts`)

- Is `name` in the tool definition the same as the routing name in `index.ts`?
- Does `inputSchema` match what the handler actually reads from `args`?
- Are `required` fields correctly listed?
- Are `enum` values complete?

### Layer 2: Handler Logic

- Is `getApiKey(args)` called correctly?
- Are required params validated before use?
- Are type conversions correct? (`String()`, `Number()`)
- Is the params object passed to the endpoint builder correctly?

### Layer 3: Endpoint URL (`src/lib/endpoints.ts`)

- Is the URL pattern correct? (`/api/mcp/${projectId}/...`)
- Are query params built correctly?
- Is `projectId` being destructured out before building query string?
- Log the actual URL being built (add temporary `console.error`)

### Layer 4: HTTP Request (`src/lib/request.ts`)

- Is the right HTTP method used? (GET vs POST vs PATCH)
- Is `Content-Type: application/json` being set?
- Is the Authorization header present?
- For POST/PATCH: is the body being JSON.stringify'd?

### Layer 5: Response Handling

- Does the API return `{ success, data }` wrapper or direct data?
- Is `response.ok` being checked?
- Is the error text being read on failure?
- Is the response being JSON.stringify'd for the MCP return?

## Phase 3 — Isolate

Once you've identified the suspect layer:

1. Read the specific code carefully
2. Check if other tools in the same category work (pattern comparison)
3. If the issue is in `endpoints.ts`, check the API docs or compare with working tools

## Phase 4 — Fix & Verify

1. Fix the root cause
2. Run `npm run typecheck && npm run lint`
3. If the tool's behavior or params changed, update `docs/TOOLS.md`
4. Remove any temporary `console.error` debug lines

## Common Issues Reference

| Symptom            | First place to check                                             |
| ------------------ | ---------------------------------------------------------------- |
| "Unknown tool"     | Tool not in `tools` array or missing routing in `index.ts`       |
| "Missing PAT"      | `getApiKey` not receiving `args`, or env var not set             |
| 404 from API       | Wrong URL in `endpoints.ts` — check path and projectId placement |
| Empty response     | API returns wrapped `{ data }` but handler reads top-level       |
| Wrong data         | Query params not being passed — check `buildQueryString` input   |
| Type error         | Missing `.js` in import, or wrong param types                    |
| Crashes on startup | Circular import or top-level await issue                         |

## Rules

- Trace layer by layer — don't skip to guessing
- Compare with a WORKING tool in the same category
- Fix the root cause, not the symptom
- Remove all debug logging before committing
