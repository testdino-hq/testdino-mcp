import { describe, it, expect, afterEach } from "vitest";
import {
  mockFetchSuccess,
  restoreFetch,
  getLastFetchUrl,
  getLastFetchOptions,
} from "../../../helpers/mockFetch.js";
import { createArgs, parseToolResponse } from "../../../helpers/mockTypes.js";
import { handleGetIntegrationStatus } from "../../../../src/tools/integrations/get-integration-status.js";

describe("handleGetIntegrationStatus", () => {
  afterEach(() => {
    restoreFetch();
  });

  it("rejects an unsupported provider", async () => {
    // Behavior test: the client validates the enum BEFORE hitting the network
    // so the AI gets a sharp error instead of a 400 from the backend.
    await expect(
      handleGetIntegrationStatus(
        createArgs({ provider: "trello" }) as never
      )
    ).rejects.toThrow(/provider must be one of/);
  });

  it("hits the status endpoint for a valid provider", async () => {
    mockFetchSuccess({
      success: true,
      integrations: { jira: { connected: true } },
    });

    await handleGetIntegrationStatus(
      createArgs({ provider: "jira" }) as never
    );

    const url = getLastFetchUrl();
    expect(url).toContain("/api/mcp/integrations/test-project-id/jira/status");
    expect(getLastFetchOptions()?.method ?? "GET").toBe("GET");
    expect(getLastFetchOptions()?.headers).toEqual(
      expect.objectContaining({ Authorization: "Bearer test-pat-token" })
    );
  });

  it("flattens target values into query params", async () => {
    // The stdio backend treats every query param other than
    // includeCreateOptions as part of the provider `target`. If the client
    // forgot to flatten, the AI could pass structured target but the backend
    // would silently ignore it and fail to resolve provider projects.
    mockFetchSuccess({
      success: true,
      integrations: { jira: { connected: true } },
      createOptions: { requiredFields: [] },
    });

    await handleGetIntegrationStatus(
      createArgs({
        provider: "jira",
        includeCreateOptions: true,
        target: { jiraProjectKey: "TRX", issueType: "Bug" },
      }) as never
    );

    const url = getLastFetchUrl();
    expect(url).toContain("includeCreateOptions=true");
    expect(url).toContain("jiraProjectKey=TRX");
    expect(url).toContain("issueType=Bug");
  });

  it("returns the response body verbatim", async () => {
    mockFetchSuccess({
      success: true,
      integrations: { linear: { connected: false } },
    });

    const result = await handleGetIntegrationStatus(
      createArgs({ provider: "linear" }) as never
    );

    const parsed = parseToolResponse(result) as {
      integrations: { linear: { connected: boolean } };
    };
    expect(parsed.integrations.linear.connected).toBe(false);
  });
});
