/**
 * List releases tool — Releases are called "Milestones" in the data model.
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface ListReleasesArgs {
  projectId: string;
  search?: string;
  type?: string;
  isCompleted?: boolean;
  parentReleaseId?: string;
  status?: string;
  sortBy?: "createdAt" | "startDate" | "endDate" | "name";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export const listReleasesTool = {
  name: "list_releases",
  description:
    "Browse releases (a.k.a. milestones) for a project. Use search to match by name; type filters by free-text release type; isCompleted filters by completion state; parentReleaseId returns the direct children of a release (releases nest up to 3 levels deep). Default page size 25 (max 200).",
  inputSchema: {
    type: "object",
    properties: {
      projectId: { type: "string", description: "Project ID (required)." },
      search: { type: "string", description: "Match by release name." },
      type: {
        type: "string",
        description:
          "Release type. Either canonical ('iteration', 'major') or display ('Iteration', 'Major') form — server normalizes to lowercase so UI badge color matches.",
      },
      isCompleted: {
        type: "boolean",
        description: "Filter releases by completion state.",
      },
      parentReleaseId: {
        type: "string",
        description: "Direct children of this release.",
      },
      status: {
        type: "string",
        description: "Release status (project-specific).",
      },
      sortBy: {
        type: "string",
        enum: ["createdAt", "startDate", "endDate", "name"],
        description: "Field to sort releases by.",
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

export async function handleListReleases(args?: ListReleasesArgs) {
  const token = getApiKey(args);
  if (!token) {
    throw new Error(
      "Missing TESTDINO_PAT environment variable. Configure it in your .cursor/mcp.json under 'env'."
    );
  }
  if (!args?.projectId) throw new Error("projectId is required");

  try {
    const { parentReleaseId, ...rest } = args;
    const url = endpoints.listReleases({
      ...rest,
      ...(parentReleaseId ? { parentMilestone: parentReleaseId } : {}),
    });
    const response = await apiRequestJson<unknown>(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to list releases: ${msg}`);
  }
}
