# TestDino MCP Server

A Model Context Protocol (MCP) server that connects TestDino to AI coding assistants. **Fully supported on Cursor and Claude Desktop**, with future support planned for VS Code. This server enables you to interact with your TestDino test data directly through natural language commands.

## What is This?

This MCP server bridges the gap between your TestDino test management platform and AI coding assistants. Instead of manually navigating the TestDino dashboard, you can ask your AI assistant to:
- Check test run results
- Analyze test failures
- Upload test results
- Get detailed test case information

All through simple conversational commands.

## Features

- **🔍 Health Check**: Verify your API connection and validate your TestDino API key
- **📊 Test Run Management**: List and retrieve detailed information about your test runs with powerful filtering options
- **🧪 Test Case Analysis**: Get comprehensive details about individual test cases, including errors, logs, and execution steps
- **📤 Test Upload**: Automatically upload Playwright test results from your local machine to TestDino
- **🔌 MCP Compatible**: Built on the Model Context Protocol standard. **Fully supported on Cursor and Claude Desktop** with comprehensive setup guides and examples. VS Code support coming soon.
- **⚡ Easy Setup**: Install and configure in minutes with npx
- **🔐 Secure**: API key stored securely in your local configuration

## Installation

The easiest way is to use npx - no installation needed! Just configure it in Cursor or Claude Desktop (see [Integration](#integration) below).


## Integration

> **Note**: This MCP server is fully supported on **Cursor** and **Claude Desktop** with comprehensive setup instructions and examples. Support for **VS Code** is planned for future releases. The server uses the standard MCP protocol, so it should work with any MCP-compatible client, but setup instructions and documentation currently focus on Cursor and Claude Desktop.

### Cursor Integration

#### Step 1: Get Your API Key

1. Log in to your [TestDino account](https://testdino.com)
2. Navigate to **Settings → API Keys**
3. Copy your API key (starts with `trx_`)

#### Step 2: Configure Cursor

1. **Open or create** the MCP configuration file:
   - **Windows**: `%APPDATA%\Cursor\mcp.json`
   - **macOS/Linux**: `~/.cursor/mcp.json`
   - **Project-specific**: `.cursor/mcp.json` in your project root

2. **Add the configuration**:

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

If you prefer to install globally instead of using npx:

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

### Claude Desktop Integration

#### Step 1: Get Your API Key

1. Log in to your [TestDino account](https://testdino.com)
2. Navigate to **Settings → API Keys**
3. Copy your API key (starts with `trx_`)

#### Step 2: Configure Claude Desktop

1. **Open or create** the Claude Desktop configuration file:
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

2. **Add the configuration**:

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

1. **Completely close and restart Claude Desktop**
2. **Verify the connection** by asking: "Check TestDino health"
3. You should see your project name and ID if everything is working!

#### Alternative: Global Installation

If you prefer to install globally instead of using npx:

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

For more detailed installation instructions, see [docs/INSTALLATION.md](./docs/INSTALLATION.md).

### Future Support

We're actively working on adding comprehensive support for:
- **VS Code**: MCP extension support with detailed configuration

The server uses the standard MCP protocol, so it may work with other MCP-compatible clients, but official support and documentation will be added in future releases.

## Usage

Once configured, simply talk to your AI assistant in natural language. **Important**: Most tools require your `TESTDINO_API_KEY` to be configured in `mcp.json`.

### Available Tools

The server provides 6 powerful tools:

1. **`health`** - Verify your connection and validate your API key
2. **`list_testruns`** - Browse test runs with filters (branch, time, author, commit, environment)
3. **`get_run_details`** - Get comprehensive details about a specific test run
4. **`list_testcase`** - List test cases with comprehensive filtering (by test run, status, browser, error category, branch, environment, commit, author, and more)
5. **`get_testcase_details`** - Get detailed information about a specific test case
6. **`upload_latest_local_test_runs`** - Upload your local Playwright test results

For complete documentation with all parameters and examples, see [docs/TOOLS.md](./docs/TOOLS.md).

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


### Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Run the compiled server
- `npm run dev` - Run with tsx for development

## Requirements

- Node.js 18.0.0 or higher
- NPM (for package management)