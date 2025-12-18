/**
 * Create manual test suite tool
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

export const createManualTestSuiteTool = {
    name: "create_manual_test_suite",
    description:
        "Create a new test suite folder to organize test cases. Use this to create a logical grouping for related test cases. Suites can be nested by providing a parentSuiteId.",
    inputSchema: {
        type: "object",
        properties: {
            projectId: {
                type: "string",
                description: "Project ID (Required). The TestDino project identifier.",
            },
            name: {
                type: "string",
                description: "Suite name (Required). A descriptive name for the test suite.",
            },
            parentSuiteId: {
                type: "string",
                description: "Optional parent suite ID to create this suite as a child of another suite. If not provided, creates a root-level suite.",
            },
        },
        required: ["projectId", "name"],
    },
};

export async function handleCreateManualTestSuite(args: any) {
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
    if (!args?.name) {
        throw new Error("name is required");
    }

    try {
        const body: any = {
            projectId: String(args.projectId),
            name: String(args.name),
        };

        // Add optional parent suite
        if (args?.parentSuiteId) {
            body.parentSuiteId = String(args.parentSuiteId);
        }

        const createManualTestSuiteUrl = endpoints.createManualTestSuite(String(args.projectId));

        const response = await apiRequestJson(createManualTestSuiteUrl, {
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
            `Failed to create manual test suite: ${error?.message || String(error)}`
        );
    }
}
