<h1 align="left">
  <picture>
    <source
      srcset="https://testdino.com/images/logo-icon-white.svg"
      media="(prefers-color-scheme: dark)"
    />
    <source
      srcset="https://testdino.com/images/logo-icon-black.svg"
      media="(prefers-color-scheme: light)"
    />
    <img
      src="https://testdino.com/images/logo-icon-black.svg"
      width="32"
      height="32"
      alt="TestDino Logo"
      valign="middle"
    />
  </picture>
  TestDino MCP
</h1>

A Model Context Protocol (MCP) server that connects TestDino to AI agents. This server enables you to interact with your TestDino test data directly through natural language commands.

[![npm version](https://img.shields.io/npm/v/@testdino/mcp.svg)](https://www.npmjs.com/package/@testdino/mcp)
[![Node.js](https://img.shields.io/node/v/@testdino/mcp.svg)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![Docs](https://img.shields.io/badge/docs-testdino.com-blue.svg)](https://docs.testdino.com/testdino-mcp/overview/)

## Quick Start

Add this to your MCP client config (`~/.cursor/mcp.json` for Cursor), then restart the client:

```json
{
  "mcpServers": {
    "TestDino": {
      "command": "npx",
      "args": ["-y", "@testdino/mcp"],
      "env": {
        "TESTDINO_PAT": "your-pat-here"
      }
    }
  }
}
```

Get your PAT from **TestDino → User Settings → Personal Access Tokens**, then ask your assistant: _"Check TestDino health."_ You should see your account, organizations, and projects. Full setup for Cursor and Claude Desktop is in [Integration](#integration).

## What is This?

This MCP server bridges the gap between your TestDino test management platform and AI agents. Instead of manually navigating the TestDino dashboard, you can ask your AI assistant to:

- Check test run results
- Analyze test failures
- Get detailed test case information
- Manage manual test cases and suites
- Plan releases, spin up manual test runs, and assign testers
- Run exploratory testing sessions
- Record per-case verdicts (passed / failed / blocked / etc.) from chat

All through simple conversational commands.

## Features

- **🔍 Health Check**: Verify your connection and validate your TestDino PAT. Get account information and list all available organizations and projects.
- **📊 Test Run Management**: List and retrieve detailed information about your test runs with filtering options (branch, time, author, commit, environment).
- **🧪 Test Case Analysis**: Get comprehensive details about individual test cases, including errors, logs, execution steps, and artifacts (screenshots, videos, traces).
- **🐛 AI-Assisted Debugging**: Debug test case failures with historical data aggregation, failure pattern analysis, and AI-friendly debugging prompts. Analyze patterns across multiple executions to identify root causes.
- **🧭 Test Quality Audit**: Fetch a server-curated audit prompt plus branch signals, analyze your local test code, and store the completed report back in TestDino without uploading raw source files.
- **📝 Test Case Management**: Create, update, list, and retrieve manual test cases with comprehensive filtering and organization (status, priority, severity, type, layer, behavior, tags).
- **📁 Test Suite Organization**: Create and manage test suite hierarchies to organize your manual test cases.
- **🚀 Release Planning**: Create, browse, and update releases (a.k.a. milestones), nest them up to 3 levels deep, and track rolled-up progress stats across all runs in a release.
- **▶️ Manual Test Runs**: Spin up runs scoped to specific suites or the whole project, attach them to a release, and update workflow state without leaving chat.
- **✅ Per-case Assignment & Verdicts**: Inside a run, assign each test case to a tester (by User \_id or email) and set the result — `passed`, `failed`, `blocked`, `skipped`, `retest` — exactly as the UI does.
- **🔭 Exploratory Sessions**: Create exploratory testing sessions with mission/charter, assign a tester, link to a release, and track state.
- **🧩 Failure Triage at Scale**: Group a run's failing tests by their underlying error signature to see which reds are one root cause versus many, so you fix the real problem first.
- **🔗 Issue Tracker Integrations**: Connect Jira, Linear, Asana, or monday.com and file a tracked issue straight from a failing test or run, then check its status later without leaving chat.
- **🔌 MCP Compatible**: Built on the Model Context Protocol standard. You can configure TestDino MCP with any MCP-compatible IDEs or AI agents (Cursor, Claude Desktop, etc.).
- **⚡ Easy Setup**: Install and configure in minutes with npx. No installation required!
- **🔐 Secure**: PAT stored securely in your local configuration. One PAT provides access to all organizations and projects you have permissions for.

### Available Tools

The server provides 33 tools across eight domains:

**Test Execution & Results:**

1. **`health`** - Verify your connection and validate your PAT. Shows account information, available organizations, and projects with access permissions.
2. **`list_testruns`** - Browse test runs with filters (branch, time interval, author, commit, environment). Supports pagination and batch operations.
3. **`get_run_details`** - Get comprehensive details about a specific test run including statistics, test suites, test cases, and metadata. Supports batch operations (comma-separated IDs, max 20).
4. **`list_testcase`** - List test cases with comprehensive filtering (by test run, status, browser, error category, branch, environment, commit, author, spec file, tags, runtime, artifacts, and more). Can filter by test run criteria or directly by test case properties.
5. **`get_testcase_details`** - Get detailed information about a specific test case including error messages, stack traces, test steps, console logs, and artifacts. Can identify by testcase_id alone or by testcase_name with testrun_id/counter.
6. **`debug_testcase`** - Debug a test case by aggregating historical failure data across multiple executions. Returns failure patterns, error categories, common error messages, error locations, browser-specific issues, and a pre-formatted debugging prompt for AI analysis. Perfect for root-cause analysis and identifying flaky test behavior.
7. **`get_audit_report`** - Fetch the audit context (server-curated prompt + top failing / flaky / slow tests for the branch) to start a new audit, browse historical reports, or retrieve one by `reportId`.
8. **`submit_audit_report`** - Submit a completed audit report (score, findings, recommendations, markdown) to TestDino.

**Test Case Management:**

9. **`list_manual_test_cases`** - Search and list manual test cases with comprehensive filtering (project, suite, status, priority, severity, type, layer, behavior, automation status, tags, flaky status).
10. **`get_manual_test_case`** - Get detailed information about a specific manual test case including steps, custom fields, preconditions, postconditions, and all metadata.
11. **`create_manual_test_case`** - Create new manual test cases with steps, preconditions, postconditions, and metadata (priority, severity, type, layer, behavior).
12. **`update_manual_test_case`** - Update existing manual test cases (title, description, steps, status, priority, severity, type, layer, behavior, preconditions, postconditions).
13. **`list_manual_test_suites`** - List test suite hierarchy to find suite IDs for organization. Supports filtering by parent suite.
14. **`create_manual_test_suite`** - Create new test suite folders to organize test cases. Supports nested suites by providing parentSuiteId.

**Releases (a.k.a. Milestones):**

15. **`list_releases`** - Browse releases for a project with filters (search, type, completion status, parent release). Releases group runs + sessions and can nest up to 3 levels deep.
16. **`get_release`** - Get full details for one release including dates, status, parent/root hierarchy, and rolled-up progress stats across all runs in this release and its descendants. Accepts internal `_id` or counter-style ID like `MS-12`.
17. **`create_release`** - Create a new release with name, type, dates, and optional parent for nesting.
18. **`update_release`** - Modify an existing release — name, dates, completion flags, type, linked issues. Closed releases are still editable.

**Manual Test Runs:**

19. **`list_manual_runs`** - Browse manual runs in a project. Filter by status, state, environment, release, tags, or free-text name search.
20. **`get_manual_run`** - Get full details for one run — test stats (total/passed/failed/blocked/untested), contributors, attachments, linked release. Accepts internal `_id` or counter-style ID like `RUN-12`.
21. **`create_manual_run`** - Create a new manual run. Choose `selectionMode='all'` for every case in the project, or `'selected'` with suite/case IDs to scope it. Attach to a release with `releaseId`.
22. **`update_manual_run`** - Modify run metadata — name, environment, state, release attachment, tags. Closed runs are read-only except for `releaseId`.
23. **`list_run_test_cases`** - Get the per-case execution rows inside a run — exactly what the UI shows in the run's test-case table. Each row includes the current assignee and current result. Filter by assignee (email or \_id) or result.
24. **`update_run_test_case`** - Set the assignee and/or result for one test case inside a run — same as clicking "Assign to" + the result pill in the UI. Works even on untested cases (auto-creates the per-case row on first edit). Accepts caseKey (`TC-156`), test case _id, or the internal `tcm_rtc_…` ID.

**Exploratory Sessions:**

25. **`list_sessions`** - Browse exploratory sessions in a project. Filter by status, state, sessionType, assignee (email or \_id), release, tags.
26. **`get_session`** - Get full details for one session — name, mission, status, assignee, linked release, findings. Accepts internal `_id` or counter-style ID like `SES-12`.
27. **`create_session`** - Create a new exploratory session with mission/charter, sessionType, assignee, estimate, and optional release attachment.
28. **`update_session`** - Modify session metadata — name, mission, assignee, state, estimate, linked issues, attachments.

**Error Analysis:**

29. **`get_run_error_clusters`** - Group a run's failing tests by error signature to triage at scale. Surfaces clusters of tests that share the same root-cause error, with an optional `status` filter (`all`, `failed`, `flaky`). Use it after `list_testruns` to understand why a run failed.

**Integrations (Issue Trackers):**

30. **`connect_integration`** - Return an OAuth connect URL for a provider (Jira, Linear, Asana, monday.com, GitHub). Show the URL to the user to authorize; do not open it programmatically.
31. **`get_integration_status`** - Report whether a provider is connected for a project. Set `includeCreateOptions` to also fetch the fields available for issue creation. Call this before `create_external_issue`.
32. **`create_external_issue`** - File an issue in a connected tracker (Jira, Linear, Asana, monday.com) from a TestDino source entity such as a failing test case or run. Supports `preview` and idempotent retries via `idempotencyKey`.
33. **`get_external_issue`** - Fetch previously created issues by their IDs or keys (one or many) and return their current status in the provider (Jira, Linear, Asana).

> **Provider support**: All providers can be connected and status-checked. Issue **creation** works with Jira, Linear, Asana, and monday.com. Issue **read-back** works with Jira, Linear, and Asana. GitHub is supported as a PR/CI integration, not an issue tracker.

### Installation Options

#### There are mainly 3 options to use TestDino MCP:

**Option 1: Via npx (Recommended - No Installation)**

- No installation required
- Automatically downloads and runs when needed
- Always uses the latest version
- Configured in any MCP compatible platform

**Option 2: Global Installation**

```bash
npm install -g @testdino/mcp
```

- Install once, use in any project
- Requires Node.js 20+ and npm
- Use command: `testdino-mcp`

**Option 3: Project Installation**

```bash
npm install @testdino/mcp
```

- Installed in your project's `node_modules`
- Use command: `npx @testdino/mcp`

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
      "args": ["-y", "@testdino/mcp"],
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
npm install -g @testdino/mcp
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

### Claude Desktop

Claude Desktop uses the same config shape, in a different file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "TestDino": {
      "command": "npx",
      "args": ["-y", "@testdino/mcp"],
      "env": {
        "TESTDINO_PAT": "your-pat-here"
      }
    }
  }
}
```

Restart Claude Desktop, then ask _"Check TestDino health"_ to verify.

### Local development

By default the server talks to `https://mcp.testdino.com`. To point it at a local API while developing, set `TESTDINO_API_URL` (see [`.env.example`](./.env.example)):

```bash
TESTDINO_API_URL=http://localhost:3001
```

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
- "Create a new manual test case for login feature in suite Authentication Tests"
- "Update test case TC-123 to mark it as deprecated"
- "List all test suites in project proj_123"
- "Create a new test suite called 'Authentication Tests' in project proj_123"

**Releases:**

- "List all releases in project proj_123"
- "Show me the open iterations on this project"
- "Get details for release MS-12 and show the rolled-up test progress"
- "Create a release called 'Sprint 42' as an iteration from May 12 to May 26"
- "Mark release MS-12 as completed"

**Manual Test Runs:**

- "List manual runs in release MS-12"
- "Show me all in-progress runs on staging"
- "Get details for run RUN-7"
- "Create a manual run called 'Sprint 42 Smoke' linked to release MS-12 on staging, covering the Authentication suite"
- "Set run RUN-7's state to Done"
- "Re-attach run RUN-7 to release MS-13"

**Assigning Cases & Recording Verdicts in a Run:**

- "List the test cases in run RUN-1 with their current assignees and results"
- "Assign TC-156 in run RUN-1 to alice@company.com and mark it Passed"
- "Mark TC-157 in run RUN-1 as Failed"
- "Assign TC-158 in run RUN-1 to bob@company.com — leave the result untested"
- "Show me all cases in run RUN-1 assigned to alice@company.com that are still untested"

**Exploratory Sessions:**

- "List active exploratory sessions for project proj_123"
- "Show me sessions assigned to tester@company.com"
- "Get details for session SES-3"
- "Create an exploratory session called 'Auth charter — May 12' with mission 'find session-handling bugs around 2FA' assigned to tester@company.com, 60 minute estimate"
- "Update session SES-3 to mark it Done"

## Documentation

- **[Installation Guide](./docs/INSTALLATION.md)**: Detailed setup instructions for Cursor, Claude Desktop, and other MCP-compatible clients
- **[Tools Documentation](./docs/TOOLS.md)**: Comprehensive guide to all 33 available tools with examples, parameters, and use cases
- **[AI Agent Skills Guide](./docs/skill.md)**: Guide for AI agents on tool selection patterns, decision trees, and best practices

## Requirements

- **Node.js**: Version 20.0.0 or higher
- **NPM**: Latest version recommended (for package management)
- **TestDino Account**: Valid account with Test Runs and/or Test Case Management access
- **Personal Access Token (PAT)**: Required for authentication. Get it from TestDino Settings → Personal Access Tokens

## Key Features Explained

### AI-Assisted Debugging with `debug_testcase`

The `debug_testcase` tool helps you understand why tests are failing by analyzing historical execution data:

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
