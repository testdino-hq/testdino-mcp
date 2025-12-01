# TestDino MCP Server

A Model Context Protocol (MCP) server that connects TestDino to AI agents. This server enables you to interact with your TestDino test data directly through natural language commands.

## What is This?

This MCP server bridges the gap between your TestDino test management platform and AI agents. Instead of manually navigating the TestDino dashboard, you can ask your AI assistant to:
- Check test run results
- Analyze test failures
- Upload test results
- Get detailed test case information

All through simple conversational commands.

## Features

- **🔍 Health Check**: Verify your API connection and validate your TestDino API key.
- **📊 Test Run Management**: List and retrieve detailed information about your test runs with powerful filtering options.
- **🧪 Test Case Analysis**: Get comprehensive details about individual test cases, including errors, logs, and execution steps.
- **📤 Test Upload**: Automatically upload Playwright test results from your local machine to TestDino.
- **🔌 MCP Compatible**: Built on the Model Context Protocol standard. You can configure TestDino MCP with any MCP-compatible IDEs or AI agents.
- **⚡ Easy Setup**: Install and configure in minutes with npx.
- **🔐 Secure**: API key stored securely in your local configuration.

### Available Tools

The server provides 6 powerful tools:

1. **`health`** - Verify your connection and validate your API key.
2. **`list_testruns`** - Browse test runs with filters (branch, time, author, commit, environment).
3. **`get_run_details`** - Get comprehensive details about a specific test run.
4. **`list_testcase`** - List test cases with comprehensive filtering (by test run, status, browser, error category, branch, environment, commit, author, and more).
5. **`get_testcase_details`** - Get detailed information about a specific test case.
6. **`upload_latest_local_test_runs`** - Upload your local Playwright test results.

## Installation

The easiest way is to use npx - no installation needed! Just configure it in Cursor or any other MCP compatible platform.


## Integration

### A simple Integration guide for Cursor IDE:

#### Step 1: Get Your API Key

1. Log in to your [TestDino account](https://testdino.com)
2. Navigate to **Settings → API Keys**
3. Generate new or copy exisiting API key

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

**Important**: Replace `your_testdino_api_key_here` with your actual API key from Step 1.

#### Step 3: Restart and Verify

1. **Completely close and restart Cursor**
2. **Verify the connection** by asking: "Check TestDino health"
3. You should see your project name and ID if everything is working!

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

Once configured, simply talk to your AI assistant in natural language. **Important**: Tools will require your `TESTDINO_API_KEY` to be configured in `mcp.json`.

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

**Uploading Results:**
- "Upload my Playwright test results"
- "Upload test results from the ./test-results directory"

## Requirements

- Node.js 18.0.0 or higher
- NPM (for package management)