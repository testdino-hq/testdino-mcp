/**
 * Get a single manual test run by ID or counter-style ID.
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface GetManualRunArgs {
  projectId: string;
  runId: string;
}

export const getManualRunTool = {
  name: "get_manual_run",
  description:
    "Get the full details of one manual test run: name, status, environment, linked release, test stats (total/passed/failed/blocked/untested), contributors, attachments, linked issues. runId accepts either the internal _id or a counter-style ID like 'RUN-12'.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: { type: "string", description: "Project ID (required)." },
      runId: { type: "string", description: "Internal _id or counter-style ID (required)." },
    },
    required: ["projectId", "runId"],
  },
};

export async function handleGetManualRun(args?: GetManualRunArgs) {
  const token = getApiKey(args);
  if (!token) {
    throw new Error(
      "Missing TESTDINO_PAT environment variable. Configure it in your .cursor/mcp.json under 'env'."
    );
  }
  if (!args?.projectId) throw new Error("projectId is required");
  if (!args?.runId) throw new Error("runId is required");

  try {
    const url = endpoints.getManualRun({
      projectId: args.projectId,
      runId: args.runId,
    });
    const response = await apiRequestJson<unknown>(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get manual run: ${msg}`);
  }
}
