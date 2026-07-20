import { describe, it, expect, afterEach } from "vitest";
import {
  mockFetchSuccess,
  restoreFetch,
  getLastFetchUrl,
  getLastFetchOptions,
} from "../../../helpers/mockFetch.js";
import { createArgs } from "../../../helpers/mockTypes.js";
import { handleGetIntegrationStatus } from "../../../../src/tools/integrations/get-integration-status.js";

describe("handleGetIntegrationStatus", () => {
  afterEach(() => {
    restoreFetch();
    delete process.env.TESTDINO_PAT;
  });

  it("throws when args are undefined", async () => {
    process.env.TESTDINO_PAT = "test-pat";
    await expect(handleGetIntegrationStatus(undefined)).rejects.toThrow(
      "projectId is required"
    );
  });

  it("throws when provider is missing", async () => {
    await expect(
      handleGetIntegrationStatus(createArgs() as never)
    ).rejects.toThrow("provider is required");
  });

  it("calls the provider-in-path status endpoint", async () => {
    mockFetchSuccess({ connected: true });

    await handleGetIntegrationStatus(createArgs({ provider: "jira" }) as never);

    const url = getLastFetchUrl();
    expect(url).toContain("/api/mcp/integrations/test-project-id/jira/status");
    expect(getLastFetchOptions()?.method ?? "GET").toBe("GET");
  });

  it("passes includeCreateOptions as a query param when supplied", async () => {
    mockFetchSuccess({ connected: true, createOptions: {} });

    await handleGetIntegrationStatus(
      createArgs({ provider: "monday", includeCreateOptions: true }) as never
    );

    const url = getLastFetchUrl();
    expect(url).toContain(
      "/api/mcp/integrations/test-project-id/monday/status"
    );
    expect(url).toContain("includeCreateOptions=true");
  });

  it("sends Bearer auth and returns formatted MCP content", async () => {
    const mockData = { provider: "jira", connected: true };
    mockFetchSuccess(mockData);

    const result = await handleGetIntegrationStatus(
      createArgs({ provider: "jira" }) as never
    );

    expect(getLastFetchOptions()?.headers).toEqual(
      expect.objectContaining({ Authorization: "Bearer test-pat-token" })
    );
    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.provider).toBe("jira");
    expect(parsed.connected).toBe(true);
  });
});
