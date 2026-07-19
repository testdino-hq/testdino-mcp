import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface ExternalIssueSource {
  type: string;
  id: string;
  runId?: string;
  testRunId?: string;
  caseId?: string;
}

interface CreateExternalIssueArgs {
  token?: string;
  projectId: string;
  provider: "jira" | "linear" | "asana" | "monday" | "github";
  source: ExternalIssueSource;
  summary?: string;
  description?: string;
  target?: Record<string, unknown>;
  linkBack?: boolean;
  idempotencyKey?: string;
  preview?: boolean;
}

export const createExternalIssueTool = {
  name: "create_external_issue",
  description:
    "Files an issue in a connected provider (Jira, Linear, Asana, monday.com, GitHub) from a TestDino source entity. " +
    "source.type and source.id are required — they identify the TestDino entity (e.g. a test case or test run) the issue is about; the server resolves them into the issue draft. " +
    "Pass preview: true to see what would be created without creating it. Idempotent when idempotencyKey is supplied — safe to retry with the same key. " +
    "Call get_integration_status first (with includeCreateOptions: true to discover the provider fields available for target). " +
    "If the provider is not connected, this returns INTEGRATION_NOT_CONNECTED with a connect URL — show that URL to the user, do not open it programmatically.",
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
        description: "Integration provider to file the issue in (Required).",
      },
      source: {
        type: "object",
        description:
          "TestDino source entity the issue is about (Required). Both fields are required.",
        properties: {
          type: {
            type: "string",
            enum: [
              "test_case",
              "test_run",
              "test_suite",
              "manual_test_case",
              "manual_test_suite",
              "release",
              "manual_run",
              "manual_run_test_case",
              "session",
            ],
            description:
              "Source entity type. Use manual_test_case / manual_run / session for TCM entities and test_case / test_run / test_suite for automated ones.",
          },
          id: {
            type: "string",
            description:
              "Source entity ID, counter-style ID, or key within TestDino.",
          },
          runId: {
            type: "string",
            description:
              "Parent automated/manual run ID when the source is a run-scoped test case.",
          },
          testRunId: {
            type: "string",
            description: "Alias for runId for automated test cases.",
          },
          caseId: {
            type: "string",
            description:
              "Underlying test case ID when id is a run-test-case row/reference.",
          },
        },
        required: ["type", "id"],
      },
      summary: {
        type: "string",
        description:
          "Issue title/summary. Optional — derived from the source entity when omitted.",
      },
      description: {
        type: "string",
        description: "Issue description body. Supports plain text.",
      },
      target: {
        type: "object",
        description:
          "Provider-specific destination fields (e.g. Jira project key and issue type, monday board ID). Discover available fields via get_integration_status with includeCreateOptions: true.",
        additionalProperties: true,
      },
      linkBack: {
        type: "boolean",
        description:
          "When true, the created issue is linked back to the TestDino source entity (currently supported for Jira).",
      },
      idempotencyKey: {
        type: "string",
        minLength: 1,
        description:
          "Unique key to prevent duplicate issues on retry. Use a stable identifier such as the source entity ID.",
      },
      preview: {
        type: "boolean",
        description:
          "When true, returns the draft that would be created (wouldCreate: false) without filing the issue.",
      },
    },
    required: ["projectId", "provider", "source"],
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

  if (!args?.source?.type || !args?.source?.id) {
    throw new Error(
      "source.type and source.id are required — identify the TestDino entity (e.g. a test case or test run) the issue is about"
    );
  }

  try {
    const url = endpoints.createExternalIssue({
      projectId: String(args.projectId),
      provider: String(args.provider),
    });

    const source: Record<string, string> = {
      type: String(args.source.type),
      id: String(args.source.id),
    };
    if (args.source.runId !== undefined) {
      source.runId = String(args.source.runId);
    }
    if (args.source.testRunId !== undefined) {
      source.testRunId = String(args.source.testRunId);
    }
    if (args.source.caseId !== undefined) {
      source.caseId = String(args.source.caseId);
    }

    const body: Record<string, unknown> = { source };

    if (args.summary !== undefined) {
      body.summary = String(args.summary);
    }
    if (args.description !== undefined) {
      body.description = String(args.description);
    }
    if (args.target !== undefined) {
      body.target = args.target;
    }
    if (args.linkBack !== undefined) {
      body.linkBack = args.linkBack;
    }
    if (args.idempotencyKey !== undefined) {
      body.idempotencyKey = String(args.idempotencyKey);
    }
    if (args.preview !== undefined) {
      body.preview = args.preview;
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
