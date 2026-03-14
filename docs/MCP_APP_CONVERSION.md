# TestDino MCP → MCP App Conversion Plan

## Executive Summary

**Can we convert it?** Yes — and it's a strong fit. The existing `@testdino/mcp` server already has 12 tools and a resource system. Converting to an MCP App adds interactive UI that renders inline in Claude Desktop, ChatGPT, and other MCP-enabled hosts, so users can **see** test run dashboards, failure charts, and test case details visually instead of reading raw JSON.

**Approach:** Keep all existing tools working as-is (backward compatible). Add new UI-enabled tools using `registerAppTool` + `registerAppResource` from `@modelcontextprotocol/ext-apps`. The UI is a single bundled HTML file served as an MCP resource.

---

## Current Architecture

```
┌─────────────────────────────────────────────┐
│  @testdino/mcp server (stdio transport)     │
│                                             │
│  12 Tools:                                  │
│  ├── health                                 │
│  ├── list_testruns / get_run_details        │
│  ├── list_testcase / get_testcase_details   │
│  ├── debug_testcase                         │
│  ├── list/get/create/update manual cases    │
│  └── list/create manual test suites         │
│                                             │
│  1 Resource:                                │
│  └── testdino://docs/skill.md               │
│                                             │
│  API: https://api.testdino.com/api/mcp/...  │
│  Auth: TESTDINO_PAT (Bearer token)          │
└─────────────────────────────────────────────┘
```

All tools return `{ content: [{ type: "text", text: JSON.stringify(data) }] }` — plain text JSON. No UI.

---

## Target Architecture (MCP App)

```
┌──────────────────────────────────────────────────────────┐
│  @testdino/mcp server (stdio transport)                  │
│                                                          │
│  Existing 12 Tools (unchanged, backward compatible)      │
│                                                          │
│  NEW UI-Enabled Tools (registerAppTool):                 │
│  ├── show_test_dashboard    → renders dashboard UI       │
│  ├── show_test_run          → renders test run detail UI │
│  ├── show_test_failures     → renders failure analysis   │
│  └── show_manual_cases      → renders manual test list   │
│                                                          │
│  NEW App-Only Tools (visibility: ["app"]):               │
│  ├── fetch_testruns_for_ui  → UI polls for data          │
│  ├── fetch_testcases_for_ui → UI polls for data          │
│  └── fetch_run_stats_for_ui → UI polls for data          │
│                                                          │
│  Resources:                                              │
│  ├── testdino://docs/skill.md (existing)                 │
│  └── ui://testdino/app.html  (NEW - bundled SPA)         │
└──────────────────────────────────────────────────────────┘

User asks "show me test runs" in Claude/ChatGPT
    → Host calls show_test_dashboard tool
    → Server returns structuredContent with data
    → Host fetches ui://testdino/app.html resource
    → Host renders app in iframe
    → App receives data via ontoolresult
    → App renders interactive dashboard
```

---

## What Needs to Change

### 1. Server Changes (src/index.ts)

| What | Current | After |
|------|---------|-------|
| Server class | `Server` from `@modelcontextprotocol/sdk` | `McpServer` from `@modelcontextprotocol/sdk/server/mcp.js` |
| Tool registration | Manual `setRequestHandler(ListToolsRequestSchema, ...)` | `registerAppTool()` for UI tools, keep existing for non-UI tools |
| Resource registration | Manual handler for `skill.md` only | Add `registerAppResource()` for the HTML UI |
| Tool responses | `{ content: [{ type: "text", text }] }` | Add `structuredContent` alongside `content` for UI tools |

### 2. New Dependencies

```bash
npm install @modelcontextprotocol/ext-apps zod
npm install -D vite vite-plugin-singlefile
```

### 3. New Files to Create

```
testdino-mcp/
├── server.ts              # New server entry (or modify src/index.ts)
├── vite.config.ts         # Vite config for single-file HTML build
├── mcp-app.html           # HTML entry point for the UI
├── src/
│   ├── ui/                # NEW: UI source code
│   │   ├── app.ts         # MCP App initialization + hybrid detection
│   │   ├── views/
│   │   │   ├── dashboard.ts    # Test run dashboard view
│   │   │   ├── run-detail.ts   # Single test run detail view
│   │   │   ├── failures.ts     # Failure analysis view
│   │   │   └── manual-cases.ts # Manual test cases view
│   │   └── styles/
│   │       └── app.css         # Styles with CSS variable fallbacks
│   ├── index.ts           # Existing (keep or migrate)
│   └── tools/             # Existing tools (keep as-is)
└── dist/
    └── mcp-app.html       # Built single-file HTML (output)
```

---

## Detailed Conversion Steps

### Step 1: Upgrade Server to McpServer + Register App Tools

