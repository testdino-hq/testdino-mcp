import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface GetExternalIssueArgs {
  token?: string;
  projectId: string;
  provider: "jira" | "linear" | "asana" | "monday" | "github";
  // Mirrors the streaming MCP tool: accepts one OR many issue IDs. The stdio
  // backend serves a single issue per request (path param), so the handler
  // fetches each ID and aggregates — the AI-facing contract stays the array
  // shape the streaming tool exposes.
  issueIds: string[];
  // Provider-specific read context (e.g. Jira `{ defaultApp }` to read from a
  // specific Atlassian site). Flattened into the query string.
  target?: Record<string, string | number | boolean>;
}

export const getExternalIssueTool = {
  name: "get_external_issue",
  description:
    "Fetches previously created external issues (Jira, Linear, Asana, monday.com, GitHub) by their issue IDs or keys. " +
    "Returns current issue details including status in the external provider. " +
    "Use this to check whether issues filed via create_external_issue are still open or have been resolved.",
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
        description:
          "Integration provider the issue lives in (Required). Use the same provider passed to create_external_issue.",
      },
      issueIds: {
        type: "array",
        items: { type: "string", minLength: 1 },
        minItems: 1,
        description:
          "External issue IDs or keys (Required). Array of one or more IDs previously linked to TestDino (e.g. Jira keys like 'TD-17' or Linear identifiers).",
      },
      target: {
        type: "object",
        additionalProperties: true,
        description:
          "Provider-specific read context (optional). For Jira, pass { defaultApp } to read from a specific Atlassian site/resource.",
      },
    },
    required: ["projectId", "provider", "issueIds"],
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

  if (!args?.provider) {
    throw new Error("provider is required");
  }

  if (!Array.isArray(args?.issueIds) || args.issueIds.length === 0) {
    throw new Error("issueIds is required (a non-empty array of issue IDs)");
  }

  try {
    // Fetch each issue against the single-issue backend and aggregate. A failed
    // ID surfaces as an error entry rather than aborting the whole call, so one
    // stale/unknown ID does not hide the issues that resolved fine.
    const results = await Promise.all(
      args.issueIds.map(async (rawId) => {
        const issueId = String(rawId);
        const url = endpoints.getExternalIssue({
          projectId: String(args.projectId),
          provider: String(args.provider),
          issueId,
          target: args.target,
        });
        try {
          const issue = await apiRequestJson<unknown>(url, {
            headers: { Authorization: `Bearer ${token}` },
          });
          return { issueId, issue };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          return { issueId, error: message };
        }
      })
    );

    // Preserve the single-issue response shape when exactly one ID is requested,
    // so simple lookups read the same as before; return the array otherwise.
    const payload =
      results.length === 1 && results[0].error === undefined
        ? results[0].issue
        : { issues: results };

    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get external issue: ${errorMessage}`);
  }
}
