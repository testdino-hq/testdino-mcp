# TestDino MCP — AI Agent Skills Guide

> **How to use this guide**: Read this document before making any TestDino tool calls. It tells you which tool to pick, what parameters are required vs. optional, and how to chain tools together for common tasks.

---

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Tool Reference](#tool-reference)
   - [health](#health)
   - [list_testruns](#list_testruns)
   - [get_run_details](#get_run_details)
   - [list_testcase](#list_testcase)
   - [get_testcase_details](#get_testcase_details)
   - [debug_testcase](#debug_testcase)
   - [list_manual_test_cases](#list_manual_test_cases)
   - [get_manual_test_case](#get_manual_test_case)
   - [create_manual_test_case](#create_manual_test_case)
   - [update_manual_test_case](#update_manual_test_case)
   - [list_manual_test_suites](#list_manual_test_suites)
   - [create_manual_test_suite](#create_manual_test_suite)
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

### Pagination defaults
- Most list tools default to `limit=20` or `limit=50`. Use `get_all=true` sparingly — only when you genuinely need every record.
- Prefer filters over fetching everything.

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

**Required parameters**: `projectId` + at least one test run identifier or test run filter.

**Test run identification** (use one approach):
| Approach | Parameters |
|----------|-----------|
| Direct run lookup | `by_testrun_id` (single ID or comma-separated, max 20) OR `counter` |
| Indirect (tool resolves runs) | `by_branch`, `by_commit`, `by_author`, `by_environment`, `by_time_interval` |

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
| `by_pages` | number | List by page number (no testrun_id/counter needed) |
| `limit` | number | Results per page |
| `page` | number | Page number |
| `get_all` | boolean | All results |

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
→ Optionally: get_testcase_details(projectId, testcase_name, testrun_id=latestFailingRun, steps_filter='failed_only')
→ Provide root cause analysis and fix suggestions
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
| `steps` | array | Test steps (see formats below) |
| `priority` | string | `'high'`, `'medium'`, `'low'`, `'Not set'` |
| `severity` | string | `'Blocker'`, `'critical'`, `'major'`, `'Normal'`, `'minor'`, `'trivial'`, `'Not set'` |
| `type` | string | `'functional'`, `'smoke'`, `'regression'`, `'security'`, `'performance'`, `'e2e'`, `'Integration'`, `'API'`, `'Unit'`, `'Accessability'`, `'Compatibility'`, `'Acceptance'`, `'Exploratory'`, `'Usability'`, `'Other'` |
| `layer` | string | `'e2e'`, `'api'`, `'unit'`, `'not set'` |
| `behavior` | string | `'positive'`, `'negative'`, `'destructive'`, `'Not set'` |
| `automationStatus` | string | `'Manual'`, `'Automated'`, `'To be automated'` |
| `tags` | string | Comma-separated tags |
| `automation` | array | `['To be Automated', 'Is flaky', 'Muted']` |
| `attachments` | array | Array of URLs or local file paths (max 10MB each) |
| `customFields` | object | Key-value pairs — only if custom fields are configured in project settings |

**Classic step format**:
```json
{
  "action": "Click the login button",
  "expectedResult": "User is redirected to dashboard",
  "data": "Username: testuser@example.com",
  "subSteps": [
    {
      "action": "Enter email",
      "expectedResult": "Email field is populated",
      "data": "testuser@example.com",
      "images": [
        { "url": "https://example.com/screenshot.png", "fileName": "screenshot.png" }
      ]
    }
  ]
}
```
- Max 5 sub-steps per step
- Max 2 images per sub-step

**Gherkin step format**:
```json
{
  "event": "Given",
  "stepDescription": "the user is on the login page"
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
| `automation` | array | Automation checklist |
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

| Tool | Required |
|------|----------|
| `health` | — |
| `list_testruns` | `projectId` |
| `get_run_details` | `projectId` + (`testrun_id` OR `counter`) |
| `list_testcase` | `projectId` + (run ID or run filter) |
| `get_testcase_details` | `projectId` + (one of: `testcase_id`, `testcase_name`, `testcase_fulltitle`, `by_error_message`, `by_code_snippet`, `by_status`) |
| `debug_testcase` | `projectId`, `testcase_name` |
| `list_manual_test_cases` | `projectId` |
| `get_manual_test_case` | `projectId`, `caseId` |
| `create_manual_test_case` | `projectId`, `title`, `suiteName` |
| `update_manual_test_case` | `projectId`, `caseId`, `updates` (object) |
| `list_manual_test_suites` | `projectId` |
| `create_manual_test_suite` | `projectId`, `name` |

---

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `"Missing TESTDINO_PAT"` | PAT not in environment | Tell user to add `TESTDINO_PAT` to the `env` section of `mcp.json` |
| `"projectId is required"` | No projectId passed | Call `health()` to get it first |
| `"At least one of the following must be provided: ..."` | No search param for `get_testcase_details` | Add `testcase_id`, `testcase_name`, or another search param |
| `"testcase_name is required"` | `debug_testcase` called without name | Ask user for the test case name |
| `"Step N has X sub-steps, maximum 5 allowed"` | Sub-step limit exceeded | Reduce sub-steps to ≤ 5 per step |
| `"Sub-step N has X images, maximum 2 allowed"` | Image limit exceeded | Reduce images to ≤ 2 per sub-step |
| HTTP 404 | Resource not found | Verify IDs exist — use `list_*` tools to find valid IDs |
| `{ count: 0, ... }` | No results match filters | Broaden filters or inform user nothing matches |

### Common Mistakes to Avoid

1. **Calling any tool before `health()`** — you won't have a `projectId`.
2. **Using `testcase_name` alone in `get_testcase_details`** without a run context — returns all historical executions, which can be large. Always pair with `testrun_id` or `counter` unless you want cross-run results.
3. **Using `get_all=true` for large datasets** — prefer filters. Only use `get_all` when the user genuinely needs everything.
4. **Passing `steps` without specifying `testStepsDeclarationType`** — Classic format is the default. If using Gherkin steps, explicitly set `testStepsDeclarationType: "Gherkin"`.
5. **Creating test cases without checking suite names** — always call `list_manual_test_suites()` first; `suiteName` must be an exact match.
6. **Ignoring the `debugging_prompt` in `debug_testcase` response** — this field contains pre-formatted analysis instructions from the API. Always read and apply it when analyzing failures.

---

*For installation setup, see `docs/INSTALLATION.md`. For full API documentation, see `docs/TOOLS.md`.*