```typescript
// server.ts (new entry point)
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAppTool, registerAppResource, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { handleListTestRuns, handleGetRunDetails, handleListTestCases, /* ... */ } from "./tools/index.js";

const server = new McpServer({ name: "@testdino/mcp", version: "2.0.0" });

const resourceUri = "ui://testdino/app.html";

// ── UI-Enabled Tool: Test Dashboard ──
registerAppTool(server, "show_test_dashboard", {
  title: "Test Run Dashboard",
  description: "Shows an interactive dashboard of test runs for a project",
  inputSchema: {
    projectId: z.string().describe("Project ID"),
    by_branch: z.string().optional().describe("Filter by branch"),
    by_time_interval: z.string().optional().describe("Time range: 1d, 3d, weekly, monthly"),
  },
  _meta: { ui: { resourceUri } },
}, async (args) => {
  // Reuse existing handler to fetch data
  const result = await handleListTestRuns(args);
  const data = JSON.parse(result.content[0].text);

  return {
    content: [{ type: "text", text: `Showing ${data.length || 0} test runs for project ${args.projectId}` }],
    structuredContent: {
      view: "dashboard",
      projectId: args.projectId,
      testruns: data,
      filters: { branch: args.by_branch, timeInterval: args.by_time_interval },
    },
  };
});

// ── UI-Enabled Tool: Test Run Detail ──
registerAppTool(server, "show_test_run", {
  title: "Test Run Details",
  description: "Shows detailed interactive view of a specific test run",
  inputSchema: {
    projectId: z.string().describe("Project ID"),
    testrun_id: z.string().optional().describe("Test run ID"),
    counter: z.number().optional().describe("Test run counter"),
  },
  _meta: { ui: { resourceUri } },
}, async (args) => {
  const result = await handleGetRunDetails(args);
  const data = JSON.parse(result.content[0].text);

  return {
    content: [{ type: "text", text: `Test run details for ${args.testrun_id || args.counter}` }],
    structuredContent: { view: "run-detail", projectId: args.projectId, runDetails: data },
  };
});

// ── UI-Enabled Tool: Failure Analysis ──
registerAppTool(server, "show_test_failures", {
  title: "Test Failure Analysis",
  description: "Shows interactive failure analysis with error patterns and debugging info",
  inputSchema: {
    projectId: z.string().describe("Project ID"),
    testcase_name: z.string().describe("Test case name to debug"),
  },
  _meta: { ui: { resourceUri } },
}, async (args) => {
  const result = await handleDebugTestCase(args);
  const data = JSON.parse(result.content[0].text);

  return {
    content: [{ type: "text", text: `Failure analysis for: ${args.testcase_name}` }],
    structuredContent: { view: "failures", projectId: args.projectId, debugData: data },
  };
});

// ── App-Only Tool: UI can call this to refresh data ──
registerAppTool(server, "fetch_testruns_for_ui", {
  description: "Fetches test run data for the UI (app-only)",
  inputSchema: {
    projectId: z.string(),
    by_branch: z.string().optional(),
    by_time_interval: z.string().optional(),
    limit: z.number().optional(),
    page: z.number().optional(),
  },
  _meta: { ui: { resourceUri, visibility: ["app"] } },
}, async (args) => {
  const result = await handleListTestRuns(args);
  const data = JSON.parse(result.content[0].text);
  return {
    content: [{ type: "text", text: JSON.stringify(data) }],
    structuredContent: { testruns: data },
  };
});

// ── Register the HTML UI Resource ──
registerAppResource(server, resourceUri, resourceUri, {
  mimeType: RESOURCE_MIME_TYPE,
  _meta: {
    ui: {
      connectDomains: ["api.testdino.com"],  // API calls from the UI
    },
  },
}, async () => {
  const html = await fs.readFile(
    path.resolve(import.meta.dirname, "dist", "mcp-app.html"),
    "utf-8",
  );
  return { contents: [{ uri: resourceUri, mimeType: RESOURCE_MIME_TYPE, text: html }] };
});

// ── Keep existing non-UI tools registered normally ──
// ... (health, list_testruns, get_run_details, etc. — register with server.tool())

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Step 2: Build Pipeline (vite.config.ts)

```typescript
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: "mcp-app.html",
    },
  },
});
```

### Step 3: HTML Entry Point (mcp-app.html)

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TestDino</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./src/ui/app.ts"></script>
</body>
</html>
```

### Step 4: UI App Code (src/ui/app.ts)

