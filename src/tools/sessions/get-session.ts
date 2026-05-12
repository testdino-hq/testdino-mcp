/**
 * Get a single exploratory session.
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface GetSessionArgs {
  projectId: string;
  sessionId: string;
}

export const getSessionTool = {
  name: "get_session",
  description:
    "Get the full details of one exploratory session: name, mission, status, assignee, linked release, attachments, linked issues, findings. sessionId accepts either the internal _id or a counter-style ID like 'SES-12'.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: { type: "string", description: "Project ID (required)." },
      sessionId: { type: "string", description: "Internal _id or counter-style ID (required)." },
    },
    required: ["projectId", "sessionId"],
  },
};

export async function handleGetSession(args?: GetSessionArgs) {
  const token = getApiKey(args);
  if (!token) {
    throw new Error(
      "Missing TESTDINO_PAT environment variable. Configure it in your .cursor/mcp.json under 'env'."
    );
  }
  if (!args?.projectId) throw new Error("projectId is required");
  if (!args?.sessionId) throw new Error("sessionId is required");

  try {
    const url = endpoints.getSession({
      projectId: args.projectId,
      sessionId: args.sessionId,
    });
    const response = await apiRequestJson<unknown>(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get session: ${msg}`);
  }
}
