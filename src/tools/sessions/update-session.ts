/**
 * Update exploratory session — send only the fields you want to change in `updates`.
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface UpdateSessionArgs {
  projectId: string;
  sessionId: string;
  updates: Record<string, unknown>;
}

export const updateSessionTool = {
  name: "update_session",
  title: "Update Exploratory Session",
  description:
    'Modify an existing exploratory session. Send only fields you want to change inside the updates object. Requires write permission. Allowed fields: name, mission, sessionType, config, environment, releaseId, assigneeUserId, state, estimate, tags, linkedIssues. Pass updates.status="closed" to close the session (same as the UI "Close session" button: freezes it, snaps state to the project\'s "Done" option). This is not reversible via MCP. Files cannot be added over MCP — tell the user to use the TestDino UI. IMPORTANT: updates.tags must be a JSON array of strings — e.g. ["exploratory","auth"] — NOT a comma-separated string.',
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID",
      },
      sessionId: {
        type: "string",
        description: "Internal _id or counter-style ID",
      },
      updates: {
        type: "object",
        additionalProperties: {},
        description:
          'Fields to update: name, mission, sessionType, config, environment, releaseId, assigneeUserId, state, estimate, tags, linkedIssues. status="closed" closes the session.',
      },
    },
    required: ["projectId", "sessionId", "updates"],
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

export async function handleUpdateSession(args?: UpdateSessionArgs) {
  const token = getApiKey(args);
  if (!token) {
    throw new Error(
      "Missing TESTDINO_PAT environment variable. Configure it in your .cursor/mcp.json under 'env'."
    );
  }
  if (!args?.projectId) throw new Error("projectId is required");
  if (!args?.sessionId) throw new Error("sessionId is required");
  if (!args?.updates || typeof args.updates !== "object") {
    throw new Error("updates must be an object containing fields to modify");
  }

  try {
    const url = endpoints.updateSession(
      String(args.projectId),
      String(args.sessionId)
    );
    const response = await apiRequestJson<unknown>(url, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: { updates: args.updates },
    });
    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to update session: ${msg}`, { cause: error });
  }
}
