# Changelog

All notable changes to `@testdino/mcp` are documented here.

## 2.2.1

### Added

- **Ask about your plan and quota.** `get_org_details` returns your plan,
  executions left and when they reset, seats and projects used, and whether you
  can buy more executions. It also says what happens when executions run out
  and what to do.
- **Ask how a project is doing.** `get_project_details` returns its health,
  connected integrations, branch → environment mapping, and the top 10 flaky,
  slow and failing tests.
- **Ask about pull requests.** `get_pull_requests` lists recent pull requests
  with their latest test run, or shows one in detail.

All three are read-only and show only what your token can access.

## 2.2.0

The package now exposes exactly what the hosted TestDino MCP exposes — the same
tools, descriptions, parameters, prompts and skills guide — and answers every
call the way the hosted server does. Only the audit report file arguments
(`markdownReportPath` / `writeMarkdown` / `outputPath`), which need the local
disk, stay package-only.

### Breaking

- **Errors are tool results, not protocol errors.** A refused or failed call
  returns `isError: true` with the server's JSON body and its `statusCode`,
  instead of throwing `Failed to …: API request failed: 404 …`. Clients that
  caught the thrown error should read `isError` instead.
- **Arguments are validated before any request.** A wrong type, a missing
  required argument or an out-of-range value is refused with
  `Input validation error`, in the hosted server's words and order; an argument
  a tool does not declare is ignored. Before, some of these were sent anyway —
  `limit: "ten"` was silently dropped.
- **Attachments are no longer read from local paths.** Manual test case
  attachments must be objects, as on the hosted server; a path is refused. The
  server never stored files sent this way (a case-level attachment is refused
  with `400`, a step attachment is dropped), so add files in the TestDino UI.
- **`health` returns JSON** (user, organizations, projects, token expiry), not a
  Markdown summary.
- **Results are compact JSON** with `structuredContent`, as on the hosted server.
- `debug_testcase` and `get_testcase_details` no longer add `_agent_guidance`.
- `get_external_issue` reads all ids in one call and returns the provider's
  answer; it no longer wraps each id's error in a successful `issues` list.
- `submit_audit_report` no longer requires `score` (TestDino computes it) and
  sends `findings` as given; the server checks `orgId` and normalizes categories.
- `list_testcase` without a run scope returns the server's warning instead of
  refusing locally.
- The legacy guide URI `testdino://docs/skill.md` is gone; use
  `testdino://skills/guide`.

### Added

- **Test Controls**: `list_test_controls`, `get_test_controls`,
  `get_quarantine`, `quarantine_tests`, `update_quarantine`,
  `release_quarantine`, `set_test_critical`, `assign_test`, `watch_test`, and a
  `by_test_controls` filter on `list_testruns` and `list_testcase`.
