// The hosted MCP answers every tool call with toolResultFromCaptured
// (microservices services/mcp/node/src/shared/http/errors.ts); this is a copy,
// so a call through this package returns what the hosted server returns.

export interface ToolResult {
  [key: string]: unknown;
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError: boolean;
}

export function toolResultFromCaptured(
  statusCode: number,
  body: unknown
): ToolResult {
  const isError = statusCode >= 400;
  const isObject = body !== null && typeof body === "object";

  if (isObject) {
    // The MCP envelope has no status field; without it an agent cannot tell a terminal 4xx from a transient failure.
    const shaped =
      isError && !Array.isArray(body)
        ? { statusCode, ...(body as Record<string, unknown>) }
        : body;
    return {
      content: [{ type: "text", text: JSON.stringify(shaped) }],
      structuredContent: shaped as Record<string, unknown>,
      isError,
    };
  }

  let text: string;
  switch (typeof body) {
    case "string":
      text = body;
      break;
    case "number":
    case "boolean":
      text = String(body);
      break;
    default:
      text = "";
  }
  return {
    content: [{ type: "text", text }],
    isError,
  };
}
