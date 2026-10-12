/**
 * Create manual test case tool
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

type TestStep = Record<string, unknown>;
type FileData = Record<string, unknown>;

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
  flags?: ("To be Automated" | "Is flaky" | "Muted")[];
  attachments?: FileData[];
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
  flags?: string[];
  attachments?: (FileData | string)[];
  customFields?: Record<string, string>;
}

export const createManualTestCaseTool = {
  name: "create_manual_test_case",
  title: "Create Manual Test Case",
  description:
    'Create a new manual test case. Requires write permission. MANDATORY FIRST STEP: always call list_manual_test_suites() before this tool to get the exact suite name — suiteName must be an exact match, not approximate. Steps default to Classic format (action + expectedResult). Set testStepsDeclarationType="Gherkin" if using Given/When/Then steps. Classic step shape: { action, expectedResult, data, attachments }. Gherkin step shape: { event: "Given"|"When"|"And"|"Then"|"But", stepDescription, attachments }. Use top-level attachments for whole-test-case files, or step.attachments for files tied to a specific step. Suggestion: attaching files via the hosted MCP can be token-expensive — for lower token usage, consider the TestDino UI or the local `testdino-mcp` npm package.',
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID",
      },
      title: {
        type: "string",
        description: "Test case title",
      },
      suiteName: {
        type: "string",
        description: "Target suite name",
      },
      description: {
        type: "string",
      },
      status: {
        type: "string",
        description:
          "Status. Values come from Project Settings → Test Case Properties. Defaults: Active, Draft, Deprecated.",
      },
      testStepsDeclarationType: {
        type: "string",
        enum: ["Classic", "Gherkin"],
      },
      preconditions: {
        type: "string",
      },
      postconditions: {
        type: "string",
      },
      steps: {
        type: "array",
        items: {
          type: "object",
          properties: {
            action: {
              type: "string",
            },
            expectedResult: {
              type: "string",
            },
            data: {
              type: "string",
            },
            attachments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  _id: {
                    type: "string",
                  },
                  url: {
                    type: "string",
                  },
                  blobUrl: {
                    type: "string",
                  },
                  containerName: {
                    type: "string",
                  },
                  fileName: {
                    type: "string",
                  },
                  originalFileName: {
                    type: "string",
                  },
                  fileSize: {
                    type: "number",
                  },
                  mimeType: {
                    type: "string",
                  },
                  fileContent: {
                    type: "string",
                  },
                  uploadedBy: {
                    type: "string",
                  },
                  uploadedAt: {
                    type: "string",
                  },
                },
                additionalProperties: true,
              },
            },
            event: {
              type: "string",
              enum: ["Given", "When", "And", "Then", "But"],
            },
            stepDescription: {
              type: "string",
            },
            keyword: {
              type: "string",
              enum: ["Given", "When", "And", "Then", "But"],
            },
            text: {
              type: "string",
            },
          },
          additionalProperties: false,
        },
      },
      priority: {
        type: "string",
        description:
          "Priority. Values come from Project Settings → Test Case Properties. Defaults: Critical, High, Medium, Low, Not Set.",
      },
      severity: {
        type: "string",
        description:
          "Severity. Values come from Project Settings → Test Case Properties. Defaults: Blocker, Critical, Major, Normal, Minor, Trivial, Not Set.",
      },
      type: {
        type: "string",
        description:
          "Type. Values come from Project Settings → Test Case Properties. Defaults: Smoke, Regression, Functional, Integration, E2E, API, Unit, Performance, Security, Accessibility, Usability, Compatibility, Acceptance, Exploratory, Other.",
      },
      layer: {
        type: "string",
        description:
          "Layer. Values come from Project Settings → Test Case Properties. Defaults: E2E, API, Unit, Not Set.",
      },
      behavior: {
        type: "string",
        description:
          "Behavior. Values come from Project Settings → Test Case Properties. Defaults: Positive, Negative, Destructive, Not Set.",
      },
      automationStatus: {
        type: "string",
        description:
          "Automation status. Values come from Project Settings → Test Case Properties. Defaults: Manual, Automated.",
      },
      tags: {
        type: "string",
      },
      flags: {
        type: "array",
        items: {
          type: "string",
          enum: ["To be Automated", "Is flaky", "Muted"],
        },
        description: "Automation flags/checklist values.",
      },
      attachments: {
        type: "array",
        items: {
          $ref: "#/properties/steps/items/properties/attachments/items",
        },
        description:
          "Whole-test-case attachments as URLs, local paths, or file data objects. Suggestion: attaching files via the hosted MCP can be token-expensive (the base64 payload flows through the LLM context). For lower token usage, consider the TestDino UI or the local `testdino-mcp` npm package, which read the file locally without sending bytes through the model.",
      },
      customFields: {
        type: "object",
        additionalProperties: {},
        description:
          "Values keyed by custom field name. Every required field must be set; the error names any that are missing.",
      },
    },
    required: ["projectId", "title", "suiteName"],
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
    if (args?.flags) {
      body.flags = args.flags.map(String);
    }
    if (args?.attachments) {
      body.attachments = args.attachments;
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
    throw new Error(`Failed to create manual test case: ${errorMessage}`, {
      cause: error,
    });
  }
}
