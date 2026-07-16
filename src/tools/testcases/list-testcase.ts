/**
 * List test cases tool
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface ListTestCasesArgs {
  projectId: string;
  by_testrun_id?: string;
  counter?: number;
  by_status?: "passed" | "failed" | "skipped" | "flaky";
  by_spec_file_name?: string;
  by_error_category?: string;
  by_browser_name?: string;
  by_tag?: string;
  by_total_runtime?: string;
  by_artifacts?: boolean;
  by_error_message?: string;
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
  counter?: number;
  by_status?: string;
  by_spec_file_name?: string;
  by_error_category?: string;
  by_browser_name?: string;
  by_tag?: string;
  by_total_runtime?: string;
  by_artifacts?: string;
  by_error_message?: string;
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
        type: "number",
        description:
          "Test run counter number. Alternative to by_testrun_id. Not required when using a cross-run filter (by_branch, by_commit, by_author, by_environment, by_time_interval, by_pages). Example: 43.",
      },
      by_status: {
        type: "string",
        description:
          "Filter by status: 'passed', 'failed', 'skipped', or 'flaky'.(ID/Counter is required while using this parameter)",
        enum: ["passed", "failed", "skipped", "flaky"],
      },
      by_spec_file_name: {
        type: "string",
        description:
          "Filter by spec file name. Example: 'login.spec.js' or 'user-profile.spec.ts'. (ID/Counter is required while using this parameter)",
      },
      by_error_category: {
        type: "string",
        description:
          "Filter by error category. Example: 'timeout_issues', 'element_not_found', 'assertion_failures', 'network_issues'. (ID/Counter is required while using this parameter)",
      },
      by_browser_name: {
        type: "string",
        description:
          "Filter by browser name. Example: 'chromium', 'firefox', 'webkit'. (ID/Counter is required while using this parameter)",
      },
      by_tag: {
        type: "string",
        description:
          "Filter by tag(s). Single tag or comma-separated. Example: 'smoke' or 'smoke,regression'. (ID/Counter is required while using this parameter)",
      },
      by_total_runtime: {
        type: "string",
        description:
          "Filter by total runtime. Use '<60' for less than 60 seconds, '>100' for more than 100 seconds. Example: '<60', '>100', '<30'. (ID/Counter is required while using this parameter)",
      },
      by_artifacts: {
        type: "boolean",
        description:
          "Filter test cases that have artifacts available (screenshots, videos, traces). Set to true to list only test cases with artifacts. (ID/Counter is required while using this parameter)",
        default: false,
      },
      by_error_message: {
        type: "string",
        description:
          "Filter by error message (partial match, case-insensitive). Example: 'Test timeout of 60000ms exceeded'. (ID/Counter is required while using this parameter)",
      },
      by_attempt_number: {
        type: "number",
        description:
          "Filter by attempt number. Example: 1 for first attempt, 2 for second attempt. (ID/Counter is required while using this parameter)",
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
      params.counter = Number(args.counter);
    }
    if (args?.by_status) {
      params.by_status = String(args.by_status);
    }
    if (args?.by_spec_file_name) {
      params.by_spec_file_name = String(args.by_spec_file_name);
    }
    if (args?.by_error_category) {
      params.by_error_category = String(args.by_error_category);
    }
    if (args?.by_browser_name) {
      params.by_browser_name = String(args.by_browser_name);
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
    if (args?.by_error_message) {
      params.by_error_message = String(args.by_error_message);
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
