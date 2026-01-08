# TestDino MCP

A Model Context Protocol (MCP) server that connects TestDino to AI agents. This server enables you to interact with your TestDino test data directly through natural language commands.

## What is This?

This MCP server bridges the gap between your TestDino test management platform and AI agents. Instead of manually navigating the TestDino dashboard, you can ask your AI assistant to:

- Check test run results
- Analyze test failures
- Get detailed test case information
- Manage manual test cases and suites

All through simple conversational commands.

## Features
- **🔍 Health Check**: Verify your connection and validate your TestDino PAT. Get account information and list all available organizations and projects.
- **📊 Test Run Management**: List and retrieve detailed information about your test runs with powerful filtering options (branch, time, author, commit, environment).
- **🧪 Test Case Analysis**: Get comprehensive details about individual test cases, including errors, logs, execution steps, and artifacts (screenshots, videos, traces).
- **🐛 AI-Assisted Debugging**: Debug test case failures with historical data aggregation, failure pattern analysis, and AI-friendly debugging prompts. Analyze patterns across multiple executions to identify root causes.
- **📝 Test Case Management**: Create, update, list, and retrieve manual test cases with comprehensive filtering and organization (status, priority, severity, type, layer, behavior, tags).
- **📁 Test Suite Organization**: Create and manage test suite hierarchies to organize your manual test cases.
- **🔌 MCP Compatible**: Built on the Model Context Protocol standard. You can configure TestDino MCP with any MCP-compatible IDEs or AI agents (Cursor, Claude Desktop, etc.).
- **⚡ Easy Setup**: Install and configure in minutes with npx. No installation required!
- **🔐 Secure**: PAT stored securely in your local configuration. One PAT provides access to all organizations and projects you have permissions for.

### Available Tools

The server provides 12 powerful tools:

**Test Execution & Results:**

1. **`health`** - Verify your connection and validate your PAT. Shows account information, available organizations, and projects with access permissions.
2. **`list_testruns`** - Browse test runs with powerful filters (branch, time interval, author, commit, environment). Supports pagination and batch operations.
3. **`get_run_details`** - Get comprehensive details about a specific test run including statistics, test suites, test cases, and metadata. Supports batch operations (comma-separated IDs, max 20).
4. **`list_testcase`** - List test cases with comprehensive filtering (by test run, status, browser, error category, branch, environment, commit, author, spec file, tags, runtime, artifacts, and more). Can filter by test run criteria or directly by test case properties.
5. **`get_testcase_details`** - Get detailed information about a specific test case including error messages, stack traces, test steps, console logs, and artifacts. Can identify by testcase_id alone or by testcase_name with testrun_id/counter.
6. **`debug_testcase`** - Debug a test case by aggregating historical failure data across multiple executions. Returns failure patterns, error categories, common error messages, error locations, browser-specific issues, and a pre-formatted debugging prompt for AI analysis. Perfect for root-cause analysis and identifying flaky test behavior.

**Test Case Management:**

7. **`list_manual_test_cases`** - Search and list manual test cases with comprehensive filtering (project, suite, status, priority, severity, type, layer, behavior, automation status, tags, flaky status).
8. **`get_manual_test_case`** - Get detailed information about a specific manual test case including steps, custom fields, preconditions, postconditions, and all metadata.
9. **`create_manual_test_case`** - Create new manual test cases with steps, preconditions, postconditions, and metadata (priority, severity, type, layer, behavior).
10. **`update_manual_test_case`** - Update existing manual test cases (title, description, steps, status, priority, severity, type, layer, behavior, preconditions, postconditions).
11. **`list_manual_test_suites`** - List test suite hierarchy to find suite IDs for organization. Supports filtering by parent suite.
12. **`create_manual_test_suite`** - Create new test suite folders to organize test cases. Supports nested suites by providing parentSuiteId.

### Installation Options

#### There are mainly 3 options to use TestDino MCP:

**Option 1: Via npx (Recommended - No Installation)**

- No installation required
- Automatically downloads and runs when needed
- Always uses the latest version
- Configured in any MCP compatible platform

**Option 2: Global Installation**

```bash
npm install -g testdino-mcp
```

- Install once, use in any project
- Requires Node.js 18+ and npm
- Use command: `testdino-mcp`

**Option 3: Project Installation**

```bash
npm install testdino-mcp
```

- Installed in your project's `node_modules`
- Use command: `npx testdino-mcp`

## Integration

### A simple Integration guide for Cursor IDE:

#### Step 1: Get Your Personal Access Token (PAT)

