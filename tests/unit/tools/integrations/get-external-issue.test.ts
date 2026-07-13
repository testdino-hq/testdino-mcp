import { describe, it, expect, afterEach } from "vitest";
import {
  mockFetchSuccess,
  restoreFetch,
  getLastFetchUrl,
  getLastFetchOptions,
} from "../../../helpers/mockFetch.js";
import { createArgs } from "../../../helpers/mockTypes.js";
import { handleGetExternalIssue } from "../../../../src/tools/integrations/get-external-issue.js";

describe("handleGetExternalIssue", () => {
  afterEach(() => {
    restoreFetch();
    delete process.env.TESTDINO_PAT;
  });

  it("throws when args are undefined", async () => {
    process.env.TESTDINO_PAT = "test-pat";
    await expect(handleGetExternalIssue(undefined)).rejects.toThrow(
      "projectId is required"
    );
  });

  it("throws when issueId is missing", async () => {
    await expect(
      handleGetExternalIssue(
        createArgs({ issueId: undefined }) as never
      )
    ).rejects.toThrow("issueId is required");
  });

  it("calls the correct endpoint with issueId in path", async () => {
    mockFetchSuccess({ issueId: "JIRA-123", status: "open" });

    await handleGetExternalIssue(
      createArgs({ issueId: "JIRA-123" }) as never
    );

    const url = getLastFetchUrl();
    expect(url).toContain(
      "/api/mcp/test-project-id/external-issue/JIRA-123"
    );
    expect(getLastFetchOptions()?.method ?? "GET").toBe("GET");
  });

  it("encodes issueId correctly in the path", async () => {
    mockFetchSuccess({ issueId: "ext_456" });

    await handleGetExternalIssue(
      createArgs({ issueId: "ext_456" }) as never
    );

    expect(getLastFetchUrl()).toContain("/external-issue/ext_456");
  });

  it("sends Bearer auth and returns formatted MCP content", async () => {
    const mockData = {
      issueId: "JIRA-456",
      provider: "jira",
      status: "in_progress",
    };
    mockFetchSuccess(mockData);

    const result = await handleGetExternalIssue(
      createArgs({ issueId: "JIRA-456" }) as never
    );

    expect(getLastFetchOptions()?.headers).toEqual(
      expect.objectContaining({ Authorization: "Bearer test-pat-token" })
    );
    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.provider).toBe("jira");
    expect(parsed.status).toBe("in_progress");
  });
});
