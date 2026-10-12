import { endpoints } from "../../lib/endpoints.js";
import { callTestControls } from "./_shared.js";

export const updateQuarantineTool = {
  name: "update_quarantine",
  title: "Update Quarantine",
  description:
    "Change an active quarantine: its end date (ends_in_days, counted from today), assignee, note, or linked ticket (issue_key, issue_url). Only the fields you pass change; the others stay as they are, even if someone edits them at the same time. A quarantine always has an assignee.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID (e.g. project_<id>)",
      },
      quarantine_id: {
        type: "string",
        maxLength: 128,
        description: "Quarantine id, as list_test_controls returns it",
      },
      ends_in_days: {
        type: "integer",
        minimum: 1,
        maximum: 90,
      },
      assignee: {
        type: "string",
        maxLength: 254,
        description: '"me", a user id or a teammate\'s email',
      },
      note: {
        type: "string",
        maxLength: 1000,
        description: 'Replaces the note; "" clears it',
      },
      issue_key: {
        type: "string",
        maxLength: 128,
        description: 'Ticket key, e.g. "TD-123"',
      },
      issue_url: {
        type: "string",
        maxLength: 2048,
        description: "http(s) link to the ticket",
      },
    },
    required: ["projectId", "quarantine_id"],
    additionalProperties: false,
    $schema: "http://json-schema.org/draft-07/schema#",
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
  },
  execution: {
    taskSupport: "forbidden",
  },
};

export async function handleUpdateQuarantine(args?: Record<string, unknown>) {
  return callTestControls(
    args,
    endpoints.quarantine(String(args?.projectId), String(args?.quarantine_id)),
    "PATCH"
  );
}
