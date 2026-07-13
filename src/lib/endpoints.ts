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
    limit?: number;
    page?: number;
    get_all?: string | boolean;
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
    counter?: number;
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
   * @param params.by_status - Optional: passed, failed, skipped, or flaky
   * @param params.by_spec_file_name - Optional: Filter by spec file name
   * @param params.by_error_category - Optional: Filter by error category
   * @param params.by_browser_name - Optional: Filter by browser name
   * @param params.by_tag - Optional: Filter by tag(s)
   * @param params.by_total_runtime - Optional: Filter by runtime (e.g., '<60', '>100')
   * @param params.by_artifacts - Optional: Filter by artifacts availability
   * @param params.by_error_message - Optional: Filter by error message
   * @param params.by_attempt_number - Optional: Filter by attempt number
   * @param params.by_pages - Optional: List by page number (doesn't require testrun_id/counter)
   * @param params.by_branch - Optional: Filter by branch (doesn't require testrun_id/counter)
   * @param params.by_time_interval - Optional: Filter by time interval
   * @param params.limit - Optional: Results per page
   * @param params.by_environment - Optional: Filter by environment
   * @param params.by_author - Optional: Filter by author
   * @param params.by_commit - Optional: Filter by commit hash
   * @param params.page - Optional: Page number
   * @param params.get_all - Optional: Get all results
   */
  listTestCases: (params?: {
    projectId?: string;
    by_testrun_id?: string; // Single ID or comma-separated IDs for batch (max 20)
    counter?: number;
    by_status?: string;
    by_spec_file_name?: string;
    by_error_category?: string;
    by_browser_name?: string;
    by_tag?: string;
    by_total_runtime?: string;
    by_artifacts?: string | boolean;
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
    get_all?: string | boolean;
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
   * @param params.testcaseid - Optional: Test case ID (can be used alone)
   * @param params.by_title - Optional: Test case name/title (must be combined with by_testrun_id or counter)
   * @param params.by_testrun_id - Optional: Test run ID (required when using by_title)
   * @param params.counter - Optional: Test run counter (required when using by_title if by_testrun_id not provided)
   */
  getTestCaseDetails: (params?: {
    projectId?: string;
    testcaseid?: string;
    by_title?: string;
    by_fulltitle?: string;
    by_testrun_id?: string;
    by_testrun_ids?: string;
    by_testsuite_id?: string;
    counter?: string | number;
    by_status?: string;
    by_error_message?: string;
    by_code_snippet?: string;
    include_history?: boolean | string;
    history_limit?: number;
    include_artifacts?: boolean | string;
    include_screenshots?: boolean | string;
    include_traces?: boolean | string;
    include_videos?: boolean | string;
    include_attachments?: boolean | string;
    steps_filter?: "failed_only";
    limit?: number;
    page?: number;
    sort_by?: string;
    sort_order?: string;
    get_all?: boolean | string;
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
  }): string => {
    const baseUrl = getBaseUrl();
    const { projectId, testcase_name } = params;
    const queryParams = new URLSearchParams({ testcase_name });
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
  }): string => {
    const baseUrl = getBaseUrl();
    const { projectId, provider, ...queryParams } = params;
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
  }): string => {
    const baseUrl = getBaseUrl();
    const { projectId, provider, issueId } = params;
    return `${baseUrl}/api/mcp/integrations/${projectId}/${provider}/issues/${issueId}`;
  },
};
