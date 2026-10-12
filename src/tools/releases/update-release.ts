/**
 * Update release tool — send only the fields you want to change in `updates`.
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface UpdateReleaseArgs {
  projectId: string;
  releaseId: string;
  updates: Record<string, unknown>;
}

export const updateReleaseTool = {
  name: "update_release",
  title: "Update Release",
  description:
    "Modify an existing release. Send only the fields you want to change inside the updates object. Requires write permission. Fields: name, description, note, type, startDate, endDate, isStarted, isCompleted, startedAt, completedAt, linkedIssues, branch, environment, buildTarget, testers, parentReleaseId.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID",
      },
      releaseId: {
        type: "string",
        description: "Internal _id or counter-style ID",
      },
      updates: {
        type: "object",
        additionalProperties: {},
        description:
          "Fields to update: name, description, note, type, startDate, endDate, isStarted, isCompleted, startedAt, completedAt, linkedIssues, branch, environment, buildTarget ({platform,version,buildNumber,source,deployUrl}), testers (User _ids, org members), parentReleaseId (re-parent the release; same field name used at create time)…",
      },
    },
    required: ["projectId", "releaseId", "updates"],
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

export async function handleUpdateRelease(args?: UpdateReleaseArgs) {
  const token = getApiKey(args);
  if (!token) {
    throw new Error(
      "Missing TESTDINO_PAT environment variable. Configure it in your .cursor/mcp.json under 'env'."
    );
  }
  if (!args?.projectId) throw new Error("projectId is required");
  if (!args?.releaseId) throw new Error("releaseId is required");
  if (!args?.updates || typeof args.updates !== "object") {
    throw new Error("updates must be an object containing fields to modify");
  }

  try {
    const url = endpoints.updateRelease(
      String(args.projectId),
      String(args.releaseId)
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
    throw new Error(`Failed to update release: ${msg}`, { cause: error });
  }
}
