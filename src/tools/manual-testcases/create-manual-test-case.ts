/**
 * Create manual test case tool
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

interface CreateManualTestCaseArgs {
  projectId: string;
  title: string;
  suiteName: string;
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
  attachments?: string[]; // Array of attachment URLs or file paths (up to 10MB) - will be processed to FileData objects
  customFields?: Record<string, string>; // Custom fields as key-value pairs
}

interface CreateManualTestCaseBody {
  projectId: string;
  title: string;
  suiteName: string;
  description?: string;
  status?: string;
  testStepsDeclarationType?: string;
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
  automation?: string[];
  attachments?: (FileData | string)[];
  customFields?: Record<string, string>;
}

export const createManualTestCaseTool = {
  name: "create_manual_test_case",
  description:
    "Create a new manual test case. Use this to document new test scenarios, features, or requirements. Supports adding test steps, preconditions, postconditions, and metadata like priority, severity, and type.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID (Required). The TestDino project identifier.",
      },
      title: {
        type: "string",
        description:
          "Test case title (Required). A clear, descriptive title for the test case.",
      },
      suiteName: {
        type: "string",
        description:
          "Test suite name (Required). The suite where this test case will be created. Use list_manual_test_suites to find suite names.",
      },
      description: {
        type: "string",
        description: "Detailed description of what this test case validates.",
      },
      status: {
        type: "string",
        description: "Test case status.",
        enum: ["Active", "Draft", "Deprecated"],
      },
      testStepsDeclarationType: {
        type: "string",
        description: "Type of test steps declaration format.",
        enum: ["Classic", "Gherkin"],
      },
      preconditions: {
        type: "string",
        description:
          "Prerequisites or setup required before executing this test case.",
      },
      postconditions: {
        type: "string",
        description:
          "Expected state or cleanup actions after executing this test case.",
      },
      steps: {
        type: "array",
        description:
          "Array of test steps. For Classic format: action, expectedResult, optional data, and optional subSteps (max 5 per step, each with optional images max 2). For Gherkin format: event and stepDescription.",
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
                        description: "The action to perform in this sub-step.",
                      },
                      expectedResult: {
                        type: "string",
                        description:
                          "The expected outcome of this sub-step action.",
                      },
                      data: {
                        type: "string",
                        description: "Optional test data for this sub-step.",
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
                  description: "Gherkin event keyword (Gherkin format).",
                  enum: ["Given", "When", "And", "Then", "But"],
                },
                stepDescription: {
                  type: "string",
                  description: "The step description (Gherkin format).",
                },
              },
              required: ["event", "stepDescription"],
            },
          ],
        },
      },
      priority: {
        type: "string",
        description: "Test case priority level.",
        enum: ["high", "medium", "low", "Not set"],
      },
      severity: {
        type: "string",
        description: "Test case severity level.",
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
        description: "Test case type.",
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
        description: "Test layer.",
        enum: ["e2e", "api", "unit", "not set"],
      },
      behavior: {
        type: "string",
        description: "Test behavior type.",
        enum: ["positive", "negative", "destructive", "Not set"],
      },
      automationStatus: {
        type: "string",
        description: "Automation status of the test case.",
        enum: ["Manual", "Automated", "To be automated"],
      },
      tags: {
        type: "string",
        description: "Tags to add to your test cases.",
      },
      automation: {
        type: "array",
        description: "Automation checklist options.",
        items: {
          type: "string",
          enum: ["To be Automated", "Is flaky", "Muted"],
        },
      },
      attachments: {
        type: "array",
        description:
          "Array of attachment URLs or file paths (up to 10MB each).",
        items: {
          type: "string",
        },
      },
      customFields: {
        type: "object",
        description:
          "Custom fields as key-value pairs. Only available if custom fields are configured in test case management settings.",
        additionalProperties: {
          type: "string",
        },
      },
    },
    required: ["projectId", "title", "suiteName"],
  },
};

export async function handleCreateManualTestCase(
  args?: CreateManualTestCaseArgs
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
  if (!args?.title) {
    throw new Error("title is required");
  }
  if (!args?.suiteName) {
    throw new Error("suiteName is required");
  }

  try {
    const body: CreateManualTestCaseBody = {
      projectId: String(args.projectId),
      title: String(args.title),
      suiteName: String(args.suiteName),
    };

    // Add optional fields
    if (args?.description) {
      body.description = String(args.description);
    }
    if (args?.status) {
      body.status = String(args.status);
    }
    if (args?.testStepsDeclarationType) {
      body.testStepsDeclarationType = String(args.testStepsDeclarationType);
    }
    if (args?.preconditions) {
      body.preconditions = String(args.preconditions);
    }
    if (args?.postconditions) {
      body.postconditions = String(args.postconditions);
    }
    if (args?.steps) {
      // Validate sub-step and image constraints before sending
      validateClassicSteps(args.steps);
      processSubStepImages(args.steps);
      body.steps = args.steps;
    }
    if (args?.priority) {
      body.priority = String(args.priority);
    }
    if (args?.severity) {
      body.severity = String(args.severity);
    }
    if (args?.type) {
      body.type = String(args.type);
    }
    if (args?.layer) {
      body.layer = String(args.layer);
    }
    if (args?.behavior) {
      body.behavior = String(args.behavior);
    }
    if (args?.automationStatus) {
      body.automationStatus = String(args.automationStatus);
    }
    if (args?.tags) {
      body.tags = String(args.tags);
    }
    if (args?.automation) {
      body.automation = args.automation.map(String);
    }
    if (args?.attachments) {
      // Process attachments: convert local file paths to file data objects (same format as UI)
      body.attachments = processAttachments(args.attachments.map(String));
    }
    if (args?.customFields) {
      body.customFields = args.customFields;
    }

    const createManualTestCaseUrl = endpoints.createManualTestCase(
      String(args.projectId)
    );

    const response = await apiRequestJson<unknown>(createManualTestCaseUrl, {
      method: "POST",
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
    throw new Error(`Failed to create manual test case: ${errorMessage}`);
  }
}
