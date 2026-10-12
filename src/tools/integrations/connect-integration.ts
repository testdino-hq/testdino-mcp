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
  title: "Connect Integration",
  description:
    "Start the provider OAuth/connect flow for a TestDino project. The tool first checks current status and returns already_connected instead of starting OAuth when the provider is connected.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "TestDino project ID",
      },
      orgId: {
        type: "string",
        description:
          "TestDino organization ID. Usually inferred from the PAT scope; pass explicitly if the token spans multiple orgs.",
      },
      provider: {
        type: "string",
        enum: ["jira", "linear", "asana", "monday", "github"],
        description: "Integration provider connected to this TestDino project.",
      },
    },
    required: ["projectId", "provider"],
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
    throw new Error(`Failed to connect integration: ${errorMessage}`, {
      cause: error,
    });
  }
}
