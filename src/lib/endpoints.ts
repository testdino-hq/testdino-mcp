/**
 * Centralized API endpoints configuration
 */

import { getApiUrl } from "./env.js";

/**
 * Get the  base URL for API requests
 */
export function getBaseUrl(): string {
  const baseUrl = getApiUrl();
  return baseUrl;
}

/**
 * Build query string from parameters object
 */
function buildQueryString(
  params: Record<string, string | number | boolean | undefined | null>
): string {
  const queryParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      queryParams.append(key, String(value));
    }
  }

  const queryString = queryParams.toString();
  return queryString ? `?${queryString}` : "";
}

/**
 * MCP API endpoints
 */
export const endpoints = {
  /**
   * List test runs with filters
   * GET /api/mcp/:projectId/list-testruns
   */
  listTestRuns: (params?: {
    projectId?: string;
    by_branch?: string;
    by_time_interval?: string;
    by_author?: string;
    by_commit?: string;
    by_environment?: string;
    by_status?: string;
    by_test_case_tags?: string;
    search?: string;
    sort?: string;
    limit?: number;
    page?: number;
  }): string => {
    const baseUrl = getBaseUrl();
    const projectId = params?.projectId || "";
    const { projectId: _, ...queryParams } = params || {};
    const queryString = queryParams ? buildQueryString(queryParams) : "";
    return `${baseUrl}/api/mcp/${projectId}/list-testruns${queryString}`;
  },

  /**
   * Get detailed test run information by test run ID(s) - supports batch operations
   * GET /api/mcp/:projectId/get-run-details
   * @param params.projectId - Required: Project ID
   * @param params.testrun_id - Optional: Single ID or comma-separated IDs (max 20). Example: 'run1' or 'run1,run2,run3'
   * @param params.counter - Optional: Filter by test run counter number
   */
  getRunDetails: (params: {
    projectId: string;
    testrun_id?: string; // Optional: Single ID or comma-separated IDs for batch (max 20)
    counter?: string | number; // Number for a single run, or comma-separated string for a batch (max 20)
  }): string => {
    const baseUrl = getBaseUrl();
    const { projectId, ...queryParams } = params;
    const queryString = buildQueryString(queryParams);
    return `${baseUrl}/api/mcp/${projectId}/get-run-details${queryString}`;
  },

  /**
   * List test cases with comprehensive filtering options
   * GET /api/mcp/:projectId/list-testcase
   * @param params.projectId - Required: Project ID
   * @param params.by_testrun_id - Optional: Single ID or comma-separated IDs (max 20). Required unless using counter, by_pages, or by_branch
   * @param params.counter - Optional: Test run counter number. Alternative to by_testrun_id
   * @param params.by_status - Optional: passed, failed, flaky, skipped, interrupted, incomplete, running
   * @param params.by_testsuite_id - Optional: Filter by suite ID
   * @param params.by_shard - Optional: 1-based shard index
   * @param params.search - Optional: Search test title or title path
   * @param params.sort - Optional: name_asc, name_desc, duration_asc, duration_desc
   * @param params.by_tag - Optional: Filter by tag(s)
   * @param params.by_total_runtime - Optional: Per-test duration filter; seconds by default, ms/s suffix (e.g., '>10', '<1000ms', '>5s')
   * @param params.by_artifacts - Optional: Filter by artifacts availability
   * @param params.by_attempt_number - Optional: Exact retry count (0 = initial/no-retry)
   * @param params.by_pages - Optional: List by page number (doesn't require testrun_id/counter)
   * @param params.by_branch - Optional: Filter by branch (doesn't require testrun_id/counter)
   * @param params.by_time_interval - Optional: Filter by time interval
   * @param params.limit - Optional: Results per page
   * @param params.by_environment - Optional: Filter by environment
   * @param params.by_author - Optional: Filter by author
   * @param params.by_commit - Optional: Filter by commit hash
   * @param params.page - Optional: Page number
   */
  listTestCases: (params?: {
    projectId?: string;
    by_testrun_id?: string; // Single ID or comma-separated IDs for batch (max 20)
    counter?: string | number;
    by_status?: string;
    by_testsuite_id?: string;
    by_shard?: number;
    search?: string;
    sort?: string;
    by_tag?: string;
    by_total_runtime?: string;
    by_artifacts?: string | boolean;
    by_attempt_number?: number;
    by_pages?: number;
    by_branch?: string;
    by_time_interval?: string;
    limit?: number;
    by_environment?: string;
    by_author?: string;
    by_commit?: string;
    page?: number;
  }): string => {
    const baseUrl = getBaseUrl();
    const projectId = params?.projectId || "";
    const { projectId: _, ...queryParams } = params || {};
    const queryString = queryParams ? buildQueryString(queryParams) : "";
    return `${baseUrl}/api/mcp/${projectId}/list-testcase${queryString}`;
  },

  /**
   * Get detailed test case information
   * GET /api/mcp/:projectId/get-testcase-details
   * @param params.projectId - Required: Project ID
   * @param params.testcase_id - Optional: Exact pw_test_id(s), comma-separated (max 50)
   * @param params.testcase_name - Optional: Test case title (resolves through test history)
   * @param params.testrun_id - Optional: Run scope, comma-separated (max 20)
   * @param params.by_fulltitle - Optional: Full title path match
   * @param params.by_testrun_ids - Optional: Comma-separated run IDs (max 20)
   * @param params.include_history - Optional: Attach test-history output
   * @param params.history_limit - Optional: Max history timeline cells (1-100)
   * @param params.steps_filter - Optional: 'failed_only' to drop passing steps
   * Deprecated aliases (still accepted): testcaseid, by_title, by_testrun_id
   */
  getTestCaseDetails: (params?: {
    projectId?: string;
    testcase_id?: string;
    testcase_name?: string;
    testrun_id?: string;
    by_fulltitle?: string;
    by_testrun_ids?: string;
    // Deprecated aliases retained for backward compatibility (mirrors streaming).
    testcaseid?: string;
    by_title?: string;
    by_testrun_id?: string;
    include_history?: boolean | string;
    history_limit?: number;
    steps_filter?: "failed_only";
  }): string => {
    const baseUrl = getBaseUrl();
    const projectId = params?.projectId || "";
    const { projectId: _, ...queryParams } = params || {};
    const queryString = queryParams ? buildQueryString(queryParams) : "";
    return `${baseUrl}/api/mcp/${projectId}/get-testcase-details${queryString}`;
  },

  /**
   * Hello/health check endpoint - validates PAT and returns access information
   * GET /api/mcp/hello
   */
  hello: (): string => {
    const baseUrl = getBaseUrl();
    return `${baseUrl}/api/mcp/hello`;
  },

  /**
   * List manual test cases with filtering
   * GET /api/mcp/manual-tests/:projectId/test-cases
   */
  listManualTestCases: (params?: {
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
  }): string => {
    const baseUrl = getBaseUrl();
    const { projectId, ...queryParams } = params || {};
    const queryString = queryParams ? buildQueryString(queryParams) : "";
    return `${baseUrl}/api/mcp/manual-tests/${projectId}/test-cases${queryString}`;
  },

  /**
   * Get manual test case details
   * GET /api/mcp/manual-tests/:projectId/test-cases/:caseId
   */
  getManualTestCase: (params: {
    projectId: string;
    caseId: string;
  }): string => {
    const baseUrl = getBaseUrl();
    const { projectId, caseId } = params;
    return `${baseUrl}/api/mcp/manual-tests/${projectId}/test-cases/${caseId}`;
  },

  /**
   * Create manual test case
   * POST /api/mcp/manual-tests/:projectId/test-cases
   */
  createManualTestCase: (projectId: string): string => {
    const baseUrl = getBaseUrl();
    return `${baseUrl}/api/mcp/manual-tests/${projectId}/test-cases`;
  },

  /**
   * Update manual test case
   * PATCH /api/mcp/manual-tests/:projectId/test-cases/:caseId
   */
  updateManualTestCase: (projectId: string, caseId: string): string => {
    const baseUrl = getBaseUrl();
    return `${baseUrl}/api/mcp/manual-tests/${projectId}/test-cases/${caseId}`;
  },

  /**
   * List manual test suites
   * GET /api/mcp/manual-tests/:projectId/test-suites
   */
  listManualTestSuites: (params?: {
    projectId: string;
    parentSuiteId?: string;
  }): string => {
    const baseUrl = getBaseUrl();
    const { projectId, ...queryParams } = params || {};
    const queryString = queryParams ? buildQueryString(queryParams) : "";
    return `${baseUrl}/api/mcp/manual-tests/${projectId}/test-suites${queryString}`;
  },

  /**
   * Create manual test suite
   * POST /api/mcp/manual-tests/:projectId/test-suites
   */
  createManualTestSuite: (projectId: string): string => {
    const baseUrl = getBaseUrl();
    return `${baseUrl}/api/mcp/manual-tests/${projectId}/test-suites`;
  },

  /**
   * Debug test case - returns aggregated debug data with debugging_prompt
   * GET /api/mcp/:projectId/debug-testcase
   * @param params.projectId - Required: Project ID or Project Name
   * @param params.testcase_name - Required: Test case name/title
   * Note: The debugging_prompt is provided by the API endpoint as part of the structured response
   */
  debugTestCase: (params: {
    projectId: string;
    testcase_name: string;
    suite_file_path?: string;
  }): string => {
    const baseUrl = getBaseUrl();
    const { projectId, testcase_name, suite_file_path } = params;
    const queryParams = new URLSearchParams({ testcase_name });
    if (suite_file_path) {
      queryParams.append("suite_file_path", suite_file_path);
    }
    return `${baseUrl}/api/mcp/${projectId}/debug-testcase?${queryParams.toString()}`;
  },

  /**
   * Get audit context (prompt + branch signals + last audit)
   * GET /api/mcp/:projectId/audit-context?branch=main
   */
  getAuditContext: (params: { projectId: string; branch?: string }): string => {
    const baseUrl = getBaseUrl();
    const { projectId, ...queryParams } = params;
    const queryString = buildQueryString(queryParams);
    return `${baseUrl}/api/mcp/${projectId}/audit-context${queryString}`;
  },

  /**
   * Submit completed audit report
   * POST /api/mcp/:projectId/audit-report
   */
  submitAuditReport: (params: { projectId: string }): string => {
    const baseUrl = getBaseUrl();
    const { projectId } = params;
    return `${baseUrl}/api/mcp/${projectId}/audit-report`;
  },

  /**
   * List audit reports
   * GET /api/mcp/:projectId/audit-reports
   */
  listAuditReports: (params: {
    projectId: string;
    branch?: string;
    limit?: number;
    page?: number;
  }): string => {
    const baseUrl = getBaseUrl();
    const { projectId, ...queryParams } = params;
    const queryString = buildQueryString(queryParams);
    return `${baseUrl}/api/mcp/${projectId}/audit-reports${queryString}`;
  },

  /**
   * Get single audit report
   * GET /api/mcp/:projectId/audit-reports/:reportId
   */
  getAuditReport: (params: { projectId: string; reportId: string }): string => {
    const baseUrl = getBaseUrl();
    const { projectId, reportId } = params;
    return `${baseUrl}/api/mcp/${projectId}/audit-reports/${reportId}`;
  },

  // ─── Releases (UI label) / Milestones (data model) ─────────────────────────

  /**
   * List releases
   * GET /api/mcp/releases/:projectId
   */
  listReleases: (params: {
    projectId: string;
    search?: string;
    type?: string;
    isCompleted?: boolean;
    parentMilestone?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: number;
    limit?: number;
  }): string => {
    const baseUrl = getBaseUrl();
    const { projectId, ...queryParams } = params;
    const queryString = buildQueryString(queryParams);
    return `${baseUrl}/api/mcp/releases/${projectId}${queryString}`;
  },

  /**
   * Get a single release
   * GET /api/mcp/releases/:projectId/:releaseId
   */
  getRelease: (params: { projectId: string; releaseId: string }): string => {
    const baseUrl = getBaseUrl();
    const { projectId, releaseId } = params;
    return `${baseUrl}/api/mcp/releases/${projectId}/${releaseId}`;
  },

  /**
   * Create a new release
   * POST /api/mcp/releases/:projectId
   */
  createRelease: (projectId: string): string => {
    const baseUrl = getBaseUrl();
    return `${baseUrl}/api/mcp/releases/${projectId}`;
  },

  /**
   * Update an existing release
   * PATCH /api/mcp/releases/:projectId/:releaseId
   */
  updateRelease: (projectId: string, releaseId: string): string => {
    const baseUrl = getBaseUrl();
    return `${baseUrl}/api/mcp/releases/${projectId}/${releaseId}`;
  },

  // ─── Manual Runs ───────────────────────────────────────────────────────────

  /**
   * List manual test runs
   * GET /api/mcp/manual-runs/:projectId
   */
  listManualRuns: (params: {
    projectId: string;
    search?: string;
    status?: string;
    state?: string;
    environment?: string;
    milestone?: string;
    tags?: string;
    isClosed?: boolean;
    sortBy?: string;
    sortOrder?: string;
    page?: number;
    limit?: number;
  }): string => {
    const baseUrl = getBaseUrl();
    const { projectId, ...queryParams } = params;
    const queryString = buildQueryString(queryParams);
    return `${baseUrl}/api/mcp/manual-runs/${projectId}${queryString}`;
  },

  /**
   * Get a single manual test run
   * GET /api/mcp/manual-runs/:projectId/:runId
   */
  getManualRun: (params: { projectId: string; runId: string }): string => {
    const baseUrl = getBaseUrl();
    const { projectId, runId } = params;
    return `${baseUrl}/api/mcp/manual-runs/${projectId}/${runId}`;
  },

  /**
   * Create a new manual test run
   * POST /api/mcp/manual-runs/:projectId
   */
  createManualRun: (projectId: string): string => {
    const baseUrl = getBaseUrl();
    return `${baseUrl}/api/mcp/manual-runs/${projectId}`;
  },

  /**
   * Update a manual test run
   * PATCH /api/mcp/manual-runs/:projectId/:runId
   */
  updateManualRun: (projectId: string, runId: string): string => {
    const baseUrl = getBaseUrl();
    return `${baseUrl}/api/mcp/manual-runs/${projectId}/${runId}`;
  },

  /**
   * List the per-case execution records inside a run
   * GET /api/mcp/manual-runs/:projectId/:runId/test-cases
   */
  listRunTestCases: (params: {
    projectId: string;
    runId: string;
    search?: string;
    assignee?: string;
    result?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: number;
    limit?: number;
  }): string => {
    const baseUrl = getBaseUrl();
    const { projectId, runId, ...queryParams } = params;
    const queryString = buildQueryString(queryParams);
    return `${baseUrl}/api/mcp/manual-runs/${projectId}/${runId}/test-cases${queryString}`;
  },

  /**
   * Update one per-case record inside a run (assignee, result, elapsed)
   * PATCH /api/mcp/manual-runs/:projectId/:runId/test-cases/:rtcRef
   */
  updateRunTestCase: (
    projectId: string,
    runId: string,
    rtcRef: string
  ): string => {
    const baseUrl = getBaseUrl();
    return `${baseUrl}/api/mcp/manual-runs/${projectId}/${runId}/test-cases/${rtcRef}`;
  },

  // ─── Exploratory Sessions ──────────────────────────────────────────────────

  /**
   * List exploratory sessions
   * GET /api/mcp/sessions/:projectId
   */
  listSessions: (params: {
    projectId: string;
    search?: string;
    status?: string;
    state?: string;
    sessionType?: string;
    assignee?: string;
    milestone?: string;
    tags?: string;
    isClosed?: boolean;
    sortBy?: string;
    sortOrder?: string;
    page?: number;
    limit?: number;
  }): string => {
    const baseUrl = getBaseUrl();
    const { projectId, ...queryParams } = params;
    const queryString = buildQueryString(queryParams);
    return `${baseUrl}/api/mcp/sessions/${projectId}${queryString}`;
  },

  /**
   * Get a single exploratory session
   * GET /api/mcp/sessions/:projectId/:sessionId
   */
  getSession: (params: { projectId: string; sessionId: string }): string => {
    const baseUrl = getBaseUrl();
    const { projectId, sessionId } = params;
    return `${baseUrl}/api/mcp/sessions/${projectId}/${sessionId}`;
  },

  /**
   * Create a new exploratory session
   * POST /api/mcp/sessions/:projectId
   */
  createSession: (projectId: string): string => {
    const baseUrl = getBaseUrl();
    return `${baseUrl}/api/mcp/sessions/${projectId}`;
  },

  /**
   * Update an exploratory session
   * PATCH /api/mcp/sessions/:projectId/:sessionId
   */
  updateSession: (projectId: string, sessionId: string): string => {
    const baseUrl = getBaseUrl();
    return `${baseUrl}/api/mcp/sessions/${projectId}/${sessionId}`;
  },

  // ─── Test Run Error Clusters ───────────────────────────────────────────────

  /**
   * Get error clusters for a test run grouped by error signature
   * GET /api/mcp/:projectId/get-run-error-clusters?testrun_id=…&status=…
   */
  runErrorClusters: (params: {
    projectId: string;
    testrun_id: string;
    status?: string;
  }): string => {
    const baseUrl = getBaseUrl();
    const { projectId, ...queryParams } = params;
    const queryString = buildQueryString(queryParams);
    return `${baseUrl}/api/mcp/${projectId}/get-run-error-clusters${queryString}`;
  },

  // ─── Integrations ──────────────────────────────────────────────────────────
  // Provider lives in the path on this surface:
  // /api/mcp/integrations/:projectId/:provider/…

  /**
   * Get integration connection status for a project + provider
   * GET /api/mcp/integrations/:projectId/:provider/status?includeCreateOptions=…
   */
  getIntegrationStatus: (params: {
    projectId: string;
    provider: string;
    includeCreateOptions?: boolean;
    // Provider-specific target values (e.g. jiraProjectKey, issueType, teamId).
    // Flattened into the query string; the stdio backend rebuilds `target` from
    // the extra query keys (minus includeCreateOptions).
    target?: Record<string, string | number | boolean>;
  }): string => {
    const baseUrl = getBaseUrl();
    const { projectId, provider, includeCreateOptions, target } = params;
    const queryParams: Record<string, string | number | boolean | undefined> = {
      includeCreateOptions,
      ...(target ?? {}),
    };
    const queryString = buildQueryString(queryParams);
    return `${baseUrl}/api/mcp/integrations/${projectId}/${provider}/status${queryString}`;
  },

  /**
   * Get OAuth connect URL for an integration provider
   * POST /api/mcp/integrations/:projectId/:provider/connect
   */
  connectIntegration: (params: {
    projectId: string;
    provider: string;
  }): string => {
    const baseUrl = getBaseUrl();
    return `${baseUrl}/api/mcp/integrations/${params.projectId}/${params.provider}/connect`;
  },

  /**
   * Create an external issue in Jira / Linear / Asana / monday.com / GitHub
   * POST /api/mcp/integrations/:projectId/:provider/issues
   */
  createExternalIssue: (params: {
    projectId: string;
    provider: string;
  }): string => {
    const baseUrl = getBaseUrl();
    return `${baseUrl}/api/mcp/integrations/${params.projectId}/${params.provider}/issues`;
  },

  /**
   * Get a previously created external issue by ID
   * GET /api/mcp/integrations/:projectId/:provider/issues/:issueId
   */
  getExternalIssue: (params: {
    projectId: string;
    provider: string;
    issueId: string;
    // Provider-specific read context (e.g. Jira `defaultApp`). Flattened to query.
    target?: Record<string, string | number | boolean>;
  }): string => {
    const baseUrl = getBaseUrl();
    const { projectId, provider, issueId, target } = params;
    const queryString = buildQueryString({ ...(target ?? {}) });
    return `${baseUrl}/api/mcp/integrations/${projectId}/${provider}/issues/${encodeURIComponent(
      issueId
    )}${queryString}`;
  },
};
