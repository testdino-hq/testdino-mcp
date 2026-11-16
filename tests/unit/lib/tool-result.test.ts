// Same actionable-error shaping as the hosted MCP (microservices tests/mcp/unit/tool-result.test.ts).
import { describe, expect, it } from "vitest";
import {
  SERVER_ERROR_HINT,
  toolResultFromCaptured,
} from "../../../src/lib/tool-result.js";

const parse = (r: { content: { text: string }[] }) =>
  JSON.parse(r.content[0].text) as Record<string, unknown>;

describe("toolResultFromCaptured — actionable errors", () => {
  it("turns an HTML gateway page into a coded error without the markup", () => {
    const r = toolResultFromCaptured(
      502,
      "<html><body>502 Bad Gateway</body></html>"
    );
    expect(r.isError).toBe(true);
    expect(r.content[0].text).not.toMatch(/<html/);
    expect(parse(r)).toMatchObject({
      statusCode: 502,
      error: {
        code: "UPSTREAM_ERROR",
        message: "TestDino could not complete the request (HTTP 502).",
      },
      hint: SERVER_ERROR_HINT,
    });
  });

  it("keeps a short plain-text error message", () => {
    expect(
      parse(toolResultFromCaptured(400, "branch is required"))
    ).toMatchObject({
      error: { code: "REQUEST_FAILED", message: "branch is required" },
    });
  });

  it("adds the retry hint to every 5xx, but not to a 4xx", () => {
    expect(
      parse(toolResultFromCaptured(502, { error: { code: "UPSTREAM_ERROR" } }))
        .hint
    ).toBe(SERVER_ERROR_HINT);
    expect(
      parse(toolResultFromCaptured(404, { error: "not found" }))
    ).not.toHaveProperty("hint");
  });
});
