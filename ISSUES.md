# TestDino MCP — Issue Tracker

Status flow: `FOUND` → `IN PROGRESS` → `FIXED` (with resolution summary)

Severity levels: `CRITICAL` | `HIGH` | `IMPORTANT` | `MEDIUM` | `LOW`

---

## Summary

| ID      | Severity  | Status | Description                                                                                     |
| ------- | --------- | ------ | ----------------------------------------------------------------------------------------------- |
| ISS-001 | CRITICAL  | FOUND  | PAT precedence inverted — env var overrides explicit args.token                                 |
| ISS-002 | CRITICAL  | FOUND  | readFileSync for skill.md crashes server if file missing                                        |
| ISS-003 | CRITICAL  | FOUND  | Zero test coverage — entire test suite absent                                                   |
| ISS-004 | IMPORTANT | FOUND  | Raw API error body leaked into tool output, no size cap                                         |
| ISS-005 | IMPORTANT | FOUND  | list_testcase: args.projectId accessed without null guard                                       |
| ISS-006 | IMPORTANT | FOUND  | get_testcase_details: unsafe cast bypasses endpoint type system                                 |
| ISS-007 | IMPORTANT | FOUND  | health tool returns soft error on missing PAT, inconsistent with all other tools                |
| ISS-008 | IMPORTANT | FOUND  | get_testcase_details: by_status alone satisfies validation, enabling unscoped queries           |
| ISS-009 | MEDIUM    | FOUND  | processSubStepImages silently swallows file read errors                                         |
| ISS-010 | MEDIUM    | FOUND  | debug_testcase: error message deviates from convention                                          |
| ISS-011 | MEDIUM    | FOUND  | list_manual_test_cases: default limit hardcoded in handler, duplicating schema                  |
| ISS-012 | MEDIUM    | FOUND  | listManualTestCases/listManualTestSuites endpoint produces undefined in URL when params omitted |
| ISS-013 | MEDIUM    | FOUND  | Enum "Accessability" misspelled across 3 tool files                                             |

---

## ISS-001: PAT Precedence Inverted (CRITICAL)

**Status:** FOUND (2026-03-28)

**Symptoms:** If a user has `TESTDINO_PAT` set globally and passes a different token via `args.token`, the environment variable silently overrides the explicit argument.

**Root cause:** `src/lib/env.ts:13`

```ts
return process.env.TESTDINO_PAT || tokenFromArgs;
```

Precedence is backwards. CLAUDE.md documents "checks args.token first, then env" but code does the opposite.

**Fix:** Swap the order:

```ts
return tokenFromArgs || process.env.TESTDINO_PAT;
```

**Files:** `src/lib/env.ts:13`
**Tests:** Need unit test verifying args.token takes precedence over env var

---

## ISS-002: readFileSync Crashes Server If skill.md Missing (CRITICAL)

**Status:** FOUND (2026-03-28)

**Symptoms:** MCP server crashes with unhandled exception if `docs/skill.md` is missing (e.g., corrupted install, missing docs directory).

**Root cause:** `src/index.ts:110` — `readFileSync` is not wrapped in try/catch. The synchronous exception propagates uncaught through the MCP SDK and kills the server's stdio transport.

**Fix:** Wrap in try/catch and return a graceful error:

```ts
try {
  const content = readFileSync(skillPath, "utf-8");
  return { contents: [{ uri, mimeType: "text/markdown", text: content }] };
} catch {
  throw new Error(`Resource file not found: ${skillPath}`);
}
```

**Files:** `src/index.ts:106-124`
**Tests:** Need test verifying graceful error when resource file is missing

---

## ISS-003: Zero Test Coverage (CRITICAL)

**Status:** FOUND (2026-03-28)

**Symptoms:** `npm test` runs but finds no tests. Jest is configured, `__tests__/` directory does not exist. CI uses `--passWithNoTests` to avoid failure.

