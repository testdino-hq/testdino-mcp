# TestDino MCP Server - Tools Documentation

This comprehensive guide covers all available tools in the `testdino-mcp` MCP server. Each tool enables you to interact with your TestDino test data through natural language commands in AI coding assistants.

> **Platform Support**: This documentation and examples are currently optimized for **Cursor**. Support for **Claude Desktop** and **VS Code** is planned for future releases. The tools work with any MCP-compatible client, but setup instructions focus on Cursor.

## Understanding This Documentation

- **What each tool does**: Clear explanation of functionality
- **When to use it**: Common use cases and scenarios
- **How to use it**: Step-by-step examples with real commands
- **What you'll get back**: Expected response formats
- **Troubleshooting**: Common issues and solutions

**Prerequisites**: Most tools require a Personal Access Token (PAT) configured as `TESTDINO_API_KEY` in your `.cursor/mcp.json` file. The PAT provides access to all organizations and projects you have permissions for. See the [Installation Guide](./INSTALLATION.md) for setup instructions.

## Table of Contents

**Test Execution & Results:**

- [health](#health)
- [list_testruns](#list_testruns)
- [get_run_details](#get_run_details)
- [list_testcase](#list_testcase)
- [get_testcase_details](#get_testcase_details)
- [debug_testcase](#debug_testcase)

**Test Case Management:**

- [list_manual_test_cases](#list_manual_test_cases)
- [get_manual_test_case](#get_manual_test_case)
- [create_manual_test_case](#create_manual_test_case)
- [update_manual_test_case](#update_manual_test_case)
- [list_manual_test_suites](#list_manual_test_suites)
- [create_manual_test_suite](#create_manual_test_suite)

---

## health

**Purpose**: Verify your connection to TestDino and validate your API key configuration.

### Description

The health tool is your first step after installation. It checks if:

- The MCP server is running correctly
- Your API key is configured properly
- You can successfully connect to TestDino
- Your project information is accessible

This is the perfect tool to use when troubleshooting connection issues or verifying your setup is correct.

### Parameters

**No parameters required.** The health tool now automatically displays your account information and available organizations/projects.

**Note:** The Personal Access Token (PAT) is automatically read from the `TESTDINO_API_KEY` environment variable configured in `.cursor/mcp.json`. You don't need to pass it as a parameter. The PAT provides access to all your organizations and projects.

### Configuration

Before using this tool with API key validation, configure your TestDino API key in `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "TestDino": {
      "command": "testdino-mcp",
      "env": {
        "TESTDINO_API_KEY": "your_testdino_api_key_here"
      }
    }
  }
}
```

### Example Usage

**Request:**

```json
{
  "name": "health",
  "arguments": {
    "name": "testdino-mcp"
  }
}
```

**Response (with API key configured):**

```
Hello, testdino-mcp! 👋

This is your MCP server responding.

✅ API key validated successfully!
Project Name: My Test Project
Project ID: proj_690ded10f1fb81a3ca1bbc50
```

**Response (without API key):**

```
Hello, testdino-mcp! 👋

This is your MCP server responding.

⚠️ No TESTDINO_API_KEY available to verify
```

### Use Cases

- Testing MCP server connectivity
- Validating API key configuration
- Verifying project access
- Troubleshooting authentication issues

### Error Handling

**API Key Validation Error:**

```
Hello, testdino-mcp! 👋

This is your MCP server responding.

❌ Error validating API key: [error message]
```

### Prerequisites

- **Personal Access Token (PAT)**: For full validation, configure `TESTDINO_API_KEY` in `.cursor/mcp.json`. The PAT provides access to all your organizations and projects.
- **Internet Connectivity**: Required for API key validation

### Technical Details

- **API Endpoint**: `/api/mcp/hello`
- **Method**: GET
- **Authentication**: Bearer token from `TESTDINO_API_KEY` environment variable (Personal Access Token)
- **Response Format**: Text with project information

---

## list_testruns

**Purpose**: Browse and filter your test runs to find specific test executions.

### Description

This tool helps you discover and explore test runs in your TestDino project. Think of it as a searchable list of all your test executions. You can filter by:

- **Branch**: Find test runs from specific git branches
- **Time**: Get runs from the last day, week, month, or a custom date range
- **Author**: See test runs by specific developers
- **Commit**: Find runs by git commit hash
- **Environment**: Filter by environment (production, staging, development, etc.)

Perfect for answering questions like "What tests ran on the develop branch?" or "Show me all test runs from production environment."

### Parameters

| Parameter          | Type    | Required | Default | Description                                                                                                                                                     |
| ------------------ | ------- | -------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `by_branch`        | string  | No       | -       | Filter by git branch name((e.g., 'main', 'develop', 'feature/login'))                                                                                           |
| `by_time_interval` | string  | No       | -       | Filter by time interval. Supports: '1d' (last day), '3d' (last 3 days), 'weekly' (last 7 days), 'monthly' (last 30 days), or date range '2024-01-01,2024-01-31' |
| `by_author`        | string  | No       | -       | Filter by commit author name (case-insensitive, partial match)                                                                                                  |
| `by_commit`        | string  | No       | -       | Filter by git commit hash (full or partial)                                                                                                                     |
| `by_environment`   | string  | No       | -       | Filter by environment. Example: 'production', 'staging','development' - filters by metadata.git.environment                                                     |
| `limit`            | number  | No       | 20      | Number of results per page (max: 1000)                                                                                                                          |
| `page`             | number  | No       | 1       | Page number for pagination                                                                                                                                      |
| `get_all`          | boolean | No       | false   | Get all results up to 1000 (default: false)                                                                                                                     |

**Note:** The API key is automatically read from the `TESTDINO_API_KEY` environment variable configured in `.cursor/mcp.json`.

### Configuration

Configure your TestDino API key in `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "TestDino": {
      "command": "testdino-mcp",
      "env": {
        "TESTDINO_API_KEY": "your_testdino_api_key_here"
      }
    }
  }
}
```

### Example Usage

**List Recent Test Runs:**

```json
{
  "name": "list_testruns",
  "arguments": {
    "limit": 10
  }
}
```

**Filter by Branch:**

```json
{
  "name": "list_testruns",
  "arguments": {
    "by_branch": "develop",
    "limit": 20
  }
}
```

**Filter by Time Interval:**

```json
{
  "name": "list_testruns",
  "arguments": {
    "by_time_interval": "3d",
    "limit": 50
  }
}
```

**Filter by Author:**

```json
{
  "name": "list_testruns",
  "arguments": {
    "by_author": "john",
    "limit": 20
  }
}
```

**Filter by Commit:**

```json
{
  "name": "list_testruns",
  "arguments": {
    "by_commit": "abc123",
    "limit": 10
  }
}
```

**Filter by Environment:**

```json
{
  "name": "list_testruns",
  "arguments": {
    "by_environment": "production",
    "limit": 20
  }
}
```

**Pagination:**

```json
{
  "name": "list_testruns",
  "arguments": {
    "page": 2,
    "limit": 20
  }
}
```

**Get All Results:**

```json
{
  "name": "list_testruns",
  "arguments": {
    "get_all": true
  }
}
```

**Date Range Filter:**

```json
{
  "name": "list_testruns",
  "arguments": {
    "by_time_interval": "2024-01-01,2024-01-31",
    "limit": 100
  }
}
```

### Response Format

The tool returns a JSON response with:

- `success`: Boolean indicating if the request was successful
- `message`: Status message
- `data.count`: Total number of test runs returned
- `data.testRuns`: Array of test run objects containing:
  - `_id`: Test run identifier
  - `counter`: Run counter number
  - `startTime`: Test run start timestamp
  - `endTime`: Test run end timestamp
  - `duration`: Duration in milliseconds
  - `status`: Run status (e.g., "completed")
  - `environment`: Environment where tests ran
  - `branch`: Git branch name
  - `author`: Commit author
  - `pr`: Pull request ID (if applicable)
  - `testStats`: Object with test statistics:
    - `total`: Total number of tests
    - `passed`: Number of passed tests
    - `failed`: Number of failed tests
    - `skipped`: Number of skipped tests
    - `flaky`: Number of flaky tests
    - `timedOut`: Number of timed out tests
    - `totalAttempts`: Total test attempts (including retries)
    - `retriedTests`: Number of tests that were retried

### Example Response

```json
{
  "success": true,
  "message": "Test runs retrieved successfully",
  "data": {
    "count": 20,
    "testRuns": [
      {
        "_id": "test_run_6901b2abc6b187e63f536a6b",
        "counter": 5194,
        "startTime": "2025-10-29T05:42:05.446Z",
        "endTime": "2025-10-29T06:08:15.439Z",
        "duration": 1569993.858,
        "status": "completed",
        "environment": "Linux",
        "branch": "develop",
        "author": "john",
        "pr": "4422",
        "testStats": {
          "total": 367,
          "passed": 324,
          "failed": 2,
          "skipped": 16,
          "flaky": 25,
          "timedOut": 0,
          "totalAttempts": 406,
          "retriedTests": 27
        }
      }
    ]
  }
}
```

### Use Cases

- **Monitoring Test Runs**: Track recent test execution activity
- **Branch Analysis**: Review test results for specific branches
- **PR Testing**: Check test runs associated with pull requests
- **Time-based Analysis**: Analyze test runs over specific time periods
- **Author Tracking**: Review test runs by specific developers
- **Performance Monitoring**: Identify slow or problematic test runs

### Error Handling

**Missing API Key:**

```
Error: Missing TESTDINO_API_KEY environment variable.
Please configure it in your .cursor/mcp.json file under the 'env' section.
```

**API Request Failed:**

```
Error: Failed to list test runs: [error message]
```

### Prerequisites

1. **TestDino Account**: Valid account with API access
2. **API Key Configuration**: `TESTDINO_API_KEY` must be set in `.cursor/mcp.json` under the `env` section
3. **Internet Connectivity**: Required to access TestDino API
4. **Test Runs**: At least one test run should exist in your TestDino project

### Technical Details

- **API Endpoint**: `/api/test-runs`
- **Method**: GET
- **Authentication**: Bearer token from `TESTDINO_API_KEY` environment variable
- **Response Format**: JSON

### Related Documentation

- [TestDino API Documentation](https://docs.testdino.com)
- [TestDino Support](mailto:support@testdino.com)

---

## list_testcase

**Purpose**: List test cases with comprehensive filtering options across test runs.

### Description

This tool provides powerful filtering capabilities to find specific test cases. You can filter by:

- **Test run identification**: By test run ID or counter
- **Test case properties**: Status, spec file, browser, tags, runtime, artifacts, error messages, attempt number
- **Test run context**: Branch, time interval, environment, author, commit hash
- **Pagination**: By page number (doesn't require test run ID)

**Important**: You can identify which test runs to search in two ways:

1. **Direct Test Run Identification**: Use `by_testrun_id` OR `counter` to specify specific test runs
2. **Test Run Filters**: Use any of the following filters to first list matching test runs, then return test cases from those runs:
   - `by_branch` - Filter by git branch name
   - `by_commit` - Filter by git commit hash
   - `by_author` - Filter by commit author
   - `by_environment` - Filter by environment (production, staging, development, etc.)
   - `by_time_interval` - Filter by time period
   - `by_pages` - List by page number
   - `page` - Page number for pagination
   - `limit` - Results per page
   - `get_all` - Get all results

When using test run filters (option 2), the tool first finds test runs matching those criteria, then returns all test cases from those filtered test runs. This allows you to find test cases across multiple test runs without needing to know specific test run IDs.

All other parameters are optional filters that can be combined to narrow down results.

### Parameters

| Parameter           | Type    | Required | Description                                                                                                                                                                                                                        |
| ------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `by_testrun_id`     | string  | No\*     | Test run ID(s). Single ID or comma-separated for multiple runs (max 20). Example: 'test_run_123' or 'run1,run2,run3'. Required unless using counter, by_pages, or by_branch.                                                       |
| `counter`           | number  | No\*     | Test run counter number. Alternative to by_testrun_id. Required unless using by_testrun_id, by_pages, or by_branch. Example: 43.                                                                                                   |
| `by_status`         | string  | No       | Filter by status: 'passed', 'failed', 'skipped', or 'flaky'.                                                                                                                                                                       |
| `by_spec_file_name` | string  | No       | Filter by spec file name. Example: 'login.spec.js' or 'user-profile.spec.ts'.                                                                                                                                                      |
| `by_error_category` | string  | No       | Filter by error category. Example: 'timeout_issues', 'element_not_found', 'assertion_failures', 'network_issues'.                                                                                                                  |
| `by_browser_name`   | string  | No       | Filter by browser name. Example: 'chromium', 'firefox', 'webkit'.                                                                                                                                                                  |
| `by_tag`            | string  | No       | Filter by tag(s). Single tag or comma-separated. Example: 'smoke' or 'smoke,regression'.                                                                                                                                           |
| `by_total_runtime`  | string  | No       | Filter by total runtime. Use '<60' for less than 60 seconds, '>100' for more than 100 seconds. Example: '<60', '>100', '<30'.                                                                                                      |
| `by_artifacts`      | boolean | No       | Filter test cases that have artifacts available (screenshots, videos, traces). Set to true to list only test cases with artifacts (default: false).                                                                                |
| `by_error_message`  | string  | No       | Filter by error message (partial match, case-insensitive). Example: 'Test timeout of 60000ms exceeded'.                                                                                                                            |
| `by_attempt_number` | number  | No       | Filter by attempt number. Example: 1 for first attempt, 2 for second attempt.                                                                                                                                                      |
| `by_pages`          | number  | No       | List test cases by page number. Does not require testrun_id or counter. Returns test cases from all test runs on the specified page.                                                                                               |
| `by_branch`         | string  | No       | Filter by git branch name. Does not require testrun_id or counter. First lists test runs on the specified branch, then returns test cases from those test runs. Example: 'main', 'develop'.                                        |
| `by_time_interval`  | string  | No       | Filter by time interval. Returns test cases from test runs in the specified time period. Supports: '1d' (last day), '3d' (last 3 days), 'weekly' (last 7 days), 'monthly' (last 30 days), or '2024-01-01,2024-01-31' (date range). |
| `limit`             | number  | No       | Number of results per page (default: 1000, max: 1000).                                                                                                                                                                             |
| `by_environment`    | string  | No       | Filter by environment. Returns test cases from test runs in the specified environment. Example: 'production', 'staging', 'development'.                                                                                            |
| `by_author`         | string  | No       | Filter by commit author name (case-insensitive, partial match). Returns test cases from test runs by the specified author.                                                                                                         |
| `by_commit`         | string  | No       | Filter by git commit hash (full or partial). Returns test cases from test runs with the specified commit.                                                                                                                          |
| `page`              | number  | No       | Page number for pagination (default: 1).                                                                                                                                                                                           |
| `get_all`           | boolean | No       | Get all results up to 1000 (default: false).                                                                                                                                                                                       |

**Note:** The API key is automatically read from the `TESTDINO_API_KEY` environment variable configured in `.cursor/mcp.json`.

### Configuration

Configure your TestDino API key in `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "TestDino": {
      "command": "testdino-mcp",
      "env": {
        "TESTDINO_API_KEY": "your_testdino_api_key_here"
      }
    }
  }
}
```

### Example Usage

**List All Test Cases by Test Run ID:**

```json
{
  "name": "list_testcase",
  "arguments": {
    "by_testrun_id": "test_run_6901b2abc6b187e63f536a6b"
  }
}
```

**List Test Cases by Counter:**

```json
{
  "name": "list_testcase",
  "arguments": {
    "counter": 43
  }
}
```

**Filter by Status - Failed Tests:**

```json
{
  "name": "list_testcase",
  "arguments": {
    "by_testrun_id": "test_run_6901b2abc6b187e63f536a6b",
    "by_status": "failed"
  }
}
```

**Filter by Error Category - Timeout Issues:**

```json
{
  "name": "list_testcase",
  "arguments": {
    "counter": 43,
    "by_error_category": "timeout_issues"
  }
}
```

**Filter by Browser - Firefox:**

```json
{
  "name": "list_testcase",
  "arguments": {
    "by_testrun_id": "test_run_6901b2abc6b187e63f536a6b",
    "by_browser_name": "firefox"
  }
}
```

**Filter by Runtime - Less Than 60 Seconds:**

```json
{
  "name": "list_testcase",
  "arguments": {
    "counter": 43,
    "by_total_runtime": "<60"
  }
}
```

**Filter by Artifacts:**

```json
{
  "name": "list_testcase",
  "arguments": {
    "by_testrun_id": "test_run_6901b2abc6b187e63f536a6b",
    "by_artifacts": true
  }
}
```

**Filter by Error Message:**

```json
{
  "name": "list_testcase",
  "arguments": {
    "counter": 43,
    "by_error_message": "Test timeout of 60000ms exceeded"
  }
}
```

**Filter by Attempt Number:**

```json
{
  "name": "list_testcase",
  "arguments": {
    "by_testrun_id": "test_run_6901b2abc6b187e63f536a6b",
    "by_attempt_number": 1
  }
}
```

**List by Page Number (No Test Run ID Required):**

```json
{
  "name": "list_testcase",
  "arguments": {
    "by_pages": 1
  }
}
```

**Filter by Branch (No Test Run ID Required):**

```json
{
  "name": "list_testcase",
  "arguments": {
    "by_branch": "main"
  }
}
```

**Filter by Environment and Status (No Test Run ID Required):**

```json
{
  "name": "list_testcase",
  "arguments": {
    "by_environment": "production",
    "by_status": "failed"
  }
}
```

**Filter by Commit and Browser (No Test Run ID Required):**

```json
{
  "name": "list_testcase",
  "arguments": {
    "by_commit": "1c402f4dac574278d11da59f5c63d3e73f28b1f4",
    "by_browser_name": "chromium"
  }
}
```

**Filter by Author and Time Interval (No Test Run ID Required):**

```json
{
  "name": "list_testcase",
  "arguments": {
    "by_author": "john",
    "by_time_interval": "weekly"
  }
}
```

**Filter by Page Number (No Test Run ID Required):**

```json
{
  "name": "list_testcase",
  "arguments": {
    "by_pages": 1,
    "limit": 50
  }
}
```

**Complex Filter - Multiple Conditions (No Test Run ID Required):**

```json
{
  "name": "list_testcase",
  "arguments": {
    "by_branch": "develop",
    "by_status": "failed",
    "by_error_category": "timeout_issues",
    "by_total_runtime": ">100"
  }
}
```

### Response Format

The tool returns a JSON response with test case information including:

- Test case identifiers
- Test titles
- Status (passed, failed, skipped, flaky)
- Duration
- Browser information
- Error details (for failed tests)

### Use Cases

- **Debugging Failed Tests**: Quickly identify which tests failed in a run or across multiple runs
- **Flaky Test Analysis**: Find and analyze flaky tests across test runs
- **Test Coverage Review**: Review all tests in a specific run or across runs matching criteria
- **Status-based Filtering**: Focus on specific test outcomes (passed, failed, skipped, flaky)
- **Cross-Run Analysis**: Find test cases across multiple test runs using filters (branch, environment, commit, author, time)
- **Environment-Specific Analysis**: Analyze test cases from specific environments (production, staging, development)
- **Browser-Specific Analysis**: Find test cases executed on specific browsers
- **Error Pattern Detection**: Identify common error categories or messages across test runs
- **Performance Analysis**: Find slow or fast tests using runtime filters
- **Artifact Management**: Locate test cases with available debugging artifacts (screenshots, videos, traces)

### Error Handling

**Missing API Key:**

```
Error: Missing TESTDINO_API_KEY environment variable.
Please configure it in your .cursor/mcp.json file under the 'env' section.
```

**Missing Required Parameters:**

```
Error: At least one of the following must be provided: by_testrun_id, counter, or any test run filter (by_branch, by_commit, by_author, by_environment, by_time_interval, by_pages, page, limit, get_all)
```

**API Request Failed:**

```
Error: Failed to list test cases: [error message]
```

### Prerequisites

1. **TestDino Account**: Valid account with API access
2. **API Key Configuration**: `TESTDINO_API_KEY` must be set in `.cursor/mcp.json` under the `env` section
3. **Test Run Identification**: Either a test run ID/counter OR at least one test run filter (by_branch, by_commit, by_author, by_environment, by_time_interval, by_pages, page, limit, get_all)
4. **Internet Connectivity**: Required to access TestDino API

### Technical Details

- **API Endpoint**: `/api/test-cases`
- **Method**: GET
- **Authentication**: Bearer token from `TESTDINO_API_KEY` environment variable
- **Response Format**: JSON

### Related Documentation

- [TestDino API Documentation](https://docs.testdino.com)
- [TestDino Support](mailto:support@testdino.com)

---

## get_testcase_details

**Purpose**: Get comprehensive information about a specific test case, including error details, execution steps, and debugging information.

### Description

This is your deep-dive tool for understanding why a test failed or how it executed. It provides:

- **Error details**: Full error messages and stack traces
- **Execution steps**: Step-by-step what the test did
- **Console logs**: Any console output during test execution
- **Retry attempts**: Information about multiple attempts if the test was retried
- **Metadata**: Test duration, browser, environment, and more

Use this when you need to debug a failing test or understand exactly what happened during test execution.

**Important**: You can identify a test case in two ways:

1. **By test case ID** - Use `testcase_id` alone (if you know the exact test case ID)
2. **By test case name** - Use `testcase_name` combined with either `testrun_id` OR `counter` (required because test cases can have the same name across different test runs)

### Parameters

| Parameter       | Type   | Required | Description                                                                                                                                                            |
| --------------- | ------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `testcase_id`   | string | No\*     | Test case ID. Can be used alone to get test case details. Example: 'test_case_123'.                                                                                    |
| `testcase_name` | string | No\*     | Test case name/title. Must be combined with either testrun_id or counter to identify which test run's test case you want. Example: 'Verify user can logout and login'. |
| `testrun_id`    | string | No       | Test run ID. Required when using testcase_name to specify which test run's test case you want. Example: 'test_run_6901b2abc6b187e63f536a6b'.                           |
| `counter`       | number | No       | Test run counter number. Required when using testcase_name (if testrun_id is not provided) to specify which test run's test case you want. Example: 43.                |

**Note:** The API key is automatically read from the `TESTDINO_API_KEY` environment variable configured in `.cursor/mcp.json`.

### Configuration

Configure your TestDino API key in `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "TestDino": {
      "command": "testdino-mcp",
      "env": {
        "TESTDINO_API_KEY": "your_testdino_api_key_here"
      }
    }
  }
}
```

### Example Usage

**Get Test Case Details by ID:**

```json
{
  "name": "get_testcase_details",
  "arguments": {
    "testcase_id": "test_case_6901b2abc6b187e63f536a6b"
  }
}
```

**Get Test Case Details by Name and Test Run ID:**

```json
{
  "name": "get_testcase_details",
  "arguments": {
    "testcase_name": "Verify user can logout and login",
    "testrun_id": "test_run_6901b2abc6b187e63f536a6b"
  }
}
```

**Get Test Case Details by Name and Counter:**

```json
{
  "name": "get_testcase_details",
  "arguments": {
    "testcase_name": "Verify user can logout and login",
    "counter": 43
  }
}
```

**Natural Language Example:**

- "Get test case details for 'Verify user can logout and login' in testrun #43"
- "Show me details for test case test_case_6901b2abc6b187e63f536a6b"

### Response Format

The tool returns a JSON response with comprehensive test case information including:

- Test case metadata
- Test attempts and retries
- Execution steps
- Console logs
- Error details and stack traces
- Screenshots and artifacts (if available)
- Performance metrics

### Use Cases

- **Deep Debugging**: Investigate specific test failures in detail
- **Error Analysis**: Review error messages and stack traces
- **Step-by-step Review**: Understand test execution flow
- **Console Log Analysis**: Review console output during test execution
- **Performance Investigation**: Analyze test duration and timing

### Error Handling

**Missing API Key:**

```
Error: Missing TESTDINO_API_KEY environment variable.
Please configure it in your .cursor/mcp.json file under the 'env' section.
```

**Missing Required Parameters:**

```
Error: Either 'testcase_id' or 'testcase_name' must be provided.
If using 'testcase_name', you must also provide either 'testrun_id' or 'counter' to specify which test run's test case you want.
```

**Missing Test Run ID/Counter with Test Case Name:**

```
Error: When using 'testcase_name', you must also provide either 'testrun_id' or 'counter' to specify which test run's test case you want.
This is required because test cases can have the same name across different test runs.
```

**API Request Failed:**

```
Error: Failed to retrieve test case details: [error message]
```

### Prerequisites

1. **TestDino Account**: Valid account with API access
2. **API Key Configuration**: `TESTDINO_API_KEY` must be set in `.cursor/mcp.json` under the `env` section
3. **Test Case ID**: A valid test case identifier
4. **Internet Connectivity**: Required to access TestDino API

### Technical Details

- **API Endpoint**: `/api/test-cases/{testcaseid}`
- **Method**: GET
- **Authentication**: Bearer token from `TESTDINO_API_KEY` environment variable
- **Response Format**: JSON

### Related Documentation

- [TestDino API Documentation](https://docs.testdino.com)
- [TestDino Support](mailto:support@testdino.com)

---

## debug_testcase

**Purpose**: Debug a specific test case by fetching aggregated historical execution and failure data from the TestDino API to provide AI-assisted root-cause analysis and fix suggestions.

### Description

This tool is designed for AI-assisted debugging of test case failures. It calls the TestDino API which aggregates historical execution data for a specific test case across multiple test runs and returns:

- **Failure Pattern Analysis**: Common error categories, messages, and locations
- **Execution History**: Attempts, retries, and duration patterns
- **Timeline Analysis**: Failure timeline across test runs
- **Debugging Prompt**: AI-friendly context for root-cause analysis (provided by the API endpoint)
- **Attachment Metadata**: Available debugging artifacts (screenshots, videos, traces)

**Important**: The `debugging_prompt` is part of the structured data returned by the TestDino API endpoint. It is common for all debug requests and is generated server-side, so there's no need to generate it client-side.

Unlike `get_testcase_details` which shows details for a single execution, `debug_testcase` analyzes patterns across multiple executions to help identify:
- Recurring failure patterns
- Flaky test behavior
- Browser-specific issues
- Common error locations in code
- Retry patterns

**AI Integration**: The tool returns structured data with debugging-oriented prompts (from the API), enabling AI clients (Cursor, Claude, ChatGPT, etc.) to:
- Identify failure patterns automatically
- Explain likely root causes
- Suggest fixes or improvements
- Correlate failures with test code (when AI has access to source code)

### Parameters

| Parameter       | Type   | Required | Description                                                                                                                              |
| --------------- | ------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `projectId`    | string | Yes      | Project ID or Project Name (Required). The TestDino project identifier.                                                                  |
| `testcase_name` | string | Yes      | Test case name/title to debug (Required). Example: 'Verify user can logout and login'. The API performs case-insensitive matching.      |

**Note:** The API key is automatically read from the `TESTDINO_API_KEY` environment variable configured in `.cursor/mcp.json`.

### Configuration

Configure your TestDino API key in `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "TestDino": {
      "command": "testdino-mcp",
      "env": {
        "TESTDINO_API_KEY": "your_testdino_api_key_here"
      }
    }
  }
}
```

### Example Usage

**Basic Debug:**

```json
{
  "name": "debug_testcase",
  "arguments": {
    "projectId": "project_123",
    "testcase_name": "Verify user login"
  }
}
```

**Debug with Project Name:**

```json
{
  "name": "debug_testcase",
  "arguments": {
    "projectId": "My Test Project",
    "testcase_name": "Checkout flow"
  }
}
```

**Natural Language Examples:**

- "Debug test case 'Verify user login'"
- "Analyze failures for 'Checkout flow' test case"
- "What are the failure patterns for 'API authentication' test?"
- "Debug 'User registration' test case"

### Response Format

The tool returns a structured JSON response with:

**Test Metadata:**
- `title`: Test case name
- `total_executions`: Total number of executions found
- `failed_count`: Number of failed executions
- `flaky_count`: Number of flaky executions
- `passed_count`: Number of passed executions
- `skipped_count`: Number of skipped executions

**Execution History:**
- `attempts`: Total number of attempts (including retries)
- `retries`: Number of executions that required retries
- `average_duration`: Average test duration
- `min_duration`: Minimum test duration
- `max_duration`: Maximum test duration

**Error Patterns:**
- `error_categories`: Object mapping error categories to occurrence counts
- `common_error_messages`: Array of most common error messages with counts
- `error_locations`: Array of most common failure locations (file:line) with counts
- `browser_specific_failures`: Object mapping browser names to failure counts (if applicable)

**Failure Timeline:**
- Array of failed/flaky executions with:
  - `testrun_id`: Test run identifier
  - `testrun_counter`: Test run counter number
  - `timestamp`: Execution timestamp
  - `status`: Execution status
  - `error_message`: Error message (truncated)
  - `error_category`: Error category
  - `artifacts_available`: Boolean indicating if debugging artifacts are available

**Debugging Prompt:**
- Pre-formatted text prompt provided by the API endpoint (common for all debug requests)
- Includes:
  - Summary statistics
  - Error pattern analysis
  - Flakiness indicators
  - Retry analysis
  - Recommended actions

**Attachments Metadata:**
- `total_with_screenshots`: Number of executions with screenshots
- `total_with_videos`: Number of executions with videos
- `total_with_traces`: Number of executions with traces

**Test Run Context:**
- `branches`: Array of branches where test executed
- `environments`: Array of environments where test executed
- `commits`: Array of commits where test executed
- `time_range`: Time interval filter applied (if any)

### Example Response

```json
{
  "test_metadata": {
    "title": "Verify user login",
    "total_executions": 45,
    "failed_count": 12,
    "flaky_count": 3,
    "passed_count": 30,
    "skipped_count": 0
  },
  "execution_history": {
    "attempts": 52,
    "retries": 7,
    "average_duration": 45.3,
    "min_duration": 12.1,
    "max_duration": 89.7
  },
  "error_patterns": {
    "error_categories": {
      "timeout_issues": 8,
      "element_not_found": 4
    },
    "common_error_messages": [
      {
        "message": "Test timeout of 60000ms exceeded",
        "count": 8
      },
      {
        "message": "Element not found: #login-button",
        "count": 4
      }
    ],
    "error_locations": [
      {
        "file": "tests/login.spec.ts",
        "line": "42",
        "count": 6
      }
    ],
    "browser_specific_failures": {
      "firefox": 5,
      "chromium": 7
    }
  },
  "failure_timeline": [
    {
      "testrun_id": "test_run_123",
      "testrun_counter": 100,
      "timestamp": "2024-01-15T10:30:00Z",
      "status": "failed",
      "error_message": "Test timeout of 60000ms exceeded",
      "error_category": "timeout_issues",
      "artifacts_available": true
    }
  ],
  "debugging_prompt": "Debugging context for test case: \"Verify user login\"\n\n**Summary:**\n- Total executions analyzed: 45\n- Failed: 12 (26.7%)\n- Flaky: 3 (6.7%)\n- Passed: 30 (66.7%)\n- Overall failure rate: 33.3%\n\n**Error Patterns Detected:**\n- Most common error category: timeout_issues (8 occurrences)\n- Most common error: \"Test timeout of 60000ms exceeded\" (8 times)\n- Most common failure location: tests/login.spec.ts:42 (6 times)\n- Browser-specific issue: chromium has 7 failures\n\n**Recommended Actions:**\n1. Investigate the most common error: \"Test timeout of 60000ms exceeded\"\n2. Check the code at tests/login.spec.ts:42 for potential issues\n3. Address flakiness by improving test stability (waits, selectors, timing)\n4. Review available artifacts (8 screenshots, 5 videos) for visual debugging\n5. If you have access to the test code, correlate these failure patterns with the test implementation\n\nNote: This debugging_prompt is provided by the TestDino API endpoint and is common for all debug requests.",
  "attachments_metadata": {
    "total_with_screenshots": 8,
    "total_with_videos": 5,
    "total_with_traces": 3
  },
  "test_run_context": {
    "branches": ["main", "develop"],
    "environments": ["production", "staging"],
    "commits": ["abc123", "def456"],
    "time_range": "weekly"
  }
}
```

### Use Cases

- **Root Cause Analysis**: Identify why a test case is failing repeatedly
- **Flaky Test Detection**: Analyze patterns to identify flaky behavior
- **Pattern Recognition**: Find common error categories and messages
- **Browser-Specific Issues**: Identify browser-specific failure patterns
- **Code Location Analysis**: Find specific file/line locations where failures occur
- **Historical Trend Analysis**: Understand how test stability changes over time
- **AI-Assisted Debugging**: Provide context for AI tools to suggest fixes
- **Retry Pattern Analysis**: Understand retry behavior and success rates

### Error Handling

**Missing API Key:**

```
Error: Missing TESTDINO_API_KEY environment variable.
Please configure it in your .cursor/mcp.json file under the 'env' section.
```

**Missing Required Parameters:**

```
Error: projectId is required
```

```
Error: testcase_name is required
```

**No Test Cases Found:**

```json
{
  "test_metadata": {
    "title": "Verify user login",
    "total_executions": 0,
    "failed_count": 0,
    "flaky_count": 0,
    "passed_count": 0,
    "skipped_count": 0
  },
  "message": "No test case executions found matching \"Verify user login\". Try adjusting the search name or time interval filters.",
  "debugging_prompt": "No historical data available for test case \"Verify user login\". This could mean:\n1. The test case name doesn't match exactly\n2. No test runs have executed this test case in the specified time range\n3. Try using a broader time interval or removing filters"
}
```

**API Request Failed:**

```
Error: Failed to debug test case: [error message]
```

### Prerequisites

1. **TestDino Account**: Valid account with API access
2. **API Key Configuration**: `TESTDINO_API_KEY` must be set in `.cursor/mcp.json` under the `env` section
3. **Test Case History**: At least one test run should have executed the test case (for meaningful analysis)
4. **Internet Connectivity**: Required to access TestDino API

### Technical Details

- **API Endpoint**: `/api/mcp/:projectId/debug-testcase?testcase_name=<name>`
- **Method**: GET
- **Authentication**: Bearer token from `TESTDINO_API_KEY` environment variable
- **Response Format**: JSON with aggregated debugging data
- **Data Processing**: The API endpoint performs all aggregation and pattern detection server-side
- **Debugging Prompt**: The `debugging_prompt` field is generated by the API endpoint and is common for all debug requests

### AI Integration Notes

**Code-Aware Debugging:**

When the AI client has access to the Playwright project source code, it can:

1. **Read Test Files**: Access the actual test implementation
2. **Correlate Failures**: Match error locations with test code
3. **Analyze Locators**: Check if locators in error messages match test code
4. **Review Waits**: Analyze wait strategies and timing issues
5. **Check Assertions**: Review assertion logic for potential issues

**Example AI Workflow:**

1. User asks: "Why is 'Verify user login' failing?"
2. AI calls `debug_testcase` to get failure patterns
3. AI reads `tests/login.spec.ts` (if accessible)
4. AI correlates error location `tests/login.spec.ts:42` with actual code
5. AI provides specific fix suggestions based on code + failure patterns

**Debugging Prompt Format:**

The `debugging_prompt` field is formatted specifically for AI consumption, providing:
- Structured summary
- Pattern identification
- Actionable recommendations
- Context for code correlation

### Related Documentation

- [TestDino API Documentation](https://docs.testdino.com)
- [TestDino Support](mailto:support@testdino.com)
- [get_testcase_details](#get_testcase_details) - For single execution details
- [list_testcase](#list_testcase) - For finding test cases across runs

---

## upload_latest_local_test_runs

**Purpose**: Upload your local Playwright test results to TestDino for analysis and tracking.

### Description

After running Playwright tests locally, use this tool to upload the results to TestDino. The tool:

- **Automatically finds** your Playwright report directory
- **Detects git information** (branch, commit, author) from your repository
- **Uploads test results** including JSON data and optionally HTML reports
- **Creates a test run** in TestDino that you can then analyze with other tools

This bridges the gap between local testing and centralized test management, allowing you to track local test runs alongside CI/CD runs.

### Parameters

| Parameter    | Type    | Required | Default               | Description                                                          |
| ------------ | ------- | -------- | --------------------- | -------------------------------------------------------------------- |
| `token`      | string  | No       | -                     | TestDino API token (optional if TESTDINO_API_KEY is set in mcp.json) |
| `reportDir`  | string  | No       | `./playwright-report` | Path to the Playwright report directory                              |
| `uploadHtml` | boolean | No       | `true`                | Whether to upload HTML report as well                                |
| `runtime`    | string  | No       | `development`         | TestDino runtime environment (development, staging, or production)   |

**Note:** The API key is automatically read from the `TESTDINO_API_KEY` environment variable configured in `.cursor/mcp.json`. You can also pass it as the `token` parameter if needed.

### How It Works

1. **Report Discovery**: The tool searches for the report directory in common locations:
   - Documents folder
   - Desktop folder
   - Projects folder
   - Current working directory
   - Walks up the directory tree (up to 15 levels) to find the report

2. **Git Detection**: Automatically finds the git repository root to extract:
   - Git commit hash
   - Git branch name
   - Repository name

3. **Upload Process**: Uses the `tdpw` CLI tool to upload:
   - Test results (JSON format)
   - HTML report (if `uploadHtml` is `true`)

### Example Usage

**Basic Upload (using API key from mcp.json):**

```json
{
  "name": "upload_latest_local_test_runs",
  "arguments": {}
}
```

**Upload with Token Parameter:**

```json
{
  "name": "upload_latest_local_test_runs",
  "arguments": {
    "token": "trx_production_your_token_here"
  }
}
```

**Upload with Runtime Environment:**

```json
{
  "name": "upload_latest_local_test_runs",
  "arguments": {
    "runtime": "staging"
  }
}
```

**Custom Report Directory:**

```json
{
  "name": "upload_latest_local_test_runs",
  "arguments": {
    "token": "trx_production_your_token_here",
    "reportDir": "./test-results/playwright-report"
  }
}
```

**JSON Only (No HTML):**

```json
{
  "name": "upload_latest_local_test_runs",
  "arguments": {
    "token": "trx_production_your_token_here",
    "uploadHtml": false
  }
}
```

**Full Example:**

```json
{
  "name": "upload_latest_local_test_runs",
  "arguments": {
    "token": "trx_production_your_token_here",
    "reportDir": "./playwright-report",
    "uploadHtml": true
  }
}
```

### Success Response

```
✅ Report uploaded successfully!

Output:
[tdpw output messages]
```

### Error Handling

The tool provides detailed error messages if something goes wrong:

**Report Directory Not Found:**

```
❌ Upload failed.

Error: Report directory does not exist: C:\path\to\playwright-report
MCP server cwd: C:\Users\...
Project root: C:\Users\...
Searched in: Documents, Desktop, Projects, and current directory
Please ensure the Playwright report has been generated at: ./playwright-report
```

**Missing Token:**

```
Error: Missing TESTDINO_API_KEY environment variable.
Please configure it in your .cursor/mcp.json file under the 'env' section, or provide it as the 'token' argument.
```

**Git Metadata Issues:**

```
❌ Upload failed.

Error: STRICT METADATA VALIDATION FAILED
❌ Git commit hash missing or unknown
❌ Git branch information missing or unknown
❌ Repository name missing or unknown
```

### Prerequisites

1. **Playwright Report**: You must have run Playwright tests and generated a report

   ```bash
   npx playwright test
   # or
   npx playwright test --reporter=html
   ```

2. **Git Repository**: Your project should be a git repository with:
   - At least one commit
   - A configured remote (for repository name)
   - A valid branch

3. **TestDino Token**: A valid API token from TestDino platform (configured in `mcp.json` as `TESTDINO_API_KEY` or passed as `token` parameter)

4. **Internet Connectivity**: Required to upload to TestDino servers

### Troubleshooting

#### Report Directory Not Found

**Problem**: Tool can't find `playwright-report` directory

**Solutions**:

- Ensure you've run Playwright tests: `npx playwright test`
- Check the report directory path is correct
- Use absolute path if relative path doesn't work
- Verify the report directory exists before calling the tool

#### Git Metadata Missing

**Problem**: Upload fails due to missing git information

**Solutions**:

- Initialize git repository: `git init`
- Make at least one commit: `git commit -m "Initial commit"`
- Configure git remote: `git remote add origin <url>`
- Ensure you're on a valid branch: `git checkout -b main`

#### Command Syntax Warning

**Problem**: Deprecation warning about `tdpw` command syntax

**Solution**: The tool now uses the correct syntax (`tdpw upload`). If you see this warning, update to the latest version of the MCP server.

#### Token Invalid

**Problem**: Authentication fails

**Solutions**:

- Verify your TestDino API token is correct
- Check token hasn't expired
- Ensure token has upload permissions

### Technical Details

- **Command Used**: `npx --yes tdpw upload <reportDir> --token=<token> [--upload-html]`
- **Working Directory**: Automatically set to git repository root
- **Path Resolution**: Supports both relative and absolute paths
- **Search Depth**: Searches up to 15 directory levels from common locations
- **Runtime Environment**: Set via `runtime` parameter or `TESTDINO_RUNTIME` environment variable (development, staging, production)
- **API Key Source**: Automatically reads from `TESTDINO_API_KEY` environment variable if available

### Related Documentation

- [TestDino Documentation](https://docs.testdino.com)
- [TestDino CLI Issues](https://github.com/testdino-inc/testdino-cli/issues)
- [TestDino Support](mailto:support@testdino.com)

---

## get_run_details

**Purpose**: Get a complete overview of a test run, including all test suites, test cases, statistics, and metadata.

### Description

This tool provides a comprehensive view of an entire test run. Unlike `list_testruns` which gives you a summary list, `get_run_details` gives you:

- **Complete test statistics**: Total, passed, failed, skipped, flaky counts
- **All test suites**: Organized by test file with their own statistics
- **Test cases by status**: Grouped into passed, failed, skipped, and flaky
- **Run metadata**: Git branch, commit, CI/CD information, environment details, rerun attempt metadata
- **Error categorization**: Breakdown of failure types

Use this when you want a full picture of what happened in a specific test run, need to analyze the overall health of a test execution, or query for specific rerun attempts.

**Note**: This tool accepts only `testrun_id` and `counter` parameters. For filtering by branch, time, author, environment, or PR, use the `list_testruns` tool first to find the test run IDs, then use this tool to get detailed information.

### Parameters

| Parameter    | Type   | Required | Default | Description                                                                                                                                                           |
| ------------ | ------ | -------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `testrun_id` | string | No       | -       | Test run ID(s). Can be a single ID or comma-separated IDs for batch operations (max 20). Example: 'test_run_xyz123' or 'run1,run2,run3'. Optional if using `counter`. |
| `counter`    | number | No       | -       | Filter by test run counter number. The counter is a sequential number assigned to each test run. Optional if using `testrun_id`.                                      |

**Note:** The API key is automatically read from the `TESTDINO_API_KEY` environment variable configured in `.cursor/mcp.json`. You don't need to pass it as a parameter.

### Response Data Structure

The tool returns structured data including:

- **Project Information**: Project ID, name, and description (from initial project API call)
- **Test Run Summary**: Run ID and basic information
- **Rerun Attempt Metadata**: Information about rerun attempts including:
  - Rerun attempt number (if this is a rerun)
  - Original test run ID (if this is a rerun)
  - Rerun status and timing information
- **Test Statistics**: Counts of passed, failed, skipped, and flaky tests
- **Error Categories**: Breakdown of failure types:
  - Assertion failures
  - Element not found
  - Timeout issues
  - Network issues
  - Other failures
  - Flaky test categories (timing, environment, network, assertion intermittent)
- **Test Suites**: List of test suites with:
  - Suite ID and file name
  - Suite-level statistics
  - Individual test cases with:
    - Test title and status
    - Duration and browser
    - Error type and confidence score
    - Failure category
- **Raw JSON Data**: Complete API response for detailed analysis

**Note**: Rerun attempt metadata is always included in the response, allowing you to identify if a test run is a rerun and access details about the rerun attempt number.

### Configuration

Before using this tool, you must configure your TestDino API key in `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "TestDino": {
      "command": "testdino-mcp",
      "env": {
        "TESTDINO_API_KEY": "your_testdino_api_key_here"
      }
    }
  }
}
```

### Example Usage

**Get Details by Run ID:**

```json
{
  "name": "get_run_details",
  "arguments": {
    "testrun_id": "test_run_690ded10f1fb81a3ca1bbc50"
  }
}
```

**Get Details by Counter:**

```json
{
  "name": "get_run_details",
  "arguments": {
    "counter": 42
  }
}
```

**Get Details by Run ID and Counter:**

```json
{
  "name": "get_run_details",
  "arguments": {
    "testrun_id": "test_run_690ded10f1fb81a3ca1bbc50",
    "counter": 42
  }
}
```

**Batch Operation (Multiple Run IDs):**

```json
{
  "name": "get_run_details",
  "arguments": {
    "testrun_id": "run1,run2,run3"
  }
}
```

### Response Format

The tool returns a formatted markdown response with:

1. **Project Information** - Project details from the initial API call
2. **Test Run Summary** - Basic run information
3. **Test Statistics** - Overall pass/fail counts
4. **Error Categories** - Breakdown of failure types
5. **Test Suites** - Detailed suite and test case information
6. **Raw JSON Data** - Complete API response for programmatic access

### Example Response

````
## Test Run Details

### Project Information
- **Project ID**: proj_690ded10f1fb81a3ca1bbc50
- **Project Name**: My Test Project
- **Description**: Main test project for CI/CD

### Test Run Summary
- **Run ID**: test_run_690ded10f1fb81a3ca1bbc50

### Test Statistics
- **Passed**: 2
- **Failed**: 10
- **Skipped**: 0
- **Flaky**: 0

### Error Categories
**Failed Tests:**
- Assertion Failures: 0
- Element Not Found: 0
- Timeout Issues: 10
- Network Issues: 0
- Other Failures: 0

### Test Suites (2)

#### Suite 1: example.spec.js
- **Suite ID**: test_suite_690ded11f1fb81a3ca1bbc59
- **Stats**: 1 passed, 10 failed, 0 skipped

**Test Cases (11):**

1. **Verify that user can login and logout successfully**
   - Status: failed
   - Duration: 68.34s
   - Browser: chromium
   - Error Type: timeout_issues
   - Confidence: 83.58%
   - Failure Category: flaky

[... more test cases ...]

### Raw Data (JSON)
```json
{
  "success": true,
  "message": "Test run summary retrieved successfully",
  "data": { ... }
}
````

```

### Use Cases

- **Debugging Failed Tests**: Investigate why specific tests failed
- **Analyzing Test Trends**: Review test statistics and error patterns
- **CI/CD Integration**: Get test run details for pull requests
- **Test Quality Analysis**: Review confidence scores and flaky test patterns
- **Performance Analysis**: Review test durations and identify slow tests

### Error Handling

**API Request Failed:**
```

❌ Failed to retrieve test run details.

Error: Failed to fetch test run details: 404 Not Found
{error details}

Please check:

1. TESTDINO_API_KEY is configured in .cursor/mcp.json under the 'env' section
2. Your TestDino API key is valid
3. You have internet connectivity
4. The API endpoint is accessible
5. The run ID exists in your project
6. You have permission to access this test run

```

**Missing API Key:**
```

Error: Missing TESTDINO_API_KEY environment variable.
Please configure it in your .cursor/mcp.json file under the 'env' section.

```

**Missing Run ID:**
```

Error: Missing required parameter: testrun_id

```

### Prerequisites

1. **TestDino Account**: Valid account with API access
2. **API Key Configuration**: `TESTDINO_API_KEY` must be set in `.cursor/mcp.json` under the `env` section
3. **Test Runs**: At least one test run must exist in your TestDino project
4. **Internet Connectivity**: Required to access TestDino API
5. **Valid Run ID**: You must know the specific test run ID you want to retrieve

### How It Works

1. **Project Validation**: The tool first calls `/api/projects` to validate your API key and retrieve project information
2. **Run Retrieval**: After successful project validation, it fetches the specific test run details using the provided run ID
3. **Data Formatting**: The response is formatted as markdown with project info, test statistics, error categories, and detailed test case information

### Technical Details

- **Project API Endpoint**: `https://api.testdino.com/api/projects`
- **Run Details API Endpoint**: `https://api.testdino.com/api/test-runs/details?run_id={runId}`
- **Method**: GET for both endpoints
- **Authentication**: Bearer token from `TESTDINO_API_KEY` environment variable
- **Response Format**: JSON with formatted markdown summary

### Related Documentation

- [TestDino API Documentation](https://docs.testdino.com)
- [TestDino Support](mailto:support@testdino.com)

---

## Adding New Tools

When adding new tools to the MCP server:

1. Define the tool in the `tools` array in `src/index.ts`
2. Implement the tool handler in the `CallToolRequestSchema` handler
3. Add documentation to this file following the same format
4. Update the table of contents
5. Include examples, error handling, and troubleshooting sections

---

## Version History

- **v1.0.3**:
  - **Removed**: `upload_latest_local_test_runs` tool
  - **Added**: Manual test case management tools:
    - `list_manual_test_cases` - Search and list manual test cases with filtering
    - `get_manual_test_case` - Get detailed manual test case information
    - `create_manual_test_case` - Create new manual test cases
    - `update_manual_test_case` - Update existing manual test cases
    - `list_manual_test_suites` - List test suite hierarchy
    - `create_manual_test_suite` - Create new test suites
  - **Updated**: `health` tool now displays account info and organizations without requiring name parameter
  - **Fixed**: Manual test case endpoints now use correct RESTful paths (`/test-cases` instead of `/list-manualtest-cases`)

- **v1.0.2**:
  - Initial release with `hello` (now `health`) and `upload_latest_local_test_runs` tools
  - Added `list_testruns` tool for filtering and listing test runs
  - Added `list_testcase` tool for listing test cases in a run
  - Added `get_testcase_details` tool for detailed test case information
  - Added `get_run_details` tool for comprehensive test run information
  - Updated `health` tool (formerly `hello`) with API key validation
  - All tools support automatic API key reading from `TESTDINO_API_KEY` environment variable
  - Added `runtime` parameter to upload tool for environment selection
  - Improved workspace detection and report directory search

```
