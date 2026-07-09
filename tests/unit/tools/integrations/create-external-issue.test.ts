import { describe, it, expect, afterEach } from "vitest";
import {
  mockFetchSuccess,
  restoreFetch,
  getLastFetchUrl,
  getLastFetchOptions,
} from "../../../helpers/mockFetch.js";
import { createArgs, parseToolResponse } from "../../../helpers/mockTypes.js";
import { handleCreateExternalIssue } from "../../../../src/tools/integrations/create-external-issue.js";

describe("handleCreateExternalIssue", () => {
  afterEach(() => {
    restoreFetch();
  });

  it("rejects an unsupported provider", async () => {
    await expect(
      handleCreateExternalIssue(
        createArgs({
          provider: "notion",
          source: { type: "test_case", id: "TC-1" },
        }) as never
      )
    ).rejects.toThrow(/provider must be one of/);
  });

  it("rejects an unsupported source.type", async () => {
    // Guards against an AI hallucinating a source type. The backend would
    // 400, but the client-side rejection saves a round-trip and gives a
    // clearer message.
    await expect(
      handleCreateExternalIssue(
        createArgs({
          provider: "jira",
          source: { type: "audit_report", id: "AR-1" },
        }) as never
      )
    ).rejects.toThrow(/source.type 'audit_report' is invalid/);
  });

  it("rejects a missing source.id", async () => {
    await expect(
      handleCreateExternalIssue(
        createArgs({
          provider: "jira",
          source: { type: "test_case" },
        }) as never
      )
    ).rejects.toThrow(/source.id is required/);
  });

  it("POSTs the full draft to the issues endpoint", async () => {
    mockFetchSuccess({
      success: true,
      issue: { key: "TRX-42", url: "https://example.atlassian.net/browse/TRX-42" },
    });

    await handleCreateExternalIssue(
      createArgs({
        provider: "jira",
        source: { type: "test_case", id: "TC-1", runId: "tr_abc" },
        summary: "Login fails",
        description: "Steps to reproduce…",
        target: { jiraProjectKey: "TRX", issueType: "Bug" },
        linkBack: true,
        idempotencyKey: "run_tr_abc_tc1",
      }) as never
    );

    const url = getLastFetchUrl();
    expect(url).toContain(
      "/api/mcp/integrations/test-project-id/jira/issues"
    );

    const options = getLastFetchOptions();
    expect(options?.method).toBe("POST");
    const body = JSON.parse(String(options?.body));

    expect(body.source).toEqual({
      type: "test_case",
      id: "TC-1",
      runId: "tr_abc",
    });
    expect(body.summary).toBe("Login fails");
    expect(body.description).toBe("Steps to reproduce…");
    expect(body.target.jiraProjectKey).toBe("TRX");
    expect(body.linkBack).toBe(true);
    expect(body.idempotencyKey).toBe("run_tr_abc_tc1");
  });

  it("passes preview=true to the backend", async () => {
    // Behavior test: preview must reach the backend so it returns a draft
    // instead of committing. Silent drop would file real issues when the
    // AI expected a dry-run.
    mockFetchSuccess({
      success: true,
      preview: true,
      wouldCreate: false,
      draft: {},
    });

    await handleCreateExternalIssue(
      createArgs({
        provider: "linear",
        source: { type: "test_run", id: "tr_1" },
        preview: true,
      }) as never
    );

    const body = JSON.parse(String(getLastFetchOptions()?.body));
    expect(body.preview).toBe(true);
  });

  it("returns the response body verbatim", async () => {
    mockFetchSuccess({
      success: true,
      issue: { key: "TRX-99" },
      linkBack: { success: true },
    });

    const result = await handleCreateExternalIssue(
      createArgs({
        provider: "jira",
        source: { type: "session", id: "s_1" },
        target: { jiraProjectKey: "TRX", issueType: "Task" },
      }) as never
    );

    const parsed = parseToolResponse(result) as {
      issue: { key: string };
    };
    expect(parsed.issue.key).toBe("TRX-99");
  });
});
