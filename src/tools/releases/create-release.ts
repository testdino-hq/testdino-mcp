/**
 * Create release tool — requires write permission.
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";
import {
  buildTargetItemSchema,
  linkedIssueItemSchema,
} from "../../lib/item-schemas.js";

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
  buildTarget?: unknown;
  testers?: string[];
}

export const createReleaseTool = {
  name: "create_release",
  description:
    "Create a new release. Requires write permission. Use parentReleaseId to nest under another release (max 3 levels deep). startDate/endDate are ISO date strings. isStarted/isCompleted are independent flags — startedAt/completedAt are recorded separately. branch/environment/buildTarget/testers describe what build the release ships and who tests it.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: { type: "string", description: "Project ID (required)." },
      name: { type: "string", description: "Release name (required)." },
      description: {
        type: "string",
        description: "Plain-text release description.",
      },
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
      isStarted: {
        type: "boolean",
        description: "Whether this release has started.",
      },
      isCompleted: {
        type: "boolean",
        description: "Whether this release is completed.",
      },
      startedAt: { type: "string", description: "ISO datetime." },
      completedAt: { type: "string", description: "ISO datetime." },
      linkedIssues: {
        type: "array",
        items: linkedIssueItemSchema,
        description:
          "Array of linked-issue objects (same shape list_releases returns).",
      },
      branch: {
        type: "string",
        description: "Source branch this release ships from.",
      },
      environment: {
        type: "string",
        description: 'Environment label this release targets, e.g. "Staging".',
      },
      buildTarget: {
        ...buildTargetItemSchema,
        description:
          'Build target: { platform: "web"|"ios"|"android"|"api", version, buildNumber, source, deployUrl }.',
      },
      testers: {
        type: "array",
        items: { type: "string" },
        description: "User _ids assigned as testers. Must be org members.",
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
