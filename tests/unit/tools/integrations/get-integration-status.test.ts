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

  it("calls integration-status endpoint without provider filter when omitted", async () => {
    mockFetchSuccess({ integrations: [] });

    await handleGetIntegrationStatus(createArgs() as never);

    const url = getLastFetchUrl();
    expect(url).toContain("/api/mcp/test-project-id/integration-status");
    expect(url).not.toContain("provider=");
    expect(getLastFetchOptions()?.method ?? "GET").toBe("GET");
  });

  it("passes provider as query param when supplied", async () => {
    mockFetchSuccess({ connected: true });

    await handleGetIntegrationStatus(
      createArgs({ provider: "jira" }) as never
    );

    expect(getLastFetchUrl()).toContain("provider=jira");
  });

  it("passes monday provider correctly", async () => {
    mockFetchSuccess({ connected: false });

    await handleGetIntegrationStatus(
      createArgs({ provider: "monday" }) as never
    );

    expect(getLastFetchUrl()).toContain("provider=monday");
  });

  it("sends Bearer auth and returns formatted MCP content", async () => {
    const mockData = { integrations: [{ provider: "jira", connected: true }] };
    mockFetchSuccess(mockData);

    const result = await handleGetIntegrationStatus(createArgs() as never);

    expect(getLastFetchOptions()?.headers).toEqual(
      expect.objectContaining({ Authorization: "Bearer test-pat-token" })
    );
    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.integrations[0].provider).toBe("jira");
    expect(parsed.integrations[0].connected).toBe(true);
  });
});
