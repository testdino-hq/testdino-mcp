/**
 * Get release tool — releaseId accepts internal _id or counter-style ID.
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface GetReleaseArgs {
  projectId: string;
  releaseId: string;
}

export const getReleaseTool = {
  name: "get_release",
  description:
    "Get the full details of one release: dates, status, linked issues, parent/root, and rolled-up progress stats (run counts, test status breakdown). releaseId accepts either the internal _id or a counter-style ID like 'MS-12'.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: { type: "string", description: "Project ID (required)." },
      releaseId: { type: "string", description: "Internal _id or counter-style ID (required)." },
    },
    required: ["projectId", "releaseId"],
  },
};

export async function handleGetRelease(args?: GetReleaseArgs) {
  const token = getApiKey(args);
  if (!token) {
    throw new Error(
      "Missing TESTDINO_PAT environment variable. Configure it in your .cursor/mcp.json under 'env'."
    );
  }
  if (!args?.projectId) throw new Error("projectId is required");
  if (!args?.releaseId) throw new Error("releaseId is required");

  try {
    const url = endpoints.getRelease({
      projectId: args.projectId,
      releaseId: args.releaseId,
    });
    const response = await apiRequestJson<unknown>(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get release: ${msg}`);
  }
}
