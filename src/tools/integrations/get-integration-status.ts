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
  title: "Get Integration Status",
  description:
    "Check whether Jira, Linear, Asana, monday.com, or GitHub is connected for a TestDino project. Call this before connect_integration or create_external_issue.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "TestDino project ID",
      },
      provider: {
        type: "string",
        enum: ["jira", "linear", "asana", "monday", "github"],
        description: "Integration provider connected to this TestDino project.",
      },
      includeCreateOptions: {
        type: "boolean",
        description:
          "When true, include provider create metadata (createOptions: projects, issue types, required/optional fields). Resolved against the provider default target when no target is supplied.",
      },
      target: {
        type: "object",
        additionalProperties: {},
        description:
          'Provider-specific target/field values. Jira accepts human-readable aliases such as { jiraProjectKey: "TRX", issueType: "Bug" } or { jiraProjectName, issueTypeName }; raw { jiraProjectId, issueTypeId } also works. Linear { teamId }, Asana { workspaceId, projectId }, monday.com { boardId }.',
      },
    },
    required: ["projectId", "provider"],
    additionalProperties: false,
    $schema: "http://json-schema.org/draft-07/schema#",
  },
  annotations: {
    readOnlyHint: true,
  },
  execution: {
    taskSupport: "forbidden",
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
    throw new Error(`Failed to get integration status: ${errorMessage}`, {
      cause: error,
    });
  }
}
