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

- **🔍 Health Check**: Verify your API connection and validate your TestDino API key.
- **📊 Test Run Management**: List and retrieve detailed information about your test runs with powerful filtering options.
- **🧪 Test Case Analysis**: Get comprehensive details about individual test cases, including errors, logs, and execution steps.
- **📤 Test Upload**: Automatically upload Playwright test results from your local machine to TestDino.
- **📝 Test Case Management**: Create, update, list, and retrieve manual test cases with comprehensive filtering and organization.
- **📁 Test Suite Organization**: Create and manage test suite hierarchies to organize your manual test cases.
- **🔌 MCP Compatible**: Built on the Model Context Protocol standard. You can configure TestDino MCP with any MCP-compatible IDEs or AI agents.
- **⚡ Easy Setup**: Install and configure in minutes with npx.
- **🔐 Secure**: API key stored securely in your local configuration.

### Available Tools

The server provides 11 powerful tools:

**Test Execution & Results:**

1. **`health`** - Verify your connection and validate your API key.
2. **`list_testruns`** - Browse test runs with filters (branch, time, author, commit, environment).
3. **`get_run_details`** - Get comprehensive details about a specific test run.
4. **`list_testcase`** - List test cases with comprehensive filtering (by test run, status, browser, error category, branch, environment, commit, author, and more).
5. **`get_testcase_details`** - Get detailed information about a specific test case.

**Test Case Management:**

6. **`list_manual_test_cases`** - Search and list manual test cases with filtering (project, suite, status, priority, severity, type, tags, etc.).
7. **`get_manual_test_case`** - Get detailed information about a specific manual test case including steps and custom fields.
8. **`create_manual_test_case`** - Create new manual test cases with steps, preconditions, and metadata.
9. **`update_manual_test_case`** - Update existing manual test cases (title, steps, status, priority, etc.).
10. **`list_manual_test_suites`** - List test suite hierarchy to find suite IDs for organization.
11. **`create_manual_test_suite`** - Create new test suite folders to organize test cases.

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
        "TESTDINO_API_KEY": "your_testdino_api_key_here"
      }
    }
  }
}
```

**Important**: Replace `your_testdino_api_key_here` with your actual Personal Access Token (PAT) from Step 1.

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
        "TESTDINO_API_KEY": "your_testdino_api_key_here"
      }
    }
  }
}
```

The server uses the standard MCP protocol, so it will work with other MCP-compatible clients as well.

## Usage

Once configured, simply talk to your AI assistant in natural language. **Important**: Tools require your Personal Access Token (PAT) configured as `TESTDINO_API_KEY` in `mcp.json`. The PAT automatically provides access to all organizations and projects you have permissions for.

### Example Commands

Try these natural language commands in Cursor or Claude Desktop (or other MCP-compatible clients):

**Connection & Setup:**

- "Check if my TestDino connection is working"
- "Validate my TestDino API key"

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

**Managing Manual Test Cases:**

- "List all manual test cases in project proj_123"
- "Search for manual test cases with tag 'smoke' in project proj_123"
- "Show me all critical priority manual test cases in project proj_123"
- "Get details for manual test case TC-123 in project proj_123"
- "Create a new manual test case for login feature in suite suite_456"
- "Update test case TC-123 to mark it as deprecated"
- "List all test suites in project proj_123"
- "Create a new test suite called 'Authentication Tests' in project proj_123"

## Requirements

- Node.js 18.0.0 or higher
- NPM (for package management)
