/**
 * Update manual test case tool
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";
import {
  processAttachments,
  processSubStepImages,
  validateClassicSteps,
  FileData,
} from "../../lib/file-utils.js";
import type { TestStep } from "../../lib/file-utils.js";

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
  automation?: ("To be Automated" | "Is flaky" | "Muted")[];
  attachments?: {
    add?: (FileData | string)[]; // Processed attachments: FileData objects for local files, strings for URLs
    remove?: string[]; // Array of attachment IDs or URLs to remove
  };
  customFields?: Record<string, string>; // Custom fields as key-value pairs
}

interface UpdateManualTestCaseArgs {
  projectId: string;
  caseId: string;
  updates: ManualTestCaseUpdates;
}

export const updateManualTestCaseTool = {
  name: "update_manual_test_case",
  description:
    "Update an existing manual test case. Use this to modify test case details, steps, status, priority, or any other fields. Provide only the fields you want to update in the updates object.",
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
          "Object containing the fields to update. Can include: name, description, steps, status, priority, severity, type, layer, behavior, preconditions, postconditions, automationStatus, tags, automation, attachments, customFields, etc.",
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
            description: "Updated status.",
            enum: ["Active", "Draft", "Deprecated"],
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
              "Updated test steps array. For Classic format: action, expectedResult, optional data, and optional subSteps (max 5 per step, each with optional images max 2). For Gherkin format: event and stepDescription.",
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
                    subSteps: {
                      type: "array",
                      description:
                        "Optional array of sub-steps for this step (Classic format only). Maximum 5 sub-steps per step. Each sub-step can have up to 2 images.",
                      maxItems: 5,
                      items: {
                        type: "object",
                        properties: {
                          action: {
                            type: "string",
                            description:
                              "The action to perform in this sub-step.",
                          },
                          expectedResult: {
                            type: "string",
                            description:
                              "The expected outcome of this sub-step action.",
                          },
                          data: {
                            type: "string",
                            description:
                              "Optional test data for this sub-step.",
                          },
                          images: {
                            type: "array",
                            description:
                              "Optional array of images for this sub-step. Maximum 2 images per sub-step. Each image requires a url and fileName.",
                            maxItems: 2,
                            items: {
                              type: "object",
                              properties: {
                                url: {
                                  type: "string",
                                  description: "The URL of the image.",
                                },
                                fileName: {
                                  type: "string",
                                  description: "The file name of the image.",
                                },
                              },
                              required: ["url", "fileName"],
                            },
                          },
                        },
                        required: ["action", "expectedResult"],
                      },
                    },
                  },
                  required: ["action", "expectedResult"],
                },
                {
                  properties: {
                    event: {
                      type: "string",
                      enum: ["Given", "When", "And", "Then", "But"],
                    },
                    stepDescription: { type: "string" },
                  },
                  required: ["event", "stepDescription"],
                },
              ],
            },
          },
          priority: {
            type: "string",
            description: "Updated priority.",
            enum: ["high", "medium", "low", "Not set"],
          },
          severity: {
            type: "string",
            description: "Updated severity.",
            enum: [
              "Blocker",
              "critical",
              "major",
              "Normal",
              "minor",
              "trivial",
              "Not set",
            ],
          },
          type: {
            type: "string",
            description: "Updated type.",
            enum: [
              "functional",
              "smoke",
              "regression",
              "security",
              "performance",
              "e2e",
              "Integration",
              "API",
              "Unit",
              "Accessability",
              "Compatibility",
              "Acceptance",
              "Exploratory",
              "Usability",
              "Other",
            ],
          },
          layer: {
            type: "string",
            description: "Updated layer.",
            enum: ["e2e", "api", "unit", "not set"],
          },
          behavior: {
            type: "string",
            description: "Updated behavior.",
            enum: ["positive", "negative", "destructive", "Not set"],
          },
          automationStatus: {
            type: "string",
            description: "Updated automation status.",
            enum: ["Manual", "Automated", "To be automated"],
          },
          tags: {
            type: "string",
            description: "Updated tags.",
          },
          automation: {
            type: "array",
            description: "Updated automation checklist options.",
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
    // Validate sub-step and image constraints before sending
    if (args.updates.steps && Array.isArray(args.updates.steps)) {
      validateClassicSteps(args.updates.steps);
      processSubStepImages(args.updates.steps);
    }

    // Process attachments if present: convert local file paths to file data objects (same format as UI)
    const processedUpdates = { ...args.updates };
    if (processedUpdates.attachments?.add) {
      processedUpdates.attachments.add = processAttachments(
        processedUpdates.attachments.add.map(String)
      );
    }

    const body = { ...processedUpdates };

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
