# TestDino MCP — Issue Tracker

Status flow: `FOUND` → `IN PROGRESS` → `FIXED` (with resolution summary)

Severity levels: `CRITICAL` | `HIGH` | `IMPORTANT` | `MEDIUM` | `LOW`

---

## Summary

| ID      | Severity  | Status | Description                                                                                                                |
| ------- | --------- | ------ | -------------------------------------------------------------------------------------------------------------------------- |
| ISS-001 | CRITICAL  | FOUND  | PAT precedence inverted — env var overrides explicit args.token                                                            |
| ISS-002 | CRITICAL  | FOUND  | readFileSync for skill.md crashes server if file missing                                                                   |
| ISS-003 | CRITICAL  | FOUND  | Zero test coverage — entire test suite absent                                                                              |
| ISS-004 | IMPORTANT | FOUND  | Raw API error body leaked into tool output, no size cap                                                                    |
| ISS-005 | IMPORTANT | FOUND  | list_testcase: args.projectId accessed without null guard                                                                  |
| ISS-006 | IMPORTANT | FOUND  | get_testcase_details: unsafe cast bypasses endpoint type system                                                            |
| ISS-007 | IMPORTANT | FOUND  | health tool returns soft error on missing PAT, inconsistent with all other tools                                           |
| ISS-008 | IMPORTANT | FOUND  | get_testcase_details: by_status alone satisfies validation, enabling unscoped queries                                      |
| ISS-009 | MEDIUM    | FOUND  | processSubStepImages silently swallows file read errors                                                                    |
| ISS-010 | MEDIUM    | FOUND  | debug_testcase: error message deviates from convention                                                                     |
| ISS-011 | MEDIUM    | FOUND  | list_manual_test_cases: default limit hardcoded in handler, duplicating schema                                             |
| ISS-012 | MEDIUM    | FOUND  | listManualTestCases/listManualTestSuites endpoint produces undefined in URL when params omitted                            |
| ISS-013 | MEDIUM    | FOUND  | Enum "Accessability" misspelled across 3 tool files                                                                        |
| ISS-014 | HIGH      | FIXED  | list_testruns: by_status/search/by_test_case_tags/sort missing from schema — filters silently dropped (TDV2-105)           |
| ISS-015 | HIGH      | FIXED  | Transport parity: 13 tools + resource/prompt drifted from the streaming MCP (phantom params, missing params, wrong shapes) |

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

---

## ISS-014: list_testruns Missing Filter Params — Silently Dropped by Agents (HIGH)

**Status:** FIXED (2026-07-17)

**Symptoms:** Jira TDV2-105 reported "filters are ignored and unfiltered data is returned" for list_testruns via STDIO MCP. Live check 2026-07-17 against staging: the gateway applies status/search/tags/sort correctly, but this package's tool schema never declared them, so agents' filter args were dropped client-side and the unfiltered baseline came back — indistinguishable from "filters ignored".

**Root cause:** `src/tools/testruns/list-testruns.ts` inputSchema + handler and `src/lib/endpoints.ts` listTestRuns signature only carried branch/time/author/commit/environment/pagination. The server (gateway stdio route → translateListRunsQuery) already accepts `by_status`, `by_test_case_tags`, `search`, and `sort`.

**Fix:** Declared all four params (enums mirroring the gateway: by_status passed/failed/interrupted/incomplete/running; sort counter_desc/counter_asc/duration_asc/duration_desc), forwarded them in the handler, extended the endpoint builder signature, and updated docs. Also corrected `by_author` description: claimed "case-insensitive, partial match" but proven live to be exact match ("sahip"/"SAHIP" → 0 results, "sahip9211" → 18).

**Files:** `src/tools/testruns/list-testruns.ts`, `src/lib/endpoints.ts`, `docs/TOOLS.md`, `docs/skill.md`
**Tests:** `tests/unit/tools/testruns/list-testruns.test.ts` — "forwards status, tags, search, and sort filters" (regression for the dropped-param path)

---

## ISS-015: Transport Parity — npm Package Drifted From the Streaming MCP (HIGH)

**Status:** FIXED (2026-07-19)

**Symptoms:** A full tool-by-tool audit of this package (`mcpv1.1.0`) against the streaming MCP server (`microservices/services/mcp/node/src/mcp/streaming`) found the tool _inventory_ matched (33 tools) but ~13 tools had schema drift: phantom params the gateway silently drops, real params missing, wrong types/enums, and one wrong shape. The skills resource used a different URI and the `testdino_guide` prompt was absent. Drift misleads AI agents (advertise filters that do nothing / can't pass filters that work).

**Root cause:** Schemas were maintained independently per transport with no lock-step check. Concentrated in analytics, integrations, and releases.

**Fix (aligned npm → streaming, the source of truth):**

- `list_testcase` — removed phantoms `by_spec_file_name`/`by_error_category`/`by_browser_name`/`by_error_message`; added `search`/`by_testsuite_id`/`by_shard`/`sort`; fixed `by_status` enum (7 values) and `by_total_runtime` unit copy (seconds default + `ms`/`s`, TDV2-108) and `by_attempt_number` (0 = no-retry).
- `get_testcase_details` — removed phantom/extra params (`by_error_message`, `by_code_snippet`, `by_status`, `testsuite_id`, `counter`, `include_artifacts/screenshots/traces/videos/attachments`, `limit`, `page`, `sort_by`, `sort_order`, `get_all`); renamed `testcase_fulltitle`→`by_fulltitle`, `testrun_ids`→`by_testrun_ids`.
- `get_run_details` — `counter` now accepts number OR comma-separated string batch.
- `list_testruns` — removed phantom `get_all`.
- `debug_testcase` — added `suite_file_path`.
- `create_release` — added `branch`, `environment`, `buildTarget`, `testers`.
- `update_release` / `update_run_test_case` / `update_manual_test_case` — documented the missing `updates` sub-fields.
- `get_integration_status` / `get_external_issue` — added `target`; `get_external_issue` now takes `issueIds` (array) matching streaming (handler fans out over the single-issue backend and aggregates).
- `create_external_issue` — added `source.runId`/`testRunId`/`caseId`; `idempotencyKey` minLength 1.
- Resource URI aligned to `testdino://skills/guide` (legacy `testdino://docs/skill.md` still served); added the `testdino_guide` prompt + `prompts` capability.

**Files:** `src/lib/endpoints.ts`, `src/index.ts`, all 5 analytics tools, 4 integration tools, `create-release.ts`/`update-release.ts`/`update-manual-test-case.ts`/`update-run-test-case.ts`, `docs/skill.md`, `docs/TOOLS.md`, and matching unit tests + `tests/integration/server.test.ts`.
**Tests:** 154 pass (was 143). New coverage: string `counter`, new list_testcase filters, get_testcase_details renamed/deprecated aliases, `suite_file_path`, create_release build fields, `issueIds` array + multi-issue aggregation, and the `testdino_guide` prompt + resource URI.
**Not verified:** live MCP client run against the real backend (schema/handler-level only); the array-typed `type: ["number","string"]` fields typecheck but were not exercised through actual tool registration.

**Known remaining gap (separate follow-up):** the integration tools (`get_integration_status`, `connect_integration`, `create_external_issue`, `get_external_issue`) have no dedicated section in `docs/skill.md` / `docs/TOOLS.md` — net-new documentation, not schema drift.
