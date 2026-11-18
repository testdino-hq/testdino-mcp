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

  it("drops an XML error page too", () => {
    const r = toolResultFromCaptured(
      403,
      '<?xml version="1.0"?><Error><Code>AuthenticationFailed</Code></Error>'
    );
    expect(r.content[0].text).not.toMatch(/<\?xml|AuthenticationFailed/);
    expect(parse(r)).toMatchObject({ error: { code: "REQUEST_FAILED" } });
  });

  it("keeps a short plain-text error message", () => {
    expect(
      parse(toolResultFromCaptured(400, "branch is required"))
    ).toMatchObject({
      error: { code: "REQUEST_FAILED", message: "branch is required" },
    });
  });

  it("adds the retry hint to 500/502/503/504, not to a 4xx", () => {
    for (const status of [500, 502, 503, 504]) {
      expect(
        parse(
          toolResultFromCaptured(status, { error: { code: "UPSTREAM_ERROR" } })
        ).hint,
        String(status)
      ).toBe(SERVER_ERROR_HINT);
    }
    expect(
      parse(toolResultFromCaptured(404, { error: "not found" }))
    ).not.toHaveProperty("hint");
  });

  // The create tools send no Idempotency-Key, so a blind retry can create twice.
  it("the retry hint tells the agent to check a write went through first", () => {
    expect(SERVER_ERROR_HINT).toMatch(/first check whether it went through/);
  });
});

describe("toolResultFromCaptured — review fixes", () => {
  it("keeps a message that only has an angle-bracket placeholder", () => {
    const r = toolResultFromCaptured(400, "Expected <runId> in path");
    expect(parse(r)).toMatchObject({
      error: { message: "Expected <runId> in path" },
    });
  });

  it("gives no retry hint to a 501", () => {
    expect(
      parse(toolResultFromCaptured(501, { error: { code: "NOT_IMPLEMENTED" } }))
    ).not.toHaveProperty("hint");
  });
});
