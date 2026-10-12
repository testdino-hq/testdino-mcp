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
  title: "Create External Issue",
  description:
    "Create a provider issue/task/item linked to a TestDino entity. Supported source types include automated and manual runs, test cases, suites, releases, and sessions. Check get_integration_status first for required provider fields.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "TestDino project ID",
      },
      provider: {
        type: "string",
        enum: ["jira", "linear", "asana", "monday"],
        description:
          "Provider to create the issue in. GitHub can be connected but not written to.",
      },
      source: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: [
              "test_run",
              "test_suite",
              "test_case",
              "manual_test_case",
              "manual_test_suite",
              "release",
              "manual_run",
              "manual_run_test_case",
              "session",
            ],
            description:
              "TestDino entity type the external issue should be associated with.",
          },
          id: {
            type: "string",
            minLength: 1,
            description: "TestDino entity ID, counter-style ID, or key.",
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
        additionalProperties: false,
        description: "TestDino entity to link with the external issue.",
      },
      summary: {
        type: "string",
        description: "Issue title. Later phases can derive this from source.",
      },
      description: {
        type: "string",
        description:
          "Issue body/description. Later phases can derive this from source.",
      },
      target: {
        type: "object",
        additionalProperties: {},
        description:
          'Provider-specific target/field values. Jira accepts human-readable aliases such as { jiraProjectKey: "TRX", issueType: "Bug" } or { jiraProjectName, issueTypeName }; raw { jiraProjectId, issueTypeId } also works. Linear { teamId }, Asana { workspaceId, projectId }, monday.com { boardId }.',
      },
      linkBack: {
        type: "boolean",
        description:
          "Whether TestDino should link the created external issue back to the source entity.",
      },
      idempotencyKey: {
        type: "string",
        minLength: 1,
        description:
          "Caller-provided stable key for retrying the same create request without creating duplicates when supported downstream.",
      },
      preview: {
        type: "boolean",
        description:
          "When true, resolve and return the issue draft without creating anything in the provider.",
      },
    },
    required: ["projectId", "provider", "source"],
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
    throw new Error(`Failed to create external issue: ${errorMessage}`, {
      cause: error,
    });
  }
}
