/**
 * Create exploratory session — requires write permission.
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";
import {
  attachmentItemSchema,
  linkedIssueItemSchema,
} from "../../lib/item-schemas.js";

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
  description:
    'Create a new exploratory testing session. Requires write permission. mission accepts rich HTML (the high-level charter). assigneeUserId accepts either a User _id ("user_abc...") or an email address — the email is resolved against TestDino users automatically. estimate is in minutes. Findings cannot be created here — add them in the UI. IMPORTANT: tags must be a JSON array of strings — e.g. ["exploratory","auth"] — NOT the comma-separated form that list_sessions accepts as a filter.',
  inputSchema: {
    type: "object",
    properties: {
      projectId: { type: "string", description: "Project ID (required)." },
      name: { type: "string", description: "Session name (required)." },
      mission: { type: "string", description: "Rich HTML mission/charter." },
      sessionType: {
        type: "string",
        description: "Free-text type, e.g. 'Exploratory'.",
      },
      config: {
        type: "string",
        description: "Configuration notes or target setup for the session.",
      },
      environment: {
        type: "string",
        description: "Environment label, e.g. 'Staging'.",
      },
      releaseId: {
        type: "string",
        description: "Attach session to this release.",
      },
      assigneeUserId: {
        type: "string",
        description:
          'User _id ("user_abc...") OR email address — both accepted. Email is looked up server-side.',
      },
      state: {
        type: "string",
        description:
          "Workflow state (default 'new'). Either canonical ('under_review') or display ('Under review') form — server normalizes to lowercase+underscored so UI colors render correctly.",
      },
      estimate: { type: "number", description: "Estimate in minutes." },
      tags: {
        type: "array",
        items: { type: "string" },
        description:
          'Array of tag strings, e.g. ["exploratory","auth"]. NOT a comma-separated string.',
      },
      linkedIssues: {
        type: "array",
        items: linkedIssueItemSchema,
        description: "Array of linked-issue objects.",
      },
      attachments: {
        type: "array",
        items: attachmentItemSchema,
        description: "Array of attachment objects or URLs.",
      },
    },
    required: ["projectId", "name"],
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
    throw new Error(`Failed to create session: ${msg}`);
  }
}
