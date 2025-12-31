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
  get_all?: boolean;
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
  get_all?: string;
}

export const listTestCasesTool = {
  name: "list_testcase",
  description:
    "List test cases with comprehensive filtering options. You can filter by test run (ID or counter), status, spec file, error category, browser, tags, runtime, artifacts, error messages, attempt number, branch, time interval, environment, author, or commit hash. When using test run filters (by_branch, by_commit, by_author, by_environment, by_time_interval, by_pages, page, limit, get_all), the tool first lists test runs matching those criteria, then returns test cases from those filtered test runs. Use this to find specific test cases across your test runs.",
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
          "Test run ID(s). Single ID or comma-separated for multiple runs (max 20). Example: 'test_run_123' or 'run1,run2,run3'. Not required when using test run filters (by_branch, by_commit, by_author, by_environment, by_time_interval, by_pages, page, limit, get_all).",
      },
      counter: {
        type: "number",
        description:
          "Test run counter number. Alternative to by_testrun_id. Not required when using test run filters (by_branch, by_commit, by_author, by_environment, by_time_interval, by_pages, page, limit, get_all). Example: 43.",
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
          "Number of results per page (default: 1000, max: 1000). Does not require testrun_id or counter. When used alone, first lists test runs, then returns test cases from those test runs.",
        default: 1000,
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
          "Page number for pagination (default: 1). Does not require testrun_id or counter. When used alone, first lists test runs on the specified page, then returns test cases from those test runs.",
        default: 1,
      },
      get_all: {
        type: "boolean",
        description:
          "Get all results up to 1000 (default: false). Does not require testrun_id or counter. When used alone, first lists all test runs, then returns test cases from those test runs.",
        default: false,
      },
    },
    required: ["projectId"],
  },
};

export async function handleListTestCases(args?: ListTestCasesArgs) {
  // Read API key from environment variable (set in mcp.json) or from args
  const token = getApiKey(args);

  if (!token) {
    throw new Error(
      "Missing TESTDINO_API_KEY environment variable. " +
        "Please configure it in your .cursor/mcp.json file under the 'env' section."
    );
  }

  // Validate that at least one identifier is provided
  // Test run filters that don't require testrun_id or counter:
  // by_branch, by_commit, by_author, by_environment, by_time_interval, by_pages, page, limit, get_all
  const hasTestRunId = !!args?.by_testrun_id;
  const hasCounter = args?.counter !== undefined;
  const hasTestRunFilters = !!(
    args?.by_branch ||
    args?.by_commit ||
    args?.by_author ||
    args?.by_environment ||
    args?.by_time_interval ||
    args?.by_pages !== undefined ||
    args?.page !== undefined ||
    args?.limit !== undefined ||
    args?.get_all !== undefined
  );

  if (!hasTestRunId && !hasCounter && !hasTestRunFilters) {
    throw new Error(
      "At least one of the following must be provided: by_testrun_id, counter, or any test run filter (by_branch, by_commit, by_author, by_environment, by_time_interval, by_pages, page, limit, get_all)"
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
    if (args?.get_all !== undefined) {
      params.get_all = String(args.get_all);
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
