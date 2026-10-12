import { endpoints } from "../../lib/endpoints.js";
import { callTestControls } from "./_shared.js";

export const listTestControlsTool = {
  name: "list_test_controls",
  title: "List Test Controls",
  description:
    'List the tests under Test Controls in a project, as the Test Controls page shows them. view "quarantined" (default) lists quarantines — filter by state (active, ending_soon, released), covers (any failure or one error) and, for released ones, reason; the response includes the quarantine budget. view "critical" lists tests marked critical, view "watched" lists the tests you watch, view "candidates" lists flaky tests that could be quarantined. search matches the test title or file; assignee takes "me", a user id or an email. Quarantine settings (budget, default length, auto-release) are changed only in the app, not here.',
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID (e.g. project_<id>)",
      },
      view: {
        type: "string",
        enum: ["quarantined", "critical", "watched", "candidates"],
        description: 'Default "quarantined"',
      },
      state: {
        type: "string",
        enum: ["active", "ending_soon", "released"],
        description: 'quarantined view only. Default "active"',
      },
      search: {
        type: "string",
        maxLength: 200,
        description: "Match the test title or file",
      },
      assignee: {
        type: "string",
        description: '"me", a user id or an email. Not for the candidates view',
      },
      covers: {
        type: "string",
        enum: ["any", "error"],
        description: 'quarantined view only: "any" failure or one "error"',
      },
      reason: {
        type: "string",
        enum: ["manual", "healthy", "expired", "not_seen", "issue_closed"],
        description: 'Release reason; only with state "released"',
      },
      page: {
        type: "integer",
        minimum: 1,
      },
      limit: {
        type: "integer",
        minimum: 1,
        maximum: 500,
        description: "Default 25 (50 for candidates, max 200 there)",
      },
    },
    required: ["projectId"],
    additionalProperties: false,
    $schema: "http://json-schema.org/draft-07/schema#",
  },
  annotations: {
    readOnlyHint: true,
  },
  execution: {
    taskSupport: "forbidden",
  },
};

export async function handleListTestControls(args?: Record<string, unknown>) {
  return callTestControls(args, endpoints.listTestControls(args ?? {}));
}
