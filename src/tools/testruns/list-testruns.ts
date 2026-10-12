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
  by_status?: "passed" | "failed" | "interrupted" | "incomplete" | "running";
  by_test_case_tags?: string;
  by_test_controls?: string;
  search?: string;
  sort?: "counter_desc" | "counter_asc" | "duration_asc" | "duration_desc";
  limit?: number;
  page?: number;
}

interface ListTestRunsParams {
  projectId: string;
  by_branch?: string;
  by_time_interval?: string;
  by_author?: string;
  by_commit?: string;
  by_environment?: string;
  by_status?: string;
  by_test_case_tags?: string;
  by_test_controls?: string;
  search?: string;
  sort?: string;
  limit?: number;
  page?: number;
}

export const listTestRunsTool = {
  name: "list_testruns",
  title: "List Test Runs",
  description:
    'Browse test runs for a project with optional filters. Use this when you need run-level metadata: pass/fail totals, duration, branch, commit, author, or when you need testrun_id values for follow-up calls. Use specific filters and pagination instead of fetching broad result sets. You do NOT need to call this before list_testcase when you already have branch/time/author filters — list_testcase resolves runs internally. Common time values: "1d", "3d", "weekly", "monthly", or "YYYY-MM-DD,YYYY-MM-DD" for a custom range.',
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID (e.g. project_<id>)",
      },
      by_branch: {
        type: "string",
        description: "Filter by git branch name",
      },
      by_time_interval: {
        type: "string",
        description:
          'Time filter: "1h", "1d", "weekly", "monthly", "last 5 days", or "YYYY-MM-DD,YYYY-MM-DD"',
      },
      by_author: {
        type: "string",
        description: "Filter by commit author",
      },
      by_commit: {
        type: "string",
        description: "Filter by commit hash prefix",
      },
      by_environment: {
        type: "string",
        description: "Filter by CI/deployment environment",
      },
      by_status: {
        type: "string",
        enum: ["passed", "failed", "interrupted", "incomplete", "running"],
        description: "Filter by run status",
      },
      search: {
        type: "string",
        description: "Search run commit message, or exact counter when numeric",
      },
      by_test_case_tags: {
        type: "string",
        description: "Comma-separated test case tags contained in the run",
      },
      by_test_controls: {
        type: "string",
        enum: ["excluded", "critical", "any"],
        description:
          'Runs Test Controls changed, as the runs list filter: "excluded" = had quarantined failures, "critical" = a critical test passed only on retry, "any" = changed by Test Controls. Each run carries `quarantine` ({state, excluded_count, critical_flaky}; null for reporters before 2.8.0).',
      },
      sort: {
        type: "string",
        enum: ["counter_desc", "counter_asc", "duration_asc", "duration_desc"],
        description: "Run list sort order",
      },
      page: {
        type: "integer",
        exclusiveMinimum: 0,
        description: "1-indexed page number (default: 1)",
      },
      limit: {
        type: "integer",
        description: "Items per page. Data Handler accepts 10, 25, 50, or 100.",
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
    if (args?.by_status) {
      params.by_status = String(args.by_status);
    }
    if (args?.by_test_case_tags) {
      params.by_test_case_tags = String(args.by_test_case_tags);
    }
    if (args?.by_test_controls) {
      params.by_test_controls = String(args.by_test_controls);
    }
    if (args?.search) {
      params.search = String(args.search);
    }
    if (args?.sort) {
      params.sort = String(args.sort);
    }
    if (args?.limit !== undefined) {
      params.limit = Number(args.limit);
    }
    if (args?.page !== undefined) {
      params.page = Number(args.page);
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
    throw new Error(`Failed to list test runs: ${errorMessage}`, {
      cause: error,
    });
  }
}
