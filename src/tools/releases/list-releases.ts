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
  title: "List Releases",
  description:
    "Browse releases (milestones) for a project. Supports filtering by type, completion status, parent release, and free-text search on name. Pass parentReleaseId to get only the direct children of a release (releases nest up to 3 levels deep). Default page size is 25 (max 200).",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID",
      },
      search: {
        type: "string",
        description: "Match by name",
      },
      type: {
        type: "string",
        description:
          'Release type. Default options (lowercased on save so the UI badge color matches): "release", "version", "sprint", "iteration", "plan", "cycle", "feature". Display labels ("Sprint", "Iteration", …) are accepted and normalized. Projects can customize this list via Project Settings → Release Types, so other values may be valid for a given project.',
      },
      isCompleted: {
        type: "boolean",
      },
      parentReleaseId: {
        type: "string",
        description: "Filter to direct children of a release",
      },
      status: {
        type: "string",
        description: "Release status (project-specific)",
      },
      sortBy: {
        type: "string",
        enum: ["createdAt", "startDate", "endDate", "name"],
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
    throw new Error(`Failed to list releases: ${msg}`, { cause: error });
  }
}
