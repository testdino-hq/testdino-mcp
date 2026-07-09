# Changelog

All notable changes to `testdino-mcp` are documented here.

## 1.0.11 — 2026-07-09

### Added

- **`get_audit_report`** — fetches the server-curated audit prompt plus
  branch signals (top failing tests, top flaky tests, top slow tests,
  recent runs) so an AI agent walks into an audit with real context
  about your test suite. Also browses previously submitted reports and
  retrieves one by ID.
- **`submit_audit_report`** — submits a completed audit report back to
  TestDino with score, findings, recommendations, and the markdown
  writeup.

Both tools work exactly like the rest of the MCP surface — call them
through your AI agent and results land in the TestDino dashboard.