- **Prompts** `fix_run`, `fix_case`, `fix_flake` and `optimize_swarm`, beside `testdino_guide`.
- **Swarm runs**: `list_testcase` takes `by_machine` (one machine's cases); `get_run_details` describes the per-machine fields.
- Every tool carries the hosted `title` and its read-only / destructive
  annotations, so clients that honour them ask before a destructive call.

### Changed

- The skills guide is the hosted guide, word for word.

## 2.1.0 (2026-10-10)

### Added

- **Re-run a run's failures from your agent.** Two tools, and they work as a
  pair: `get_rerun_selection` says what a re-run would execute and what
  starting it would do, `rerun_test` starts it.
  - `get_rerun_selection` returns the exact Playwright `--test-list` lines, how
    many of the run's tests are selected, and the CLI command that runs the
    same set locally. It is read-only.
  - It also returns `rerun_mechanism`, which answers the question that actually
    matters before you agree to a re-run: whether it happens **inside the run's
    own GitHub run** — so that run's red check can turn green — or starts a
    separate workflow run, and when it cannot be the former, why.
  - `rerun_test` needs `confirm: true` after you say yes, and needs `mode`.
    **There is no default mode**, because the two answer different questions:
    `same-commit` re-runs the commit that failed (are these failures real, or
    flaky?), `latest` runs the branch tip (did the fix work?). An omitted mode
    is refused rather than guessed.
  - Every refusal happens before anything is dispatched, and where running the
    tests by hand is an option it hands you the CLI command instead.
  - A same-commit re-run runs **only the failed tests** when the run was
    recorded by `npx tdpw test` 2.7.8 or newer; older versions repeat each
    failed job in full, and the result says which happened.

## 2.0.4 (2026-10-09)

### Added

- `debug_testcase` and `verify_fix` take `testcase_id` (the test's `pw_test_id`). A title that
  matches the same test under several Playwright projects answers
  `409 AMBIGUOUS_IDENTITY`; call again with the candidate's `pw_test_id`.

### Changed

- A read that fails on a dropped connection (`fetch failed`) is retried twice
  with backoff (about 3 s in total) before the tool call fails. This rides out
  a brief connection drop, not an outage of minutes. Writes are never retried.
- A `429` error now says how long to wait (`Rate limited: retry after Ns.`),
  from the server's `Retry-After` / `RateLimit-Reset` headers.
- Requests carry a random per-process id (`mcp-session-id`) so the hosted
  service can group a session's tool calls in its usage analytics. It contains
  no user or machine data.

## 2.0.3 (2026-09-15)

### Added

- **Automation linking.** Five tools let an agent wire a manual test case to
  the Playwright test that covers it and see automation results on the case:
  `list_automated_tests` (source of `pwTestId` + `fullTitle`),
  `get_test_case_links`, `link_automated_test`, `unlink_automated_test`, and
  `bulk_link_automated_tests` (up to 500 pairs, per-item results). Same plan
  gate, 50-link cap and audit trail as the UI's link dialog.
- **Debug ladder.** Three tools already on the hosted streaming server now
  ship here too: `get_debug_evidence` (one call — flake verdict, regression
  boundary, every artifact link, JSON or markdown), `get_flake_verdict`, and
  `verify_fix` (did the fix hold against the baseline run?).

### Changed

- `update_manual_test_case` now rejects `updates.linkedTests` with a message
  naming the link tools, instead of forwarding it and reporting a success that
  linked nothing (the server strips that field from the generic update).

## 2.0.2 (2026-08-06)

### Added

- **AI Insights over MCP.** New `get_ai_insights` tool surfaces TestDino's AI
  analysis at three levels: project overview (per-category failure counts + top
  offenders over a date range), run (AI failure categorization, failure
  clusters, error-analysis table, LLM-written summary), and test case
  (recommendations + quick fixes). When AI features are turned off for a project
  (Settings → AI) it returns a `disabled` status with a message to enable them.
- **`get_trace_analysis`** - resolves a failing test's hosted Playwright trace to
  a short-lived download URL and returns a runbook for local trace-CLI debugging.
- **`include_ai_insights` flag** on `get_run_details` (attaches the run's AI
  Insights under `ai_insights`) and `debug_testcase` (attaches recommendations +
  quick fixes under `ai_fixes`).

## 2.0.1 (2026-07-20)

### Changed

- **New package name.** The server is now published as `@testdino/mcp`.
  Update your MCP config to the new name (for example
  `"args": ["-y", "@testdino/mcp"]`). The previous `testdino-mcp`
  package is no longer updated. Same tools, same behavior as 2.0.0.

## 2.0.0 (2026-07-20)

### Added

- **File issues in your tracker from a failed test.** Connect Jira,
  Linear, Asana, or monday.com once, then ask your AI assistant to open
  a ticket straight from a failing test or run, with the test context
  already attached. Check the status of tickets you have filed
  (including several at once), and see which trackers are connected for
  a project. New tools: `connect_integration`, `get_integration_status`,
  `create_external_issue`, `get_external_issue`.
- **Triage big failing runs by pattern.** Ask your assistant to cluster
  a run's failures by their underlying error, so you can see which reds
  are one real problem versus many and fix the root cause first. New
  tool: `get_run_error_clusters`.

### Improved

- **Sharper test-run and test-case filtering.** Filter runs by status,
  by test case tags, and by free-text search, with sorting. Filter for
  tests that actually have screenshots, videos, or traces available,
  including artifacts from earlier attempts of a flaky test. Pull test
  history and per-step detail for a case.
- **Health check now shows your organization role,** so you can confirm
  what you are able to do before you try it.

### Changed

- **A new PAT is required.** After updating, generate a fresh Personal
  Access Token in TestDino and use it in your MCP config. Tokens from
  earlier versions will not work with this release.
- **New service address.** The MCP now talks to `mcp.testdino.com`. If
  you set a custom API URL in your config, update it. Standard
  configurations need no changes.

## 1.0.11 (2026-07-09)

### Improved

- **TestDino audits now start with branch signals in hand.** When your
  AI agent kicks off a Playwright audit, it walks in with the top
  failing tests, top flaky tests, and top slow tests from your recent
  runs on the target branch, before it reviews any code. Findings come
  out grounded in what your suite is actually doing.

### Changed

- The audit is now driven by two focused tools, `get_audit_report` (to
  fetch context and browse past reports) and `submit_audit_report` (to
  hand in a completed audit). The previous single `test_audit` tool has
  been consolidated into these two. Update your automations and CI
  scripts if they called `test_audit` by name.
