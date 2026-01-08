/**
 * List test runs tool
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface ListTestRunsArgs {
  projectId: string;
  by_branch?: string;
  by_time_interval?: string;
  by_author?: string;
  by_commit?: string;
  by_environment?: string;
  limit?: number;
  page?: number;
  get_all?: boolean;
}

interface ListTestRunsParams {
  projectId: string;
  by_branch?: string;
  by_time_interval?: string;
  by_author?: string;
  by_commit?: string;
  by_environment?: string;
  limit?: number;
  page?: number;
  get_all?: string;
}

export const listTestRunsTool = {
  name: "list_testruns",
  description:
    "Browse and filter your test runs to find specific test executions. Filter by git branch (e.g., 'develop', 'main'), time interval ('1d', '3d', 'weekly', 'monthly', or custom date ranges), commit author, or environment (e.g., 'production', 'staging', 'development'). Supports efficient pagination using page/limit or offset/limit, or use get_all=true to fetch all results (up to 1000). Returns test run summaries with statistics (total, passed, failed, skipped, flaky counts), duration, status, branch, author, and PR information when available. Perfect for answering questions like 'What tests ran on the develop branch?' or 'Show me all test runs from last week.' The PAT should be configured in mcp.json as TESTDINO_PAT environment variable.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID (Required). The TestDino project identifier.",
      },
      by_branch: {
        type: "string",
        description:
          "Filter by git branch name (e.g., 'main', 'develop', 'feature/login').",
      },
      by_time_interval: {
        type: "string",
        description:
          "Filter by time: '1d' (last day), '3d' (last 3 days), 'weekly' (last 7 days), 'monthly' (last 30 days), or '2024-01-01,2024-01-31' (date range).",
      },
      by_author: {
        type: "string",
        description:
          "Filter by commit author name (case-insensitive, partial match).",
      },
      by_commit: {
        type: "string",
        description: "Filter by git commit hash (full or partial).",
      },
      by_environment: {
        type: "string",
        description:
          "Filter by environment. Example: 'production', 'staging', 'development'.",
      },
      limit: {
        type: "number",
        description: "Number of results per page (default: 20, max: 1000).",
        default: 20,
      },
      page: {
        type: "number",
        description: "Page number (default: 1).",
        default: 1,
      },
      get_all: {
        type: "boolean",
        description: "Get all results up to 1000 (default: false).",
        default: false,
      },
    },
    required: ["projectId"],
  },
};

export async function handleListTestRuns(args?: ListTestRunsArgs) {
  // Read PAT from environment variable (set in mcp.json) or from args
  const token = getApiKey(args);

  if (!token) {
    throw new Error(
      "Missing TESTDINO_PAT environment variable. " +
        "Please configure it in your .cursor/mcp.json file under the 'env' section."
    );
  }

  if (!args?.projectId) {
    throw new Error("projectId is required");
  }

  try {
    const params: ListTestRunsParams = {
      projectId: String(args.projectId),
    };

    if (args?.by_branch) {
      params.by_branch = String(args.by_branch);
    }
    if (args?.by_time_interval) {
      params.by_time_interval = String(args.by_time_interval);
    }
    if (args?.by_author) {
      params.by_author = String(args.by_author);
    }
    if (args?.by_commit) {
      params.by_commit = String(args.by_commit);
    }
    if (args?.by_environment) {
      params.by_environment = String(args.by_environment);
    }
    if (args?.limit !== undefined) {
      params.limit = Number(args.limit);
    }
    if (args?.page !== undefined) {
      params.page = Number(args.page);
    }
    if (args?.get_all !== undefined) {
      params.get_all = String(args.get_all);
    }

    const listTestRunsUrl = endpoints.listTestRuns(params);

    const response = await apiRequestJson<unknown>(listTestRunsUrl, {
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
    throw new Error(`Failed to list test runs: ${errorMessage}`);
  }
}
