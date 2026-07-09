import { describe, it, expect, afterEach } from "vitest";
import {
  mockFetchSuccess,
  restoreFetch,
  getLastFetchUrl,
  getLastFetchOptions,
} from "../../../helpers/mockFetch.js";
import { createArgs, parseToolResponse } from "../../../helpers/mockTypes.js";
import { handleConnectIntegration } from "../../../../src/tools/integrations/connect-integration.js";

describe("handleConnectIntegration", () => {
  afterEach(() => {
    restoreFetch();
  });

  it("rejects an unsupported provider", async () => {
    await expect(
      handleConnectIntegration(
        createArgs({ provider: "trello" }) as never
      )
    ).rejects.toThrow(/provider must be one of/);
  });

  it("POSTs to the connect endpoint with the orgId in the body", async () => {
    // Behavior test: orgId reaches the stdio backend via the request body,
    // NOT the URL. A silent regression (e.g. putting it in the query string)
    // would break multi-org PAT users — the backend would fall back to the
    // scope inference and pick the wrong org.
    mockFetchSuccess({
      success: true,
      connectUrl: "https://api.testdino.com/oauth/jira/start?state=abc",
    });

    await handleConnectIntegration(
      createArgs({ provider: "jira", orgId: "org_multi" }) as never
    );

    const url = getLastFetchUrl();
    expect(url).toContain("/api/mcp/integrations/test-project-id/jira/connect");
    expect(url).not.toContain("orgId=");

    const options = getLastFetchOptions();
    expect(options?.method).toBe("POST");
    const body = JSON.parse(String(options?.body));
    expect(body.orgId).toBe("org_multi");
  });

  it("omits orgId when not supplied (backend infers from PAT scope)", async () => {
    mockFetchSuccess({
      success: true,
      connectUrl: "https://api.testdino.com/oauth/linear/start?state=xyz",
    });

    await handleConnectIntegration(
      createArgs({ provider: "linear" }) as never
    );

    const body = JSON.parse(String(getLastFetchOptions()?.body));
    expect(body.orgId).toBeUndefined();
  });

  it("returns the already_connected short-circuit shape when the backend says so", async () => {
    mockFetchSuccess({
      success: true,
      provider: "jira",
      connected: true,
      status: "already_connected",
    });

    const result = await handleConnectIntegration(
      createArgs({ provider: "jira" }) as never
    );

    const parsed = parseToolResponse(result) as {
      status: string;
      connected: boolean;
    };
    expect(parsed.status).toBe("already_connected");
    expect(parsed.connected).toBe(true);
  });
});
