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
  title: "List Exploratory Sessions",
  description:
    "Browse exploratory sessions for a project. Filter by status (active|closed), state, sessionType, assignee, release (releaseId), tags, or free-text search on name. Default page size 25 (max 200).",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID",
      },
      search: {
        type: "string",
        description: "Match by session name",
      },
      status: {
        type: "string",
        enum: ["active", "closed"],
      },
      state: {
        type: "string",
        description:
          'Workflow state. Pass either the canonical form ("new", "under_review", "done", "rejected") or the display form ("Under review", "Done") — the server normalizes (lowercase, spaces → underscores) so UI badges colorize correctly.',
      },
      sessionType: {
        type: "string",
      },
      assigneeUserId: {
        type: "string",
        description:
          'User _id (e.g. "user_abc...") OR email address — both are accepted.',
      },
      releaseId: {
        type: "string",
        description:
          'Filter to sessions in this release. Pass "none" for unlinked.',
      },
      tags: {
        type: "string",
        description: "Single tag or comma-separated tags",
      },
      isClosed: {
        type: "boolean",
      },
      sortBy: {
        type: "string",
        enum: ["createdAt", "updatedAt", "name"],
      },
      sortOrder: {
        type: "string",
        enum: ["asc", "desc"],
      },
      page: {
        type: "integer",
        minimum: 1,
      },
      limit: {
        type: "integer",
        minimum: 1,
        maximum: 200,
        description: "Default 25",
      },
    },
    required: ["projectId"],
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
    throw new Error(`Failed to list sessions: ${msg}`, { cause: error });
  }
}
