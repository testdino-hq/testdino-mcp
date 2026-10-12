import { endpoints } from "../../lib/endpoints.js";
import { callTestControls } from "./_shared.js";

export const getQuarantineTool = {
  name: "get_quarantine",
  title: "Get Quarantine",
  description:
    "Read one quarantine: reason, assignee, end date, what it covers, its state, and its full history of changes (events). Also returns coveredRuns from the last 90 days (a total plus the 10 latest) — runs a quarantine of this test kept from failing.",
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
    },
    required: ["projectId", "quarantine_id"],
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

export async function handleGetQuarantine(args?: Record<string, unknown>) {
  return callTestControls(
    args,
    endpoints.quarantine(String(args?.projectId), String(args?.quarantine_id))
  );
}
