# Changelog

All notable changes to `@testdino/mcp` are documented here.

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
