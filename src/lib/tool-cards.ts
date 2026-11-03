/**
 * The card resources of the hosted MCP's tool cards (services/mcp/node CARD_TOOLS). Each tool's
 * definition names its card in its copied _meta; the card HTML is fetched from the hosted MCP.
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

export function toolCardUri(tool: string): string {
  return `ui://testdino/tool/${tool}/v1`;
}

export const toolCardResources = CARD_TOOLS.map((tool) => ({
  name: `testdino_${tool}_view`,
  title: `TestDino ${tool} card`,
  uri: toolCardUri(tool),
  description: `Card view of the ${tool} tool's answer.`,
  mimeType: "text/html;profile=mcp-app",
  _meta: { ui: { csp: {}, prefersBorder: false } },
}));
