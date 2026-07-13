import { describe, it, expect, afterEach } from "vitest";
import {
  mockFetchSuccess,
  restoreFetch,
  getLastFetchUrl,
  getLastFetchOptions,
} from "../../../helpers/mockFetch.js";
import { createArgs } from "../../../helpers/mockTypes.js";
import { handleConnectIntegration } from "../../../../src/tools/integrations/connect-integration.js";

describe("handleConnectIntegration", () => {
  afterEach(() => {
    restoreFetch();
    delete process.env.TESTDINO_PAT;
  });

  it("throws when args are undefined", async () => {
    process.env.TESTDINO_PAT = "test-pat";
    await expect(handleConnectIntegration(undefined)).rejects.toThrow(
      "projectId is required"
    );
  });

  it("throws when provider is missing", async () => {
    await expect(
      handleConnectIntegration(
        createArgs({ provider: undefined }) as never
      )
    ).rejects.toThrow("provider is required");
  });

  it("POSTs to the connect-url endpoint with provider in body", async () => {
    mockFetchSuccess({ connectUrl: "https://jira.example.com/oauth" });

    await handleConnectIntegration(
      createArgs({ provider: "jira" }) as never
    );

    const url = getLastFetchUrl();
    expect(url).toContain(
      "/api/mcp/test-project-id/integration/connect-url"
    );
    expect(getLastFetchOptions()?.method).toBe("POST");
    const body = JSON.parse(getLastFetchOptions()?.body as string);
    expect(body.provider).toBe("jira");
  });

  it("supports monday provider", async () => {
    mockFetchSuccess({ connectUrl: "https://monday.example.com/oauth" });

    await handleConnectIntegration(
      createArgs({ provider: "monday" }) as never
    );

    const body = JSON.parse(getLastFetchOptions()?.body as string);
    expect(body.provider).toBe("monday");
  });

  it("sends Bearer auth and returns MCP content with the connect URL", async () => {
    const mockData = { connectUrl: "https://jira.example.com/oauth?state=abc" };
    mockFetchSuccess(mockData);

    const result = await handleConnectIntegration(
      createArgs({ provider: "jira" }) as never
    );

    expect(getLastFetchOptions()?.headers).toEqual(
      expect.objectContaining({ Authorization: "Bearer test-pat-token" })
    );
    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.connectUrl).toContain("oauth");
  });
});
