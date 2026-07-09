# Changelog

All notable changes to `testdino-mcp` are documented here.

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
