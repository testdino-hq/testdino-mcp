/**
 * List manual test cases tool
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface ListManualTestCasesArgs {
  projectId: string;
  time?: "last 1 hour" | "Last 5 hours" | "Yesterday" | "last 7 days";
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
  limit?: number;
}

interface ListManualTestCasesParams {
  projectId: string;
  time?: string;
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
  limit?: number;
}

export const listManualTestCasesTool = {
  name: "list_manual_test_cases",
  description:
    "Search and list manual test cases with filtering capabilities. Use this to find specific manual test cases for QA testing, auditing, or test case management. Supports filtering by project, time, suite, status, priority, severity, type, layer, behavior, automation status, and tags.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID (Required). The TestDino project identifier.",
      },
      time: {
        type: "string",
        description: "Filter by time interval.",
        enum: ["last 1 hour", "Last 5 hours", "Yesterday", "last 7 days"],
      },
      search: {
        type: "string",
        description:
          "Search term to match against title or caseId. Example: 'login' or 'TC-123'.",
      },
      suiteId: {
        type: "string",
        description:
          "Filter by specific test suite ID. Use list_manual_test_suites to find suite IDs.",
      },
      status: {
        type: "string",
        description:
          "Filter by status. Values come from Project Settings → Test Case Properties. Defaults: Active, Draft, Deprecated.",
      },
      priority: {
        type: "string",
        description:
          "Filter by priority. Values come from Project Settings → Test Case Properties. Defaults: Critical, High, Medium, Low, Not Set.",
      },
      severity: {
        type: "string",
        description:
          "Filter by severity. Values come from Project Settings → Test Case Properties. Defaults: Blocker, Critical, Major, Normal, Minor, Trivial, Not Set.",
      },
      type: {
        type: "string",
        description:
          "Filter by type. Values come from Project Settings → Test Case Properties. Defaults include Smoke, Regression, Functional, API, Unit, E2E, Other.",
      },
      layer: {
        type: "string",
        description:
          "Filter by layer. Values come from Project Settings → Test Case Properties. Defaults: E2E, API, Unit, Not Set.",
      },
      behavior: {
        type: "string",
        description:
          "Filter by behavior. Values come from Project Settings → Test Case Properties. Defaults: Positive, Negative, Destructive, Not Set.",
      },
      automationStatus: {
        type: "string",
        description:
          "Filter by automation status. Values come from Project Settings → Test Case Properties. Defaults: Manual, Automated, To Be Automated.",
      },
      tags: {
        type: "string",
        description:
          "Filter by tags. Can be a single tag or comma-separated tags. Example: 'smoke' or 'smoke,regression,login'.",
      },
      limit: {
        type: "number",
        description:
          "Maximum number of results to return (default: 10, max: 1000).",
        default: 10,
      },
    },
    required: ["projectId"],
  },
};

export async function handleListManualTestCases(
  args?: ListManualTestCasesArgs
) {
  // Read PAT from environment variable (set in mcp.json) or from args
  const token = getApiKey(args);

  if (!token) {
    throw new Error(
      "Missing TESTDINO_PAT environment variable. " +
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
    if (args?.time) {
      params.time = String(args.time);
    }
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
    if (args?.limit !== undefined) {
      params.limit = Number(args.limit);
    } else {
      params.limit = 10; // Default limit
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
