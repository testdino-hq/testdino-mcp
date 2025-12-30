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

## list_manual_test_cases

**Purpose**: Search and list manual test cases with comprehensive filtering options for QA testing, auditing, or test case management.

### Description

This tool helps you discover and explore manual test cases in your TestDino project. You can filter by:

- **Search**: Match against title, description, or case ID
- **Suite**: Filter by specific test suite
- **Status**: Filter by status (actual, draft, deprecated)
- **Priority**: Filter by priority level (critical, high, medium, low)
- **Severity**: Filter by severity level (critical, major, minor, trivial)
- **Type**: Filter by test type (functional, smoke, regression, security, performance, e2e)
- **Layer**: Filter by test layer (e2e, api, unit)
- **Behavior**: Filter by behavior type (positive, negative, destructive)
- **Automation Status**: Filter by automation status (automated, manual, not_automated)
- **Tags**: Filter by tags (comma-separated)
- **Flaky Status**: Filter by flaky test status

Perfect for finding specific test cases for execution, review, or management.

### Parameters

| Parameter          | Type    | Required | Default | Description                                                                                                                                    |
| ------------------ | ------- | -------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `projectId`        | string  | Yes      | -       | Project ID (Required). The TestDino project identifier.                                                                                      |
| `search`           | string  | No       | -       | Search term to match against title, description, or caseId. Example: 'login' or 'TC-123'.                                                       |
| `suiteId`          | string  | No       | -       | Filter by specific test suite ID. Use list_manual_test_suites to find suite IDs.                                                              |
| `status`           | string  | No       | -       | Filter by test case status. Options: 'actual', 'draft', 'deprecated'.                                                                          |
| `priority`         | string  | No       | -       | Filter by priority level. Options: 'critical', 'high', 'medium', 'low'.                                                                       |
| `severity`         | string  | No       | -       | Filter by severity level. Options: 'critical', 'major', 'minor', 'trivial'.                                                                    |
| `type`             | string  | No       | -       | Filter by test case type. Options: 'functional', 'smoke', 'regression', 'security', 'performance', 'e2e'.                                     |
| `layer`            | string  | No       | -       | Filter by test layer. Options: 'e2e', 'api', 'unit'.                                                                                          |
| `behavior`         | string  | No       | -       | Filter by test behavior type. Options: 'positive', 'negative', 'destructive'.                                                                  |
| `automationStatus` | string  | No       | -       | Filter by automation status. Options: 'automated', 'manual', 'not_automated'.                                                                   |
| `tags`             | string  | No       | -       | Filter by tags (comma-separated list). Example: 'smoke,regression' or 'critical'.                                                              |
| `isFlaky`          | boolean | No       | -       | Filter test cases marked as flaky. Set to true to show only flaky tests, false for non-flaky.                                                  |
| `limit`            | number  | No       | 50      | Maximum number of results to return (max: 1000).                                                                                              |

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

**List All Manual Test Cases:**

```json
{
  "name": "list_manual_test_cases",
  "arguments": {
    "projectId": "proj_690ded10f1fb81a3ca1bbc50"
  }
}
```

**Search by Keyword:**

```json
{
  "name": "list_manual_test_cases",
  "arguments": {
    "projectId": "proj_690ded10f1fb81a3ca1bbc50",
    "search": "login"
  }
}
```

**Filter by Suite and Status:**

```json
{
  "name": "list_manual_test_cases",
  "arguments": {
    "projectId": "proj_690ded10f1fb81a3ca1bbc50",
    "suiteId": "suite_123",
    "status": "actual"
  }
}
```

**Filter by Priority and Type:**

```json
{
  "name": "list_manual_test_cases",
  "arguments": {
    "projectId": "proj_690ded10f1fb81a3ca1bbc50",
    "priority": "critical",
    "type": "smoke"
  }
}
```

**Filter by Tags:**

```json
{
  "name": "list_manual_test_cases",
  "arguments": {
    "projectId": "proj_690ded10f1fb81a3ca1bbc50",
    "tags": "smoke,regression"
  }
}
```

**Complex Filter:**

