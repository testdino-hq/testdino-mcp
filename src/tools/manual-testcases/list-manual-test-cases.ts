/**
 * List manual test cases tool
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface ListManualTestCasesArgs {
  projectId: string;
  search?: string;
  suiteId?: string;
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
  automationStatus?: "automated" | "manual" | "not_automated";
  tags?: string;
  isFlaky?: boolean;
  limit?: number;
}

interface ListManualTestCasesParams {
  projectId: string;
  search?: string;
  suiteId?: string;
  status?: string;
  priority?: string;
  severity?: string;
  type?: string;
  layer?: string;
  behavior?: string;
  automationStatus?: string;
  tags?: string;
  isFlaky?: boolean;
  limit?: number;
}

export const listManualTestCasesTool = {
  name: "list_manual_test_cases",
  description:
    "Search and list manual test cases with filtering capabilities. Use this to find specific manual test cases for QA testing, auditing, or test case management. Supports filtering by project, suite, status, priority, severity, type, layer, behavior, automation status, tags, and flaky status.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID (Required). The TestDino project identifier.",
      },
      search: {
        type: "string",
        description:
          "Search term to match against title, description, or caseId. Example: 'login' or 'TC-123'.",
      },
      suiteId: {
        type: "string",
        description:
          "Filter by specific test suite ID. Use list_manual_test_suites to find suite IDs.",
      },
      status: {
        type: "string",
        description: "Filter by test case status.",
        enum: ["actual", "draft", "deprecated"],
      },
      priority: {
        type: "string",
        description: "Filter by priority level.",
        enum: ["critical", "high", "medium", "low"],
      },
      severity: {
        type: "string",
        description: "Filter by severity level.",
        enum: ["critical", "major", "minor", "trivial"],
      },
      type: {
        type: "string",
        description: "Filter by test case type.",
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
        description: "Filter by test layer.",
        enum: ["e2e", "api", "unit"],
      },
      behavior: {
        type: "string",
        description: "Filter by test behavior type.",
        enum: ["positive", "negative", "destructive"],
      },
      automationStatus: {
        type: "string",
        description: "Filter by automation status.",
        enum: ["automated", "manual", "not_automated"],
      },
      tags: {
        type: "string",
        description:
          "Filter by tags (comma-separated list). Example: 'smoke,regression' or 'critical'.",
      },
      isFlaky: {
        type: "boolean",
        description:
          "Filter test cases marked as flaky. Set to true to show only flaky tests, false for non-flaky.",
      },
      limit: {
        type: "number",
        description:
          "Maximum number of results to return (default: 50, max: 1000).",
        default: 50,
      },
    },
    required: ["projectId"],
  },
};

export async function handleListManualTestCases(
  args?: ListManualTestCasesArgs
) {
  // Read API key from environment variable (set in mcp.json) or from args
  const token = getApiKey(args);

  if (!token) {
    throw new Error(
      "Missing TESTDINO_API_KEY environment variable. " +
        "Please configure it in your .cursor/mcp.json file under the 'env' section."
    );
  }

  // Validate required parameter
  if (!args?.projectId) {
    throw new Error("projectId is required");
  }

  try {
    const params: ListManualTestCasesParams = {
      projectId: String(args.projectId),
    };

    // Add optional filters
    if (args?.search) {
      params.search = String(args.search);
    }
    if (args?.suiteId) {
      params.suiteId = String(args.suiteId);
    }
    if (args?.status) {
      params.status = String(args.status);
    }
    if (args?.priority) {
      params.priority = String(args.priority);
    }
    if (args?.severity) {
      params.severity = String(args.severity);
    }
    if (args?.type) {
      params.type = String(args.type);
    }
    if (args?.layer) {
      params.layer = String(args.layer);
    }
    if (args?.behavior) {
      params.behavior = String(args.behavior);
    }
    if (args?.automationStatus) {
      params.automationStatus = String(args.automationStatus);
    }
    if (args?.tags) {
      params.tags = String(args.tags);
    }
    if (args?.isFlaky !== undefined) {
      params.isFlaky = Boolean(args.isFlaky);
    }
    if (args?.limit !== undefined) {
      params.limit = Number(args.limit);
    }

    const listManualTestCasesUrl = endpoints.listManualTestCases(params);

    const response = await apiRequestJson<unknown>(listManualTestCasesUrl, {
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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to list manual test cases: ${errorMessage}`);
  }
}