```typescript
import { App, applyDocumentTheme, applyHostStyleVariables, applyHostFonts } from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

const appEl = document.getElementById("app")!;

// ── MCP App Initialization ──
const app = new App({ name: "TestDino", version: "1.0.0" });

// Register handlers BEFORE connect()
app.ontoolresult = (result: CallToolResult) => {
  const data = result.structuredContent as Record<string, any>;
  renderView(data);
};

app.ontoolinput = (params) => {
  // Show loading state while waiting for result
  appEl.innerHTML = `<div class="loading">Loading ${params.arguments?.view || "data"}...</div>`;
};

app.onhostcontextchanged = (ctx) => {
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
  if (ctx.safeAreaInsets) {
    const { top, right, bottom, left } = ctx.safeAreaInsets;
    appEl.style.padding = `${top}px ${right}px ${bottom}px ${left}px`;
  }
};

app.onteardown = async () => ({ });

// Connect to host
app.connect();

// ── View Router ──
function renderView(data: Record<string, any>) {
  switch (data.view) {
    case "dashboard":    renderDashboard(data); break;
    case "run-detail":   renderRunDetail(data); break;
    case "failures":     renderFailures(data); break;
    default:             appEl.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
  }
}

// ── Dashboard View ──
function renderDashboard(data: any) {
  const runs = data.testruns || [];
  appEl.innerHTML = `
    <div class="dashboard">
      <h2>Test Runs — ${data.projectId}</h2>
      <div class="stats-bar">
        <span class="stat">${runs.length} runs</span>
      </div>
      <table class="runs-table">
        <thead><tr><th>Run</th><th>Branch</th><th>Status</th><th>Passed</th><th>Failed</th></tr></thead>
        <tbody>
          ${runs.map((r: any) => `
            <tr data-run-id="${r.id}">
              <td>${r.counter || r.id}</td>
              <td>${r.branch || "—"}</td>
              <td><span class="badge badge-${r.status}">${r.status}</span></td>
              <td class="passed">${r.passed ?? "—"}</td>
              <td class="failed">${r.failed ?? "—"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;

  // Click to drill into a run (calls app-only tool)
  appEl.querySelectorAll("[data-run-id]").forEach(row => {
    row.addEventListener("click", async () => {
      const runId = (row as HTMLElement).dataset.runId!;
      const result = await app.callServerTool({
        name: "fetch_testruns_for_ui",
        arguments: { projectId: data.projectId, testrun_id: runId },
      });
      if (result.structuredContent) renderView({ view: "run-detail", ...(result.structuredContent as any) });
    });
  });
}

// ── Run Detail View ──
function renderRunDetail(data: any) {
  const run = data.runDetails;
  appEl.innerHTML = `
    <div class="run-detail">
      <h2>Test Run: ${run?.counter || run?.id || "Detail"}</h2>
      <pre>${JSON.stringify(run, null, 2)}</pre>
    </div>
  `;
}

// ── Failure Analysis View ──
function renderFailures(data: any) {
  const debug = data.debugData;
  appEl.innerHTML = `
    <div class="failures">
      <h2>Failure Analysis</h2>
      <pre>${JSON.stringify(debug, null, 2)}</pre>
    </div>
  `;
}
```

### Step 5: Package Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "build:ui": "vite build",
    "build:server": "tsc",
    "build": "npm run build:ui && npm run build:server",
    "serve": "tsx server.ts",
    "dev": "tsx server.ts"
  }
}
```

---

## CSP Requirements

The UI runs in a sandboxed iframe. TestDino's API must be declared:

| CSP Type | Domain | Why |
|----------|--------|-----|
| `connectDomains` | `api.testdino.com` | All API calls from the UI go here |
| `connectDomains` | `localhost:3001` | Dev mode API (dev only) |

No `resourceDomains` or `frameDomains` needed (no external images/fonts/iframes).

---

## Migration Strategy (Recommended)

### Phase 1: Add UI tools alongside existing tools (non-breaking)
- Install new dependencies
- Create `server.ts` with `McpServer` + `registerAppTool`
- Keep all 12 existing tools registered normally via `server.tool()`
- Add 3-4 new `show_*` UI tools that reuse existing handlers
- Build and serve single-file HTML

### Phase 2: Build out rich UI views
- Dashboard with pass/fail charts, trend lines
- Test run detail with expandable test cases
- Failure analysis with error categorization
- Manual test case browser

### Phase 3: Add interactivity
- App-only tools for pagination, filtering, drill-down
- `app.callServerTool()` for in-UI data refresh
- Fullscreen mode for complex dashboards

---

## Key Decisions Needed

1. **Framework for UI**: Vanilla JS (simplest, no deps), React (richer components), or Preact (lightweight React)?
2. **Keep both entry points?** The existing `src/index.ts` can coexist with a new `server.ts`, or you can migrate `index.ts` to use `McpServer`.
3. **Which views first?** Recommend starting with the test run dashboard — highest visual impact.
4. **Dev vs Prod API URL**: The `connectDomains` CSP needs to match. Could use env vars at build time to inline the correct API URL.

---

## Testing

```bash
# 1. Build
npm run build:ui && npm run build:server

# 2. Test in basic-host
cd /tmp/mcp-ext-apps/examples/basic-host
npm install
# Point to your server
npm run start

# 3. Open http://localhost:8080, call show_test_dashboard
```

---

## Effort Estimate

| Task | Complexity |
|------|-----------|
| Server migration (McpServer + registerAppTool) | Low — mostly wiring |
| Vite + single-file build setup | Low — config only |
| Basic dashboard UI (vanilla JS) | Medium |
| Rich interactive views (charts, tables, drill-down) | Medium-High |
| App-only tools for interactivity | Low |
| Styling + host theme integration | Low |
| **Total** | **Can ship a working V1 in 1-2 days** |