```json
{
  "name": "list_manual_test_cases",
  "arguments": {
    "projectId": "proj_690ded10f1fb81a3ca1bbc50",
    "priority": "high",
    "severity": "major",
    "layer": "e2e",
    "behavior": "positive",
    "limit": 100
  }
}
```

### Response Format

The tool returns a JSON response with an array of manual test cases, each containing:

- Test case ID and title
- Description and status
- Priority, severity, and type
- Suite information
- Steps, preconditions, and postconditions
- Tags and metadata
- Automation status

### Use Cases

- **Test Execution Planning**: Find test cases to execute based on priority, type, or tags
- **Test Case Auditing**: Review test cases by status, suite, or other criteria
- **Quality Assurance**: Filter test cases for specific testing scenarios
- **Test Organization**: Find test cases within specific suites
- **Flaky Test Management**: Identify and manage flaky test cases

### Error Handling

**Missing API Key:**

```
Error: Missing TESTDINO_API_KEY environment variable.
Please configure it in your .cursor/mcp.json file under the 'env' section.
```

**Missing Project ID:**

```
Error: projectId is required
```

**API Request Failed:**

```
Error: Failed to list manual test cases: [error message]
```

### Prerequisites

1. **TestDino Account**: Valid account with API access
2. **API Key Configuration**: `TESTDINO_API_KEY` must be set in `.cursor/mcp.json` under the `env` section
3. **Project ID**: Valid TestDino project identifier
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

## get_manual_test_case

**Purpose**: Retrieve detailed information of a single manual test case, including steps, custom fields, preconditions, and all metadata.

### Description

This tool provides comprehensive details about a specific manual test case. Use this to:

- Review complete test case information before execution
- Understand test steps and expected results
- Check preconditions and postconditions
- Review metadata like priority, severity, and type
- Access custom fields and tags

Perfect for getting all the information needed to execute a manual test case or review its details.

### Parameters

| Parameter   | Type   | Required | Description                                                                                                                                    |
| ----------- | ------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `projectId` | string | Yes      | Project ID (Required). The TestDino project identifier.                                                                                         |
| `caseId`    | string | Yes      | Test case ID (Required). Can be internal _id or human-readable ID like 'TC-123'.                                                               |

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

**Get Test Case by ID:**

```json
{
  "name": "get_manual_test_case",
  "arguments": {
    "projectId": "proj_690ded10f1fb81a3ca1bbc50",
    "caseId": "TC-123"
  }
}
```

**Get Test Case by Internal ID:**

```json
{
  "name": "get_manual_test_case",
  "arguments": {
    "projectId": "proj_690ded10f1fb81a3ca1bbc50",
    "caseId": "test_case_6901b2abc6b187e63f536a6b"
  }
}
```

### Response Format

The tool returns a JSON response with comprehensive test case information including:

- Test case ID, title, and description
- Status, priority, severity, and type
- Suite information
- Test steps with actions and expected results
- Preconditions and postconditions
- Tags and custom fields
- Automation status
- Creation and update timestamps

### Use Cases

- **Test Execution**: Get complete test case details before execution
- **Test Review**: Review test case structure and steps
- **Documentation**: Access test case documentation and metadata
- **Test Maintenance**: Review test case details for updates

### Error Handling

**Missing API Key:**

```
Error: Missing TESTDINO_API_KEY environment variable.
Please configure it in your .cursor/mcp.json file under the 'env' section.
```

**Missing Required Parameters:**

```
Error: projectId is required
Error: caseId is required
```

**Test Case Not Found:**

```
Error: Failed to get manual test case details: 404 Not Found
```

### Prerequisites

1. **TestDino Account**: Valid account with API access
2. **API Key Configuration**: `TESTDINO_API_KEY` must be set in `.cursor/mcp.json` under the `env` section
3. **Project ID**: Valid TestDino project identifier
4. **Test Case ID**: Valid test case identifier (internal _id or human-readable ID)
5. **Internet Connectivity**: Required to access TestDino API

### Technical Details

- **API Endpoint**: `/api/test-cases/{caseId}`
- **Method**: GET
- **Authentication**: Bearer token from `TESTDINO_API_KEY` environment variable
- **Response Format**: JSON

### Related Documentation

