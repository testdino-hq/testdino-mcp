/**
 * Update manual test case tool
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface TestStep {
  action: string;
  expectedResult: string;
  data?: string;
}

interface ManualTestCaseUpdates {
  title?: string;
  description?: string;
  preconditions?: string;
  postconditions?: string;
  steps?: TestStep[];
  status?: "actual" | "draft" | "deprecated";
  priority?: "critical" | "high" | "medium" | "low";
  severity?: "critical" | "major" | "minor" | "trivial";
  type?:
    | "functional"
    | "smoke"
    | "regression"
    | "security"
    | "performance"
    | "e2e";
  layer?: "e2e" | "api" | "unit";
  behavior?: "positive" | "negative" | "destructive";
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
          "Object containing the fields to update. Can include: title, description, steps, status, priority, severity, type, layer, behavior, preconditions, postconditions, etc.",
        properties: {
          title: {
            type: "string",
            description: "Updated test case title.",
          },
          description: {
            type: "string",
            description: "Updated description.",
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
            description: "Updated test steps array.",
            items: {
              type: "object",
              properties: {
                action: { type: "string" },
                expectedResult: { type: "string" },
                data: { type: "string" },
              },
            },
          },
          status: {
            type: "string",
            description: "Updated status.",
            enum: ["actual", "draft", "deprecated"],
          },
          priority: {
            type: "string",
            description: "Updated priority.",
            enum: ["critical", "high", "medium", "low"],
          },
          severity: {
            type: "string",
            description: "Updated severity.",
            enum: ["critical", "major", "minor", "trivial"],
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
            ],
          },
          layer: {
            type: "string",
            description: "Updated layer.",
            enum: ["e2e", "api", "unit"],
          },
          behavior: {
            type: "string",
            description: "Updated behavior.",
            enum: ["positive", "negative", "destructive"],
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
  // Read API key from environment variable (set in mcp.json) or from args
  const token = getApiKey(args);

  if (!token) {
    throw new Error(
      "Missing TESTDINO_API_KEY environment variable. " +
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
    const body = {
      projectId: String(args.projectId),
      caseId: String(args.caseId),
      ...args.updates,
    };

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
