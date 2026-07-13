import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface ConnectIntegrationArgs {
  token?: string;
  projectId: string;
  provider: "jira" | "linear" | "asana" | "monday" | "github";
  orgId?: string;
}

export const connectIntegrationTool = {
  name: "connect_integration",
  description:
    "Returns an OAuth connect URL for the requested integration provider (Jira, Linear, Asana, monday.com, GitHub). " +
    "Show the returned URL to the user — do NOT open it programmatically. The user must visit it in their browser to authorize the connection. " +
    "Call get_integration_status first to check whether the provider is already connected; if it is, this returns status already_connected instead of a URL.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID (Required). The TestDino project identifier.",
      },
      provider: {
        type: "string",
        enum: ["jira", "linear", "asana", "monday", "github"],
        description: "Integration provider to connect (Required).",
      },
      orgId: {
        type: "string",
        description:
          "Organization ID. Optional — derived from your PAT scopes when omitted; pass it explicitly if your PAT spans multiple organizations.",
      },
    },
    required: ["projectId", "provider"],
  },
};

export async function handleConnectIntegration(args?: ConnectIntegrationArgs) {
  const token = getApiKey(args);

  if (!token) {
    throw new Error(
      "Missing TESTDINO_PAT environment variable. " +
        "Please configure it in your .cursor/mcp.json file under the 'env' section."
    );
  }

  if (!args?.projectId) {
    throw new Error("projectId is required");
  }

  if (!args?.provider) {
    throw new Error("provider is required");
  }

  try {
    const url = endpoints.connectIntegration({
      projectId: String(args.projectId),
      provider: String(args.provider),
    });

    const response = await apiRequestJson<unknown>(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: args.orgId !== undefined ? { orgId: String(args.orgId) } : {},
    });

    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to connect integration: ${errorMessage}`);
  }
}