- [TestDino API Documentation](https://docs.testdino.com)
- [TestDino Support](mailto:support@testdino.com)

---

## create_manual_test_case

**Purpose**: Create a new manual test case with steps, preconditions, postconditions, and metadata.

### Description

This tool allows you to create new manual test cases in your TestDino project. You can specify:

- **Basic Information**: Title, description, suite
- **Test Steps**: Array of steps with actions, expected results, and optional test data
- **Preconditions**: Prerequisites required before test execution
- **Postconditions**: Expected state after test execution
- **Metadata**: Priority, severity, type, layer, behavior

Use this to document new test scenarios, features, or requirements as they are developed.

### Parameters

| Parameter       | Type    | Required | Description                                                                                                                                    |
| --------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `projectId`    | string  | Yes      | Project ID (Required). The TestDino project identifier.                                                                                        |
| `title`        | string  | Yes      | Test case title (Required). A clear, descriptive title for the test case.                                                                      |
| `suiteId`      | string  | Yes      | Test suite ID (Required). The suite where this test case will be created. Use list_manual_test_suites to find suite IDs.                     |
| `description`  | string  | No       | Detailed description of what this test case validates.                                                                                        |
| `preconditions`| string  | No       | Prerequisites or setup required before executing this test case.                                                                               |
| `postconditions`| string | No       | Expected state or cleanup actions after executing this test case.                                                                               |
| `steps`        | array   | No       | Array of test steps. Each step should have action, expectedResult, and optional data fields.                                                  |
| `priority`     | string  | No       | Test case priority level. Options: 'critical', 'high', 'medium', 'low'.                                                                        |
| `severity`     | string  | No       | Test case severity level. Options: 'critical', 'major', 'minor', 'trivial'.                                                                    |
| `type`         | string  | No       | Test case type. Options: 'functional', 'smoke', 'regression', 'security', 'performance', 'e2e'.                                                |
| `layer`        | string  | No       | Test layer. Options: 'e2e', 'api', 'unit'.                                                                                                    |
| `behavior`     | string  | No       | Test behavior type. Options: 'positive', 'negative', 'destructive'.                                                                             |

**Note:** The API key is automatically read from the `TESTDINO_API_KEY` environment variable configured in `.cursor/mcp.json`.

### Test Steps Structure

Each step in the `steps` array should have:

- `action` (required): The action to perform in this step
- `expectedResult` (required): The expected outcome of this action
- `data` (optional): Optional test data for this step

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

**Basic Test Case:**

```json
{
  "name": "create_manual_test_case",
  "arguments": {
    "projectId": "proj_690ded10f1fb81a3ca1bbc50",
    "title": "Verify user can login with valid credentials",
    "suiteId": "suite_123"
  }
}
```

**Test Case with Steps:**

```json
{
  "name": "create_manual_test_case",
  "arguments": {
    "projectId": "proj_690ded10f1fb81a3ca1bbc50",
    "title": "Verify user can login with valid credentials",
    "suiteId": "suite_123",
    "description": "Test that users can successfully login with valid email and password",
    "preconditions": "User account exists with valid credentials",
    "steps": [
      {
        "action": "Navigate to login page",
        "expectedResult": "Login page is displayed"
      },
      {
        "action": "Enter valid email address",
        "expectedResult": "Email field is populated",
        "data": "user@example.com"
      },
      {
        "action": "Enter valid password",
        "expectedResult": "Password field is populated",
        "data": "SecurePassword123"
      },
      {
        "action": "Click login button",
        "expectedResult": "User is redirected to dashboard"
      }
    ],
    "priority": "high",
    "type": "functional",
    "layer": "e2e"
  }
}
```

**Test Case with Full Metadata:**

```json
{
  "name": "create_manual_test_case",
  "arguments": {
    "projectId": "proj_690ded10f1fb81a3ca1bbc50",
    "title": "Verify login fails with invalid password",
    "suiteId": "suite_123",
    "description": "Test that login fails when incorrect password is provided",
    "preconditions": "User account exists",
    "postconditions": "User remains on login page with error message",
    "steps": [
      {
        "action": "Enter valid email",
        "expectedResult": "Email field is populated"
      },
      {
        "action": "Enter invalid password",
        "expectedResult": "Password field is populated",
        "data": "WrongPassword"
      },
      {
        "action": "Click login button",
        "expectedResult": "Error message is displayed"
      }
    ],
    "priority": "medium",
    "severity": "major",
    "type": "functional",
    "layer": "e2e",
    "behavior": "negative"
  }
}
```

### Response Format

The tool returns a JSON response with the created test case information, including:

- Test case ID (internal _id and human-readable ID)
- All provided fields
- Creation timestamp
- Suite information

### Use Cases

- **Feature Documentation**: Document test cases for new features
- **Test Planning**: Create test cases during test planning phase
- **Requirement Coverage**: Create test cases to cover requirements
- **Test Case Migration**: Import test cases from other systems

### Error Handling

**Missing API Key:**

```
Error: Missing TESTDINO_API_KEY environment variable.
Please configure it in your .cursor/mcp.json file under the 'env' section.
```

**Missing Required Parameters:**

```
Error: projectId is required
Error: title is required
Error: suiteId is required
```

**Invalid Suite ID:**

```
Error: Failed to create manual test case: Suite not found
```

### Prerequisites

1. **TestDino Account**: Valid account with API access
2. **API Key Configuration**: `TESTDINO_API_KEY` must be set in `.cursor/mcp.json` under the `env` section
3. **Project ID**: Valid TestDino project identifier
4. **Suite ID**: Valid test suite identifier (use `list_manual_test_suites` to find suite IDs)
5. **Internet Connectivity**: Required to access TestDino API

### Technical Details

- **API Endpoint**: `/api/test-cases`
- **Method**: POST
- **Authentication**: Bearer token from `TESTDINO_API_KEY` environment variable
- **Response Format**: JSON

### Related Documentation

- [TestDino API Documentation](https://docs.testdino.com)
- [TestDino Support](mailto:support@testdino.com)

---

## update_manual_test_case

**Purpose**: Update an existing manual test case. Modify test case details, steps, status, priority, or any other fields.

### Description

This tool allows you to update existing manual test cases. You can modify:

- **Basic Information**: Title, description
- **Test Steps**: Add, modify, or remove steps
- **Preconditions/Postconditions**: Update prerequisites or expected outcomes
- **Status**: Change status (actual, draft, deprecated)
- **Metadata**: Update priority, severity, type, layer, behavior

Use this to keep test cases up-to-date as requirements change or to fix errors in existing test cases.

### Parameters

| Parameter   | Type   | Required | Description                                                                                                                                    |
| ----------- | ------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `projectId` | string | Yes      | Project ID (Required). The TestDino project identifier.                                                                                       |
| `caseId`    | string | Yes      | Test case ID (Required). Can be internal _id or human-readable ID like 'TC-123'.                                                              |
| `updates`   | object | Yes      | Object containing the fields to update. Can include: title, description, steps, status, priority, severity, type, layer, behavior, preconditions, postconditions, etc. |

**Note:** The API key is automatically read from the `TESTDINO_API_KEY` environment variable configured in `.cursor/mcp.json`.

### Updates Object Properties

The `updates` object can contain any of the following fields:

- `title` (string): Updated test case title
- `description` (string): Updated description
- `preconditions` (string): Updated preconditions
- `postconditions` (string): Updated postconditions
- `steps` (array): Updated test steps array (each step has action, expectedResult, optional data)
- `status` (string): Updated status. Options: 'actual', 'draft', 'deprecated'
- `priority` (string): Updated priority. Options: 'critical', 'high', 'medium', 'low'
- `severity` (string): Updated severity. Options: 'critical', 'major', 'minor', 'trivial'
- `type` (string): Updated type. Options: 'functional', 'smoke', 'regression', 'security', 'performance', 'e2e'
- `layer` (string): Updated layer. Options: 'e2e', 'api', 'unit'
- `behavior` (string): Updated behavior. Options: 'positive', 'negative', 'destructive'

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

**Update Status:**

```json
{
  "name": "update_manual_test_case",
  "arguments": {
    "projectId": "proj_690ded10f1fb81a3ca1bbc50",
    "caseId": "TC-123",
    "updates": {
      "status": "deprecated"
    }
  }
}
```

**Update Title and Priority:**

```json
{
  "name": "update_manual_test_case",
  "arguments": {
    "projectId": "proj_690ded10f1fb81a3ca1bbc50",
    "caseId": "TC-123",
    "updates": {
      "title": "Updated test case title",
      "priority": "critical"
    }
  }
}
```

**Update Test Steps:**

```json
{
  "name": "update_manual_test_case",
  "arguments": {
    "projectId": "proj_690ded10f1fb81a3ca1bbc50",
    "caseId": "TC-123",
    "updates": {
      "steps": [
        {
          "action": "Navigate to login page",
          "expectedResult": "Login page is displayed"
        },
        {
          "action": "Enter credentials",
          "expectedResult": "Credentials are entered",
          "data": "user@example.com"
        },
        {
          "action": "Click login",
          "expectedResult": "User is logged in"
        }
      ]
    }
  }
}
```

**Multiple Updates:**

```json
{
  "name": "update_manual_test_case",
  "arguments": {
    "projectId": "proj_690ded10f1fb81a3ca1bbc50",
    "caseId": "TC-123",
    "updates": {
      "description": "Updated description with new requirements",
      "priority": "high",
      "severity": "major",
      "status": "actual",
      "preconditions": "Updated preconditions"
    }
  }
}
```

### Response Format

The tool returns a JSON response with the updated test case information.

### Use Cases

- **Test Maintenance**: Update test cases as requirements change
- **Status Management**: Mark test cases as deprecated or update their status
- **Step Updates**: Modify test steps when processes change
- **Metadata Updates**: Update priority, severity, or other metadata
- **Bug Fixes**: Correct errors in test case documentation

### Error Handling

**Missing API Key:**

```
Error: Missing TESTDINO_API_KEY environment variable.
Please configure it in your .cursor/mcp.json file under the 'env' section.
```

**Missing Required Parameters:**

```
Error: projectId is required
Error: caseId is required
Error: updates object is required
```

**Test Case Not Found:**

```
Error: Failed to update manual test case: 404 Not Found
```

### Prerequisites

1. **TestDino Account**: Valid account with API access
2. **API Key Configuration**: `TESTDINO_API_KEY` must be set in `.cursor/mcp.json` under the `env` section
3. **Project ID**: Valid TestDino project identifier
4. **Test Case ID**: Valid test case identifier (internal _id or human-readable ID)
5. **Internet Connectivity**: Required to access TestDino API

### Technical Details

- **API Endpoint**: `/api/test-cases/{caseId}`
- **Method**: PATCH
- **Authentication**: Bearer token from `TESTDINO_API_KEY` environment variable
- **Response Format**: JSON

### Related Documentation

- [TestDino API Documentation](https://docs.testdino.com)
- [TestDino Support](mailto:support@testdino.com)

---

## list_manual_test_suites

**Purpose**: List the test suite hierarchy to help users find suite IDs for test case creation and organization.

### Description

This tool helps you navigate the test suite structure in your TestDino project. Use this to:

- Find suite IDs needed for creating test cases
- Understand the organization of your test suites
- Navigate nested suite hierarchies
- Plan test case organization

Test suites can be nested, and you can list root-level suites or children of a specific parent suite.

### Parameters

| Parameter       | Type   | Required | Description                                                                                                                                    |
| --------------- | ------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `projectId`     | string | Yes      | Project ID (Required). The TestDino project identifier.                                                                                        |
| `parentSuiteId` | string | No       | Optional parent suite ID to fetch only children of a specific suite. If not provided, returns the root-level suites.                         |

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

**List Root-Level Suites:**

```json
{
  "name": "list_manual_test_suites",
  "arguments": {
    "projectId": "proj_690ded10f1fb81a3ca1bbc50"
  }
}
```

**List Children of a Parent Suite:**

```json
{
  "name": "list_manual_test_suites",
  "arguments": {
    "projectId": "proj_690ded10f1fb81a3ca1bbc50",
    "parentSuiteId": "suite_123"
  }
}
```

### Response Format

The tool returns a JSON response with an array of test suites, each containing:

- Suite ID
- Suite name
- Parent suite information (if nested)
- Child suites (if any)
- Suite metadata

### Use Cases

- **Test Organization**: Understand how test suites are organized
- **Suite Discovery**: Find suite IDs for test case creation
- **Hierarchy Navigation**: Navigate nested suite structures
- **Planning**: Plan test case organization before creation

### Error Handling

**Missing API Key:**

```
Error: Missing TESTDINO_API_KEY environment variable.
Please configure it in your .cursor/mcp.json file under the 'env' section.
```

**Missing Project ID:**

```
Error: projectId is required
```

**API Request Failed:**

```
Error: Failed to list manual test suites: [error message]
```

### Prerequisites

1. **TestDino Account**: Valid account with API access
2. **API Key Configuration**: `TESTDINO_API_KEY` must be set in `.cursor/mcp.json` under the `env` section
3. **Project ID**: Valid TestDino project identifier
4. **Internet Connectivity**: Required to access TestDino API

### Technical Details

- **API Endpoint**: `/api/test-suites`
- **Method**: GET
- **Authentication**: Bearer token from `TESTDINO_API_KEY` environment variable
- **Response Format**: JSON

### Related Documentation

- [TestDino API Documentation](https://docs.testdino.com)
- [TestDino Support](mailto:support@testdino.com)

---

## create_manual_test_suite

**Purpose**: Create a new test suite folder to organize test cases.

### Description

This tool allows you to create new test suites to organize your manual test cases. Test suites can be:

- **Root-level**: Created at the top level of your project
- **Nested**: Created as children of existing suites (by providing a `parentSuiteId`)

Use this to create logical groupings for related test cases, such as:
- Feature-based suites (e.g., "Login Tests", "Payment Tests")
- Module-based suites (e.g., "API Tests", "UI Tests")
- Environment-based suites (e.g., "Production Tests", "Staging Tests")

### Parameters

| Parameter       | Type   | Required | Description                                                                                                                                    |
| --------------- | ------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `projectId`     | string | Yes      | Project ID (Required). The TestDino project identifier.                                                                                        |
| `name`          | string | Yes      | Suite name (Required). A descriptive name for the test suite.                                                                                 |
| `parentSuiteId` | string | No       | Optional parent suite ID to create this suite as a child of another suite. If not provided, creates a root-level suite.                       |

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

**Create Root-Level Suite:**

```json
{
  "name": "create_manual_test_suite",
  "arguments": {
    "projectId": "proj_690ded10f1fb81a3ca1bbc50",
    "name": "Authentication Tests"
  }
}
```

**Create Nested Suite:**

```json
{
  "name": "create_manual_test_suite",
  "arguments": {
    "projectId": "proj_690ded10f1fb81a3ca1bbc50",
    "name": "Login Tests",
    "parentSuiteId": "suite_123"
  }
}
```

**Create Feature-Based Suite:**

```json
{
  "name": "create_manual_test_suite",
  "arguments": {
    "projectId": "proj_690ded10f1fb81a3ca1bbc50",
    "name": "Payment Processing Tests"
  }
}
```

### Response Format

The tool returns a JSON response with the created suite information, including:

- Suite ID (needed for creating test cases in this suite)
- Suite name
- Parent suite information (if nested)
- Creation timestamp

### Use Cases

- **Test Organization**: Create logical groupings for test cases
- **Feature Testing**: Organize tests by feature or module
- **Team Organization**: Create suites for different teams or projects
- **Test Planning**: Set up suite structure before creating test cases

### Error Handling

**Missing API Key:**

```
Error: Missing TESTDINO_API_KEY environment variable.
Please configure it in your .cursor/mcp.json file under the 'env' section.
```

**Missing Required Parameters:**

```
Error: projectId is required
Error: name is required
```

**Invalid Parent Suite:**

```
Error: Failed to create manual test suite: Parent suite not found
```

### Prerequisites

1. **TestDino Account**: Valid account with API access
2. **API Key Configuration**: `TESTDINO_API_KEY` must be set in `.cursor/mcp.json` under the `env` section
3. **Project ID**: Valid TestDino project identifier
4. **Parent Suite ID** (optional): Valid parent suite identifier if creating a nested suite
5. **Internet Connectivity**: Required to access TestDino API

### Technical Details

- **API Endpoint**: `/api/test-suites`
- **Method**: POST
- **Authentication**: Bearer token from `TESTDINO_API_KEY` environment variable
- **Response Format**: JSON

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
