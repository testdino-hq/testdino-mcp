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

  it("throws when provider is missing", async () => {
    await expect(
      handleGetExternalIssue(createArgs({ issueIds: ["JIRA-123"] }) as never)
    ).rejects.toThrow("provider is required");
  });

  it("throws when issueIds is missing or empty", async () => {
    await expect(
      handleGetExternalIssue(
        createArgs({ provider: "jira", issueIds: undefined }) as never
      )
    ).rejects.toThrow("issueIds is required");
    await expect(
      handleGetExternalIssue(
        createArgs({ provider: "jira", issueIds: [] }) as never
      )
    ).rejects.toThrow("issueIds is required");
  });

  it("calls the provider-in-path endpoint with a single issueId", async () => {
    mockFetchSuccess({ issueId: "JIRA-123", status: "open" });

    await handleGetExternalIssue(
      createArgs({ provider: "jira", issueIds: ["JIRA-123"] }) as never
    );

    const url = getLastFetchUrl();
    expect(url).toContain(
      "/api/mcp/integrations/test-project-id/jira/issues/JIRA-123"
    );
    expect(getLastFetchOptions()?.method ?? "GET").toBe("GET");
  });

  it("preserves the single-issue response shape for one ID", async () => {
    const mockData = {
      issueId: "JIRA-456",
      provider: "jira",
      status: "in_progress",
    };
    mockFetchSuccess(mockData);

    const result = await handleGetExternalIssue(
      createArgs({ provider: "jira", issueIds: ["JIRA-456"] }) as never
    );

    expect(getLastFetchOptions()?.headers).toEqual(
      expect.objectContaining({ Authorization: "Bearer test-pat-token" })
    );
    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.provider).toBe("jira");
    expect(parsed.status).toBe("in_progress");
  });

  it("aggregates multiple IDs under an `issues` array", async () => {
    mockFetchSuccess({ status: "open" });

    const result = await handleGetExternalIssue(
      createArgs({
        provider: "jira",
        issueIds: ["JIRA-1", "JIRA-2"],
      }) as never
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(Array.isArray(parsed.issues)).toBe(true);
    expect(parsed.issues).toHaveLength(2);
    expect(parsed.issues[0].issueId).toBe("JIRA-1");
    expect(parsed.issues[1].issueId).toBe("JIRA-2");
  });
});
