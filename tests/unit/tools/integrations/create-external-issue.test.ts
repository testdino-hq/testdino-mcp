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
  idempotencyKey: "testrun-abc-login-test",
  summary: "Login test failing on main",
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

  it("throws when idempotencyKey is missing", async () => {
    await expect(
      handleCreateExternalIssue(
        createArgs({ ...baseIssueArgs, idempotencyKey: undefined }) as never
      )
    ).rejects.toThrow("idempotencyKey is required");
  });

  it("throws when summary is missing", async () => {
    await expect(
      handleCreateExternalIssue(
        createArgs({ ...baseIssueArgs, summary: undefined }) as never
      )
    ).rejects.toThrow("summary is required");
  });

  it("POSTs to external-issue endpoint with required fields in body", async () => {
    mockFetchSuccess({ issueId: "JIRA-123" });

    await handleCreateExternalIssue(createArgs(baseIssueArgs) as never);

    const url = getLastFetchUrl();
    expect(url).toContain("/api/mcp/test-project-id/external-issue");
    expect(getLastFetchOptions()?.method).toBe("POST");
    const body = JSON.parse(getLastFetchOptions()?.body as string);
    expect(body.provider).toBe("jira");
    expect(body.idempotencyKey).toBe("testrun-abc-login-test");
    expect(body.summary).toBe("Login test failing on main");
  });

  it("includes optional fields when provided", async () => {
    mockFetchSuccess({ issueId: "MONDAY-456" });

    await handleCreateExternalIssue(
      createArgs({
        ...baseIssueArgs,
        provider: "monday",
        description: "Detailed description",
        source: "testrun-abc",
        linkBack: true,
        providerFields: { boardId: "123" },
      }) as never
    );

    const body = JSON.parse(getLastFetchOptions()?.body as string);
    expect(body.description).toBe("Detailed description");
    expect(body.source).toBe("testrun-abc");
    expect(body.linkBack).toBe(true);
    expect(body.providerFields.boardId).toBe("123");
  });

  it("omits optional fields when not provided", async () => {
    mockFetchSuccess({ issueId: "JIRA-789" });

    await handleCreateExternalIssue(createArgs(baseIssueArgs) as never);

    const body = JSON.parse(getLastFetchOptions()?.body as string);
    expect(body.description).toBeUndefined();
    expect(body.source).toBeUndefined();
    expect(body.linkBack).toBeUndefined();
    expect(body.providerFields).toBeUndefined();
  });

  it("sends Bearer auth and returns formatted MCP content", async () => {
    const mockData = { issueId: "JIRA-100", url: "https://jira.example.com/JIRA-100" };
    mockFetchSuccess(mockData);

    const result = await handleCreateExternalIssue(
      createArgs(baseIssueArgs) as never
    );

    expect(getLastFetchOptions()?.headers).toEqual(
      expect.objectContaining({ Authorization: "Bearer test-pat-token" })
    );
    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.issueId).toBe("JIRA-100");
  });
});
