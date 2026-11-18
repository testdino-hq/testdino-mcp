/**
 * Health tool - Health check and PAT validation
 */

import { endpoints } from "../lib/endpoints.js";
import { apiRequestJson } from "../lib/request.js";
import { getApiKey } from "../lib/env.js";

export const healthTool = {
  name: "health",
  title: "Health Check",
  description:
    "Verifies your TestDino token, returns your account identity, and lists the organizations and projects you can access with their ids and names (orgName, projectName). Call it when you need a projectId or orgId you do not have yet. Most tools take a projectId from this list (match by projectName if the user gives a name); get_org_details takes an orgId. Reuse the id for later calls instead of calling this again. Each organization also reports your `role` in it (owner, admin, member, billing, or viewer) so you can tell the user what they can do there — treat it as informational, not a security guarantee. Wildcard scopes surface as `projects: { allProjects: true }` with no per-project names — for those, ask the user which projectId to use, or call a listing tool. Recently-renamed orgs/projects may show the old name for up to 30s (registry poll cadence). Also call this whenever you get a PROJECT_NOT_FOUND or auth error from another tool — it will tell you which projects are actually accessible.",
  inputSchema: {
    type: "object",
    properties: {},
    $schema: "http://json-schema.org/draft-07/schema#",
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false,
  },
  execution: {
    taskSupport: "forbidden",
  },
  _meta: {
    ui: {
      resourceUri: "ui://testdino/tool/health/v1",
    },
    "ui/resourceUri": "ui://testdino/tool/health/v1",
  },
};

export async function handleHealth(args?: Record<string, unknown>) {
  const token = getApiKey(args);
  if (!token) {
    throw new Error(
      "Missing TESTDINO_PAT environment variable. Please configure it in your .cursor/mcp.json file under the 'env' section."
    );
  }

  try {
    const response = await apiRequestJson<unknown>(endpoints.hello(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    return {
      content: [{ type: "text", text: JSON.stringify(response) }],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to check health: ${msg}`, { cause: error });
  }
}
