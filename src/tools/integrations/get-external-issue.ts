/**
 * get_external_issue — read. Fetches one provider issue by key/ID that was
 * previously linked via `create_external_issue` (or filed manually and
 * associated with a TestDino entity).
 *
 * One issueId per call. The streaming MCP accepts an array; the stdio
 * backend only serves one — matches the underlying route
 * (`GET /:projectId/:provider/issues/:issueId`).
 *
 * For Jira, pass `defaultApp` (query param) to target a specific Atlassian
 * site when the connected account has multiple.
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";
import { INTEGRATION_PROVIDERS, assertProvider } from "./shared.js";

interface GetExternalIssueArgs {
  token?: string;
  projectId: string;
  provider: string;
  issueId: string;
  defaultApp?: string;
}

export const getExternalIssueTool = {
  name: "get_external_issue",
  description:
    "Fetch one external issue/task by its provider key or ID — for example a Jira key like TD-17, a Linear identifier, or a monday.com item ID. Use this to inspect the state or details of an issue previously linked to TestDino (or filed manually and associated with a TestDino entity). " +
    "The stdio backend gates on provider connection status: a disconnected provider returns 409 with nextTool='connect_integration'. " +
    "For Jira accounts with multiple Atlassian sites, pass `defaultApp` to target a specific site.",
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
          "Integration provider. One of: jira, linear, asana, monday, github.",
      },
      issueId: {
        type: "string",
        description:
          "External issue ID or key (e.g. TD-17 for Jira, or the provider's issue identifier).",
      },
      defaultApp: {
        type: "string",
        description:
          "Optional Jira-only hint. Target Atlassian site/resource when the connected account has multiple.",
      },
    },
    required: ["projectId", "provider", "issueId"],
  },
};

export async function handleGetExternalIssue(args?: GetExternalIssueArgs) {
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

  if (typeof args.issueId !== "string" || !args.issueId.trim()) {
    throw new Error("issueId is required");
  }

  try {
    const url = endpoints.getExternalIssue({
      projectId: String(args.projectId),
      provider,
      issueId: args.issueId,
      defaultApp:
        typeof args.defaultApp === "string" && args.defaultApp.trim()
          ? args.defaultApp
          : undefined,
    });

    const response = await apiRequestJson(url, {
      headers: { Authorization: `Bearer ${token}` },
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
    throw new Error(`Failed to get external issue: ${errorMessage}`);
  }
}