**Root cause:** Tests were never written. No `__tests__/` directory, no `.test.ts` files anywhere.

**Fix:** Write test suite covering:

- `lib/env.ts` — PAT resolution precedence
- `lib/endpoints.ts` — URL building, query string generation
- `lib/request.ts` — success/error handling
- `lib/file-utils.ts` — MIME types, file reading, attachment processing, validation
- All 12 tool handlers — auth, param validation, response format, error wrapping
- `index.ts` — tool registration, resource handler

**Files:** `__tests__/` (to be created)
**Tests:** This IS the test issue

---

## ISS-004: Raw API Error Body Leaked Into Tool Output (IMPORTANT)

**Status:** FOUND (2026-03-28)

**Symptoms:** API error responses can contain internal server details, auth context, or reflected tokens. These get passed through `apiRequestJson` → tool handler → MCP client output with no filtering or truncation.

**Root cause:** `src/lib/request.ts:38-41`

```ts
const errorText = await response.text();
throw new Error(
  `API request failed: ${response.status} ${response.statusText}\n${errorText}`
);
```

No size cap on `errorText`. No scrubbing of sensitive patterns (Bearer tokens, internal paths).

**Fix:** Truncate `errorText` to 500 chars. Scrub any `Bearer ` token patterns:

```ts
let errorText = await response.text();
errorText = errorText.substring(0, 500);
errorText = errorText.replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [REDACTED]");
```

**Files:** `src/lib/request.ts:38-41`
**Tests:** Need test verifying error truncation and token scrubbing

---

## ISS-005: list_testcase Missing projectId Validation (IMPORTANT)

**Status:** FOUND (2026-03-28)

**Symptoms:** If `args` is undefined, the handler hits `args.projectId` on line 213 and throws a raw `TypeError` instead of the expected "projectId is required" message.

**Root cause:** `src/tools/testcases/list-testcase.ts:213` — `args.projectId` accessed without null guard. Unlike every other handler, this one does not validate `projectId` explicitly before the try block.

**Fix:** Add before the try block:

```ts
if (!args?.projectId) {
  throw new Error("projectId is required");
}
```

**Files:** `src/tools/testcases/list-testcase.ts:213`
**Tests:** Need test verifying "projectId is required" error message

---

## ISS-006: get_testcase_details Unsafe Cast Bypasses Type System (IMPORTANT)

**Status:** FOUND (2026-03-28)

**Symptoms:** If `endpoints.getTestCaseDetails` signature changes, this handler silently masks the incompatibility.

**Root cause:** `src/tools/testcases/get-testcase-details.ts:276-278` — `queryParams` is `Record<string, string>` but cast to the full endpoint param type. Handler converts everything to strings before building params, bypassing the typed interface.

**Fix:** Build `queryParams` using the proper typed interface (matching the pattern in other handlers) instead of casting.

**Files:** `src/tools/testcases/get-testcase-details.ts:276-278`
**Tests:** Need test verifying correct param types are passed to endpoint builder

---

## ISS-007: Health Tool Inconsistent Error Handling (IMPORTANT)

**Status:** FOUND (2026-03-28)

**Symptoms:** Health tool returns a formatted markdown error on missing PAT. All other 11 tools throw an exception. AI agents treating non-exception responses as success could misinterpret this.

**Root cause:** `src/tools/health.ts:27-35` — returns `{ content: [{ type: "text", text: "... Error ..." }] }` instead of throwing.

**Fix:** This is debatable — health is a diagnostic tool and a friendly error may be intentional. However, it should be consistent. Either all tools throw, or this is documented as an intentional exception.

**Files:** `src/tools/health.ts:27-35`
**Tests:** Need test verifying behavior on missing PAT

---

## ISS-008: get_testcase_details by_status Alone Enables Unscoped Queries (IMPORTANT)

**Status:** FOUND (2026-03-28)

