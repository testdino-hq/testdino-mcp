
# TestDino MCP Connector

A Model Context Protocol (MCP) connector that connects TestDino to AI agents and web clients. Interact with your TestDino test data through natural language — directly inside Claude, Cursor, ChatGPT, and more.

---

## What Is Built

This repo contains **two servers** that serve the same MCP tools over different transports:

| File | Transport | Used By |
|---|---|---|
| `server.ts` | stdio | Claude Desktop, Cursor |
| `server-http.ts` | HTTP (Streamable HTTP) | Claude Web, ChatGPT Web |

Both servers expose the same 12 tools + 1 interactive UI tool (`show_testdino`).

### Interactive UI Dashboard (`show_testdino`)

In addition to the 12 standard tools, the connector includes a built-in visual dashboard rendered inside the AI client:

- Browse test runs with filters (branch, time, author)
- Drill into run details (status, commit, author, duration)
- View test cases with pass/fail/flaky status
- Debug failing tests with AI analysis
- Manage manual test cases and suites

This UI is served as an embedded HTML app via the MCP Apps extension protocol and works in Claude Desktop and Claude Web.

---

## How It Works

### Authentication

Every user creates their own **Personal Access Token (PAT)** in the TestDino dashboard. This token is passed to the connector when connecting — how it's passed depends on the client:

| Client | How token is passed |
|---|---|
| Claude Desktop | `TESTDINO_PAT` env var in config file |
| Cursor | `TESTDINO_PAT` env var in config file |
| Claude Web | `?token=tpu_...` in the connector URL |
| ChatGPT Web | `Authorization: Bearer tpu_...` header |

The connector reads the token from whichever source is available (header → query param → env var) and uses it to authenticate all TestDino API calls on behalf of that user.

### Request Flow

```
User prompt
  → AI client (Claude / Cursor / ChatGPT)
    → MCP connector (stdio or HTTP)
      → TestDino API (api.testdino.com)
        → Response back to AI
```

### Architecture

```
testdino-mcp/
├── server.ts          # stdio server — for Claude Desktop & Cursor
├── server-http.ts     # HTTP server — for Claude Web & ChatGPT
├── frontend/
│   ├── lib/
│   │   └── env.ts     # token resolution (header → query → env)
│   ├── tools/         # 12 tool handlers
│   └── ui/            # React dashboard (show_testdino UI)
```

### Token Resolution Priority

The HTTP server resolves the token in this order:

1. `Authorization: Bearer tpu_...` header — used by ChatGPT and OAuth clients
2. `?token=tpu_...` URL query param — used by Claude Web connector
3. `TESTDINO_PAT` environment variable — fallback for local/server deployments

---

## Available Tools

| Tool | Purpose |
|---|---|
| `show_testdino` | Opens the interactive visual dashboard |
| `health` | Validates PAT and lists orgs/projects |
| `list_testruns` | Browse test runs with filters |
| `get_run_details` | Full details of a specific run |
| `list_testcase` | List test cases with filters |
| `get_testcase_details` | Deep dive into a single test case |
| `debug_testcase` | AI-assisted debugging with historical patterns |
| `list_manual_test_cases` | Search manual test cases |
| `get_manual_test_case` | Get manual test case details |
| `create_manual_test_case` | Create a new manual test case |
| `update_manual_test_case` | Update an existing manual test case |
| `list_manual_test_suites` | List test suite hierarchy |
| `create_manual_test_suite` | Create a new test suite |

---

## Connecting Locally

### Prerequisites

- Node.js 18+
- A TestDino account with a PAT token (`tpu_...`)
- This repo cloned locally

### Get Your PAT

