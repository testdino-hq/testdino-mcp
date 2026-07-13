import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface CreateExternalIssueArgs {
  token?: string;
  projectId: string;
  provider: "jira" | "monday";
  idempotencyKey: string;
  summary: string;
  description?: string;
  source?: string;
  linkBack?: boolean;
  providerFields?: Record<string, unknown>;
}

export const createExternalIssueTool = {
  name: "create_external_issue",
  description:
    "Files a Jira or monday.com issue from a TestDino test failure. " +
    "Idempotent — safe to retry with the same idempotencyKey without creating duplicates. " +
    "Call get_integration_status first to confirm the provider is connected. " +
    "Returns the created issue details including the external issue ID and a link to the issue in the provider's UI.",
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
        description: "Integration provider to file the issue in (Required).",
      },
      idempotencyKey: {
        type: "string",
        description:
          "Unique key to prevent duplicate issues (Required). Use a stable identifier such as the test case ID or a combination of run ID and test name.",
      },
      summary: {
        type: "string",
        description: "Issue title/summary (Required).",
      },
      description: {
        type: "string",
        description: "Issue description body. Supports plain text.",
      },
      source: {
        type: "string",
        description:
          "Source context string — e.g. the test case ID or run ID that triggered this issue.",
      },
      linkBack: {
        type: "boolean",
        description:
          "When true, the created issue includes a link back to the TestDino test run. Defaults to true.",
      },
      providerFields: {
        type: "object",
        description:
          "Provider-specific fields (e.g. Jira project key, issue type, monday board ID). Pass any fields the provider requires beyond the standard ones above.",
        additionalProperties: true,
      },
    },
    required: ["projectId", "provider", "idempotencyKey", "summary"],
  },
};

export async function handleCreateExternalIssue(
  args?: CreateExternalIssueArgs
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

  if (!args?.idempotencyKey) {
    throw new Error("idempotencyKey is required");
  }

  if (!args?.summary) {
    throw new Error("summary is required");
  }

  try {
    const url = endpoints.createExternalIssue(String(args.projectId));

    const body: Record<string, unknown> = {
      provider: String(args.provider),
      idempotencyKey: String(args.idempotencyKey),
      summary: String(args.summary),
    };

    if (args.description !== undefined) {
      body.description = String(args.description);
    }
    if (args.source !== undefined) {
      body.source = String(args.source);
    }
    if (args.linkBack !== undefined) {
      body.linkBack = args.linkBack;
    }
    if (args.providerFields !== undefined) {
      body.providerFields = args.providerFields;
    }

    const response = await apiRequestJson<unknown>(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
    });

    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create external issue: ${errorMessage}`);
  }
}
