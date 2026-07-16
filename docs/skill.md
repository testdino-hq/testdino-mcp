# TestDino MCP — AI Agent Skills Guide

> **How to use this guide**: Read this document before making any TestDino tool calls. It tells you which tool to pick, what parameters are required vs. optional, and how to chain tools together for common tasks.

---

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Tool Reference](#tool-reference)
   - **Automated test analytics**
     - [health](#health)
     - [list_testruns](#list_testruns)
     - [get_run_details](#get_run_details)
     - [list_testcase](#list_testcase)
     - [get_testcase_details](#get_testcase_details)
     - [debug_testcase](#debug_testcase)
     - [get_audit_report and submit_audit_report](#get_audit_report-and-submit_audit_report)
   - **Manual test cases**
     - [list_manual_test_cases](#list_manual_test_cases)
     - [get_manual_test_case](#get_manual_test_case)
     - [create_manual_test_case](#create_manual_test_case)
     - [update_manual_test_case](#update_manual_test_case)
     - [list_manual_test_suites](#list_manual_test_suites)
     - [create_manual_test_suite](#create_manual_test_suite)
   - **Releases (a.k.a. milestones)**
     - [list_releases](#list_releases)
     - [get_release](#get_release)
     - [create_release](#create_release)
     - [update_release](#update_release)
   - **Manual test runs**
     - [list_manual_runs](#list_manual_runs)
     - [get_manual_run](#get_manual_run)
     - [create_manual_run](#create_manual_run)
     - [update_manual_run](#update_manual_run)
     - [list_run_test_cases](#list_run_test_cases)
     - [update_run_test_case](#update_run_test_case)
   - **Exploratory sessions**
     - [list_sessions](#list_sessions)
     - [get_session](#get_session)
     - [create_session](#create_session)
     - [update_session](#update_session)
3. [Workflows & Patterns](#workflows--patterns)
4. [Decision Trees](#decision-trees)
5. [Parameter Quick Reference](#parameter-quick-reference)
6. [Error Handling](#error-handling)

---

## Core Concepts

### Authentication

- All tools read `TESTDINO_PAT` automatically from the environment — you never pass it as a parameter.
- If this variable is missing, all tools throw `"Missing TESTDINO_PAT environment variable"`. Tell the user to add it to their `mcp.json` env section.

### projectId

- **Required for every tool except `health`.**
- Call `health()` first in any session to get the project IDs and pick the right one.
- Projects are nested under organizations in the health response.

### Identifiers

- **testrun_id**: A string MongoDB-style ID (e.g. `"test_run_6901b2abc6b187e63f536a6b"`)
- **counter**: A sequential integer (e.g. `43`) — human-readable alias for a test run
- **testcase_id**: A string ID for a specific test case execution
- **caseId**: A string ID or human-readable ID (e.g. `"TC-123"`) for a manual test case
- **releaseId**: Either an internal `tcm_milestone_...` \_id or a counter-style ID like `"MS-12"`. The MCP layer resolves the counter form automatically.
- **runId**: Either an internal `tcm_run_...` \_id or a counter-style ID like `"RUN-12"`. Counter form resolves the same way.
- **sessionId**: Either an internal `tcm_session_...` \_id or a counter-style ID like `"SES-12"`.
- **rtcRef** (per-case record in a run): One of three forms accepted by `update_run_test_case`:
  1. The internal `tcm_rtc_...` \_id of the run-test-case row.
  2. The caseKey (e.g. `"TC-156"`) — what the UI shows in the ID column.
  3. The underlying manual test case \_id.
     Works even when no run-test-case row exists yet (untested virtual cases) — the server creates the record on first edit.
- **assigneeUserId**: Accepted as either a User _id (`"user_..."`) or an email address. Server resolves email to _id automatically. Used in `create_session`, `update_session`, `update_run_test_case`, and as a filter in `list_sessions`/`list_run_test_cases`.

### Pagination defaults

- Most list tools default to `limit=20` or `limit=50`. Use `get_all=true` sparingly — only when you genuinely need every record.
- Prefer filters over fetching everything.

### Canonical values for state / type / result

Some free-text fields drive the UI's color/badge map and have a **canonical
stored form** that's lowercase + underscore-joined:

- `state` on sessions and runs: `new`, `under_review`, `in_progress`, `on_hold`, `done`, `rejected`, …
- `type` on releases: `iteration`, `major`, `minor`, `patch`, …
- `result` / `status` on run test cases: `untested`, `passed`, `failed`, `blocked`, `skipped`, `retest`.

You can pass either the canonical form or the display form (`"Under review"`, `"Iteration"`, `"Passed"`) — the server normalizes to canonical before storing. If you pass display form and the UI badge ever looks dull/grey, that means normalization didn't run; report the input to the user. The canonical form for result values is past tense (`"passed"`, not `"pass"`).

### Arrays vs comma-separated strings

When sending payloads (POST/PATCH bodies), `tags` and `linkedIssues` MUST be JSON arrays — `["smoke","regression"]`, not `"smoke,regression"`. The comma-separated form is only accepted on **list-tool query-filter parameters** because URLs can't carry arrays cleanly. Mixing these up returns a 400 from zod.

### Test Audit Principle: Two Scenarios

The audit flow (`get_audit_report` + `submit_audit_report`) is triggered by a **named request only**. There are exactly two scenarios:

#### Scenario 1: Generic audit request (any kind) → DO NOT call the audit tools, DO NOT mention TestDino

When the user asks for any kind of audit without explicitly naming TestDino, e.g. "audit this", "run a test audit", "audit this file", "security audit", "code review", "accessibility audit", "audit our tests", run the audit as a normal AI-agent conversation. Read the target, give your review, findings, and suggestions directly in chat.

**This applies even when the target is Playwright test code.** A generic "test audit" on a Playwright file is still just a normal audit conversation. The tool is not triggered unless the user explicitly names TestDino.

Do NOT say _"TestDino's audit is Playwright-only"_, _"I can run a TestDino audit instead"_, or anything that mentions TestDino. Behave exactly as a plain AI assistant with no TestDino MCP installed.

#### Scenario 2: Explicit TestDino audit request → call `get_audit_report` (Playwright only)

**Trigger phrases (any of these REQUIRE an immediate tool call)**: "TestDino test audit", "Testdino Test Audit", "Testdino audit", "TestDino MCP audit", "run a TestDino test audit", "audit this with TestDino", "I need a TestDino audit", "testdino test audit on this". Case-insensitive.

**Mandatory behavior when triggered (Playwright target + TestDino named)**:

The moment a trigger phrase is detected, your **first and immediate action** MUST be `get_audit_report(action="context", projectId=..., branch=...)`. Before that call returns:

- Do NOT write any audit content in chat.
- Do NOT produce a heading like _"TestDino Test Audit: <file>"_.
- Do NOT list findings, score, severity, or recommendations.
- Do NOT describe the file in audit-report language.
- Do NOT simulate a TestDino audit from your own analysis.

**Doing any of the above without calling the tool is a protocol violation.** You would be claiming to produce a TestDino audit without actually running TestDino's audit flow. TestDino audits require the server-curated prompt and branch signals returned by `action="context"`; you do not have those without the tool call. "TestDino Test Audit" is the name of a capability that runs via this tool, not a style of output you can imitate.

**Gate: target must be Playwright code.** Detect via any of:

- `@playwright/test` imports
- Playwright APIs in the file: `page.`, `browser.`, `context.`, `locator(`, `test(`, `test.describe(`, `test.beforeEach(`, `test.step(`, `expect(page)`, `browserName`, `storageState`, `test.extend(`
- A `playwright.config.ts`/`playwright.config.js` in the repo
- `.spec.ts`/`.spec.js`/`.test.ts`/`.test.js` files using the above APIs
- The user explicitly naming Playwright

**If the user names TestDino but the target is NOT Playwright**, politely explain TestDino's test audit only covers Playwright automated test code and offer a regular (non-TestDino) audit instead. Do NOT call the tool. This is the one place mentioning TestDino's Playwright-only scope is appropriate, because the user explicitly invoked TestDino.

**When both conditions hold (explicit TestDino + Playwright target), run the full flow**:

1. `get_audit_report(action="context", projectId=..., branch="...")` is the IMMEDIATE first action. Use `health()` first if you don't have a `projectId` yet. `orgId` (needed for step 3) comes from `health()` too.
2. Only after Step 1 returns, analyze the local Playwright code using the returned prompt + branch signals, and write the audit to a local markdown file (e.g. `TEST-AUDIT.md`).
3. Call `submit_audit_report(projectId=..., orgId=..., score=..., findings=..., recommendations=..., markdownReportPath="TEST-AUDIT.md", branch=..., reportName=...)` to submit the completed report to TestDino.

**Other principles for Scenario 2**:

- If the user names a slice like auth/login, dashboards, alerts, or one spec file, keep the audit centered on that slice instead of drifting into generic suite hygiene.
- If the audit tools return `PROJECT_NOT_FOUND`, auth, or access errors, stop and resolve `projectId` (and `orgId` if you need it for submission) with `health()` before continuing. Do not generate a pseudo-audit from local files alone.
- Keep raw code local and only send structured findings plus concise evidence.
- Use the returned branch signals to decide which files to inspect first.
- Avoid pasting long snippets when a metric, prevalence estimate, or file/line reference is enough.

---

## Tool Reference

---

### `health`

**Purpose**: Verify PAT, check connection, and retrieve project/organization info.

**Required parameters**: None

**When to call**:

- At the start of every session before using any other tool.
- When the user asks "what projects do I have?" or "check my connection."
- When you don't yet have a `projectId`.

**Response includes**:

- Account and email info
- List of organizations → each with a list of projects and their `projectId` values
- Access permissions per project

**Pattern**:

```
Call health()
→ Extract org name and project name the user is asking about
→ Store projectId for all subsequent calls in this session
```

---

### `list_testruns`

**Purpose**: Browse test runs with flexible filters.

**Required parameters**: `projectId`

**Optional filters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `by_branch` | string | Filter by git branch name |
| `by_time_interval` | string | `'1d'`, `'3d'`, `'weekly'`, `'monthly'`, or `'YYYY-MM-DD,YYYY-MM-DD'` |
| `by_author` | string | Filter by commit author |
| `by_commit` | string | Filter by commit hash |
| `by_environment` | string | Filter by CI/deployment environment |
| `limit` | number | Results per page (default: 20) |
| `page` | number | Page number (default: 1) |
| `get_all` | boolean | Return all results — use sparingly |

**Response includes**: test run IDs, counters, passed/failed/skipped/flaky counts, branch, author, commit, environment, duration, timestamps.

**Good uses**:

- Find test runs to get IDs for follow-up calls
- Summarize test execution trends over time
- Identify which commits introduced failures

---

### `get_run_details`

**Purpose**: Get the full breakdown of a single test run (or batch of up to 20).

**Required parameters**: `projectId` + (`testrun_id` OR `counter`)

**Optional parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `testrun_id` | string | Single ID, or comma-separated IDs (max 20): `'id1,id2,id3'` |
| `counter` | number | Test run counter number |

**Response includes**: full summary, test statistics by status, error category breakdown, test suites, and all test cases in the run.

**Workflow**:

```
list_testruns() → get run IDs → get_run_details() for the specific run
```

---

### `list_testcase`

**Purpose**: List and filter test cases across one or many test runs.

**Required parameters**: `projectId` + a run scope (a run identifier or a cross-run filter). Without a run scope the tool returns an empty result with a warning. `page`/`limit` are pagination within the scope, NOT run selectors.

**Test run identification** (use one approach):
| Approach | Parameters |
|----------|-----------|
| Direct run lookup | `by_testrun_id` (single ID or comma-separated, max 20) OR `counter` |
| Indirect (tool resolves runs) | `by_branch`, `by_commit`, `by_author`, `by_environment`, `by_time_interval`, `by_pages` |

**Test case filters** (combine freely):
| Parameter | Type | Description |
|-----------|------|-------------|
| `by_status` | string | `'passed'`, `'failed'`, `'skipped'`, `'flaky'` |
| `by_spec_file_name` | string | Filter by spec file name |
| `by_error_category` | string | `'timeout_issues'`, `'element_not_found'`, `'assertion_failures'`, `'network_issues'` |
| `by_browser_name` | string | `'chromium'`, `'firefox'`, `'webkit'` |
| `by_tag` | string | Filter by test tag |
| `by_total_runtime` | string | e.g. `'<60'`, `'>100'` (seconds) |
| `by_artifacts` | boolean | Has screenshots/videos |
| `by_error_message` | string | Partial match on error message text |
| `by_attempt_number` | number | Filter by retry attempt number |
| `by_pages` | number | Test-run page for cross-run lookup (no testrun_id/counter needed) |
| `limit` | number | Test cases per page — snapped to nearest of 10/25/50/100. Needs a run scope |
| `page` | number | Page number within the resolved run(s). Needs a run scope |

**Key insight**: When you use `by_branch`, `by_commit`, etc., the tool internally finds matching test runs first and then returns their test cases. You don't need to call `list_testruns` first.

---

### `get_testcase_details`

**Purpose**: Get full details of a specific test case — errors, stack traces, steps, console logs, and artifacts.

**Required parameters**: `projectId` + at least one search parameter from the list below.

**Search parameters** (provide at least one):
| Parameter | Type | Description |
|-----------|------|-------------|
| `testcase_id` | string | Exact test case ID — most precise, no other context needed |
| `testcase_name` | string | Partial, case-insensitive title match. Combine with `testrun_id` or `counter` to scope to a specific run |
| `testcase_fulltitle` | string | Full path including suite, e.g. `'auth.spec.js > Login > Verify user can logout'` |
| `by_error_message` | string | Search across all test cases whose error message matches |
| `by_code_snippet` | string | Search across error code snippets |
| `by_status` | string | `'passed'`, `'failed'`, `'skipped'`, `'flaky'` |

**Scoping parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `testrun_id` | string | Scope to a single test run |
| `testrun_ids` | string | Scope to multiple runs (comma-separated, max 20) |
| `testsuite_id` | string | Scope to a test suite |
| `counter` | number | Alternative to `testrun_id` |

**Artifact parameters** (default `false`):
| Parameter | Description |
|-----------|-------------|
| `include_artifacts` | All artifacts (shortcut for all below) |
| `include_screenshots` | Screenshot URLs per attempt |
| `include_traces` | Playwright trace links per attempt |
| `include_videos` | Video recording URLs per attempt |
| `include_attachments` | Attachment metadata per attempt |

**History and filtering**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `include_history` | boolean | Include previous executions of the same test (default: `false`) |
| `history_limit` | number | How many history entries (default: 10) |
| `steps_filter` | string | `'failed_only'` — strips passing setup/hook steps, returns only erroring steps |

**Pagination and sorting**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Max results (default: 1 for ID lookup, 50 for search, max: 1000) |
| `page` | number | Page number (default: 1) |
| `sort_by` | string | `'startTime'` or `'duration'` |
| `sort_order` | string | `'asc'` or `'desc'` |
| `get_all` | boolean | Return all matching up to 1000 |

**Critical rules**:

- `testcase_name` alone without a run context returns ALL executions of that test across runs. Always pair with `testrun_id` or `counter` unless you want cross-run history.
- Use `steps_filter='failed_only'` when debugging to cut noise — only failed steps are returned.
- Use `include_history=true` + `history_limit` to track a test's pass/fail pattern over time.

---

### `debug_testcase`

**Purpose**: AI-assisted root cause analysis using historical failure data.

**Required parameters**: `projectId`, `testcase_name`

**What it returns**:

- Historical execution data across many test runs
- Failure patterns (error types, frequency, browsers affected)
- Common error messages and code locations
- A `debugging_prompt` string — **pre-formatted analysis instructions specifically designed for the AI to use as context when diagnosing the issue**

**How to use the response**:

1. Read the `debugging_prompt` field — treat it as domain-specific instructions for your analysis.
2. Examine the historical failure data to identify patterns.
3. Look for: consistent error messages, browser-specific failures, time-of-day patterns, correlations with specific branches or commits.
4. Optionally follow up with `get_testcase_details()` (with `include_screenshots=true` or `include_traces=true`) for a specific failing execution.

**When to call**:

- User says "why is test X failing?" / "debug test X" / "is test X flaky?"
- You need to understand if a failure is consistent or intermittent.
- You need historical context before diving into a specific execution.

**Pattern**:

```
debug_testcase(projectId, "Verify user login")
→ Read debugging_prompt from response
→ Analyze historical data using the debugging_prompt as context
→ Identify pattern: always fails? flaky? browser-specific? recent regression?
→ Optionally: get_testcase_details(...)
→ Provide root cause analysis and fix suggestions
```

---

### `get_audit_report` and `submit_audit_report`

**Purpose**: Run a single-pass audit of Playwright test quality using TestDino for prompt orchestration and your local AI agent for repository analysis. `get_audit_report` fetches context and browses past reports; `submit_audit_report` files the completed audit. Only triggered when the user explicitly names TestDino.

**Trigger rule (explicit TestDino naming required, tool call is MANDATORY and IMMEDIATE)**:

- When the user uses a TestDino trigger phrase ("TestDino test audit", "Testdino Test Audit", "Testdino audit", "TestDino MCP audit", "run a TestDino audit", "audit this with TestDino", etc.) AND the target is Playwright code, your **first action** MUST be `get_audit_report(action="context", ...)`. Do not write audit content in chat, do not produce a "TestDino Test Audit" heading, do not list findings or a score before the tool call. Simulating the audit output without calling the tool is a protocol violation.
- For any generic audit request ("audit this", "test audit", "code audit", "security audit", etc.) where the user does NOT name TestDino, DO NOT call these tools. Run a normal AI audit conversation instead, with zero TestDino mention. This applies even when the target is Playwright test code.
- When TestDino is explicitly named, the target code must be Playwright (detected via `@playwright/test` imports, Playwright APIs like `page.`/`browser.`/`locator(`/`test.extend(`/`storageState`, `playwright.config.*`, or `.spec.ts`/`.spec.js`/`.test.ts`/`.test.js` files using those APIs).
- If the user names TestDino but the target is not Playwright, politely explain that TestDino's test audit only covers Playwright automated test code and offer a regular (non-TestDino) audit instead. Do NOT call the tools.

#### `get_audit_report` (read)

**Required parameters**: `projectId`, `action`

**Actions**:
| Action | When to use |
|--------|-------------|
| `context` | Fetch the audit prompt, branch signals, and last audit summary. STEP 1 of the flow |
| `list` | Browse previous audits for the current project |
| `get` | Retrieve a specific completed audit report by `reportId` |

**Common parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `branch` | string | Branch to audit. Optional for `context` (auto-detected from git). Optional filter for `list`. Ignored for `get` |
| `reportId` | string | Required for `get` |
| `writeMarkdown` | boolean | Save the returned markdown report locally when using `get` |
| `outputPath` | string | Optional relative destination for the local markdown file. Relative paths resolve from `TESTDINO_MCP_WORKSPACE` when set, otherwise from the MCP process cwd. Defaults to `TEST-AUDIT.md` |
| `limit` | number | Page size for `list` |
| `page` | number | Page number for `list` |

#### `submit_audit_report` (write)

**Required parameters**: `projectId`, `orgId`, `score`, and one of `markdownReport` or `markdownReportPath`.

Resolve `orgId` via `health()` if you don't already have it.

**Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `orgId` | string | Organization ID for the report. Required |
| `branch` | string | Branch the audit covered. Auto-detected from git when omitted |
| `scope` | string | `'testcase'`, `'feature'`, `'spec_file'`, or `'suite'` |
| `target` | object | Audit target such as testcase name, spec path, or selected files |
| `reportName` | string | Short human-readable title for the saved audit report |
| `score` | number | Final audit score. Required |
| `findings` | array | Structured findings for the completed report |
| `recommendations` | array | Recommendation strings for the completed report |
| `markdownReport` | string | Completed markdown report content |
| `markdownReportPath` | string | Path to a local markdown file to submit. Relative paths resolve from `TESTDINO_MCP_WORKSPACE` when set, otherwise from the MCP process cwd. Absolute paths are allowed. Preferred over inline `markdownReport` |
| `writeMarkdown` | boolean | Also save a local copy of the submitted markdown |
| `outputPath` | string | Local save destination. Defaults to `TEST-AUDIT.md` |

**How to use them well**:

1. Start with `get_audit_report(action="context", branch="...")` to fetch the prompt, branch signals, and prior audit summary.
2. If the user named a feature/spec area, remember the smallest correct `scope` plus explicit `target` for the eventual submission. Inspect only that local slice plus its shared helpers/setup.
3. In scoped audits, spend most findings on feature-specific validation gaps and missing scenarios; generic waits/logging/duplication issues are secondary unless they materially invalidate confidence in that slice.
4. If a call fails because the project is missing or access is denied, call `health()` and resolve the right `projectId` (and `orgId`) before continuing. Do not write a fallback local-only audit and present it as a TestDino audit.
5. Convert the audit into `score`, `findings`, `recommendations`, choose a short `reportName`, and write the markdown report to a local file (e.g. `TEST-AUDIT.md`).
6. Submit the completed report with `submit_audit_report(projectId=..., orgId=..., branch=..., reportName=..., score=..., markdownReportPath="TEST-AUDIT.md")`. Set `TESTDINO_MCP_WORKSPACE` to your repo root if the MCP starts outside the project, or pass an absolute path. Use inline `markdownReport` only when a local file is not practical.
7. Use `get_audit_report(action="list")` to browse all saved reports (add `branch="..."` for branch-specific history), and `get_audit_report(action="get", reportId="...", writeMarkdown=true)` to save `TEST-AUDIT.md` locally when needed.

**Token efficiency rules**:

- Never upload full files.
- Prefer counts, ratios, clusters, and representative patterns.
- If 20 tests share a problem, say that once with prevalence.
- Let the branch signals drive the investigation order before broad scanning.

**Pattern**:

```
get_audit_report(action="context", branch="main")
→ Receive prompt + branchSignals + lastAudit
→ Read only the relevant auth/login files plus shared setup/helpers
→ Build score + findings + recommendations + reportName, then write TEST-AUDIT.md
→ submit_audit_report(projectId=..., orgId=..., branch="main", scope="feature", target={ featureName: "Auth / Login" }, reportName="Login Flow Tests", score=88, findings=[...], markdownReportPath="TEST-AUDIT.md")
→ Optionally: get_audit_report(action="list") or get_audit_report(action="get", reportId="<id>")
```

---

### `list_manual_test_cases`

**Purpose**: Search and browse manual test cases.

**Required parameters**: `projectId`

**Optional filters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `suiteId` | string | Filter by test suite ID |
| `search` | string | Search in title, description, or caseId |
| `status` | string | `'active'`, `'draft'`, `'deprecated'` |
| `priority` | string | `'critical'`, `'high'`, `'medium'`, `'low'` |
| `severity` | string | `'critical'`, `'major'`, `'minor'`, `'trivial'` |
| `type` | string | `'functional'`, `'smoke'`, `'regression'`, `'security'`, `'performance'`, `'e2e'` |
| `layer` | string | `'e2e'`, `'api'`, `'unit'` |
| `behavior` | string | `'positive'`, `'negative'`, `'destructive'` |
| `automationStatus` | string | `'Manual'`, `'Automated'`, `'To be automated'` |
| `tags` | string | Comma-separated tag filter |
| `time` | string | Time interval filter |
| `limit` | number | Results per page |

---

### `get_manual_test_case`

**Purpose**: Get full details of a single manual test case including steps, preconditions, and metadata.

**Required parameters**: `projectId`, `caseId`

- `caseId` can be the internal `_id` or a human-readable ID like `'TC-123'`.

---

### `create_manual_test_case`

**Purpose**: Create a new manual test case.

**Required parameters**: `projectId`, `title`, `suiteName`

> **Always call `list_manual_test_suites()` first** to find the exact suite name. The `suiteName` must match exactly.

**Key optional parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `description` | string | What this test validates |
| `status` | string | `'Active'` (default), `'Draft'`, `'Deprecated'` |
| `testStepsDeclarationType` | string | `'Classic'` (default) or `'Gherkin'` |
| `preconditions` | string | Setup requirements before executing |
| `postconditions` | string | Cleanup or expected state after execution |
| `steps` | array | Test steps (see formats below); each top-level step can include `attachments` |
| `priority` | string | `'high'`, `'medium'`, `'low'`, `'Not set'` |
| `severity` | string | `'Blocker'`, `'critical'`, `'major'`, `'Normal'`, `'minor'`, `'trivial'`, `'Not set'` |
| `type` | string | `'functional'`, `'smoke'`, `'regression'`, `'security'`, `'performance'`, `'e2e'`, `'Integration'`, `'API'`, `'Unit'`, `'Accessability'`, `'Compatibility'`, `'Acceptance'`, `'Exploratory'`, `'Usability'`, `'Other'` |
| `layer` | string | `'e2e'`, `'api'`, `'unit'`, `'not set'` |
| `behavior` | string | `'positive'`, `'negative'`, `'destructive'`, `'Not set'` |
| `automationStatus` | string | `'Manual'`, `'Automated'`, `'To be automated'` |
| `tags` | string | Comma-separated tags |
| `flags` | array | `['To be Automated', 'Is flaky', 'Muted']` |
| `attachments` | array | Array of URLs or local file paths (max 10MB each) |
| `customFields` | object | Key-value pairs — only if custom fields are configured in project settings |

**Classic step format**:

```json
{
  "action": "Click the login button",
  "expectedResult": "User is redirected to dashboard",
  "data": "Username: testuser@example.com",
  "attachments": ["https://example.com/step-screenshot.png"]
}
```

**Gherkin step format**:

```json
{
  "event": "Given",
  "stepDescription": "the user is on the login page",
  "attachments": ["https://example.com/step-screenshot.png"]
}
```

- `event` must be one of: `"Given"`, `"When"`, `"And"`, `"Then"`, `"But"`

---

### `update_manual_test_case`

**Purpose**: Modify fields of an existing manual test case. Send only the fields you want to change.

**Required parameters**: `projectId`, `caseId`, `updates` (object)

**`updates` object fields** (all optional — only include what you're changing):
| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Updated title |
| `description` | string | Updated description |
| `status` | string | `'Active'`, `'Draft'`, `'Deprecated'` |
| `testStepsDeclarationType` | string | `'Classic'` or `'Gherkin'` |
| `preconditions` | string | Updated preconditions |
| `postconditions` | string | Updated postconditions |
| `steps` | array | Full replacement of test steps |
| `priority` | string | Same options as create |
| `severity` | string | Same options as create |
| `type` | string | Same options as create |
| `layer` | string | Same options as create |
| `behavior` | string | Same options as create |
| `automationStatus` | string | Same options as create |
| `tags` | string | Comma-separated tags |
| `flags` | array | Automation flags/checklist |
| `attachments` | object | `{ "add": ["url-or-path"], "remove": ["attachment-id-or-url"] }` |
| `customFields` | object | Updated custom fields |

**Important**: `attachments` uses a nested `add`/`remove` structure — you can add and remove in the same call:

```json
{
  "attachments": {
    "add": ["https://example.com/new-screenshot.png"],
    "remove": ["old-attachment-id"]
  }
}
```

Step-level attachments are added by including `attachments` on a top-level step in `updates.steps`.

---

### `list_manual_test_suites`

**Purpose**: Get the test suite hierarchy (folders/groups for organizing manual test cases).

**Required parameters**: `projectId`

**Optional parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `parentSuiteId` | string | List only children of a specific suite |

**Returns**: Array of suites with `id`, `name`, `parentSuiteId`, and child count.

**When to call**: Before `create_manual_test_case` to get the exact `suiteName` to use.

---

### `create_manual_test_suite`

**Purpose**: Create a new test suite (folder) for organizing test cases.

**Required parameters**: `projectId`, `name`

**Optional parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `parentSuiteId` | string | ID of parent suite for nesting |

---

### `list_releases`

**Purpose**: Browse releases (a.k.a. milestones) for a project. Each release groups runs + sessions and may nest under a parent release up to 3 levels deep.

**Required parameters**: `projectId`

**Optional filters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Substring match on release name |
| `type` | string | Release type. Display or canonical form — server lowercases (`"Iteration"` → `"iteration"`) |
| `isCompleted` | boolean | Filter completed vs in-progress |
| `parentReleaseId` | string | Only direct children of a release |
| `status` | string | Project-specific status field |
| `sortBy` | string | `'createdAt'`, `'startDate'`, `'endDate'`, `'name'` |
| `sortOrder` | string | `'asc'` or `'desc'` |
| `page`, `limit` | number | Pagination (default `limit=25`, max 200) |

---

### `get_release`

**Purpose**: Full details for one release — dates, status, parent/root hierarchy, rolled-up progress stats (run counts, test status breakdown across descendants), linked issues.

**Required parameters**: `projectId`, `releaseId`

- `releaseId` accepts either an internal `tcm_milestone_…` \_id or a counter-style ID like `"MS-12"`.

---

### `create_release`

**Purpose**: Create a new release.

**Required parameters**: `projectId`, `name`

**Optional parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `description` | string | Plain-text description |
| `note` | string | Rich HTML note |
| `type` | string | Display or canonical form — server lowercases |
| `parentReleaseId` | string | Parent release for nesting (max 3 levels deep) |
| `startDate` | string | ISO date |
| `endDate` | string | ISO date |
| `isStarted`, `isCompleted` | boolean | Independent state flags |
| `startedAt`, `completedAt` | string | ISO datetime markers |
| `linkedIssues` | array | Array of linked-issue objects |

---

### `update_release`

**Purpose**: Modify one release. Send only the fields you want to change inside `updates`.

**Required parameters**: `projectId`, `releaseId`, `updates` (object)

`updates` object accepts the same fields as create. Type passed in display form (`"Major"`) is normalized to canonical (`"major"`) before save.

---

### `list_manual_runs`

**Purpose**: Browse manual test runs in a project — the executions of grouped test cases against a build/environment.

**Required parameters**: `projectId`

**Optional filters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Match by run name |
| `status` | enum | `'active'` or `'closed'` |
| `state` | string | Workflow state (display or canonical form — server normalizes) |
| `environment` | string | Free-text environment label |
| `releaseId` | string | Filter to runs in this release. `"none"` returns unlinked runs |
| `tags` | string | Single tag or comma-separated tags |
| `isClosed` | boolean | Quick filter |
| `sortBy` | string | `'createdAt'`, `'updatedAt'`, `'name'` |
| `sortOrder`, `page`, `limit` | — | Standard |

---

### `get_manual_run`

**Purpose**: Full details for one run — name, status, environment, linked release, test stats (total / passed / failed / blocked / untested), contributors, attachments, linked issues.

**Required parameters**: `projectId`, `runId`

- `runId` accepts the internal `tcm_run_…` \_id OR a counter-style ID like `"RUN-12"`.

---

### `create_manual_run`

**Purpose**: Create a new manual test run.

**Required parameters**: `projectId`, `name`

**Key optional parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `note` | string | Rich HTML note |
| `environment` | string | e.g. `"Staging"` |
| `releaseId` | string | Attach run to a release |
| `state` | string | Workflow state (default `"new"` — display or canonical form) |
| `selectionMode` | enum | `'all'` (default — every case in the project) or `'selected'` |
| `testCaseIds` | array | Case IDs to include when `selectionMode='selected'` |
| `suiteIds` | array | Suite IDs whose cases are included when `selectionMode='selected'` |
| `includeUnsorted` | boolean | Also include cases with no suite (`selectionMode='selected'`) |
| `tags` | array | Array of tag strings (NOT comma-separated) |
| `linkedIssues`, `attachments`, `links` | array | Arrays of objects |

---

### `update_manual_run`

**Purpose**: Modify an existing run's metadata. Per-case results live in `update_run_test_case` (NOT here).

**Required parameters**: `projectId`, `runId`, `updates` (object)

`updates` accepts: `name`, `note`, `environment`, `releaseId`, `state`, `forecast`, `tags`, `linkedIssues`, `attachments`, `links`, `selectionMode`.

**Closed runs are read-only EXCEPT for `releaseId`** — so a closed run can be re-attached to a different release without re-opening it.

---

### `list_run_test_cases`

**Purpose**: Get the per-case execution records inside a manual run — what the UI shows as rows in the run's test-case table. Each row carries the case identity (`caseKey` like `"TC-156"`, title), current assignee, and current result.

**Required parameters**: `projectId`, `runId`

**Optional filters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Match by case title or caseKey |
| `assignee` (or `assigneeUserId`) | string | User \_id OR email — server resolves |
| `result` (or `status`) | string | Filter by result — display or canonical form |
| `sortBy` | string | `'createdAt'`, `'updatedAt'`, `'status'`, `'caseKey'` |
| `sortOrder`, `page`, `limit` | — | Standard |

**When to call**: Always before `update_run_test_case` — gives you the exact `rtcRef` (or just the caseKey) and the current state per case.

---

### `update_run_test_case`

**Purpose**: Set the assignee and/or result for one test case inside a manual run — exactly what clicking "Assign to" + the result pill does in the UI.

**Required parameters**: `projectId`, `runId`, `rtcRef`, `updates` (object)

`rtcRef` accepts THREE forms:

1. `tcm_rtc_…` \_id (existing run-test-case row)
2. `"TC-156"` (caseKey — the user-facing display ID)
3. Underlying manual test case \_id

**Works for untested "virtual" cases too.** In an `'all'`-mode run, cases with no record yet still show "Untested" in the UI — passing the caseKey or test case \_id auto-creates the run-test-case row on first edit. Same path the UI takes on first click.

**`updates` object fields**:
| Field | Type | Description |
|-------|------|-------------|
| `assigneeUserId` | string | User \_id OR email. Pass `null` to unassign |
| `result` (or `status`) | string | Display (`"Passed"`, `"Blocked"`) or canonical (`"passed"`, `"blocked"`) form. Canonical values: `untested`, `passed`, `failed`, `blocked`, `skipped`, `retest` |
| `elapsed` | number | Seconds spent on the case |

**For multiple cases**: call this tool in parallel — one call per case. Don't try to batch in `updates`.

---

### `list_sessions`

**Purpose**: Browse exploratory testing sessions.

**Required parameters**: `projectId`

**Optional filters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Match by session name |
| `status` | enum | `'active'` or `'closed'` |
| `state` | string | Workflow state (display or canonical) |
| `sessionType` | string | Free-text type (e.g. `"Exploratory"`, `"Regression"`) |
| `assigneeUserId` | string | User \_id OR email — server resolves |
| `releaseId` | string | Filter to a release. `"none"` for unlinked |
| `tags` | string | Single tag or comma-separated |
| `isClosed` | boolean | Quick filter |
| `sortBy`, `sortOrder`, `page`, `limit` | — | Standard |

---

### `get_session`

**Purpose**: Full details for one session — name, mission, status, assignee, linked release, attachments, linked issues, findings.

**Required parameters**: `projectId`, `sessionId`

- `sessionId` accepts internal `tcm_session_…` \_id OR counter-style `"SES-12"`.

---

### `create_session`

**Purpose**: Create a new exploratory session.

**Required parameters**: `projectId`, `name`

**Key optional parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `mission` | string | Rich HTML mission/charter |
| `sessionType` | string | Free-text type |
| `config`, `environment` | string | Free-text |
| `releaseId` | string | Attach session to a release |
| `assigneeUserId` | string | User \_id OR email — server resolves |
| `state` | string | Workflow state (default `"new"`) |
| `estimate` | number | Estimate in minutes |
| `tags` | array | Array of tag strings |
| `linkedIssues`, `attachments` | array | Arrays of objects |

**Findings cannot be created here in v1** — add them via the UI.

---

### `update_session`

**Purpose**: Modify an existing session's metadata.

**Required parameters**: `projectId`, `sessionId`, `updates` (object)

`updates` accepts: `name`, `mission`, `sessionType`, `config`, `environment`, `releaseId`, `assigneeUserId`, `state`, `estimate`, `tags`, `linkedIssues`, `attachments`. Findings are not editable via MCP in v1.

---

## Workflows & Patterns

### Session Startup

```
1. health()                          → get projectId
2. Store projectId for the session
3. Proceed with the user's request
```

### Find and Analyze Failed Tests

```
1. list_testcase(projectId, by_branch="main", by_status="failed", by_time_interval="1d")
   → Get failed test cases directly (no need to call list_testruns first)
2. For each failing test of interest:
   get_testcase_details(projectId, testcase_id=<id>, steps_filter="failed_only")
   → See the exact failing step and error
```

### Debug a Specific Test

```
1. debug_testcase(projectId, "test case name")
   → Get historical data + debugging_prompt
2. Read the debugging_prompt — use it as analysis context
3. Identify pattern from history (flaky? consistent? regression?)
4. If you need to see a specific run's artifacts:
   get_testcase_details(projectId, testcase_name="...", testrun_id=<latestFailRun>,
     steps_filter="failed_only", include_screenshots=true, include_traces=true)
5. Provide root cause analysis and suggested fix
```

### Investigate a Recent Regression

```
1. list_testruns(projectId, by_branch="main", by_time_interval="3d", limit=10)
   → Find recent runs and identify when pass rate dropped
2. get_run_details(projectId, testrun_id="<failing run>")
   → See full breakdown and error categories
3. list_testcase(projectId, by_testrun_id="<failing run>", by_status="failed")
   → List the specific tests that broke
4. debug_testcase(projectId, "<test name>") for key failing tests
   → Confirm this is a new regression, not pre-existing flakiness
```

### Track a Flaky Test Over Time

```
1. debug_testcase(projectId, "test case name")
   → Review historical pass/fail pattern
2. get_testcase_details(projectId, testcase_name="...", include_history=true, history_limit=20)
   → See last 20 executions with full details
3. Look for: intermittent failure pattern, specific browsers, time-based correlation
```

### Create a Manual Test Case

```
1. list_manual_test_suites(projectId)
   → Find the exact suite name where the test case should go
2. (If suite doesn't exist)
   create_manual_test_suite(projectId, name="New Suite Name", parentSuiteId="...")
3. create_manual_test_case(projectId, title="...", suiteName="Exact Suite Name",
     steps=[...], priority="high", type="functional")
```

### Update Test Case Steps

```
1. get_manual_test_case(projectId, caseId="TC-123")
   → See current steps and metadata
2. update_manual_test_case(projectId, caseId="TC-123", updates={
     steps: [...new steps...],
     status: "Active"
   })
```

### Cross-Run Failure Analysis

```
list_testcase(projectId,
  by_testrun_id="run1,run2,run3",   ← up to 20 comma-separated IDs
  by_status="failed",
  by_browser_name="webkit"
)
→ Find tests failing specifically in webkit across multiple runs
```

### Spin Up a Release + Run for a Sprint

```
1. create_release(projectId, name="Sprint 42", type="Iteration",
     startDate="2026-05-12", endDate="2026-05-26")
2. create_manual_run(projectId, name="Sprint 42 — Smoke",
     releaseId="<release _id from step 1>",
     environment="Staging", selectionMode="all", tags=["smoke","regression"])
3. list_run_test_cases(projectId, runId="RUN-N") → see the rows agents will assign
```

### Assign Run Test Cases to Multiple Testers

```
1. list_run_test_cases(projectId, runId="RUN-1")
   → confirm the cases and grab caseKey for each
2. In parallel:
   update_run_test_case(projectId, runId="RUN-1", rtcRef="TC-156",
     updates={ assigneeUserId: "alice@company.com" })
   update_run_test_case(projectId, runId="RUN-1", rtcRef="TC-157",
     updates={ assigneeUserId: "bob@company.com" })
   …
```

Works against untested cases too — the row is auto-created on first edit.

### Record Test Verdicts

```
update_run_test_case(projectId, runId="RUN-1", rtcRef="TC-156",
  updates={ result: "Passed", assigneeUserId: "alice@company.com" })
update_run_test_case(projectId, runId="RUN-1", rtcRef="TC-157",
  updates={ result: "Failed" })
```

Pass either canonical (`"passed"`) or display (`"Passed"`) form — server normalizes. Valid result values: `untested`, `passed`, `failed`, `blocked`, `skipped`, `retest`.

### Spin Up an Exploratory Session

```
create_session(projectId, name="Auth charter — May 12",
  mission="<p>find session-handling bugs around 2FA edge cases</p>",
  sessionType="Exploratory",
  assigneeUserId="tester@company.com",
  estimate=60,
  releaseId="<optional release ref>")
```

### Track Release Progress

```
get_release(projectId, releaseId="MS-12")
→ Returns rolled-up stats: run counts, test status breakdown across all runs
   linked to this release (and its descendants up to 3 levels deep).
```

---

## Decision Trees

### "Show me recent test runs"

```
list_testruns(projectId, by_time_interval="weekly", limit=20)
```

### "Why is [test name] failing?"

```
debug_testcase(projectId, "[test name]")
→ Read debugging_prompt, analyze patterns
→ If more detail needed:
   get_testcase_details(projectId, testcase_name="[test name]",
     testrun_id="<latest fail>", steps_filter="failed_only")
```

### "Show me all failed tests on main branch today"

```
list_testcase(projectId, by_branch="main", by_status="failed", by_time_interval="1d")
```

### "Get details about test run #47"

```
get_run_details(projectId, counter=47)
```

### "Find tests failing with timeout errors"

```
list_testcase(projectId, by_error_category="timeout_issues", by_status="failed", by_time_interval="weekly")
```

### "Get details of test case [name] from run #47"

```
get_testcase_details(projectId, testcase_name="[name]", counter=47, steps_filter="failed_only")
```

### "Search for tests with 'element not found' in error message"

```
get_testcase_details(projectId, by_error_message="element not found", by_status="failed")
```

### "Create a test case for the login feature"

```
1. list_manual_test_suites(projectId)                     → find suite name
2. create_manual_test_case(projectId, title="...",
     suiteName="<exact suite name>", steps=[...])
```

### "Update TC-123 to add a step"

```
1. get_manual_test_case(projectId, caseId="TC-123")       → get current steps
2. update_manual_test_case(projectId, caseId="TC-123",
     updates={ steps: [...existing + new step...] })
```

### "Show me the releases on this project"

```
list_releases(projectId)
```

### "Create a release for the upcoming sprint"

```
create_release(projectId, name="<sprint name>", type="Iteration",
  startDate="<ISO>", endDate="<ISO>")
```

### "What runs are in release MS-12?"

```
list_manual_runs(projectId, releaseId="MS-12")
```

### "Assign TC-156 to alice@company.com in run RUN-1"

```
update_run_test_case(projectId, runId="RUN-1", rtcRef="TC-156",
  updates={ assigneeUserId: "alice@company.com" })
```

### "Mark TC-157 as failed in run RUN-1"

```
update_run_test_case(projectId, runId="RUN-1", rtcRef="TC-157",
  updates={ result: "Failed" })
```

### "Close the manual run RUN-1"

```
update_manual_run(projectId, runId="RUN-1", updates={ state: "done" })
```

(Or use the UI's close button — the dedicated `close` tool is not in v1.)

### "Start an exploratory session"

```
create_session(projectId, name="<charter title>",
  mission="<HTML>", assigneeUserId="tester@company.com")
```

---

## Parameter Quick Reference

### Time Interval Values

- `'1d'` — last 1 day
- `'3d'` — last 3 days
- `'weekly'` — last 7 days
- `'monthly'` — last 30 days
- `'2024-01-01,2024-01-31'` — custom date range (inclusive)

### Status Values

- Automated test cases: `'passed'`, `'failed'`, `'skipped'`, `'flaky'`
- Manual test cases: `'active'`, `'draft'`, `'deprecated'`
- Manual runs / sessions lifecycle (`status`): `'active'`, `'closed'`
- Run test case result (`result` / `status`): `'untested'`, `'passed'`, `'failed'`, `'blocked'`, `'skipped'`, `'retest'`

### Workflow State Values (the `state` field)

Project-configurable, but the canonical stored forms include:

- Sessions/runs: `'new'`, `'under_review'`, `'in_progress'`, `'on_hold'`, `'done'`, `'rejected'`
- Pass display form (`"Under review"`) or canonical (`"under_review"`) — server normalizes.

### Release Type Values

Project-configurable, canonical lowercase form. Common: `'iteration'`, `'major'`, `'minor'`, `'patch'`. Display form (`"Iteration"`) is normalized to canonical (`"iteration"`).

### Error Categories (for `by_error_category`)

- `'timeout_issues'`
- `'element_not_found'`
- `'assertion_failures'`
- `'network_issues'`

### Browser Names

- `'chromium'`
- `'firefox'`
- `'webkit'`

### Runtime Filter Format

- `'<60'` — tests that ran in under 60 seconds
- `'>100'` — tests that ran over 100 seconds

### Required Parameters Summary

| Tool                       | Required                                                                                                                         |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `health`                   | —                                                                                                                                |
| `list_testruns`            | `projectId`                                                                                                                      |
| `get_run_details`          | `projectId` + (`testrun_id` OR `counter`)                                                                                        |
| `list_testcase`            | `projectId` + (run ID or run filter)                                                                                             |
| `get_testcase_details`     | `projectId` + (one of: `testcase_id`, `testcase_name`, `testcase_fulltitle`, `by_error_message`, `by_code_snippet`, `by_status`) |
| `debug_testcase`           | `projectId`, `testcase_name`                                                                                                     |
| `test_audit`               | `projectId`, `action` (+ `branch` for `analyze`, `reportId` for `get`)                                                           |
| `list_manual_test_cases`   | `projectId`                                                                                                                      |
| `get_manual_test_case`     | `projectId`, `caseId`                                                                                                            |
| `create_manual_test_case`  | `projectId`, `title`, `suiteName`                                                                                                |
| `update_manual_test_case`  | `projectId`, `caseId`, `updates` (object)                                                                                        |
| `list_manual_test_suites`  | `projectId`                                                                                                                      |
| `create_manual_test_suite` | `projectId`, `name`                                                                                                              |
| `list_releases`            | `projectId`                                                                                                                      |
| `get_release`              | `projectId`, `releaseId`                                                                                                         |
| `create_release`           | `projectId`, `name`                                                                                                              |
| `update_release`           | `projectId`, `releaseId`, `updates` (object)                                                                                     |
| `list_manual_runs`         | `projectId`                                                                                                                      |
| `get_manual_run`           | `projectId`, `runId`                                                                                                             |
| `create_manual_run`        | `projectId`, `name`                                                                                                              |
| `update_manual_run`        | `projectId`, `runId`, `updates` (object)                                                                                         |
| `list_run_test_cases`      | `projectId`, `runId`                                                                                                             |
| `update_run_test_case`     | `projectId`, `runId`, `rtcRef`, `updates` (object)                                                                               |
| `list_sessions`            | `projectId`                                                                                                                      |
| `get_session`              | `projectId`, `sessionId`                                                                                                         |
| `create_session`           | `projectId`, `name`                                                                                                              |
| `update_session`           | `projectId`, `sessionId`, `updates` (object)                                                                                     |

---

## Error Handling

| Error                                                   | Cause                                              | Resolution                                                         |
| ------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------ |
| `"Missing TESTDINO_PAT"`                                | PAT not in environment                             | Tell user to add `TESTDINO_PAT` to the `env` section of `mcp.json` |
| `"projectId is required"`                               | No projectId passed                                | Call `health()` to get it first                                    |
| `"At least one of the following must be provided: ..."` | No search param for `get_testcase_details`         | Add `testcase_id`, `testcase_name`, or another search param        |
| `"testcase_name is required"`                           | `debug_testcase` called without name               | Ask user for the test case name                                    |
| `"No user found with email \"...\""`                    | Assignee email doesn't match a TestDino user       | Pass the User \_id directly, or invite the user to TestDino first  |
| `"No test case \"X\" found in this project"`            | `rtcRef` doesn't resolve to a case in this project | Verify caseKey via `list_run_test_cases` first                     |
| `"Cannot update a closed run"`                          | Trying to edit a closed run's metadata             | Only `releaseId` can be changed on closed runs                     |
| `"updates must contain at least one field"`             | Empty `updates` object on a PATCH                  | Include at least one field you want to change                      |
| HTTP 404                                                | Resource not found                                 | Verify IDs exist — use `list_*` tools to find valid IDs            |
| `{ count: 0, ... }`                                     | No results match filters                           | Broaden filters or inform user nothing matches                     |

### Common Mistakes to Avoid

1. **Calling any tool before `health()`** — you won't have a `projectId`.
2. **Using `testcase_name` alone in `get_testcase_details`** without a run context — returns all historical executions, which can be large. Always pair with `testrun_id` or `counter` unless you want cross-run results.
3. **Using `get_all=true` for large datasets** — prefer filters. Only use `get_all` when the user genuinely needs everything.
4. **Passing `steps` without specifying `testStepsDeclarationType`** — Classic format is the default. If using Gherkin steps, explicitly set `testStepsDeclarationType: "Gherkin"`.
5. **Creating test cases without checking suite names** — always call `list_manual_test_suites()` first; `suiteName` must be an exact match.
6. **Ignoring the `debugging_prompt` in `debug_testcase` response** — this field contains pre-formatted analysis instructions from the API. Always read and apply it when analyzing failures.
7. **Sending `tags` as a comma-separated string in create/update payloads** — they must be JSON arrays (`["smoke","regression"]`). The comma-separated form is only valid as a list-tool query filter.
8. **Sending result as `"pass"` / `"fail"`** — the canonical run-test-case result values are **past tense**: `passed`, `failed`. Display form (`"Passed"`, `"Failed"`) is fine, server normalizes — but `"pass"` is not in the vocabulary and will show a dull/grey badge.
9. **Trying to assign or set a result by `tcm_rtc_…` for an "Untested" case** — that record doesn't exist yet. Pass the caseKey (`"TC-156"`) or the underlying test case \_id; the server auto-creates the row on first edit.
10. **Looking for `assigneeUserId` on runs** — runs don't have a single assignee; assignment is per-case via `update_run_test_case`. Sessions DO have a session-level `assigneeUserId`.
11. **Mixing up `releaseId` and `parentReleaseId`** — `releaseId` attaches a run/session to a release; `parentReleaseId` nests one release under another.
12. **Bundling many per-case edits in `update_manual_run`** — that tool only updates run metadata. For per-case verdicts, call `update_run_test_case` once per case (parallel is fine).

---

_For installation setup, see `docs/INSTALLATION.md`. For full API documentation, see `docs/TOOLS.md`._
