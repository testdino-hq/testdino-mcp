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
  description:
    "List test cases with comprehensive filtering options. Provide a run scope: by_testrun_id or counter for specific runs, OR a cross-run filter (by_branch, by_time_interval, by_author, by_commit, by_environment, by_pages) which resolves the matching runs internally — you do NOT need to call list_testruns first. Without a run scope the tool returns an empty result with a warning explaining what to provide. Combine per-case filters (status, tags, runtime, artifacts, attempt number) with any run scope. page/limit paginate WITHIN the resolved run(s); limit is snapped to the nearest of 10, 25, 50, 100 (data-handler's allowed page sizes).",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID (Required). The TestDino project identifier.",
      },
      by_testrun_id: {
        type: "string",
        description:
          "Test run ID(s). Single ID or comma-separated for multiple runs (max 20). Example: 'test_run_123' or 'run1,run2,run3'. Not required when using a cross-run filter (by_branch, by_commit, by_author, by_environment, by_time_interval, by_pages).",
      },
      counter: {
        type: ["number", "string"],
        description:
          "Test run counter number. Alternative to by_testrun_id. Not required when using a cross-run filter (by_branch, by_commit, by_author, by_environment, by_time_interval, by_pages). Example: 43.",
      },
      by_status: {
        type: "string",
        description:
          "Filter by status: 'passed', 'failed', 'flaky', 'skipped', 'interrupted', 'incomplete', or 'running'. (ID/Counter is required while using this parameter)",
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
        description: "Filter by suite ID.",
      },
      by_shard: {
        type: "number",
        description:
          "1-based shard index — scope results to a single shard of a sharded run.",
      },
      search: {
        type: "string",
        description: "Search test title or title path.",
      },
      sort: {
        type: "string",
        enum: ["name_asc", "name_desc", "duration_asc", "duration_desc"],
        description: "Case list sort order.",
      },
      by_tag: {
        type: "string",
        description:
          "Filter by tag(s). Single tag or comma-separated. Example: 'smoke' or 'smoke,regression'. (ID/Counter is required while using this parameter)",
      },
      by_total_runtime: {
        type: "string",
        description:
          "Per-test duration filter. Numbers are SECONDS by default; suffix with `ms` for milliseconds or `s` for seconds. Examples: '>10', '<1000ms', '>5s'. (ID/Counter or a run scope is required while using this parameter)",
      },
      by_artifacts: {
        type: "boolean",
        description:
          "Filter test cases that have artifacts available (screenshots, videos, traces). Set to true to list only test cases with artifacts. (ID/Counter is required while using this parameter)",
        default: false,
      },
      by_attempt_number: {
        type: "number",
        description:
          "Exact retry count filter. 0 = initial/no-retry (attempt_count=1), 1 = one retry (attempt_count=2). (ID/Counter is required while using this parameter)",
      },
      by_pages: {
        type: "number",
        description:
          "List test cases by page number. Does not require testrun_id or counter. Returns test cases from all test runs on the specified page.",
      },
      by_branch: {
        type: "string",
        description:
          "Filter by git branch name. Does not require testrun_id or counter. First lists test runs on the specified branch, then returns test cases from those test runs. Example: 'main', 'develop'.",
      },
      by_time_interval: {
        type: "string",
        description:
          "Filter by time interval. Does not require testrun_id or counter. First lists test runs in the specified time period, then returns test cases from those test runs. Supports: '1d' (last day), '3d' (last 3 days), 'weekly' (last 7 days), 'monthly' (last 30 days), or '2024-01-01,2024-01-31' (date range).",
      },
      limit: {
        type: "number",
        description:
          "Test cases per page within the resolved run(s). Snapped to the nearest of 10, 25, 50, 100 (data-handler's allowed page sizes) — other values are adjusted, not rejected. Requires a run scope (by_testrun_id, counter, or a cross-run filter); it does not resolve runs on its own.",
      },
      by_environment: {
        type: "string",
        description:
          "Filter by environment. Does not require testrun_id or counter. First lists test runs in the specified environment, then returns test cases from those test runs. Example: 'production', 'staging', 'development'.",
      },
      by_author: {
        type: "string",
        description:
          "Filter by commit author name (case-insensitive, partial match). Does not require testrun_id or counter. First lists test runs by the specified author, then returns test cases from those test runs.",
      },
      by_commit: {
        type: "string",
        description:
          "Filter by git commit hash (full or partial). Does not require testrun_id or counter. First lists test runs with the specified commit, then returns test cases from those test runs.",
      },
      page: {
        type: "number",
        description:
          "1-indexed page number for pagination within the resolved run(s) (default: 1). Requires a run scope (by_testrun_id, counter, or a cross-run filter). To page across runs, use by_pages.",
        default: 1,
      },
    },
    required: ["projectId"],
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

  // Validate that a run scope is provided. Cross-run filters resolve the runs
  // internally; page/limit are pagination WITHIN a run scope (data-handler
  // /cases needs a runId), NOT run resolvers — so they do not qualify on their
  // own. This mirrors the gateway contract: without a run scope the request
  // yields an empty result.
  const hasTestRunId = !!args?.by_testrun_id;
  const hasCounter = args?.counter !== undefined;
  const hasTestRunFilters = !!(
    args?.by_branch ||
    args?.by_commit ||
    args?.by_author ||
    args?.by_environment ||
    args?.by_time_interval ||
    args?.by_pages !== undefined
  );

  if (!hasTestRunId && !hasCounter && !hasTestRunFilters) {
    throw new Error(
      "A run scope is required: provide by_testrun_id, counter, or a cross-run filter (by_branch, by_commit, by_author, by_environment, by_time_interval, by_pages). page/limit paginate within a run scope — they do not select runs on their own."
    );
  }

  try {
    const params: ListTestCasesParams = {
      projectId: String(args.projectId),
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
    throw new Error(`Failed to list test cases: ${errorMessage}`);
  }
}
