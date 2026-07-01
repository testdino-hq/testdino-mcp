/**
 * List exploratory sessions.
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface ListSessionsArgs {
  projectId: string;
  search?: string;
  status?: "active" | "closed";
  state?: string;
  sessionType?: string;
  assigneeUserId?: string;
  releaseId?: string;
  tags?: string;
  isClosed?: boolean;
  sortBy?: "createdAt" | "updatedAt" | "name";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export const listSessionsTool = {
  name: "list_sessions",
  description:
    "Browse exploratory sessions for a project. Filter by status (active|closed), state, sessionType, assigneeUserId, release (releaseId), tags, or free-text search on name. Pass releaseId='none' for sessions not attached to a release. Default page size 25 (max 200).",
  inputSchema: {
    type: "object",
    properties: {
      projectId: { type: "string", description: "Project ID (required)." },
      search: { type: "string", description: "Match by session name." },
      status: {
        type: "string",
        enum: ["active", "closed"],
        description: "Filter by open/closed session lifecycle status.",
      },
      state: {
        type: "string",
        description:
          "Workflow state. Either canonical ('under_review', 'done') or display ('Under review', 'Done') form — the server normalizes lowercase+underscored.",
      },
      sessionType: {
        type: "string",
        description: "Filter by session type label.",
      },
      assigneeUserId: {
        type: "string",
        description:
          "User _id OR email — both accepted (server resolves email to user _id).",
      },
      releaseId: {
        type: "string",
        description: "'none' for unlinked sessions.",
      },
      tags: { type: "string", description: "Single tag or comma-separated." },
      isClosed: {
        type: "boolean",
        description: "Filter by whether the session is closed.",
      },
      sortBy: {
        type: "string",
        enum: ["createdAt", "updatedAt", "name"],
        description: "Field to sort sessions by.",
      },
      sortOrder: {
        type: "string",
        enum: ["asc", "desc"],
        description: "Sort direction.",
      },
      page: { type: "number", description: "Page number for pagination." },
      limit: { type: "number", description: "Default 25 (max 200)." },
    },
    required: ["projectId"],
  },
};

export async function handleListSessions(args?: ListSessionsArgs) {
  const token = getApiKey(args);
  if (!token) {
    throw new Error(
      "Missing TESTDINO_PAT environment variable. Configure it in your .cursor/mcp.json under 'env'."
    );
  }
  if (!args?.projectId) throw new Error("projectId is required");

  try {
    const { releaseId, assigneeUserId, ...rest } = args;
    const url = endpoints.listSessions({
      ...rest,
      ...(releaseId ? { milestone: releaseId } : {}),
      ...(assigneeUserId ? { assignee: assigneeUserId } : {}),
    });
    const response = await apiRequestJson<unknown>(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to list sessions: ${msg}`);
  }
}
