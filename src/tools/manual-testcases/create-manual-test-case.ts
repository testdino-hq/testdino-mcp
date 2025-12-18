/**
 * Create manual test case tool
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

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
                description: "Test case title (Required). A clear, descriptive title for the test case.",
            },
            suiteId: {
                type: "string",
                description: "Test suite ID (Required). The suite where this test case will be created. Use list_manual_test_suites to find suite IDs.",
            },
            description: {
                type: "string",
                description: "Detailed description of what this test case validates.",
            },
            preconditions: {
                type: "string",
                description: "Prerequisites or setup required before executing this test case.",
            },
            postconditions: {
                type: "string",
                description: "Expected state or cleanup actions after executing this test case.",
            },
            steps: {
                type: "array",
                description: "Array of test steps. Each step should have action, expectedResult, and optional data fields.",
                items: {
                    type: "object",
                    properties: {
                        action: {
                            type: "string",
                            description: "The action to perform in this step.",
                        },
                        expectedResult: {
                            type: "string",
                            description: "The expected outcome of this action.",
                        },
                        data: {
                            type: "string",
                            description: "Optional test data for this step.",
                        },
                    },
                    required: ["action", "expectedResult"],
                },
            },
            priority: {
                type: "string",
                description: "Test case priority level.",
                enum: ["critical", "high", "medium", "low"],
            },
            severity: {
                type: "string",
                description: "Test case severity level.",
                enum: ["critical", "major", "minor", "trivial"],
            },
            type: {
                type: "string",
                description: "Test case type.",
                enum: ["functional", "smoke", "regression", "security", "performance", "e2e"],
            },
            layer: {
                type: "string",
                description: "Test layer.",
                enum: ["e2e", "api", "unit"],
            },
            behavior: {
                type: "string",
                description: "Test behavior type.",
                enum: ["positive", "negative", "destructive"],
            },
        },
        required: ["projectId", "title", "suiteId"],
    },
};

export async function handleCreateManualTestCase(args: any) {
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
    if (!args?.title) {
        throw new Error("title is required");
    }
    if (!args?.suiteId) {
        throw new Error("suiteId is required");
    }

    try {
        const body: any = {
            projectId: String(args.projectId),
            title: String(args.title),
            suiteId: String(args.suiteId),
        };

        // Add optional fields
        if (args?.description) {
            body.description = String(args.description);
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

        const createManualTestCaseUrl = endpoints.createManualTestCase(String(args.projectId));

        const response = await apiRequestJson(createManualTestCaseUrl, {
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
    } catch (error: any) {
        throw new Error(
            `Failed to create manual test case: ${error?.message || String(error)}`
        );
    }
}
