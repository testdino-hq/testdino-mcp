# Changelog

All notable changes to `testdino-mcp` are documented here.

## 1.0.11 — 2026-07-09

### Added

- **`get_audit_report`** (new tool, read-only). Three modes via `action`:
  - `'context'` — fetches the server-curated audit prompt AND `branchSignals`
    (`topFailingTests`, `topFlakyTests`, `topSlowTests`, `recentRuns`,
    `totalRuns`, `branch`). This is the drift with the streaming MCP that
    prompted the refactor — the AI now gets structured branch context BEFORE
    it starts analyzing local code.
  - `'list'` — browses previously submitted audit reports (optional branch
    filter, `limit` / `page`).
  - `'get'` — retrieves one saved report by `reportId`; supports
    `writeMarkdown` + `outputPath` to save the returned markdown locally.
- **`submit_audit_report`** (new tool, write-only). Persists a completed
  audit report. Requires `projectId`, `orgId`, and `score`. `markdownReport`
  or `markdownReportPath`, plus `findings`, `recommendations`, `reportName`,
  `branch`, `scope`, `target` as available.

### Changed

- **`orgId` is now required on submissions.** Matches the streaming
  `submit_audit_report` contract and the stdio backend's existing 400 gate.
  Configs that were calling `test_audit(action='analyze', score=...)`
  without `orgId` will fail with a helpful error pointing at `health()`.

### Deprecated

- **`test_audit`** is now a deprecated alias that delegates to
  `get_audit_report` and `submit_audit_report` by `action`. The first
  invocation per process logs a deprecation notice to stderr (does NOT
  pollute the tool response). Scheduled for removal in `a future major release`.

### Behind the scenes

- Extracted the audit tool's filesystem, git, markdown, and findings helpers
  into `src/tools/audits/shared.ts` so `get_audit_report`,
  `submit_audit_report`, and the `test_audit` alias share one implementation
  instead of drifting apart.
