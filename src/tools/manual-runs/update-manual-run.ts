/**
 * Update manual test run — send only the fields you want to change in `updates`.
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface UpdateManualRunArgs {
  projectId: string;
  runId: string;
  updates: Record<string, unknown>;
}

export const updateManualRunTool = {
  name: "update_manual_run",
  description:
    'Modify an existing manual test run. Send only the fields you want to change inside the `updates` object. Requires write permission. Allowed fields: name, note, environment, releaseId, state, forecast, tags, linkedIssues, attachments, links, selectionMode. Closed runs are read-only except for releaseId (so a run can be re-attached to a different release). IMPORTANT: updates.tags must be a JSON array of strings — e.g. ["smoke","regression"] — NOT a comma-separated string.',
  inputSchema: {
    type: "object",
    properties: {
      projectId: { type: "string", description: "Project ID (required)." },
      runId: {
        type: "string",
        description: "Internal _id or counter-style ID (required).",
      },
      updates: {
        type: "object",
        description:
          "Fields to update: name, note, environment, releaseId, state, forecast, tags, linkedIssues, attachments, links, selectionMode.",
      },
    },
    required: ["projectId", "runId", "updates"],
  },
};

export async function handleUpdateManualRun(args?: UpdateManualRunArgs) {
  const token = getApiKey(args);
  if (!token) {
    throw new Error(
      "Missing TESTDINO_PAT environment variable. Configure it in your .cursor/mcp.json under 'env'."
    );
  }
  if (!args?.projectId) throw new Error("projectId is required");
  if (!args?.runId) throw new Error("runId is required");
  if (!args?.updates || typeof args.updates !== "object") {
    throw new Error("updates must be an object containing fields to modify");
  }

  try {
    const url = endpoints.updateManualRun(
      String(args.projectId),
      String(args.runId)
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
    throw new Error(`Failed to update manual run: ${msg}`);
  }
}