**Symptoms:** Calling with only `projectId` + `by_status: "failed"` (no test run ID, no counter, no test case name) passes validation and returns an arbitrarily large result set.

**Root cause:** `src/tools/testcases/get-testcase-details.ts:185` — `by_status` is included in the `hasSearchParam` check, so it alone satisfies the "at least one parameter" requirement.

**Fix:** Remove `by_status` from `hasSearchParam` — it should be a filter on top of other identifiers, not a standalone search.

**Files:** `src/tools/testcases/get-testcase-details.ts:184-197`
**Tests:** Need test verifying that by_status alone does not pass validation

---

## ISS-009: processSubStepImages Silently Swallows File Read Errors (MEDIUM)

**Status:** FOUND (2026-03-28)

**Symptoms:** If a local file path in a sub-step image fails to read, the error is silently discarded and the original `img` object (missing `fileContent`) is sent to the API. The server likely rejects it with a cryptic error.

**Root cause:** `src/lib/file-utils.ts:167-169` — empty catch block returns original img without fileContent.

**Fix:** Log a warning via `console.error` or throw with a descriptive message, consistent with `processAttachments()` in the same file.

**Files:** `src/lib/file-utils.ts:167-169`
**Tests:** Need test verifying error propagation on failed file read

---

## ISS-010: debug_testcase Error Message Deviates From Convention (MEDIUM)

**Status:** FOUND (2026-03-28)

**Symptoms:** Error message says `"Missing TESTDINO_PAT (PAT) environment variable."` while all other 10 handlers say `"Missing TESTDINO_PAT environment variable."`.

**Root cause:** `src/tools/testcases/debug-testcase.ts:42`

**Fix:** Remove `(PAT)` to match convention.

**Files:** `src/tools/testcases/debug-testcase.ts:42`
**Tests:** Convention check

---

## ISS-011: list_manual_test_cases Hardcodes Default Limit (MEDIUM)

**Status:** FOUND (2026-03-28)

**Symptoms:** Default `limit: 10` defined in both the inputSchema and imperatively in the handler. Two sources of truth.

**Root cause:** `src/tools/manual-testcases/list-manual-test-cases.ts:222-225`

**Fix:** Remove the hardcoded default in the handler. Let the API use its own default when limit is not provided, consistent with other handlers.

**Files:** `src/tools/manual-testcases/list-manual-test-cases.ts:222-225`
**Tests:** Verify omitting limit param doesn't break the request

---

## ISS-012: Endpoint Functions Produce undefined in URL Path (MEDIUM)

**Status:** FOUND (2026-03-28)

**Symptoms:** `listManualTestCases` and `listManualTestSuites` endpoints produce `/api/mcp/manual-tests/undefined/test-cases` when called without params. Latent bug — handlers always provide projectId, but the endpoint function is not defensive.

**Root cause:** `src/lib/endpoints.ts:202-205` — `params || {}` fallback doesn't have projectId, so it becomes `undefined` in the URL string.

**Fix:** Add guard: `if (!projectId) throw new Error("projectId is required for this endpoint")`

**Files:** `src/lib/endpoints.ts:202, 248`
**Tests:** Need test verifying endpoint throws on missing projectId

---

## ISS-013: Enum "Accessability" Misspelled (MEDIUM)

**Status:** FOUND (2026-03-28)

**Symptoms:** AI agents following the schema's enum would send `"Accessability"` instead of `"Accessibility"`. If the API expects the correct spelling, this silently fails.

**Root cause:** Typo in enum arrays across:

- `src/tools/manual-testcases/create-manual-test-case.ts`
- `src/tools/manual-testcases/update-manual-test-case.ts`
- `src/tools/manual-testcases/list-manual-test-cases.ts`

**Fix:** Check what the API actually expects. If it expects `"Accessibility"`, fix all 3 files. If the API has the same typo, note it here and fix when the API does.

**Files:** 3 tool files (see above)
**Tests:** N/A — depends on API behavior
