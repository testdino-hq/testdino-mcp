/**
 * Get manual test case details tool
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

export const getManualTestCaseTool = {
    name: "get_manual_test_case",
    description:
        "Retrieve detailed information of a single manual test case, including steps, custom fields, preconditions, and all metadata. Use this to get comprehensive details about a specific test case for execution or review.",
    inputSchema: {
        type: "object",
        properties: {
            projectId: {
                type: "string",
                description: "Project ID (Required). The TestDino project identifier.",
            },
            caseId: {
                type: "string",
                description: "Test case ID (Required). Can be internal _id or human-readable ID like 'TC-123'.",
            },
        },
        required: ["projectId", "caseId"],
    },
};

export async function handleGetManualTestCase(args: any) {
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

    try {
        const params = {
            projectId: String(args.projectId),
            caseId: String(args.caseId),
        };

        const getManualTestCaseUrl = endpoints.getManualTestCase(params);

        const response = await apiRequestJson(getManualTestCaseUrl, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
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
            `Failed to get manual test case details: ${error?.message || String(error)}`
        );
    }
}
