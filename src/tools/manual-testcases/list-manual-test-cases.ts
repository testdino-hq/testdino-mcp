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
  status?: "active" | "draft" | "deprecated";
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
  title: "List Manual Test Cases",
  description:
    'Search and browse manual test cases with filters. Use suiteId to scope to a folder, search to match by title or caseId (e.g. "TC-123"), status for active/draft/deprecated, and tags for comma-separated tag filtering. Default limit is 10 — increase it if you need more results.',
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID",
      },
      time: {
        type: "string",
        description: 'e.g. "last 1 hour", "Yesterday", "last 7 days"',
      },
      search: {
        type: "string",
        description: "Match title or caseId",
      },
      suiteId: {
        type: "string",
      },
      status: {
        type: "string",
        enum: ["active", "draft", "deprecated"],
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
        description: "Single tag or comma-separated tags",
      },
      limit: {
        type: "integer",
        minimum: 1,
        maximum: 1000,
        description: "Default 10",
      },
    },
    required: ["projectId"],
    additionalProperties: false,
    $schema: "http://json-schema.org/draft-07/schema#",
  },
  annotations: {
    readOnlyHint: true,
  },
  execution: {
    taskSupport: "forbidden",
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
    throw new Error(`Failed to list manual test cases: ${errorMessage}`, {
      cause: error,
    });
  }
}
