/**
 * Update manual test case tool
 */

import { endpoints } from "../../lib/endpoints.js";
import { ApiError, apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

type TestStep = Record<string, unknown>;
type FileData = Record<string, unknown>;

interface ManualTestCaseUpdates {
  name?: string; // Updated test case name/title
  description?: string;
  status?: "Active" | "Draft" | "Deprecated";
  testStepsDeclarationType?: "Classic" | "Gherkin";
  preconditions?: string;
  postconditions?: string;
  steps?: TestStep[];
  priority?: "high" | "medium" | "low" | "Not set";
  severity?:
    | "Blocker"
    | "critical"
    | "major"
    | "Normal"
    | "minor"
    | "trivial"
    | "Not set";
  type?:
    | "functional"
    | "smoke"
    | "regression"
    | "security"
    | "performance"
    | "e2e"
    | "Integration"
    | "API"
    | "Unit"
    | "Accessability"
    | "Compatibility"
    | "Acceptance"
    | "Exploratory"
    | "Usability"
    | "Other";
  layer?: "e2e" | "api" | "unit" | "not set";
  behavior?: "positive" | "negative" | "destructive" | "Not set";
  automationStatus?: "Manual" | "Automated" | "To be automated";
  tags?: string;
  flags?: ("To be Automated" | "Is flaky" | "Muted")[];
  attachments?: {
    add?: FileData[];
    remove?: string[]; // Array of attachment IDs or URLs to remove
  };
  customFields?: Record<string, string>; // Custom fields as key-value pairs
  comments?: string[]; // Each string becomes a new comment on the case (PAT owner is author). 20-comments-per-case cap is enforced server-side.
  issues?: string[]; // Jira ticket keys (e.g. "PROJ-123"). Server resolves each via the project's connected Jira and saves with title+url, or as a plain stub if Jira is unavailable or the ticket isn't found — same fallback as the UI.
}

interface UpdateManualTestCaseArgs {
  projectId: string;
  caseId: string;
  updates: ManualTestCaseUpdates;
}

export const updateManualTestCaseTool = {
  name: "update_manual_test_case",
  title: "Update Manual Test Case",
  description:
    'Modify an existing manual test case. Send only the fields you want to change inside the updates object — omit everything else. Requires write permission. IMPORTANT: steps is a full replacement — passing a steps array overwrites all existing steps. Always call get_manual_test_case() first to read current steps before modifying them. For attachments use the nested shape: { add: ["url-or-path"], remove: ["attachment-id"] } — you can add and remove in the same call. Suggestion: adding attachments via the hosted MCP can be token-expensive — for lower token usage, consider the TestDino UI or the local `testdino-mcp` npm package. To add comments, pass updates.comments as an array of comment-body strings — each is appended as a new comment (PAT owner is author). Cap of 20 comments/case is enforced. To link issues, pass updates.issues as an array of ticket keys (e.g. ["PROJ-123","ENG-9"]). Every key is looked up in the project\'s connected trackers (Jira and/or Linear) and must resolve in exactly one — the whole call fails with 409 INTEGRATION_NOT_CONNECTED when neither is connected (tell the user to connect Jira or Linear in Settings → Integrations), 400 naming a key that exists in both trackers (pass that entry as { "provider": "jira" | "linear", "displayId": "KEY" } instead of a bare string), or 400 naming the keys that do not resolve. Nothing is written unless all keys resolve. Duplicate displayIds on the case are skipped.',
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID",
      },
      caseId: {
        type: "string",
        description: 'Internal _id or "TC-123" style ID',
      },
      updates: {
        type: "object",
        additionalProperties: {},
        description:
          "Fields to update: title (alias: name), description, preconditions, postconditions, status, steps, priority, severity, type, layer, behavior, automationStatus, tags, flags, attachments {add, remove}, customFields, comments (array of strings to append), issues (array of ticket keys to link, resolved against the connected Jira / Linear)…",
      },
    },
    required: ["projectId", "caseId", "updates"],
    additionalProperties: false,
    $schema: "http://json-schema.org/draft-07/schema#",
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
  },
  execution: {
    taskSupport: "forbidden",
  },
};

export async function handleUpdateManualTestCase(
  args?: UpdateManualTestCaseArgs
) {
  // Read PAT from environment variable (set in mcp.json) or from args
  const token = getApiKey(args);

  if (!token) {
    throw new Error(
      "Missing TESTDINO_PAT environment variable. " +
        "Please configure it in your .cursor/mcp.json file under the 'env' section."
    );
  }

  // Validate required parameters
  if (!args?.projectId) {
    throw new Error("projectId is required");
  }
  if (!args?.caseId) {
    throw new Error("caseId is required");
  }
  if (!args?.updates || typeof args.updates !== "object") {
    throw new Error("updates object is required");
  }

  // The server strips linkedTests from the generic update (links go through the
  // gated, audited link path), so forwarding it would return 200 and change nothing.
  if ("linkedTests" in args.updates) {
    const message =
      "updates.linkedTests is not writable here. Use link_automated_test (one case) or bulk_link_automated_tests (many) to link automated tests, and unlink_automated_test to remove a link.";
    throw new ApiError(message, 400, { success: false, message });
  }

  try {
    const body = { updates: args.updates };

    const updateManualTestCaseUrl = endpoints.updateManualTestCase(
      String(args.projectId),
      String(args.caseId)
    );

    const response = await apiRequestJson<unknown>(updateManualTestCaseUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
    throw new Error(`Failed to update manual test case: ${errorMessage}`, {
      cause: error,
    });
  }
}