1. Log in to [TestDino](https://app.testdino.com)
2. Go to **User Settings → Personal Access Tokens**
3. Generate a new token — it will look like `tpu_abc123...`

---

### Option A — Claude Desktop (stdio)

**Config file location:**
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Using published npm package:**
```json
{
  "mcpServers": {
    "testdino": {
      "command": "npx",
      "args": ["-y", "testdino-mcp"],
      "env": {
        "TESTDINO_PAT": "tpu_your_token_here"
      }
    }
  }
}
```

**Using local repo:**
```json
{
  "mcpServers": {
    "testdino": {
      "command": "npx",
      "args": ["tsx", "C:/path/to/testdino-mcp/server.ts"],
      "env": {
        "TESTDINO_PAT": "tpu_your_token_here"
      }
    }
  }
}
```

Restart Claude Desktop. Ask _"Check TestDino health"_ to verify.

---

### Option B — Cursor (stdio)

**Config file location:**
- Windows: `%APPDATA%\Cursor\mcp.json`
- macOS/Linux: `~/.cursor/mcp.json`
- Project-specific: `.cursor/mcp.json`

```json
{
  "mcpServers": {
    "testdino": {
      "command": "npx",
      "args": ["-y", "testdino-mcp"],
      "env": {
        "TESTDINO_PAT": "tpu_your_token_here"
      }
    }
  }
}
```

Restart Cursor. Go to **Settings → MCP** to verify the server appears.

---

### Option C — Claude Web (HTTP + ngrok)

Claude Web only supports HTTP-based MCP servers. To test locally, expose the HTTP server via ngrok.

**Step 1 — Install ngrok**

Download from [ngrok.com](https://ngrok.com) or:
```cmd
winget install ngrok
```

Authenticate ngrok (one-time):
```cmd
ngrok config add-authtoken YOUR_NGROK_AUTHTOKEN
```

Get your authtoken from the [ngrok dashboard](https://dashboard.ngrok.com/get-started/your-authtoken).

**Step 2 — Start the HTTP server**
```cmd
npx tsx server-http.ts
```
Server starts at `http://localhost:3001/mcp`.

**Step 3 — Expose via ngrok (new terminal)**
```cmd
ngrok http 3001
```
Copy the `https://xxxx.ngrok-free.app` URL shown in the output.

**Step 4 — Add connector in Claude Web**

1. Open [claude.ai](https://claude.ai)
2. Go to **Settings → Connectors → Add custom connector**
3. Fill in:
   - **Name:** TestDino
   - **Remote MCP server URL:** `https://xxxx.ngrok-free.app/mcp?token=tpu_your_token_here`
4. Click **Add**

Each user provides their own PAT in the URL. The server holds no tokens.

**Step 5 — Verify**

Start a new chat and ask _"Check TestDino health"_ or use the `show_testdino` tool to open the dashboard.

> **Note:** On the free ngrok plan, the URL changes every time you restart ngrok. Update the Claude Web connector URL each time.

---

### Option D — ChatGPT Web (HTTP + ngrok)

ChatGPT sends the token via the `Authorization: Bearer` header.

**Step 1 & 2** — Same as Option C (start server + ngrok).

**Step 3 — Add in ChatGPT**

1. Go to **chatgpt.com → Settings → Connected apps / MCP**
2. Add server URL: `https://xxxx.ngrok-free.app/mcp`
3. Set the authorization header:
   - `Authorization: Bearer tpu_your_token_here`

---

## Running from Source

```bash
# Install dependencies
npm install

# Run stdio server (Claude Desktop / Cursor)
npx tsx server.ts

# Run HTTP server (Claude Web / ChatGPT)
npx tsx server-http.ts
```

The HTTP server runs on port `3001` by default. Override with:
```cmd
set PORT=4000 && npx tsx server-http.ts
```

---

## Troubleshooting

**Claude Desktop / Cursor not detecting the server**
- Check JSON syntax in config file (no trailing commas, all quotes correct)
- Confirm `node --version` shows 18+
- Restart the application completely

**ngrok URL changes on every restart**
- Free ngrok plan generates a new URL each restart
- Update the Claude Web connector URL after restarting ngrok
- Upgrade to a paid ngrok plan for a stable domain

**"Invalid or expired User PAT"**
- Your `tpu_` token has expired
- Go to TestDino → Settings → Personal Access Tokens and generate a new one

**Claude Web connector not connecting**
- Confirm ngrok is running and the URL matches
- Check the token is in the URL: `...?token=tpu_your_token`
- Open the ngrok URL in a browser — a `405 Method Not Allowed` response means the server is reachable

**Server starts but tools return errors**
- Verify your PAT is valid by running: `npx tsx server.ts` and asking health check in Claude Desktop first
- Check the TestDino API is reachable: `https://api.testdino.com`
