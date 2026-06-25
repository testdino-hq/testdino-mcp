/**
 * List manual test runs.
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface ListManualRunsArgs {
  projectId: string;
  search?: string;
  status?: "active" | "closed";
  state?: string;
  environment?: string;
  releaseId?: string;
  tags?: string;
  isClosed?: boolean;
  sortBy?: "createdAt" | "updatedAt" | "name";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export const listManualRunsTool = {
  name: "list_manual_runs",
  annotations: { readOnlyHint: true },
  description:
    "Browse manual test runs for a project. Filter by status (active|closed), state (new|in_progress|on_hold|done), environment, release (releaseId), tags (csv or single), or free-text search on name. Pass releaseId='none' to list runs not attached to any release. Default page size 25 (max 200).",
  inputSchema: {
    type: "object",
    properties: {
      projectId: { type: "string", description: "Project ID (required)." },
      search: { type: "string", description: "Match by run name." },
      status: { type: "string", enum: ["active", "closed"] },
      state: {
        type: "string",
        description:
          "Workflow state. Either canonical ('in_progress', 'on_hold', 'done') or display ('In Progress', 'On Hold') form — the server normalizes lowercase+underscored.",
      },
      environment: { type: "string" },
      releaseId: {
        type: "string",
        description: "Filter to runs in this release. 'none' = unlinked.",
      },
      tags: { type: "string", description: "Single tag or comma-separated." },
      isClosed: { type: "boolean" },
      sortBy: { type: "string", enum: ["createdAt", "updatedAt", "name"] },
      sortOrder: { type: "string", enum: ["asc", "desc"] },
      page: { type: "number" },
      limit: { type: "number", description: "Default 25 (max 200)." },
    },
    required: ["projectId"],
  },
};

export async function handleListManualRuns(args?: ListManualRunsArgs) {
  const token = getApiKey(args);
  if (!token) {
    throw new Error(
      "Missing TESTDINO_PAT environment variable. Configure it in your .cursor/mcp.json under 'env'."
    );
  }
  if (!args?.projectId) throw new Error("projectId is required");

  try {
    const { releaseId, ...rest } = args;
    const url = endpoints.listManualRuns({
      ...rest,
      ...(releaseId ? { milestone: releaseId } : {}),
    });
    const response = await apiRequestJson<unknown>(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to list manual runs: ${msg}`);
  }
}
