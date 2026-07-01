/**
 * Update manual test case tool
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";
import {
  processAttachments,
  processStepAttachments,
  FileData,
} from "../../lib/file-utils.js";
import type { TestStep } from "../../lib/file-utils.js";

interface ManualTestCaseUpdates {
  name?: string; // Updated test case name/title
  description?: string;
  status?: string;
  testStepsDeclarationType?: "Classic" | "Gherkin";
  preconditions?: string;
  postconditions?: string;
  steps?: TestStep[];
  priority?: string;
  severity?: string;
  type?: string;
  layer?: string;
  behavior?: string;
  automationStatus?: string;
  tags?: string;
  flags?: ("To be Automated" | "Is flaky" | "Muted")[];
  attachments?: {
    add?: (FileData | string)[]; // Processed attachments: FileData objects for local files, strings for URLs
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
  description:
    "Update an existing manual test case. Use this to modify test case details, steps, status, priority, or any other fields. Provide only the fields you want to update in the updates object. " +
    "To add comments, pass `updates.comments` as an array of strings — each becomes a new comment (PAT owner is author). " +
    "To link Jira issues, pass `updates.issues` as an array of ticket keys (e.g. ['PROJ-123']); the server looks each up in the project's connected Jira and saves with title+url, or as a plain text stub when Jira isn't connected or the ticket isn't found (same fallback as the UI).",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID (Required). The TestDino project identifier.",
      },
      caseId: {
        type: "string",
        description:
          "Test case ID (Required). Can be internal _id or human-readable ID like 'TC-123'.",
      },
      updates: {
        type: "object",
        description:
          "Object containing the fields to update. Can include: name, description, steps, status, priority, severity, type, layer, behavior, preconditions, postconditions, automationStatus, tags, flags, attachments, customFields, etc.",
        properties: {
          name: {
            type: "string",
            description: "Updated test case name/title.",
          },
          description: {
            type: "string",
            description: "Updated description.",
          },
          status: {
            type: "string",
            description:
              "Updated status. Values come from Project Settings → Test Case Properties. Defaults: Active, Draft, Deprecated.",
          },
          testStepsDeclarationType: {
            type: "string",
            description: "Updated test steps declaration type.",
            enum: ["Classic", "Gherkin"],
          },
          preconditions: {
            type: "string",
            description: "Updated preconditions.",
          },
          postconditions: {
            type: "string",
            description: "Updated postconditions.",
          },
          steps: {
            type: "array",
            description:
              "Updated test steps array. For Classic format: action, expectedResult, and optional data. For Gherkin format: event and stepDescription. Each top-level step can include attachments as URLs or local file paths.",
            items: {
              type: "object",
              oneOf: [
                {
                  properties: {
                    action: {
                      type: "string",
                      description:
                        "The action to perform in this step (Classic format).",
                    },
                    expectedResult: {
                      type: "string",
                      description:
                        "The expected outcome of this action (Classic format).",
                    },
                    data: {
                      type: "string",
                      description:
                        "Optional test data for this step (Classic format).",
                    },
                    attachments: {
                      type: "array",
                      description:
                        "Optional top-level step attachments as URLs or local file paths.",
                      items: { type: "string" },
                    },
                  },
                },
                {
                  properties: {
                    event: {
                      type: "string",
                      enum: ["Given", "When", "And", "Then", "But"],
                    },
                    stepDescription: { type: "string" },
                    keyword: {
                      type: "string",
                      enum: ["Given", "When", "And", "Then", "But"],
                    },
                    text: { type: "string" },
                    attachments: {
                      type: "array",
                      description:
                        "Optional top-level step attachments as URLs or local file paths.",
                      items: { type: "string" },
                    },
                  },
                },
              ],
            },
          },
          priority: {
            type: "string",
            description:
              "Updated priority. Values come from Project Settings → Test Case Properties. Defaults: Critical, High, Medium, Low, Not Set.",
          },
          severity: {
            type: "string",
            description:
              "Updated severity. Values come from Project Settings → Test Case Properties. Defaults: Blocker, Critical, Major, Normal, Minor, Trivial, Not Set.",
          },
          type: {
            type: "string",
            description:
              "Updated type. Values come from Project Settings → Test Case Properties. Defaults include Smoke, Regression, Functional, API, Unit, E2E, Other.",
          },
          layer: {
            type: "string",
            description:
              "Updated layer. Values come from Project Settings → Test Case Properties. Defaults: E2E, API, Unit, Not Set.",
          },
          behavior: {
            type: "string",
            description:
              "Updated behavior. Values come from Project Settings → Test Case Properties. Defaults: Positive, Negative, Destructive, Not Set.",
          },
          automationStatus: {
            type: "string",
            description:
              "Updated automation status. Values come from Project Settings → Test Case Properties. Defaults: Manual, Automated, To Be Automated.",
          },
          tags: {
            type: "string",
            description: "Updated tags.",
          },
          flags: {
            type: "array",
            description: "Updated automation flags/checklist options.",
            items: {
              type: "string",
              enum: ["To be Automated", "Is flaky", "Muted"],
            },
          },
          attachments: {
            type: "object",
            description: "Add or remove attachments (up to 10MB each).",
            properties: {
              add: {
                type: "array",
                description: "Array of attachment URLs or file paths to add.",
                items: { type: "string" },
              },
              remove: {
                type: "array",
                description: "Array of attachment IDs or URLs to remove.",
                items: { type: "string" },
              },
            },
          },
          customFields: {
            type: "object",
            description:
              "Updated custom fields as key-value pairs. Only available if custom fields are configured in test case management settings.",
            additionalProperties: {
              type: "string",
            },
          },
          comments: {
            type: "array",
            description:
              "Array of comment bodies to append to the test case. Each string becomes a new comment with the PAT owner as the author. The server enforces a cap of 20 comments per case; entries past the cap are rejected.",
            items: { type: "string" },
          },
          issues: {
            type: "array",
            description:
              "Array of Jira ticket keys to link to the test case (e.g. ['PROJ-123', 'ENG-45']). The server resolves each key against the project's connected Jira: tickets that are found are saved with title and URL; tickets that aren't found (or if no Jira is connected) are saved as plain text stubs — same fallback as the UI's add-issue flow. Duplicate links for the same ticket are silently skipped.",
            items: { type: "string" },
          },
        },
      },
    },
    required: ["projectId", "caseId", "updates"],
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
  if (!args?.updates) {
    throw new Error("updates object is required");
  }

  try {
    // Process attachments if present: convert local file paths to file data objects (same format as UI)
    const processedUpdates = { ...args.updates };
    if (processedUpdates.steps && Array.isArray(processedUpdates.steps)) {
      processedUpdates.steps = processStepAttachments(processedUpdates.steps);
    }
    if (processedUpdates.attachments?.add) {
      processedUpdates.attachments.add = processAttachments(
        processedUpdates.attachments.add
      );
    }

    const body = { updates: processedUpdates };

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
    throw new Error(`Failed to update manual test case: ${errorMessage}`);
  }
}
