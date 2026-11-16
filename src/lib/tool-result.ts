// The hosted MCP answers every tool call with toolResultFromCaptured
// (microservices services/mcp/node/src/shared/http/errors.ts); this is a copy,
// so a call through this package returns what the hosted server returns.

export interface ToolResult {
  [key: string]: unknown;
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError: boolean;
}

// Every error the agent sees is coded and says what to do next (copied from the hosted MCP).
// Only failures that pass on their own get "try again": 500/502/503/504, never a 501 that never will.
export const SERVER_ERROR_HINT =
  "Usually temporary: try again in a moment. If it keeps failing, contact support@testdino.com.";
// A tool whose own code throws fails the same way on every retry.
export const INTERNAL_ERROR_HINT =
  "This is a problem on TestDino’s side, so the same call will likely fail again. Contact support@testdino.com.";
const TEMPORARY_STATUSES = new Set([500, 502, 503, 504]);

// Real markup, not an angle-bracket placeholder such as "Expected <runId> in path".
const HTML_PAGE = /<(?:!doctype|\?xml|\/?(?:html|head|body|title|h1|pre|div)\b)/i;

// A non-JSON error body (an HTML gateway page, a bare string) becomes a coded error, never raw markup.
function plainErrorBody(
  statusCode: number,
  body: unknown
): Record<string, unknown> {
  const raw = typeof body === "string" ? body.trim() : "";
  const usable = raw !== "" && !HTML_PAGE.test(raw);
  return {
    success: false,
    error: {
      code: statusCode >= 500 ? "UPSTREAM_ERROR" : "REQUEST_FAILED",
      message: usable
        ? raw.slice(0, 300)
        : `TestDino could not complete the request (HTTP ${statusCode}).`,
    },
  };
}

export function toolResultFromCaptured(
  statusCode: number,
  rawBody: unknown
): ToolResult {
  const isError = statusCode >= 400;
  let body = rawBody;
  if (isError && (body === null || typeof body !== "object")) {
    body = plainErrorBody(statusCode, body);
  }
  if (
    TEMPORARY_STATUSES.has(statusCode) &&
    !Array.isArray(body) &&
    !("hint" in (body as object))
  ) {
    body = { ...(body as Record<string, unknown>), hint: SERVER_ERROR_HINT };
  }
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
