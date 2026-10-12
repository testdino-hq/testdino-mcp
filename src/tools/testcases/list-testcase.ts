/**
 * List test cases tool
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface ListTestCasesArgs {
  projectId: string;
  by_testrun_id?: string;
  counter?: string | number;
  by_status?:
    | "passed"
    | "failed"
    | "flaky"
    | "skipped"
    | "interrupted"
    | "incomplete"
    | "running";
  by_testsuite_id?: string;
  by_shard?: number;
  search?: string;
  sort?: "name_asc" | "name_desc" | "duration_asc" | "duration_desc";
  by_tag?: string;
  by_test_controls?: string;
  by_total_runtime?: string;
  by_artifacts?: boolean;
  by_attempt_number?: number;
  by_pages?: number;
  by_branch?: string;
  by_time_interval?: string;
  limit?: number;
  by_environment?: string;
  by_author?: string;
  by_commit?: string;
  page?: number;
}

interface ListTestCasesParams {
  projectId: string;
  by_testrun_id?: string;
  counter?: string | number;
  by_status?: string;
  by_testsuite_id?: string;
  by_shard?: number;
  search?: string;
  sort?: string;
  by_tag?: string;
  by_test_controls?: string;
  by_total_runtime?: string;
  by_artifacts?: string;
  by_attempt_number?: number;
  by_pages?: number;
  by_branch?: string;
  by_time_interval?: string;
  limit?: number;
  by_environment?: string;
  by_author?: string;
  by_commit?: string;
  page?: number;
}

export const listTestCasesTool = {
  name: "list_testcase",
  title: "List Test Cases",
  description:
    'List and filter test cases across runs. Provide at least one run context: by_testrun_id, counter, by_pages, by_branch, by_time_interval, by_environment, by_author, or by_commit. Without a run context the tool returns an empty result with a warning. KEY INSIGHT: when you use by_branch, by_time_interval, by_author, or by_commit, this tool resolves the matching runs internally — you do NOT need to call list_testruns first. Combine filters freely: e.g. by_branch="main" + by_status="failed" + by_time_interval="1d" gives you all failures on main today in one call. Batch up to 20 run IDs with by_testrun_id="id1,id2,id3". Prefer specific filters and pagination over broad result sets.',
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID",
      },
      by_testrun_id: {
        type: "string",
        description: "Single test run ID or comma-separated (max 20)",
      },
      counter: {
        type: ["string", "number"],
        description:
          "Test run counter (alternative to by_testrun_id). Single run only, e.g. 47. Use by_testrun_id for batch lookup.",
      },
      by_status: {
        type: "string",
        enum: [
          "passed",
          "failed",
          "flaky",
          "skipped",
          "interrupted",
          "incomplete",
          "running",
        ],
      },
      by_testsuite_id: {
        type: "string",
        description: "Filter by suite ID",
      },
      by_shard: {
        type: "integer",
        exclusiveMinimum: 0,
        description:
          "1-based shard index — scope results to a single shard of a sharded run",
      },
      search: {
        type: "string",
        description: "Search test title or title path",
      },
      sort: {
        type: "string",
        enum: ["name_asc", "name_desc", "duration_asc", "duration_desc"],
        description: "Case list sort order",
      },
      by_tag: {
        type: "string",
        description: "Comma-separated tag names",
      },
      by_test_controls: {
        type: "string",
        enum: ["quarantined", "critical"],
        description:
          'Cases Test Controls changed, within the run context: "quarantined" = on the quarantine list (`quarantined: true`), "critical" = a critical test that passed only on retry and failed the build (`critical_flaky: true`). Applied before paging.',
      },
      by_total_runtime: {
        type: "string",
        description:
          'Per-test duration filter. Numbers are SECONDS by default; suffix with `ms` for milliseconds. Examples: ">10" (>10s), "<1000ms", ">5s".',
      },
      by_artifacts: {
        type: "boolean",
      },
      by_attempt_number: {
        type: "integer",
        minimum: 0,
        description:
          "Exact retry count filter. 0 means initial/no-retry cases (attempt_count=1), 1 means one retry (attempt_count=2).",
      },
      by_pages: {
        type: "integer",
        description:
          "Test-run page for cross-run lookup (1-indexed, newest first). MCP fetches one run-list page and uses up to 20 matching runs.",
      },
      by_branch: {
        type: "string",
      },
      by_time_interval: {
        type: "string",
      },
      by_environment: {
        type: "string",
      },
      by_author: {
        type: "string",
      },
      by_commit: {
        type: "string",
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

export async function handleListTestCases(args?: ListTestCasesArgs) {
  // Read PAT from environment variable (set in mcp.json) or from args
  const token = getApiKey(args);

  if (!token) {
    throw new Error(
      "Missing TESTDINO_PAT environment variable. " +
        "Please configure it in your .cursor/mcp.json file under the 'env' section."
    );
  }

  try {
    const params: ListTestCasesParams = {
      projectId: String(args?.projectId),
    };

    if (args?.by_testrun_id) {
      params.by_testrun_id = String(args.by_testrun_id);
    }
    if (args?.counter !== undefined) {
      // Forward as-is: number for a single run, comma-separated string for a
      // batch. Number() would turn "43,44" into NaN and drop the batch.
      params.counter = args.counter;
    }
    if (args?.by_status) {
      params.by_status = String(args.by_status);
    }
    if (args?.by_testsuite_id) {
      params.by_testsuite_id = String(args.by_testsuite_id);
    }
    if (args?.by_shard !== undefined) {
      params.by_shard = Number(args.by_shard);
    }
    if (args?.search) {
      params.search = String(args.search);
    }
    if (args?.sort) {
      params.sort = String(args.sort);
    }
    if (args?.by_tag) {
      params.by_tag = String(args.by_tag);
    }
    if (args?.by_test_controls) {
      params.by_test_controls = String(args.by_test_controls);
    }
    if (args?.by_total_runtime) {
      params.by_total_runtime = String(args.by_total_runtime);
    }
    if (args?.by_artifacts !== undefined) {
      params.by_artifacts = String(args.by_artifacts);
    }
    if (args?.by_attempt_number !== undefined) {
      params.by_attempt_number = Number(args.by_attempt_number);
    }
    if (args?.by_pages !== undefined) {
      params.by_pages = Number(args.by_pages);
    }
    if (args?.by_branch) {
      params.by_branch = String(args.by_branch);
    }
    if (args?.by_time_interval) {
      params.by_time_interval = String(args.by_time_interval);
    }
    if (args?.limit !== undefined) {
      params.limit = Number(args.limit);
    }
    if (args?.by_environment) {
      params.by_environment = String(args.by_environment);
    }
    if (args?.by_author) {
      params.by_author = String(args.by_author);
    }
    if (args?.by_commit) {
      params.by_commit = String(args.by_commit);
    }
    if (args?.page !== undefined) {
      params.page = Number(args.page);
    }

    const listTestCasesUrl = endpoints.listTestCases(params);

    const response = await apiRequestJson<unknown>(listTestCasesUrl, {
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
    throw new Error(`Failed to list test cases: ${errorMessage}`, {
      cause: error,
    });
  }
}
