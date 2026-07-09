# Changelog

All notable changes to `testdino-mcp` are documented here.

## 1.2.0 — 2026-07-09

### Added

Integrations tool suite — matches the streaming MCP contract and unblocks
filing external issues from chat.

- **`get_integration_status`** (read-only). Reports connection state for a
  provider (`jira` / `linear` / `asana` / `monday` / `github`) on a TestDino
  project. Optional `includeCreateOptions=true` + `target` returns provider
  create-metadata (required fields, issue types, boards, teams). Prerequisite
  for `connect_integration` and `create_external_issue`.
- **`connect_integration`** (write). Starts the OAuth/connect flow. Returns
  either an `already_connected` short-circuit or a browser-openable connect
  URL. The npm client does NOT auto-open the URL — the AI client surfaces it
  to the user.
- **`create_external_issue`** (write). Files a provider issue/task linked to
  a TestDino entity (test run, test case, session, release, manual-test
  artifact). Supports `preview=true` for a dry-run resolve, `idempotencyKey`
  for safe retries, and `linkBack=true` for Jira remote links.
- **`get_external_issue`** (read). Fetches one provider issue by key/ID.
  Divergence from streaming: the stdio backend serves one issue per call,
  not an array. `defaultApp` param for Jira multi-site accounts.

### Notes

- All 4 tools call routes the stdio backend already served — no server
  work required.
- Provider enum + source-type enum extracted to
  `src/tools/integrations/shared.ts` so a future 5th tool can reuse them
  without duplicating strings.

## 1.1.0 — 2026-07-09

### Added

- **`get_audit_report`** and **`submit_audit_report`** (see the 1.1.0 branch
  for full notes). This 1.2.0 release assumes 1.1.0 has landed first.
