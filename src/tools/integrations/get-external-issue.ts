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
  title: "Get External Issue",
  description:
    "Fetch external issue/task details by provider IDs or keys previously linked to TestDino, such as Jira keys TD-17 or Linear issue identifiers.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "TestDino project ID",
      },
      provider: {
        type: "string",
        enum: ["jira", "linear", "asana"],
        description:
          "Provider to read issues from. monday.com and GitHub have no issue read route.",
      },
      issueIds: {
        type: "array",
        items: {
          type: "string",
          minLength: 1,
        },
        minItems: 1,
        description: "External issue IDs or keys.",
      },
      target: {
        type: "object",
        additionalProperties: {},
        description:
          "Provider-specific target/context values. For Jira, pass { defaultApp } to read from a specific Atlassian site/resource.",
      },
    },
    required: ["projectId", "provider", "issueIds"],
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
    const response = await apiRequestJson<unknown>(
      endpoints.lookupExternalIssues({
        projectId: String(args.projectId),
        provider: String(args.provider),
      }),
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: { issueIds: args.issueIds, target: args.target },
      }
    );
    return {
      content: [{ type: "text", text: JSON.stringify(response) }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get external issue: ${errorMessage}`, {
      cause: error,
    });
  }
}
