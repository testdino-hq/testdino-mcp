import { describe, it, expect, afterEach } from "vitest";
import {
  mockFetchSuccess,
  restoreFetch,
  getLastFetchUrl,
  getLastFetchOptions,
} from "../../../helpers/mockFetch.js";
import { createArgs, parseToolResponse } from "../../../helpers/mockTypes.js";
import { handleGetExternalIssue } from "../../../../src/tools/integrations/get-external-issue.js";

describe("handleGetExternalIssue", () => {
  afterEach(() => {
    restoreFetch();
  });

  it("rejects a missing issueId", async () => {
    await expect(
      handleGetExternalIssue(
        createArgs({ provider: "jira", issueId: "" }) as never
      )
    ).rejects.toThrow(/issueId is required/);
  });

  it("rejects an unsupported provider", async () => {
    await expect(
      handleGetExternalIssue(
        createArgs({ provider: "trello", issueId: "T-1" }) as never
      )
    ).rejects.toThrow(/provider must be one of/);
  });

  it("hits the single-issue GET endpoint with the encoded issueId", async () => {
    // The npm client only supports one issueId per call — the stdio backend
    // route is /:issueId, not a batch endpoint (divergence from streaming).
    // The URL must URL-encode the ID so Jira keys with `/` or spaces don't
    // corrupt the path.
    mockFetchSuccess({
      success: true,
      issue: { key: "TRX-17", summary: "…" },
    });

    await handleGetExternalIssue(
      createArgs({ provider: "jira", issueId: "TRX-17" }) as never
    );

    const url = getLastFetchUrl();
    expect(url).toContain(
      "/api/mcp/integrations/test-project-id/jira/issues/TRX-17"
    );
    expect(getLastFetchOptions()?.method ?? "GET").toBe("GET");
  });

  it("appends defaultApp as a query param for Jira multi-site accounts", async () => {
    mockFetchSuccess({
      success: true,
      issue: { key: "TRX-17" },
    });

    await handleGetExternalIssue(
      createArgs({
        provider: "jira",
        issueId: "TRX-17",
        defaultApp: "acme.atlassian.net",
      }) as never
    );

    const url = getLastFetchUrl();
    expect(url).toContain("defaultApp=acme.atlassian.net");
  });

  it("returns the response body verbatim", async () => {
    mockFetchSuccess({
      success: true,
      issue: { key: "TRX-17", status: "In Progress" },
    });

    const result = await handleGetExternalIssue(
      createArgs({ provider: "jira", issueId: "TRX-17" }) as never
    );

    const parsed = parseToolResponse(result) as {
      issue: { key: string; status: string };
    };
    expect(parsed.issue.key).toBe("TRX-17");
    expect(parsed.issue.status).toBe("In Progress");
  });
});
