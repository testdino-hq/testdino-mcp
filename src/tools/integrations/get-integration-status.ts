/**
 * get_integration_status — read-only. Reports whether Jira / Linear / Asana /
 * monday.com / GitHub is connected for a TestDino project, and optionally
 * returns provider-specific create-metadata (issue types, required fields,
 * boards, teams) when `includeCreateOptions=true` + a `target` context is
 * passed.
 *
 * Prerequisite for `connect_integration` (short-circuit when already
 * connected) and `create_external_issue` (which fails fast on disconnected).
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";
import { INTEGRATION_PROVIDERS, assertProvider } from "./shared.js";

interface GetIntegrationStatusArgs {
  token?: string;
  projectId: string;
  provider: string;
  includeCreateOptions?: boolean;
  target?: Record<string, unknown>;
}

function flattenTarget(
  target?: Record<string, unknown>
): Record<string, string | number | boolean | undefined | null> {
  if (!target) {
    return {};
  }
  const out: Record<string, string | number | boolean | undefined | null> = {};
  for (const [k, v] of Object.entries(target)) {
    if (v === undefined || v === null) {
      continue;
    }
    if (
      typeof v === "string" ||
      typeof v === "number" ||
      typeof v === "boolean"
    ) {
      out[k] = v;
    }
  }
  return out;
}

export const getIntegrationStatusTool = {
  name: "get_integration_status",
  description:
    "Check whether a provider (Jira, Linear, Asana, monday.com, GitHub) is connected for a TestDino project. Call this BEFORE connect_integration (short-circuits when already connected) and BEFORE create_external_issue (which fails fast on disconnected). " +
    "Pass includeCreateOptions=true + target context to also fetch provider create-metadata — required fields, issue types, boards, teams — for building create_external_issue payloads.",
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
          "Integration provider to check. One of: jira, linear, asana, monday, github.",
      },
      includeCreateOptions: {
        type: "boolean",
        description:
          "When true, ask the integration service to also return provider create-metadata (required fields, issue types, boards, teams). Combine with `target` for provider-specific scoping.",
      },
      target: {
        type: "object",
        description:
          "Provider-specific target/scoping values. Jira: { jiraProjectKey: 'TRX', issueType: 'Bug' } or { jiraProjectName, issueTypeName } or raw { jiraProjectId, issueTypeId }. Linear: { teamId }. Asana: { workspaceId, projectId }. monday.com: { boardId }. Values are flattened to query params for the transport.",
        additionalProperties: true,
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

  const provider = assertProvider(args.provider);

  try {
    const url = endpoints.getIntegrationStatus({
      projectId: String(args.projectId),
      provider,
      includeCreateOptions: args.includeCreateOptions,
      target: flattenTarget(args.target),
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
    throw new Error(`Failed to get integration status: ${errorMessage}`);
  }
}
