# Installation Guide for testdino-mcp

This step-by-step guide will help you install and configure the TestDino MCP server. We provide comprehensive setup instructions for **Cursor** and **Claude Desktop**.

> **Platform Support**: 
> - ✅ **Cursor**: Fully supported with comprehensive setup instructions
> - ✅ **Claude Desktop**: Fully supported with comprehensive setup instructions
> - 🔜 **VS Code**: Coming soon
>
> The server uses the standard MCP protocol, so it may work with other MCP-compatible clients, but official support and documentation will be added in future releases.

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

### Step 1: Get Your TestDino API Key

1. Log in to your [TestDino account](https://testdino.com)
2. Navigate to **Settings → API Keys**
3. Click **Generate New Key** or copy an existing key
4. **Important**: Copy the key now - you'll need it in the next step

Your API key will look like: `trx_production_abc123...` or `trx_development_xyz789...`

### Step 2: Locate Your Cursor Configuration File

**Windows:**
- Global config: `%APPDATA%\Cursor\mcp.json`
- Project config: `.cursor/mcp.json` in your project root

**macOS/Linux:**
- Global config: `~/.cursor/mcp.json`
- Project config: `.cursor/mcp.json` in your project root

**Tip**: Use project config if you want different API keys per project, or global config for a single key across all projects.

### Step 3: Add the Configuration

Open or create the `mcp.json` file and add this configuration:

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

**Critical**: Replace `your_testdino_api_key_here` with the actual API key you copied in Step 1.

**If you installed globally** (Option 2 above), use this instead:
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

### Step 4: Restart Cursor

1. **Completely close Cursor** (don't just minimize)
2. **Reopen Cursor**
3. Open any project or workspace

### Step 5: Verify It's Working

1. **Check MCP Status**: Go to **Settings → MCP** and verify "testdino" appears in the list
2. **Test the Connection**: Ask Cursor: *"Check TestDino health"* or *"Validate my TestDino API key"*
3. **Expected Response**: You should see your project name and ID, confirming the connection works

If you see an error, check the [Troubleshooting](#troubleshooting) section below.

## Available Tools Overview

Once installed and configured, the MCP server provides 6 powerful tools:

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `health` | Verify connection and API key | First thing after installation, troubleshooting |
| `list_testruns` | Browse and filter test runs | Finding specific test executions |
| `get_run_details` | Get complete test run overview | Analyzing a specific test run |
| `list_testcase` | List test cases in a run | Finding failed or flaky tests |
| `get_testcase_details` | Deep dive into a test case | Debugging test failures |
| `upload_latest_local_test_runs` | Upload local test results | After running Playwright tests locally |

**Quick Examples:**
- *"Check TestDino health"* - Verify your setup
- *"Show me my last 5 test runs"* - Browse recent runs
- *"What tests failed in test run X?"* - Analyze failures
- *"Upload my Playwright test results"* - Upload local tests

**Note:** All tools (except `health` without API key) require `TESTDINO_API_KEY` to be configured. See [API Key Configuration](#api-key-configuration) below.

For complete documentation with all parameters and detailed examples, see [TOOLS.md](./TOOLS.md).

## API Key Configuration

### Why You Need an API Key

The API key authenticates your requests to TestDino. Without it, most tools won't work. The key is stored securely in your local `mcp.json` file and never shared.

### How to Get Your API Key

1. **Log in** to [TestDino](https://testdino.com)
2. **Navigate** to **Settings → API Keys**
3. **Generate** a new key or **copy** an existing one
4. **Add it** to your `mcp.json` configuration (see [Cursor Integration](#cursor-integration) above)

### Security Best Practices

- ✅ **Do**: Store your API key in `mcp.json` (it's local to your machine)
- ✅ **Do**: Use project-specific configs for different keys per project
- ❌ **Don't**: Commit `mcp.json` with your API key to version control
- ❌ **Don't**: Share your API key with others

**Tip**: Add `.cursor/mcp.json` to your `.gitignore` if you store API keys there.

## Requirements

- **Node.js**: Version 18.0.0 or higher
- **npm**: Latest version recommended
- **TestDino Account**: Valid account with API access (for most tools)

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

### Step 1: Get Your TestDino API Key

1. Log in to your [TestDino account](https://testdino.com)
2. Navigate to **Settings → API Keys**
3. Click **Generate New Key** or copy an existing key
4. **Important**: Copy the key now - you'll need it in the next step

Your API key will look like: `trx_production_abc123...` or `trx_development_xyz789...`

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
        "TESTDINO_API_KEY": "your_testdino_api_key_here"
      }
    }
  }
}
```

**Critical**: Replace `your_testdino_api_key_here` with the actual API key you copied in Step 1.

**If you installed globally** (Option 2 above), use this instead:
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

### Step 4: Restart Claude Desktop

1. **Completely close Claude Desktop** (don't just minimize)
2. **Reopen Claude Desktop**
3. Start a new conversation

### Step 5: Verify It's Working

1. **Check MCP Status**: In Claude Desktop, you can verify the MCP server is connected by checking the connection status
2. **Test the Connection**: Ask Claude: *"Check TestDino health"* or *"Validate my TestDino API key"*
3. **Expected Response**: You should see your project name and ID, confirming the connection works

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

