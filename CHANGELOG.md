# Changelog

All notable changes to `testdino-mcp` are documented here.

## 1.3.0 — 2026-07-09

### Added

- **`get_run_error_clusters`** (new tool, read-only). Groups ONE run's failing
  tests by shared error signature (a normalized error fingerprint). Returns
  clusters (each = one signature + affected tests + a category), an
  `unclustered` bucket for blank/unfingerprintable errors, a per-category
  rollup, and run totals. Failed/timed-out tests cluster on their
  final-attempt error; flaky tests cluster on the error they recovered from.
  Categories: assertion, timeout, element_not_found, network, other.
  Optional `status` filter (`all` | `failed` | `flaky`, default `all`).

  Answers "what are the distinct failures in this run?" and "which error
  affected the most tests?" — far cheaper than paging every failed case
  individually.

  Workflow: `list_testruns` → pick a `testrun_id` → `get_run_error_clusters`.

### Notes

- The stdio backend already serves `GET /api/mcp/:projectId/get-run-error-clusters` —
  no server work required.
- Total tool count: 27 → 28. This 1.3.0 release assumes 1.1.0 (audit split)
  and 1.2.0 (integrations) have landed first.

## 1.2.0 — 2026-07-09

### Added

Integrations tool suite (see the 1.2.0 branch for full notes):
`get_integration_status`, `connect_integration`, `create_external_issue`,
`get_external_issue`.

## 1.1.0 — 2026-07-09

### Added

Audit read/write split (see the 1.1.0 branch for full notes):
`get_audit_report`, `submit_audit_report`. `test_audit` is now a deprecated
alias.
