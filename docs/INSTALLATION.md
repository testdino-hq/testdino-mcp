# Installation Guide for testdino-mcp

This step-by-step guide will help you install and configure the TestDino MCP server. We provide comprehensive setup instructions for **Cursor**.

The server uses the standard MCP protocol, so it may work with other MCP-compatible clients, but official support and documentation will be added in future releases.

## Quick Start

You don't need to install anything! The MCP server runs automatically via npx when configured. We provide detailed setup instructions for **Cursor** and **Claude Desktop**. Choose your platform below:

- [Cursor Integration](#cursor-integration)
- [Claude Desktop Integration](#claude-desktop-integration)

### Installation Options

**Option 1: Via npx (Recommended - No Installation)**

- No installation required
- Automatically downloads and runs when needed
- Always uses the latest version
- Configured in Cursor or Claude Desktop (see below)

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

## Cursor Integration

Follow these steps to connect TestDino to Cursor:

### Step 1: Get Your TestDino PAT

1. Log in to your [TestDino account](https://testdino.com)
2. Navigate to **User Settings → Personal Access Tokens**
3. Generate a new PAT.
4. **Important**: Copy the PAT now - you'll need it in the next step

Your PAT will look like: `tpu...xyz`

### Step 2: Locate Your Cursor Configuration File

**Windows:**

- Global config: `%APPDATA%\Cursor\mcp.json`
- Project config: `.cursor/mcp.json` in your project root

**macOS/Linux:**

- Global config: `~/.cursor/mcp.json`
- Project config: `.cursor/mcp.json` in your project root

**Tip**: Use project config if you want different PATs per project, or global config for a single PAT across all projects.

### Step 3: Add the Configuration

Open or create the `mcp.json` file and add this configuration:

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

**Critical**: Replace `Your PAT here` with the actual Personal Access Token (PAT) you copied in Step 1.

**If you installed globally** (Option 2 above), use this instead:

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

### Step 4: Restart Cursor

1. **Completely close Cursor** (don't just minimize)
2. **Reopen Cursor**
3. Open any project or workspace

### Step 5: Verify It's Working

1. **Check MCP Status**: Go to **Settings → MCP** and verify "testdino" appears in the list
2. **Test the Connection**: Ask Cursor: _"Check TestDino health"_ or _"Validate my TestDino PAT"_
3. **Expected Response**: You should see your account name, available organizations, and projects, confirming the connection works

If you see an error, check the [Troubleshooting](#troubleshooting) section below.

## Available Tools Overview

Once installed and configured, the MCP server provides 12 powerful tools:

| Tool                       | Purpose                           | When to Use                                     |
| -------------------------- | --------------------------------- | ----------------------------------------------- |
| `health`                   | Verify connection and PAT         | First thing after installation, troubleshooting |
| `list_testruns`            | Browse and filter test runs       | Finding specific test executions                |
| `get_run_details`          | Get complete test run overview    | Analyzing a specific test run                   |
| `list_testcase`            | List test cases with filters      | Finding failed or flaky tests across runs       |
| `get_testcase_details`     | Deep dive into a test case        | Debugging specific test failures                |
| `debug_testcase`           | AI-assisted debugging with patterns| Root cause analysis, flaky test detection       |
| `list_manual_test_cases`   | Search and list manual test cases | Finding manual test cases with filters          |
| `get_manual_test_case`     | Get manual test case details      | Reviewing test steps and metadata               |
| `create_manual_test_case`  | Create new manual test case       | Documenting new test scenarios                  |
| `update_manual_test_case`  | Update existing test case         | Modifying test case details                     |
| `list_manual_test_suites`  | List test suite hierarchy         | Finding suite IDs for organization              |
| `create_manual_test_suite` | Create new test suite             | Organizing test cases                           |

**Quick Examples:**

- _"Check TestDino health"_ - Verify your setup and get project IDs
- _"Show me my last 5 test runs"_ - Browse recent runs
- _"What tests failed in test run X?"_ - Analyze failures
- _"Debug test case 'Verify user login' from testdino reports"_ - AI-assisted debugging with historical pattern analysis
- _"Debug 'Verify that User Can Complete the Journey from Login to Order Placement @webkit'"_ - Debug specific test case with browser tag
- _"List all manual test cases"_ - View manual tests
- _"Create a new manual test case"_ - Document test scenarios

**Note:** All tools require `TESTDINO_PAT` (Personal Access Token) to be configured. The PAT provides access to all organizations and projects you have permissions for. See [PAT Configuration](#pat-configuration) below.

**Special Feature - AI-Assisted Debugging:**

The `debug_testcase` tool is particularly powerful for debugging failing tests. It:
- Aggregates historical execution data across multiple test runs
- Identifies failure patterns, error categories, and common error messages
- Provides file and line numbers for error locations
- Returns pre-formatted debugging prompts for AI analysis
- Helps identify flaky test behavior and browser-specific issues

For complete documentation with all parameters and detailed examples, see [TOOLS.md](./TOOLS.md).

## Personal Access Token (PAT) Configuration

### Why You Need a PAT

The Personal Access Token (PAT) authenticates your requests to TestDino and provides access to all organizations and projects you have permissions for. Without it, tools won't work. The PAT is stored securely in your local `mcp.json` file and never shared.

### How to Get Your PAT

1. **Log in** to [TestDino](https://testdino.com)
2. **Navigate** to **Settings → Personal Access Tokens**
3. **Generate** a new token or **copy** an existing one
4. **Add it** to your `mcp.json` configuration (see [Cursor Integration](#cursor-integration) above)

### What the PAT Provides

- **Multi-Organization Access**: One PAT works across all your organizations
- **Multi-Project Access**: Automatically access all projects you have permissions for
- **Role-Based Permissions**: Your access level (read/write) is determined by your role in each project
- **No Project ID Required**: The health tool will show you all available organizations and projects

### Security Best Practices

- ✅ **Do**: Store your PAT in `mcp.json` (it's local to your machine)
- ✅ **Do**: Use the same PAT across all your projects
- ❌ **Don't**: Commit `mcp.json` with your PAT to version control
- ❌ **Don't**: Share your PAT with others

**Tip**: Add `.cursor/mcp.json` to your `.gitignore` if you store PATs there.

## Requirements

- **Node.js**: Version 18.0.0 or higher
- **npm**: Latest version recommended
- **TestDino Account**: Valid account with Testruns

## Troubleshooting

### "Package not found"

- Make sure you're connected to the internet
- Verify the package name: `testdino-mcp`
- Try: `npm view testdino-mcp` to check if it's published

### "Command not found" (after global install)

- Make sure npm's global bin directory is in your PATH
- On Windows: Usually `%APPDATA%\npm`
- On macOS/Linux: Usually `/usr/local/bin` or `~/.npm-global/bin`

### Cursor not detecting the server

1. Check the `mcp.json` file syntax (valid JSON)
2. Ensure the file path is correct
3. Restart Cursor completely
4. Check Cursor's MCP logs in Settings → MCP → View Logs

### Claude Desktop not detecting the server

1. Check the `claude_desktop_config.json` file syntax (valid JSON)
2. Ensure the file path is correct (see [Claude Desktop Integration](#claude-desktop-integration) for paths)
3. Restart Claude Desktop completely
4. Verify Node.js and npx are installed and accessible
5. Check Claude Desktop logs for error messages

### Permission errors

- On macOS/Linux, you may need `sudo` for global installs
- Or configure npm to use a different directory: `npm config set prefix ~/.npm-global`

## Claude Desktop Integration

Follow these steps to connect TestDino to Claude Desktop:

### Step 1: Get Your TestDino PAT

1. Log in to your [TestDino account](https://testdino.com)
2. Navigate to **User Settings → Personal Access Tokens**
3. Generate a new PAT
4. **Important**: Copy the PAT now - you'll need it in the next step

Your PAT will look like: `tpu...`

### Step 2: Locate Your Claude Desktop Configuration File

**Windows:**

- Config file: `%APPDATA%\Claude\claude_desktop_config.json`

**macOS:**

- Config file: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Linux:**

- Config file: `~/.config/Claude/claude_desktop_config.json`

**Note**: If the file doesn't exist, you'll need to create it. Make sure the directory exists first.

### Step 3: Add the Configuration

Open or create the `claude_desktop_config.json` file and add this configuration:

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

**Critical**: Replace `Your PAT here` with the actual Personal Access Token (PAT) you copied in Step 1.

**If you installed globally** (Option 2 above), use this instead:

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

### Step 4: Restart Claude Desktop

1. **Completely close Claude Desktop** (don't just minimize)
2. **Reopen Claude Desktop**
3. Start a new conversation

### Step 5: Verify It's Working

1. **Check MCP Status**: In Claude Desktop, you can verify the MCP server is connected by checking the connection status
2. **Test the Connection**: Ask Claude: _"Check TestDino health"_ or _"Validate my TestDino PAT"_
3. **Expected Response**: You should see your account name, available organizations, and projects, confirming the connection works

If you see an error, check the [Troubleshooting](#troubleshooting) section below.

### Claude Desktop Troubleshooting

**Config file not found:**

- Make sure Claude Desktop has been opened at least once (it creates the directory)
- Create the directory manually if needed:
  - Windows: `%APPDATA%\Claude\`
  - macOS: `~/Library/Application Support/Claude/`
  - Linux: `~/.config/Claude/`

**JSON syntax errors:**

- Validate your JSON using an online JSON validator
- Make sure all quotes are properly escaped
- Ensure there are no trailing commas

**MCP server not connecting:**

- Verify Node.js is installed: `node --version` (needs 18+)
- Check that npx is available: `npx --version`
- Ensure you have internet connectivity (npx downloads the package)
- Check Claude Desktop logs for error messages

### VS Code (Coming Soon)

VS Code MCP extension support is planned for future releases. We'll provide detailed setup instructions and configuration examples when available.

## Support

- Contact TestDino support
