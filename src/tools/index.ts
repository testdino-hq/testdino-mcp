/**
 * Tools index - Export all tools and handlers
 */

// Health tool
export { healthTool, handleHealth } from "./health.js";

// Test runs tools
export { listTestRunsTool, handleListTestRuns } from "./testruns/list-testruns.js";
export { getRunDetailsTool, handleGetRunDetails } from "./testruns/get-run-details.js";

// Test cases tools
export { listTestCasesTool, handleListTestCases } from "./testcases/list-testcase.js";
export { getTestCaseDetailsTool, handleGetTestCaseDetails } from "./testcases/get-testcase-details.js";

// Manual test cases tools
export { listManualTestCasesTool, handleListManualTestCases } from "./manual-testcases/list-manual-test-cases.js";
export { getManualTestCaseTool, handleGetManualTestCase } from "./manual-testcases/get-manual-test-case.js";
export { createManualTestCaseTool, handleCreateManualTestCase } from "./manual-testcases/create-manual-test-case.js";
export { updateManualTestCaseTool, handleUpdateManualTestCase } from "./manual-testcases/update-manual-test-case.js";

// Manual test suites tools
export { listManualTestSuitesTool, handleListManualTestSuites } from "./manual-testsuites/list-manual-test-suites.js";
export { createManualTestSuiteTool, handleCreateManualTestSuite } from "./manual-testsuites/create-manual-test-suite.js";

