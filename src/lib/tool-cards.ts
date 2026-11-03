/**
 * MCP Apps tool cards: the tools whose answer the hosted MCP draws as a card. Same list, URIs,
 * names and _meta as the hosted server (services/mcp/node CARD_TOOLS); the catalogue parity
 * test fails when they drift. The card HTML itself is fetched from the hosted MCP.
 */
export const CARD_TOOLS = [
  "health",
  "list_testruns",
  "list_testcase",
  "get_run_details",
  "get_run_error_clusters",
  "get_testcase_details",
  "get_flake_verdict",
  "get_rerun_selection",
  "get_ai_insights",
  "rerun_test",
] as const;

const CARD_TOOL_SET = new Set<string>(CARD_TOOLS);

export function toolCardUri(tool: string): string {
  return `ui://testdino/tool/${tool}/v1`;
}

/** A tool definition with its card named, exactly as the hosted tools/list shows it. */
export function withToolCard<T extends { name: string }>(tool: T): T {
  if (!CARD_TOOL_SET.has(tool.name)) return tool;
  const uri = toolCardUri(tool.name);
  return {
    ...tool,
    _meta: { ui: { resourceUri: uri }, "ui/resourceUri": uri },
  };
}

export const toolCardResources = CARD_TOOLS.map((tool) => ({
  name: `testdino_${tool}_view`,
  title: `TestDino ${tool} card`,
  uri: toolCardUri(tool),
  description: `Card view of the ${tool} tool's answer.`,
  mimeType: "text/html;profile=mcp-app",
  _meta: { ui: { csp: {}, prefersBorder: false } },
}));
