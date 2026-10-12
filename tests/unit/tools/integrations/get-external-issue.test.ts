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

  it("asks for every id in one lookup call, as the hosted tool does", async () => {
    mockFetchSuccess({ issues: [] });

    await handleGetExternalIssue(
      createArgs({
        provider: "jira",
        issueIds: ["JIRA-1", "JIRA-2"],
        target: { defaultApp: "a" },
      }) as never
    );

    expect(getLastFetchUrl()).toContain(
      "/api/mcp/integrations/test-project-id/jira/issues/lookup"
    );
    expect(getLastFetchOptions()?.method).toBe("POST");
    expect(JSON.parse(getLastFetchOptions()?.body as string)).toEqual({
      issueIds: ["JIRA-1", "JIRA-2"],
      target: { defaultApp: "a" },
    });
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
});
