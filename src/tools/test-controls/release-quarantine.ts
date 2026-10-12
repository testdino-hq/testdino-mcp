import { endpoints } from "../../lib/endpoints.js";
import { callTestControls } from "./_shared.js";

export const releaseQuarantineTool = {
  name: "release_quarantine",
  title: "Release Quarantine",
  description:
    "Call this only when the user asks for it. End a quarantine now: the test's failures fail the build again. The quarantine moves to Released with you as the releaser and its history is kept.",
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
    readOnlyHint: false,
    destructiveHint: true,
  },
  execution: {
    taskSupport: "forbidden",
  },
};

export async function handleReleaseQuarantine(args?: Record<string, unknown>) {
  return callTestControls(
    args,
    `${endpoints.quarantine(String(args?.projectId), String(args?.quarantine_id))}/release`,
    "POST"
  );
}
