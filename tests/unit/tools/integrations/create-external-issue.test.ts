import { describe, it, expect, afterEach } from "vitest";
import {
  mockFetchSuccess,
  restoreFetch,
  getLastFetchUrl,
  getLastFetchOptions,
} from "../../../helpers/mockFetch.js";
import { createArgs } from "../../../helpers/mockTypes.js";
import { handleCreateExternalIssue } from "../../../../src/tools/integrations/create-external-issue.js";

const baseIssueArgs = {
  provider: "jira",
  source: { type: "manual_test_case", id: "tc_123" },
};

describe("handleCreateExternalIssue", () => {
  afterEach(() => {
    restoreFetch();
    delete process.env.TESTDINO_PAT;
  });

  it("throws when args are undefined", async () => {
    process.env.TESTDINO_PAT = "test-pat";
    await expect(handleCreateExternalIssue(undefined)).rejects.toThrow(
      "projectId is required"
    );
  });

  it("throws when provider is missing", async () => {
    await expect(
      handleCreateExternalIssue(
        createArgs({ ...baseIssueArgs, provider: undefined }) as never
      )
    ).rejects.toThrow("provider is required");
  });

  it("throws when source is missing", async () => {
    await expect(
      handleCreateExternalIssue(
        createArgs({ ...baseIssueArgs, source: undefined }) as never
      )
    ).rejects.toThrow("source.type and source.id are required");
  });

  it("throws when source.id is missing", async () => {
    await expect(
      handleCreateExternalIssue(
        createArgs({
          ...baseIssueArgs,
          source: { type: "manual_test_case" },
        }) as never
      )
    ).rejects.toThrow("source.type and source.id are required");
  });

  it("POSTs to the provider-in-path issues endpoint with source in body", async () => {
    mockFetchSuccess({ success: true, issue: { key: "JIRA-123" } });

    await handleCreateExternalIssue(createArgs(baseIssueArgs) as never);

    const url = getLastFetchUrl();
    expect(url).toContain("/api/mcp/integrations/test-project-id/jira/issues");
    expect(getLastFetchOptions()?.method).toBe("POST");
    const body = JSON.parse(getLastFetchOptions()?.body as string);
    expect(body.source).toEqual({ type: "manual_test_case", id: "tc_123" });
    // provider travels in the path, not the body
    expect(body.provider).toBeUndefined();
  });

  it("includes optional fields when provided", async () => {
    mockFetchSuccess({ success: true, issue: { id: "MONDAY-456" } });

    await handleCreateExternalIssue(
      createArgs({
        ...baseIssueArgs,
        provider: "monday",
        summary: "Login test failing on main",
        description: "Detailed description",
        target: { boardId: "123" },
        linkBack: true,
        idempotencyKey: "testrun-abc-login-test",
        preview: true,
      }) as never
    );

    const url = getLastFetchUrl();
    expect(url).toContain(
      "/api/mcp/integrations/test-project-id/monday/issues"
    );
    const body = JSON.parse(getLastFetchOptions()?.body as string);
    expect(body.summary).toBe("Login test failing on main");
    expect(body.description).toBe("Detailed description");
    expect(body.target.boardId).toBe("123");
    expect(body.linkBack).toBe(true);
    expect(body.idempotencyKey).toBe("testrun-abc-login-test");
    expect(body.preview).toBe(true);
  });

  it("omits optional fields when not provided", async () => {
    mockFetchSuccess({ success: true, issue: { key: "JIRA-789" } });

    await handleCreateExternalIssue(createArgs(baseIssueArgs) as never);

    const body = JSON.parse(getLastFetchOptions()?.body as string);
    expect(body.summary).toBeUndefined();
    expect(body.description).toBeUndefined();
    expect(body.target).toBeUndefined();
    expect(body.linkBack).toBeUndefined();
    expect(body.idempotencyKey).toBeUndefined();
    expect(body.preview).toBeUndefined();
  });

  it("sends Bearer auth and returns formatted MCP content", async () => {
    const mockData = {
      success: true,
      issue: { key: "JIRA-100", url: "https://jira.example.com/JIRA-100" },
    };
    mockFetchSuccess(mockData);

    const result = await handleCreateExternalIssue(
      createArgs(baseIssueArgs) as never
    );

    expect(getLastFetchOptions()?.headers).toEqual(
      expect.objectContaining({ Authorization: "Bearer test-pat-token" })
    );
    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.issue.key).toBe("JIRA-100");
  });
});
