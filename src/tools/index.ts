/**
 * Tools index - Export all tools and handlers
 */

// Health tool
export { healthTool, handleHealth } from "./health.js";

// Test runs tools
export {
  listTestRunsTool,
  handleListTestRuns,
} from "./testruns/list-testruns.js";
export {
  getRunDetailsTool,
  handleGetRunDetails,
} from "./testruns/get-run-details.js";
export {
  getRunErrorClustersTool,
  handleGetRunErrorClusters,
} from "./testruns/get-run-error-clusters.js";

// Test cases tools
export {
  listTestCasesTool,
  handleListTestCases,
} from "./testcases/list-testcase.js";
export {
  getTestCaseDetailsTool,
  handleGetTestCaseDetails,
} from "./testcases/get-testcase-details.js";
export {
  debugTestCaseTool,
  handleDebugTestCase,
} from "./testcases/debug-testcase.js";
export { testAuditTool, handleTestAudit } from "./audits/test-audit.js";

// Manual test cases tools
export {
  listManualTestCasesTool,
  handleListManualTestCases,
} from "./manual-testcases/list-manual-test-cases.js";
export {
  getManualTestCaseTool,
  handleGetManualTestCase,
} from "./manual-testcases/get-manual-test-case.js";
export {
  createManualTestCaseTool,
  handleCreateManualTestCase,
} from "./manual-testcases/create-manual-test-case.js";
export {
  updateManualTestCaseTool,
  handleUpdateManualTestCase,
} from "./manual-testcases/update-manual-test-case.js";

// Manual test suites tools
export {
  listManualTestSuitesTool,
  handleListManualTestSuites,
} from "./manual-testsuites/list-manual-test-suites.js";
export {
  createManualTestSuiteTool,
  handleCreateManualTestSuite,
} from "./manual-testsuites/create-manual-test-suite.js";

// Releases (a.k.a. Milestones) tools
export {
  listReleasesTool,
  handleListReleases,
} from "./releases/list-releases.js";
export { getReleaseTool, handleGetRelease } from "./releases/get-release.js";
export {
  createReleaseTool,
  handleCreateRelease,
} from "./releases/create-release.js";
export {
  updateReleaseTool,
  handleUpdateRelease,
} from "./releases/update-release.js";

// Manual runs tools
export {
  listManualRunsTool,
  handleListManualRuns,
} from "./manual-runs/list-manual-runs.js";
export {
  getManualRunTool,
  handleGetManualRun,
} from "./manual-runs/get-manual-run.js";
export {
  createManualRunTool,
  handleCreateManualRun,
} from "./manual-runs/create-manual-run.js";
export {
  updateManualRunTool,
  handleUpdateManualRun,
} from "./manual-runs/update-manual-run.js";
export {
  listRunTestCasesTool,
  handleListRunTestCases,
} from "./manual-runs/list-run-test-cases.js";
export {
  updateRunTestCaseTool,
  handleUpdateRunTestCase,
} from "./manual-runs/update-run-test-case.js";

// Exploratory sessions tools
export {
  listSessionsTool,
  handleListSessions,
} from "./sessions/list-sessions.js";
export { getSessionTool, handleGetSession } from "./sessions/get-session.js";
export {
  createSessionTool,
  handleCreateSession,
} from "./sessions/create-session.js";
export {
  updateSessionTool,
  handleUpdateSession,
} from "./sessions/update-session.js";
