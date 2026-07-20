/**
 * Create release tool — requires write permission.
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface CreateReleaseArgs {
  projectId: string;
  name: string;
  description?: string;
  note?: string;
  type?: string;
  parentReleaseId?: string;
  startDate?: string;
  endDate?: string;
  isStarted?: boolean;
  isCompleted?: boolean;
  startedAt?: string;
  completedAt?: string;
  linkedIssues?: unknown[];
  branch?: string;
  environment?: string;
  buildTarget?: {
    platform?: "web" | "ios" | "android" | "api";
    version?: string;
    buildNumber?: string;
    source?: string;
    deployUrl?: string;
  };
  testers?: string[];
}

export const createReleaseTool = {
  name: "create_release",
  description:
    "Create a new release. Requires write permission (org_owner, org_admin, or org_member). Use parentReleaseId to nest under another release (max 3 levels deep). startDate/endDate are ISO date strings. isStarted/isCompleted are independent flags — startedAt/completedAt record when those transitions happened.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: { type: "string", description: "Project ID (required)." },
      name: { type: "string", description: "Release name (required)." },
      description: { type: "string" },
      note: { type: "string", description: "Rich HTML note." },
      type: {
        type: "string",
        description:
          "Release type. Either canonical ('iteration', 'major') or display ('Iteration', 'Major') form — server normalizes to lowercase so UI badge color matches.",
      },
      parentReleaseId: {
        type: "string",
        description: "Parent release for nesting.",
      },
      startDate: { type: "string", description: "ISO date." },
      endDate: { type: "string", description: "ISO date." },
      isStarted: { type: "boolean" },
      isCompleted: { type: "boolean" },
      startedAt: { type: "string", description: "ISO datetime." },
      completedAt: { type: "string", description: "ISO datetime." },
      linkedIssues: {
        type: "array",
        items: {},
        description:
          "Array of linked-issue objects (same shape list_releases returns).",
      },
      branch: {
        type: "string",
        description: "Source branch this release ships from",
      },
      environment: {
        type: "string",
        description: "Environment label, e.g. 'Staging'",
      },
      buildTarget: {
        type: "object",
        description: "Build target details.",
        properties: {
          platform: {
            type: "string",
            description: "Build platform.",
            enum: ["web", "ios", "android", "api"],
          },
          version: { type: "string", description: "Build version." },
          buildNumber: { type: "string", description: "Build number." },
          source: { type: "string", description: "Build source." },
          deployUrl: { type: "string", description: "Deployment URL." },
        },
      },
      testers: {
        type: "array",
        items: { type: "string" },
        description: "User _ids assigned as testers; must be org members",
      },
    },
    required: ["projectId", "name"],
  },
};

export async function handleCreateRelease(args?: CreateReleaseArgs) {
  const token = getApiKey(args);
  if (!token) {
    throw new Error(
      "Missing TESTDINO_PAT environment variable. Configure it in your .cursor/mcp.json under 'env'."
    );
  }
  if (!args?.projectId) throw new Error("projectId is required");
  if (!args?.name) throw new Error("name is required");

  try {
    const { projectId, ...body } = args;
    const url = endpoints.createRelease(String(projectId));
    const response = await apiRequestJson<unknown>(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create release: ${msg}`);
  }
}
