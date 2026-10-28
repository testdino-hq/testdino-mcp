/**
 * Create exploratory session — requires write permission.
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface CreateSessionArgs {
  projectId: string;
  name: string;
  mission?: string;
  sessionType?: string;
  config?: string;
  environment?: string;
  releaseId?: string;
  assigneeUserId?: string;
  state?: string;
  estimate?: number;
  tags?: string[];
  linkedIssues?: unknown[];
  attachments?: unknown[];
}

export const createSessionTool = {
  name: "create_session",
  title: "Create Exploratory Session",
  description:
    'Create a new exploratory testing session. Requires write permission. mission accepts rich HTML (the high-level charter). assigneeUserId accepts either a User _id ("user_abc...") or an email address — the email is resolved against TestDino users automatically. estimate is in minutes. Findings are not available via MCP — add them in the UI. IMPORTANT: tags must be a JSON array of strings — e.g. ["exploratory","auth"] — NOT the comma-separated form that list_sessions accepts as a filter.',
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID",
      },
      name: {
        type: "string",
        description: "Session name",
      },
      mission: {
        type: "string",
        description: "Rich HTML mission/charter",
      },
      sessionType: {
        type: "string",
        description: 'Free-text type, e.g. "Exploratory", "Regression"',
      },
      config: {
        type: "string",
      },
      environment: {
        type: "string",
      },
      releaseId: {
        type: "string",
        description: "Attach session to this release",
      },
      assigneeUserId: {
        type: "string",
        description:
          'User _id ("user_abc...") OR email address — both accepted. Email is looked up server-side.',
      },
      state: {
        type: "string",
        description:
          'Workflow state (default "new"). Either canonical ("under_review") or display ("Under review") form — server normalizes to lowercase+underscored so UI colors render correctly.',
      },
      estimate: {
        type: "integer",
        minimum: 0,
        description: "Estimate in minutes",
      },
      tags: {
        type: "array",
        items: {
          type: "string",
        },
        description:
          'Array of tag strings, e.g. ["exploratory","auth"]. NOT a comma-separated string.',
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
          "Array of linked-issue objects (same shape as list_sessions returns).",
      },
      attachments: {
        description:
          "Not supported over MCP: any value is refused with a 400. Tell the user to upload files in the TestDino UI.",
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

export async function handleCreateSession(args?: CreateSessionArgs) {
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
    const url = endpoints.createSession(String(projectId));
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
    throw new Error(`Failed to create session: ${msg}`, { cause: error });
  }
}
