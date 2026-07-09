/**
 * create_external_issue — write. Files a provider issue/task (Jira ticket,
 * Linear issue, monday.com item, Asana task, GitHub issue) linked to a
 * TestDino entity — a test run, test case, manual run, session, release, etc.
 *
 * The stdio backend gates on connection status: a `disconnected` provider
 * returns a 409 with `nextTool: 'connect_integration'`. Pre-flight with
 * `get_integration_status` first.
 *
 * For providers other than GitHub, the source entity is auto-resolved
 * server-side into a title + description if the caller doesn't supply them.
 *
 * `preview: true` returns the resolved draft without actually creating —
 * useful when the AI wants to confirm the payload with the user first.
 *
 * `idempotencyKey` is a caller-supplied stable string; the backend uses it
 * to dedupe retries without creating duplicate issues (where supported).
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";
import {
  EXTERNAL_ISSUE_SOURCE_TYPES,
  INTEGRATION_PROVIDERS,
  assertProvider,
} from "./shared.js";

interface CreateExternalIssueArgs {
  token?: string;
  projectId: string;
  provider: string;
  source: {
    type: string;
    id: string;
    runId?: string;
    testRunId?: string;
    caseId?: string;
  };
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
    "Create a provider issue/task/item (Jira ticket, Linear issue, monday.com item, Asana task, GitHub issue) linked to a TestDino entity — a test run, test case, session, release, or manual-testing artifact. " +
    "Prerequisite: call get_integration_status first. When the provider is disconnected the backend returns a 409 with nextTool='connect_integration'. " +
    "For non-GitHub providers, the source entity is auto-resolved into a title + description server-side if you don't pass `summary`/`description`. " +
    "Set preview=true to return the resolved draft WITHOUT filing anything — use when the user needs to confirm the payload first. " +
    "Pass a stable `idempotencyKey` when retrying to avoid duplicate issues (where supported downstream). " +
    "linkBack=true asks TestDino to store the external issue key onto the source entity so it shows up in the TestDino UI (currently supported for Jira; other providers return a partial success).",
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
      source: {
        type: "object",
        description:
          "TestDino entity to link with the external issue. `type` picks the entity kind; `id` is the entity ID/key/counter. Provide `runId` (or `testRunId`) when the source is a run-scoped test case; `caseId` when `id` is a run-test-case row reference.",
        properties: {
          type: {
            type: "string",
            enum: [...EXTERNAL_ISSUE_SOURCE_TYPES],
            description: "TestDino entity type.",
          },
          id: {
            type: "string",
            description:
              "TestDino entity ID, counter-style ID, or key (e.g. TC-1, MTC-3, tr_abc123).",
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
              "Underlying test case ID when `id` is a run-test-case row/reference.",
          },
        },
        required: ["type", "id"],
      },
      summary: {
        type: "string",
        description:
          "Issue title. Optional — non-GitHub providers auto-derive it from the source entity when omitted.",
      },
      description: {
        type: "string",
        description:
          "Issue body/description. Optional — non-GitHub providers auto-derive it from the source entity when omitted.",
      },
      target: {
        type: "object",
        description:
          "Provider-specific target/field values. Jira: { jiraProjectKey, issueType } or { jiraProjectName, issueTypeName } or raw { jiraProjectId, issueTypeId }. Linear: { teamId }. Asana: { workspaceId, projectId }. monday.com: { boardId }. Use get_integration_status(includeCreateOptions=true, target) to discover required fields.",
        additionalProperties: true,
      },
      linkBack: {
        type: "boolean",
        description:
          "When true, TestDino stores the external issue reference on the source entity so it renders in the TestDino UI. Currently full support for Jira; other providers return a partial success shape.",
      },
      idempotencyKey: {
        type: "string",
        description:
          "Caller-supplied stable string to dedupe retries. Prevents duplicate issues on a resend (where the downstream provider supports it).",
      },
      preview: {
        type: "boolean",
        description:
          "When true, resolve the source entity and return the draft WITHOUT creating the external issue. Use this to confirm the payload with the user before committing.",
      },
    },
    required: ["projectId", "provider", "source"],
  },
};

function assertSource(source: unknown): CreateExternalIssueArgs["source"] {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new Error("source is required and must be an object");
  }
  const s = source as Record<string, unknown>;
  if (typeof s.type !== "string" || !s.type.trim()) {
    throw new Error("source.type is required");
  }
  if (!(EXTERNAL_ISSUE_SOURCE_TYPES as readonly string[]).includes(s.type)) {
    throw new Error(
      `source.type '${s.type}' is invalid. Use one of: ${EXTERNAL_ISSUE_SOURCE_TYPES.join(", ")}`
    );
  }
  if (typeof s.id !== "string" || !s.id.trim()) {
    throw new Error("source.id is required");
  }
  return {
    type: s.type,
    id: s.id,
    runId: typeof s.runId === "string" ? s.runId : undefined,
    testRunId: typeof s.testRunId === "string" ? s.testRunId : undefined,
    caseId: typeof s.caseId === "string" ? s.caseId : undefined,
  };
}

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

  const provider = assertProvider(args.provider);
  const source = assertSource(args.source);

  try {
    const url = endpoints.createExternalIssue({
      projectId: String(args.projectId),
      provider,
    });

    const body: Record<string, unknown> = { source };
    if (typeof args.summary === "string" && args.summary.trim()) {
      body.summary = args.summary;
    }
    if (typeof args.description === "string" && args.description.trim()) {
      body.description = args.description;
    }
    if (args.target && typeof args.target === "object") {
      body.target = args.target;
    }
    if (typeof args.linkBack === "boolean") {
      body.linkBack = args.linkBack;
    }
    if (typeof args.idempotencyKey === "string" && args.idempotencyKey.trim()) {
      body.idempotencyKey = args.idempotencyKey;
    }
    if (args.preview === true) {
      body.preview = true;
    }

    const response = await apiRequestJson(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
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
    throw new Error(`Failed to create external issue: ${errorMessage}`);
  }
}