1. Log in to your [TestDino account](https://app.testdino.com)
2. Navigate to **User Settings → Personal Access Tokens**
3. Generate a new PAT from the **Personal Access Tokens** section.
4. **Important**: This PAT provides access to all organizations and projects you have permissions for

#### Step 2: Configure Cursor

1. **Open or create** the MCP configuration file:
   - **Windows**: `%APPDATA%\Cursor\mcp.json`
   - **macOS/Linux**: `~/.cursor/mcp.json`
   - **Project-specific**: `.cursor/mcp.json` in your project root

2. **If you are using npx or installing inside project, Add the configuration**:

```json
{
  "mcpServers": {
    "TestDino": {
      "command": "npx",
      "args": ["-y", "testdino-mcp"],
      "env": {
        "TESTDINO_PAT": "Your PAT here"
      }
    }
  }
}
```

**Important**: Replace `Your PAT here` with your actual Personal Access Token (PAT) from Step 1.

#### Step 3: Restart and Verify

1. **Completely close and restart Cursor**
2. **Verify the connection** by asking: "Check TestDino health"
3. You should see your account name, available organizations, and projects!

#### Alternative: Global Installation

**If you prefer to install globally instead of using npx or project installation:**

```bash
npm install -g testdino-mcp
```

Then use this configuration:

```json
{
  "mcpServers": {
    "TestDino": {
      "command": "testdino-mcp",
      "env": {
        "TESTDINO_PAT": "Your PAT here"
      }
    }
  }
}
```

The server uses the standard MCP protocol, so it will work with other MCP-compatible clients as well.

## Usage

Once configured, simply talk to your AI assistant in natural language. **Important**: Tools require your Personal Access Token (PAT) configured as `TESTDINO_PAT` in `mcp.json`. The PAT automatically provides access to all organizations and projects you have permissions for.

### Example Commands

Try these natural language commands in Cursor or Claude Desktop (or other MCP-compatible clients):

**Connection & Setup:**

- "Check if my TestDino connection is working"
- "Validate my TestDino PAT"

**Exploring Test Runs:**

- "Show me my last 5 test runs"
- "What test runs are on the develop branch?"
- "List test runs from the last 3 days"
- "Show me test runs by author john"
- "Find test runs for commit abc123"
- "List all test runs in production environment"

**Analyzing Test Results:**

- "Get details for test run test_run_6901b2abc6b187e63f536a6b"
- "Get details for test run counter 42"
- "What test cases failed in test run test_run_6901b2abc6b187e63f536a6b?"
- "Show me all flaky tests from the last test run"
- "List all failed test cases in production environment"
- "Show me test cases from the main branch that took more than 100 seconds"
- "Find all timeout issues in test cases from commit abc123"

**Debugging Test Failures:**

- "Debug test case 'Verify user login' in project proj_123"
- "Debug 'Verify that User Can Complete the Journey from Login to Order Placement @webkit' from testdino reports"
- "Analyze failures for 'Checkout flow' test case in project proj_123"
- "What are the failure patterns for 'API authentication' test?"
- "Why is test case 'User registration' failing?"
- "Debug test case 'Verify that user can login and logout successfully @chromium'"

**Managing Manual Test Cases:**

- "List all manual test cases in project proj_123"
- "Search for manual test cases with tag 'smoke' in project proj_123"
- "Show me all critical priority manual test cases in project proj_123"
- "Get details for manual test case TC-123 in project proj_123"
- "Create a new manual test case for login feature in suite suite_456"
- "Update test case TC-123 to mark it as deprecated"
- "List all test suites in project proj_123"
- "Create a new test suite called 'Authentication Tests' in project proj_123"

## Documentation

- **[Installation Guide](./docs/INSTALLATION.md)**: Detailed setup instructions for Cursor, Claude Desktop, and other MCP-compatible clients
- **[Tools Documentation](./docs/TOOLS.md)**: Comprehensive guide to all 12 available tools with examples, parameters, and use cases
- **[AI Agent Skills Guide](./docs/skill.md)**: Guide for AI agents on tool selection patterns, decision trees, and best practices

## Requirements

- **Node.js**: Version 18.0.0 or higher
- **NPM**: Latest version recommended (for package management)
- **TestDino Account**: Valid account with test run access
- **Personal Access Token (PAT)**: Required for authentication. Get it from TestDino Settings → Personal Access Tokens

## Key Features Explained

### AI-Assisted Debugging with `debug_testcase`

The `debug_testcase` tool is a powerful feature that helps you understand why tests are failing by analyzing historical execution data:

- **Historical Analysis**: Aggregates data from multiple test runs to identify patterns
- **Failure Patterns**: Identifies common error categories, messages, and locations
- **Browser-Specific Issues**: Detects browser-specific failure patterns
- **Flaky Test Detection**: Analyzes retry patterns and flakiness indicators
- **AI-Friendly Output**: Returns pre-formatted debugging prompts for AI analysis
- **Code Correlation**: Provides file and line numbers for error locations, enabling AI to correlate with source code

**Example Workflow:**
1. Ask: "Debug test case 'Verify user login' from testdino reports"
2. AI calls `debug_testcase` with projectId and testcase_name
3. Tool returns historical data with failure patterns
4. AI analyzes the data and correlates with your test code (if accessible)
5. AI provides specific fix suggestions based on patterns and code analysis

## Support

- **Documentation**: See [docs/TOOLS.md](./docs/TOOLS.md) for complete tool documentation
- **Installation Help**: See [docs/INSTALLATION.md](./docs/INSTALLATION.md) for detailed setup instructions
- **TestDino Support**: [support@testdino.com](mailto:support@testdino.com)
- **TestDino Documentation**: [https://docs.testdino.com](https://docs.testdino.com)
