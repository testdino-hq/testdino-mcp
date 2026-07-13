import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface GetExternalIssueArgs {
  token?: string;
  projectId: string;
  provider: "jira" | "linear" | "asana" | "monday" | "github";
  issueId: string;
}

export const getExternalIssueTool = {
  name: "get_external_issue",
  description:
    "Fetches a previously created external issue (Jira, Linear, Asana, monday.com, GitHub) by its issue ID. " +
    "Returns current issue details including its status in the external provider. " +
    "Use this to check whether an issue filed via create_external_issue is still open or has been resolved.",
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
      issueId: {
        type: "string",
        description:
          "External issue ID (Required). The ID returned by create_external_issue.",
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

  if (!args?.provider) {
    throw new Error("provider is required");
  }

  if (!args?.issueId) {
    throw new Error("issueId is required");
  }

  try {
    const url = endpoints.getExternalIssue({
      projectId: String(args.projectId),
      provider: String(args.provider),
      issueId: String(args.issueId),
    });

    const response = await apiRequestJson<unknown>(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get external issue: ${errorMessage}`);
  }
}
