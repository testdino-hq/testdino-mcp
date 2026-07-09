/**
 * connect_integration — write. Kicks off the OAuth/connect flow for a
 * TestDino project + provider. Returns a connect URL that the AI client
 * should surface to the user for them to click through in a browser.
 *
 * The stdio backend short-circuits with an `already_connected` payload when
 * the provider is already connected — no OAuth URL is minted in that case.
 *
 * DO NOT auto-open the returned URL from the npm client. MCP transports are
 * stdio; opening browsers server-side is not the client's job. Return the
 * URL as tool output and let the AI client render it to the user.
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";
import { INTEGRATION_PROVIDERS, assertProvider } from "./shared.js";

interface ConnectIntegrationArgs {
  token?: string;
  projectId: string;
  provider: string;
  orgId?: string;
}

export const connectIntegrationTool = {
  name: "connect_integration",
  description:
    "Start the provider OAuth/connect flow for a TestDino project. Returns either { connected: true, status: 'already_connected' } when the provider is already wired, or a browser-openable connect URL the user must click through. " +
    "Do NOT auto-open the URL — surface it to the user in your response so they can open it themselves. " +
    "Pass `orgId` when the caller's PAT spans multiple TestDino organizations; otherwise it's inferred from the PAT scope.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID (Required). The TestDino project identifier.",
      },
      provider: {
        type: "string",
        enum: [...INTEGRATION_PROVIDERS],
        description:
          "Integration provider to connect. One of: jira, linear, asana, monday, github.",
      },
      orgId: {
        type: "string",
        description:
          "TestDino organization ID. Optional — inferred from the PAT scope when the token belongs to a single org. Pass explicitly if the PAT spans multiple orgs.",
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

  const provider = assertProvider(args.provider);

  try {
    const url = endpoints.connectIntegration({
      projectId: String(args.projectId),
      provider,
    });

    const orgId =
      typeof args.orgId === "string" && args.orgId.trim()
        ? args.orgId.trim()
        : undefined;

    const response = await apiRequestJson(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: orgId ? { orgId } : {},
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to connect integration: ${errorMessage}`);
  }
}
