# TestDino MCP Tools - AI Agent Skills Guide

This guide helps AI agents understand and efficiently use the TestDino MCP tools. It provides patterns, best practices, and decision-making guidance for tool selection and usage.

## Table of Contents

1. [Understanding MCP Tools](#understanding-mcp-tools)
2. [Tool Categories](#tool-categories)
3. [Common Patterns & Workflows](#common-patterns--workflows)
4. [Parameter Requirements](#parameter-requirements)
5. [Decision Trees](#decision-trees)
6. [Best Practices](#best-practices)
7. [Error Handling](#error-handling)
8. [Tool Reference Quick Guide](#tool-reference-quick-guide)

---

## Understanding MCP Tools

### What are MCP Tools?

MCP (Model Context Protocol) tools are functions that AI agents can call to interact with external systems. In this case, they connect to the TestDino to:

- Retrieve test execution data
- Analyze test results
- Manage test cases
- Debug test failures

### How Tools Work

1. **Tool Definition**: Each tool has a name, description, and input schema
2. **Tool Execution**: AI agents call tools with parameters
3. **Response Handling**: Tools return structured data that agents can process
4. **Error Handling**: Tools throw errors that agents must handle gracefully

### Key Concepts

- **projectId**: Required for most tools. Get it from the `health` tool first
- **PAT**: Automatically read from `TESTDINO_PAT` environment variable (configured in mcp.json)
- **Filtering**: Many tools support powerful filtering to narrow results
- **Pagination**: Use `page`, `limit`, or `get_all` for large result sets

---

## Tool Categories

### 1. Connection & Setup Tools

#### `health`
**Purpose**: Verify connection and get project information

**When to Use**:
- First tool to call when user asks about TestDino
- Need to get project IDs and organization information
- Troubleshooting connection issues
- Validating PAT configuration

**Returns**:
- Account information
- Available organizations and projects
- Project IDs (needed for other tools)
- Access permissions

**Example Flow**:
```
User: "Check my TestDino connection"
→ Call health()
→ Extract projectId from response
→ Use projectId in subsequent tool calls
```

---

### 2. Test Run Management Tools

#### `list_testruns`
**Purpose**: Browse and filter test runs

**When to Use**:
- User asks about test runs (e.g., "show me recent test runs")
- Need to find test runs by branch, time, author, commit, or environment
- Need to get test run IDs for detailed analysis
- Analyzing test execution trends

**Key Parameters**:
- `projectId` (required)
- `by_branch`: Filter by git branch
- `by_time_interval`: '1d', '3d', 'weekly', 'monthly', or date range
- `by_author`: Filter by commit author
- `by_commit`: Filter by commit hash
- `by_environment`: Filter by environment
- `limit`, `page`, `get_all`: Pagination controls

**Returns**:
- Array of test runs with:
  - Test run IDs and counters
  - Statistics (passed, failed, skipped, flaky)
  - Metadata (branch, author, commit, environment)
  - Duration and timestamps

#### `get_run_details`
**Purpose**: Get comprehensive details about a specific test run

**When to Use**:
- User asks for details about a specific test run
- Need complete test statistics and error breakdown
- Analyzing all tests in a run
- Need test suite and test case details

**Key Parameters**:
- `projectId` (required)
- `testrun_id` OR `counter` (at least one required)

**Returns**:
- Complete test run summary
- Test statistics by status
- Error categories breakdown
- All test suites and test cases
- Rerun attempt metadata

**Workflow Pattern**:
```
1. Use list_testruns() to find test run IDs
2. Use get_run_details() for specific run analysis
```

---

### 3. Test Case Analysis Tools

#### `list_testcase`
**Purpose**: List test cases with comprehensive filtering

**When to Use**:
- User asks about specific test cases (e.g., "show me failed tests")
- Need to filter by status, browser, error category, runtime, etc.
- Finding test cases across multiple test runs
- Analyzing test cases by branch, environment, commit, or author

**Key Parameters**:
- `projectId` (required)
- **Test Run Identification** (choose one approach):
  - `by_testrun_id` OR `counter`: Direct test run identification
  - `by_branch`, `by_commit`, `by_author`, `by_environment`, `by_time_interval`: Filter test runs first, then return test cases
- **Test Case Filters**:
  - `by_status`: 'passed', 'failed', 'skipped', 'flaky'
  - `by_spec_file_name`: Filter by spec file
  - `by_error_category`: 'timeout_issues', 'element_not_found', etc.
  - `by_browser_name`: 'chromium', 'firefox', 'webkit'
  - `by_tag`: Filter by test tags
  - `by_total_runtime`: '<60', '>100' (seconds)
  - `by_artifacts`: true/false (has screenshots/videos)
  - `by_error_message`: Partial match on error message

**Important**: You can identify test runs in two ways:
1. **Direct**: Use `by_testrun_id` or `counter` to specify exact test runs
2. **Indirect**: Use `by_branch`, `by_commit`, etc. to filter test runs first, then get test cases from those runs

**Returns**:
- Array of test cases with:
  - Test case IDs and names
  - Status and duration
  - Browser and environment
  - Error information (if failed)
  - Associated test run information

#### `get_testcase_details`
**Purpose**: Get detailed information about a specific test case

**When to Use**:
- User asks for details about a specific test case
- Need error messages, stack traces, execution steps
- Debugging a specific test failure
- Need console logs or artifact information

**Key Parameters**:
- `projectId` (required)
- **Test Case Identification** (choose one):
  - `testcase_id`: Use if you know the exact test case ID
  - `testcase_name` + (`testrun_id` OR `counter`): Use test name with test run context

**Returns**:
- Complete test case details
- Error messages and stack traces
- Execution steps
- Console logs
- Artifact availability (screenshots, videos, traces)
- Retry attempt information

#### `debug_testcase`
**Purpose**: AI-assisted debugging with historical failure pattern analysis

**When to Use**:
- User asks "why is test X failing?" or "debug test X"
- Need to understand failure patterns across multiple executions
- Analyzing flaky test behavior
- Root cause analysis with historical context

**Key Parameters**:
- `projectId` (required)
- `testcase_name` (required): Test case name/title

**Returns**:
- Historical execution data
- Failure patterns and error categories
- Common error messages and locations
- Browser-specific issues
- Debugging prompt (pre-formatted for AI analysis)
- Timeline of failures

**Workflow Pattern**:
```
1. User: "Why is 'Verify user login' failing?"
2. Call debug_testcase(projectId, "Verify user login")
3. Analyze returned patterns and debugging_prompt
4. Optionally read test code if available
5. Provide root cause analysis and fix suggestions
```

---

### 4. Manual Test Case Management Tools

#### `list_manual_test_cases`
**Purpose**: Search and list manual test cases

**When to Use**:
- User asks about manual test cases
- Need to find test cases by various criteria
- Reviewing test case inventory

**Key Parameters**:
- `projectId` (required)
- `suiteId`: Filter by test suite
- `status`: 'actual', 'draft', 'deprecated'
- `priority`: 'critical', 'high', 'medium', 'low'
- `severity`: 'critical', 'major', 'minor', 'trivial'
- `type`: 'functional', 'smoke', 'regression', 'security', 'performance', 'e2e'
- `tags`: Comma-separated tags
- `search`: Search in title, description, or caseId

#### `get_manual_test_case`
**Purpose**: Get detailed manual test case information

**When to Use**:
- User asks for details about a specific manual test case
- Need test steps, preconditions, metadata

**Key Parameters**:
- `projectId` (required)
- `caseId` (required): Test case ID

#### `create_manual_test_case`
**Purpose**: Create new manual test cases

**When to Use**:
- User wants to create a new test case
- Documenting new test scenarios

**Key Parameters**:
- `projectId` (required)
- `title` (required)
- `suiteId` (required)
- `steps`: Array of {action, expectedResult, data}
- `priority`, `severity`, `type`, etc.

#### `update_manual_test_case`
**Purpose**: Update existing manual test cases

**When to Use**:
- User wants to modify a test case
- Updating test steps or metadata

**Key Parameters**:
- `projectId` (required)
- `caseId` (required)
- `updates`: Object with fields to update

#### `list_manual_test_suites`
**Purpose**: List test suite hierarchy

**When to Use**:
- Need to find suite IDs for test case creation
- Understanding test organization structure

**Key Parameters**:
- `projectId` (required)
- `parentSuiteId`: Optional, to get children of a specific suite

#### `create_manual_test_suite`
**Purpose**: Create new test suite folders

**When to Use**:
- User wants to organize test cases in a new suite
- Creating test suite structure

**Key Parameters**:
- `projectId` (required)
- `name` (required)
- `parentSuiteId`: Optional, for nested suites

---

## Common Patterns & Workflows

### Pattern 1: Initial Setup
```
1. Call health() to verify connection
2. Extract projectId from response
3. Store projectId for subsequent calls
```

### Pattern 2: Finding Failed Tests
```
1. Call list_testruns(projectId, by_branch="main", limit=10)
2. Get test run IDs from results
3. Call list_testcase(projectId, by_testrun_id=runId, by_status="failed")
4. For each failed test, call get_testcase_details() if user wants details
```

### Pattern 3: Debugging a Test
```
1. User: "Why is test X failing?"
2. Call debug_testcase(projectId, "test X")
3. Analyze returned patterns
4. Optionally call get_testcase_details() for specific execution details
5. Provide analysis and suggestions
```

### Pattern 4: Time-Based Analysis
```
1. User: "Show me test runs from last week"
2. Call list_testruns(projectId, by_time_interval="weekly")
3. Analyze results and present summary
```

### Pattern 5: Cross-Run Analysis
```
1. User: "Find all failed tests on main branch"
2. Call list_testcase(projectId, by_branch="main", by_status="failed")
   (No need to call list_testruns first - tool handles it internally)
3. Present results grouped by test run or test case
```

### Pattern 6: Creating Manual Test Cases
```
1. Call list_manual_test_suites(projectId) to find suite IDs
2. If suite doesn't exist, call create_manual_test_suite(projectId, name)
3. Call create_manual_test_case(projectId, title, suiteId, steps, ...)
```

---

## Parameter Requirements

### Required Parameters Summary

| Tool | Required Parameters |
|------|-------------------|
| `health` | None |
| `list_testruns` | `projectId` |
| `get_run_details` | `projectId` + (`testrun_id` OR `counter`) |
| `list_testcase` | `projectId` + (test run identifier OR test run filter) |
| `get_testcase_details` | `projectId` + (`testcase_id` OR (`testcase_name` + (`testrun_id` OR `counter`))) |
| `debug_testcase` | `projectId`, `testcase_name` |
| `list_manual_test_cases` | `projectId` |
| `get_manual_test_case` | `projectId`, `caseId` |
| `create_manual_test_case` | `projectId`, `title`, `suiteId` |
| `update_manual_test_case` | `projectId`, `caseId`, `updates` |
| `list_manual_test_suites` | `projectId` |
| `create_manual_test_suite` | `projectId`, `name` |

### Getting projectId

**Always start with `health()` tool** to get project IDs:
```javascript
// Call health() first
const healthResult = await health();
// Extract projectId from the response
// Response format includes organizations and projects with IDs
```

### Common Parameter Patterns

**Time Intervals**:
- `'1d'`: Last day
- `'3d'`: Last 3 days
- `'weekly'`: Last 7 days
- `'monthly'`: Last 30 days
- `'2024-01-01,2024-01-31'`: Custom date range

**Status Values**:
- `'passed'`, `'failed'`, `'skipped'`, `'flaky'`

**Error Categories**:
- `'timeout_issues'`, `'element_not_found'`, `'assertion_failures'`, `'network_issues'`

**Browsers**:
- `'chromium'`, `'firefox'`, `'webkit'`

---

## Decision Trees

### When User Asks About Test Runs

```
User asks about test runs
│
├─ Need project info?
│  └─ Call health() first
│
├─ Need specific test run details?
│  └─ Do you have testrun_id or counter?
│     ├─ Yes → get_run_details(projectId, testrun_id/counter)
│     └─ No → list_testruns() first to find IDs
│
└─ Need to filter test runs?
   └─ list_testruns(projectId, filters...)
```

### When User Asks About Test Cases

```
User asks about test cases
│
├─ Need specific test case details?
│  └─ Do you have testcase_id?
│     ├─ Yes → get_testcase_details(projectId, testcase_id)
│     └─ No → Do you have testcase_name + testrun_id/counter?
│        ├─ Yes → get_testcase_details(projectId, testcase_name, testrun_id/counter)
│        └─ No → list_testcase() first to find IDs
│
├─ Need to debug a test case?
│  └─ Do you have testcase_name?
│     ├─ Yes → debug_testcase(projectId, testcase_name)
│     └─ No → Ask user for test case name
│
└─ Need to filter test cases?
   └─ list_testcase(projectId, filters...)
      │
      ├─ Filter by test run?
      │  └─ Use by_testrun_id or counter
      │
      └─ Filter by branch/environment/commit?
         └─ Use by_branch, by_environment, by_commit, etc.
            (Tool will find matching test runs first)
```

### When User Asks About Manual Test Cases

```
User asks about manual test cases
│
├─ Need to list/search?
│  └─ list_manual_test_cases(projectId, filters...)
│
├─ Need details?
│  └─ get_manual_test_case(projectId, caseId)
│
├─ Need to create?
│  └─ Need suite ID?
│     ├─ Yes → list_manual_test_suites(projectId) first
│     └─ No → create_manual_test_case(projectId, title, suiteId, ...)
│
└─ Need to update?
   └─ update_manual_test_case(projectId, caseId, updates)
```

---

## Best Practices

### 1. Always Start with Health Check

When user first mentions TestDino or you need project information:
```javascript
// First call
const healthResult = await health();
// Extract projectId and store it
```

### 2. Use Appropriate Filters

Don't fetch all data when you can filter:
```javascript
// ❌ Bad: Fetch all test runs
list_testruns(projectId, get_all=true)

// ✅ Good: Filter by what user asked
list_testruns(projectId, by_branch="main", by_time_interval="weekly", limit=20)
```

### 3. Combine Tools for Complete Analysis

For comprehensive analysis, combine multiple tools:
```javascript
// 1. Find test runs
const runs = await list_testruns(projectId, by_branch="main");

// 2. Get details for specific run
const details = await get_run_details(projectId, testrun_id=runs[0]._id);

// 3. Get failed test cases
const failed = await list_testcase(projectId, by_testrun_id=runs[0]._id, by_status="failed");

// 4. Debug specific test
const debug = await debug_testcase(projectId, "Verify user login");
```

### 4. Handle Missing Parameters Gracefully

If user doesn't provide required parameters:
```javascript
// Check if projectId is available
if (!projectId) {
  // Call health() to get it
  const healthResult = await health();
  projectId = extractProjectId(healthResult);
}

// If testrun_id missing but user mentioned branch
if (!testrun_id && userMentionedBranch) {
  // Use list_testruns with branch filter
  const runs = await list_testruns(projectId, by_branch=branch);
  // Then use first run or ask user which one
}
```

### 5. Use Pagination Wisely

For large result sets:
```javascript
// Start with limited results
const firstPage = await list_testruns(projectId, limit=20);

// If user needs more, fetch additional pages
if (needMore) {
  const secondPage = await list_testruns(projectId, limit=20, page=2);
}
```

### 6. Leverage Cross-Run Filtering

Use `list_testcase` with test run filters to avoid multiple calls:
```javascript
// ❌ Less efficient: Find runs first, then test cases
const runs = await list_testruns(projectId, by_branch="main");
const cases = await list_testcase(projectId, by_testrun_id=runs[0]._id, by_status="failed");

// ✅ More efficient: Let tool handle it
const cases = await list_testcase(projectId, by_branch="main", by_status="failed");
```

### 7. Provide Context in Responses

When presenting results, include context:
```javascript
// Include test run information when showing test cases
// Include error categories when showing failed tests
// Include time range when showing filtered results
```

---

## Error Handling

### Common Errors

1. **Missing PAT**
   ```
   Error: Missing TESTDINO_PAT environment variable
   ```
   **Solution**: Inform user to configure PAT in mcp.json

2. **Missing projectId**
   ```
   Error: projectId is required
   ```
   **Solution**: Call `health()` first to get project IDs

3. **Missing Required Parameters**
   ```
   Error: At least one of the following must be provided: ...
   ```
   **Solution**: Check tool documentation for required parameters

4. **Test Run Not Found**
   ```
   Error: 404 Not Found
   ```
   **Solution**: Verify test run ID exists, use `list_testruns()` to find valid IDs

5. **No Results Found**
   ```
   Response: { count: 0, testRuns: [] }
   ```
   **Solution**: Adjust filters or inform user no results match criteria

### Error Handling Pattern

```javascript
try {
  const result = await toolCall(params);
  // Process result
} catch (error) {
  if (error.message.includes("TESTDINO_PAT")) {
    // Guide user to configure PAT
  } else if (error.message.includes("projectId")) {
    // Call health() to get projectId
  } else if (error.message.includes("404")) {
    // Resource not found, suggest using list tools
  } else {
    // Generic error handling
  }
}
```

---

## Tool Reference Quick Guide

### Quick Lookup Table

| User Intent | Tool to Use | Key Parameters |
|------------|-------------|----------------|
| "Check connection" | `health` | None |
| "Show test runs" | `list_testruns` | `projectId`, filters |
| "Details of test run X" | `get_run_details` | `projectId`, `testrun_id`/`counter` |
| "Show failed tests" | `list_testcase` | `projectId`, `by_status="failed"` |
| "Why is test X failing?" | `debug_testcase` | `projectId`, `testcase_name` |
| "Details of test case X" | `get_testcase_details` | `projectId`, `testcase_id` or `testcase_name`+`testrun_id` |
| "List manual test cases" | `list_manual_test_cases` | `projectId`, filters |
| "Create test case" | `create_manual_test_case` | `projectId`, `title`, `suiteId`, `steps` |

### Parameter Quick Reference

**Time Filters**:
- `by_time_interval`: '1d', '3d', 'weekly', 'monthly', 'YYYY-MM-DD,YYYY-MM-DD'

**Status Filters**:
- `by_status`: 'passed', 'failed', 'skipped', 'flaky'

**Test Run Identification**:
- `testrun_id`: String ID
- `counter`: Number (sequential)

**Test Case Identification**:
- `testcase_id`: String ID
- `testcase_name` + `testrun_id`/`counter`: Name with context

**Pagination**:
- `limit`: Number (default varies by tool)
- `page`: Number (default: 1)
- `get_all`: Boolean (default: false)

---

## Summary

### Key Takeaways

1. **Always start with `health()`** to get project IDs and verify connection
2. **Use filters** to narrow results instead of fetching everything
3. **Combine tools** for comprehensive analysis
4. **Handle errors gracefully** and guide users to solutions
5. **Leverage cross-run filtering** in `list_testcase` to avoid multiple calls
6. **Use `debug_testcase`** for AI-assisted failure analysis
7. **Provide context** in responses (test run info, time ranges, etc.)

### Tool Selection Flow

```
Need project info? → health()
Need test runs? → list_testruns()
Need test run details? → get_run_details()
Need test cases? → list_testcase()
Need test case details? → get_testcase_details()
Need to debug? → debug_testcase()
Need manual test cases? → list_manual_test_cases() / get_manual_test_case()
Need to create/update? → create_manual_test_case() / update_manual_test_case()
```

---

## Additional Resources

- **Full Documentation**: See `docs/TOOLS.md` for detailed tool documentation
- **Installation Guide**: See `docs/INSTALLATION.md` for setup instructions
- **Documentation**: https://docs.testdino.com

---

*This guide is designed to help AI agents efficiently use TestDino MCP tools. For user-facing documentation, refer to the main README.md and docs/TOOLS.md files.*

