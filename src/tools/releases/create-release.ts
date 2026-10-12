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
  title: "Create Release",
  description:
    "Create a new release. Requires write permission. Use parentReleaseId to nest under another release (max 3 levels deep). startDate/endDate are ISO date strings. isStarted/isCompleted are independent flags — startedAt/completedAt are recorded separately. branch/environment/buildTarget/testers describe what build the release ships and who tests it (testers must be org members — pass User _ids).",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID",
      },
      name: {
        type: "string",
        description: "Release name",
      },
      description: {
        type: "string",
      },
      note: {
        type: "string",
        description: "Rich HTML note",
      },
      type: {
        type: "string",
        description:
          'Release type. Default options: "release", "version", "sprint", "iteration", "plan", "cycle", "feature" (case-insensitive — server lowercases on save so the UI badge color matches). Projects can add or rename types via Project Settings → Release Types; pass the value the project actually has.',
      },
      parentReleaseId: {
        type: "string",
      },
      startDate: {
        type: "string",
        description: "ISO date",
      },
      endDate: {
        type: "string",
        description: "ISO date",
      },
      isStarted: {
        type: "boolean",
      },
      isCompleted: {
        type: "boolean",
      },
      startedAt: {
        type: "string",
        description: "ISO datetime",
      },
      completedAt: {
        type: "string",
        description: "ISO datetime",
      },
      linkedIssues: {
        type: "array",
        items: {
          type: "object",
          properties: {
            displayId: {
              type: "string",
            },
            title: {
              type: "string",
            },
            url: {
              type: "string",
            },
            issueType: {
              type: "string",
            },
            status: {
              type: "string",
            },
            source: {
              type: "string",
            },
          },
          additionalProperties: true,
        },
        description:
          "Array of linked-issue objects (same shape as list_releases returns).",
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
        type: "object",
        properties: {
          platform: {
            anyOf: [
              {
                type: "string",
                enum: ["web", "ios", "android", "api"],
              },
              {
                type: "null",
              },
            ],
          },
          version: {
            type: "string",
          },
          buildNumber: {
            type: "string",
          },
          source: {
            type: "string",
          },
          deployUrl: {
            type: "string",
          },
        },
        additionalProperties: true,
        description:
          'Build the release cuts against: { platform: "web"|"ios"|"android"|"api", version, buildNumber, source, deployUrl }. An all-empty object is stored as null.',
      },
      testers: {
        type: "array",
        items: {
          type: "string",
        },
        description:
          "User _ids assigned as testers. Must be members of the org.",
      },
    },
    required: ["projectId", "name"],
    additionalProperties: false,
    $schema: "http://json-schema.org/draft-07/schema#",
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
  },
  execution: {
    taskSupport: "forbidden",
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
    throw new Error(`Failed to create release: ${msg}`, { cause: error });
  }
}
