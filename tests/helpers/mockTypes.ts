/**
 * Standard MCP tool response shape.
 */
export interface McpToolResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
}

/**
 * Extract the parsed JSON from an MCP tool response.
 */
export function parseToolResponse(response: McpToolResponse): unknown {
  return JSON.parse(response.content[0].text);
}

/**
 * Create default args with token for tool handler tests.
 */
export function createArgs(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    token: "test-pat-token",
    projectId: "test-project-id",
    ...overrides,
  };
}
