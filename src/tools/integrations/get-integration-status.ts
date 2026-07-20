import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface GetIntegrationStatusArgs {
  token?: string;
  projectId: string;
  provider: "jira" | "linear" | "asana" | "monday" | "github";
  includeCreateOptions?: boolean;
  target?: Record<string, string | number | boolean>;
}

export const getIntegrationStatusTool = {
  name: "get_integration_status",
  description:
    "Reports whether a third-party integration (Jira, Linear, Asana, monday.com, GitHub) is connected for a project. " +
    "Call this before create_external_issue or connect_integration to check whether the provider is already active. " +
    "Set includeCreateOptions to true to also fetch the fields available for issue creation (provider projects, issue types, required/optional/custom fields).",
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
        description: "Integration provider to check (Required).",
      },
      includeCreateOptions: {
        type: "boolean",
        description:
          "When true, the response also includes createOptions: provider projects, issue types, and required/optional/custom fields for create_external_issue.",
      },
      target: {
        type: "object",
        additionalProperties: true,
        description:
          "Provider-specific target/field values (optional) used to resolve createOptions against a specific target instead of the provider default. Examples: Jira { jiraProjectKey, issueType }, Linear { teamId }, Asana { workspaceId, projectId }, monday { boardId }.",
      },
    },
    required: ["projectId", "provider"],
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

  if (!args?.provider) {
    throw new Error("provider is required");
  }

  try {
    const url = endpoints.getIntegrationStatus({
      projectId: String(args.projectId),
      provider: String(args.provider),
      ...(args.includeCreateOptions !== undefined
        ? { includeCreateOptions: args.includeCreateOptions }
        : {}),
      ...(args.target ? { target: args.target } : {}),
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
