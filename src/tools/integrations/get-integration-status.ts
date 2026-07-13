import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface GetIntegrationStatusArgs {
  token?: string;
  projectId: string;
  provider?: "jira" | "monday";
}

export const getIntegrationStatusTool = {
  name: "get_integration_status",
  description:
    "Reports whether third-party integrations (Jira, monday.com) are connected for a project. " +
    "Call this before create_external_issue or connect_integration to check which providers are already active. " +
    "Omit provider to return status for all integrations; supply a provider to check one specifically.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID (Required). The TestDino project identifier.",
      },
      provider: {
        type: "string",
        enum: ["jira", "monday"],
        description:
          "Integration provider to check. Omit to return status for all providers.",
      },
    },
    required: ["projectId"],
  },
};

export async function handleGetIntegrationStatus(
  args?: GetIntegrationStatusArgs
) {
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

  try {
    const url = endpoints.getIntegrationStatus({
      projectId: String(args.projectId),
      ...(args.provider ? { provider: String(args.provider) } : {}),
    });

    const response = await apiRequestJson<unknown>(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get integration status: ${errorMessage}`);
  }
}
