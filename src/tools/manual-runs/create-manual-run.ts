/**
 * Create manual test run — requires write permission.
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface CreateManualRunArgs {
  projectId: string;
  name: string;
  note?: string;
  environment?: string;
  releaseId?: string;
  state?: string;
  selectionMode?: "all" | "selected";
  testCaseIds?: string[];
  suiteIds?: string[];
  includeUnsorted?: boolean;
  forecast?: unknown;
  tags?: string[];
  linkedIssues?: unknown[];
  attachments?: unknown[];
  links?: unknown[];
}

export const createManualRunTool = {
  name: "create_manual_run",
  description:
    "Create a new manual test run. Requires write permission. selectionMode controls which test cases are included: 'all' (default — every case in the project) or 'selected' (use testCaseIds and/or suiteIds to scope). releaseId attaches the run to a release. note accepts rich HTML. IMPORTANT: tags must be a JSON array of strings here — e.g. [\"smoke\",\"regression\"] — NOT the comma-separated form that list_manual_runs accepts as a filter.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: { type: "string", description: "Project ID (required)." },
      name: { type: "string", description: "Run name (required)." },
      note: { type: "string", description: "Rich HTML note." },
      environment: { type: "string", description: "Environment label, e.g. 'Staging'." },
      releaseId: { type: "string", description: "Attach run to this release." },
      state: {
        type: "string",
        description:
          "Workflow state (default 'new'). Either canonical ('in_progress') or display ('In Progress') form — server normalizes to lowercase+underscored so UI colors render correctly.",
      },
      selectionMode: { type: "string", enum: ["all", "selected"], description: "Default 'all'." },
      testCaseIds: { type: "array", items: { type: "string" } },
      suiteIds: { type: "array", items: { type: "string" } },
      includeUnsorted: { type: "boolean" },
      forecast: {},
      tags: {
        type: "array",
        items: { type: "string" },
        description: "Array of tag strings, e.g. [\"smoke\",\"regression\"]. NOT a comma-separated string.",
      },
      linkedIssues: { type: "array", items: {}, description: "Array of linked-issue objects (same shape list_manual_runs returns)." },
      attachments: { type: "array", items: {}, description: "Array of attachment objects or URLs." },
      links: { type: "array", items: {}, description: "Array of link objects." },
    },
    required: ["projectId", "name"],
  },
};

export async function handleCreateManualRun(args?: CreateManualRunArgs) {
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
    const url = endpoints.createManualRun(String(projectId));
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
    throw new Error(`Failed to create manual run: ${msg}`);
  }
}
