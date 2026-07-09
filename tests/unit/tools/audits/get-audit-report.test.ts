import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "fs";
import { join, relative } from "path";
import {
  mockFetchSuccess,
  restoreFetch,
  getLastFetchUrl,
  getLastFetchOptions,
} from "../../../helpers/mockFetch.js";
import { createArgs, parseToolResponse } from "../../../helpers/mockTypes.js";
import { handleGetAuditReport } from "../../../../src/tools/audits/get-audit-report.js";

describe("handleGetAuditReport", () => {
  afterEach(() => {
    restoreFetch();
  });

  it("rejects a missing action", async () => {
    await expect(handleGetAuditReport(createArgs() as never)).rejects.toThrow(
      "action is required"
    );
  });

  it("rejects an invalid action", async () => {
    await expect(
      handleGetAuditReport(createArgs({ action: "delete" }) as never)
    ).rejects.toThrow(/Invalid action/);
  });

  it("fetches audit context with branch and surfaces branchSignals", async () => {
    // Matters: `context` is the whole point of this tool split — it must
    // return branchSignals so the AI has the top failing/flaky/slow tests
    // BEFORE it starts analyzing local code.
    mockFetchSuccess({
      success: true,
      data: {
        prompt: "Audit prompt",
        branchSignals: {
          branch: "main",
          topFailingTests: [{ name: "auth.spec.ts", failures: 12 }],
          topFlakyTests: [],
          topSlowTests: [],
          recentRuns: [],
          totalRuns: 42,
        },
        lastAudit: null,
      },
    });

    const result = await handleGetAuditReport(
      createArgs({ action: "context", branch: "main" }) as never
    );

    const url = getLastFetchUrl();
    expect(url).toContain("/api/mcp/test-project-id/audit-context?branch=main");
    expect(getLastFetchOptions()?.method ?? "GET").toBe("GET");

    const parsed = parseToolResponse(result) as {
      data: { branchSignals: { topFailingTests: unknown[] } };
    };
    expect(parsed.data.branchSignals.topFailingTests).toHaveLength(1);
  });

  it("still calls audit-context when no branch is supplied", async () => {
    // Behavior test: the audit must still hit the context endpoint when the
    // caller doesn't pass a branch — CI-run configs (or any non-git cwd)
    // would otherwise 400 on every audit. We assert the endpoint URL only;
    // whether a branch got auto-detected by git is environment-dependent
    // and out of scope for this test.
    mockFetchSuccess({
      success: true,
      data: { prompt: "p", branchSignals: { branch: null }, lastAudit: null },
    });

    await handleGetAuditReport(createArgs({ action: "context" }) as never);
    expect(getLastFetchUrl()).toContain(
      "/api/mcp/test-project-id/audit-context"
    );
  });

  it("passes filter, limit, page to list", async () => {
    mockFetchSuccess({
      success: true,
      data: { reports: [], pagination: {} },
    });

    await handleGetAuditReport(
      createArgs({
        action: "list",
        branch: "main",
        limit: 10,
        page: 2,
      }) as never
    );

    const url = getLastFetchUrl();
    expect(url).toContain("/api/mcp/test-project-id/audit-reports?");
    expect(url).toContain("branch=main");
    expect(url).toContain("limit=10");
    expect(url).toContain("page=2");
  });

  it("does NOT auto-apply the detected branch to list", async () => {
    // Behavior test: list without an explicit branch must NOT inherit the
    // caller's git branch — else `list` on the audits page would silently
    // filter by whichever branch the terminal was on.
    mockFetchSuccess({ success: true, data: { reports: [] } });

    await handleGetAuditReport(createArgs({ action: "list" }) as never);

    const url = getLastFetchUrl();
    expect(url).toContain("/api/mcp/test-project-id/audit-reports");
    expect(url).not.toContain("branch=");
  });

  it("requires reportId for get", async () => {
    await expect(
      handleGetAuditReport(createArgs({ action: "get" }) as never)
    ).rejects.toThrow("reportId is required");
  });

  it("writes the markdown to a local file when writeMarkdown=true on get", async () => {
    const tempDir = mkdtempSync(join(process.cwd(), "tmp-audit-get-"));
    const outputPath = relative(process.cwd(), join(tempDir, "TEST-AUDIT.md"));

    mockFetchSuccess({
      success: true,
      data: {
        auditId: "audit_1",
        status: "completed",
        markdownReport: "# Test Audit\n\n- Score: 88/100",
      },
    });

    try {
      const result = await handleGetAuditReport(
        createArgs({
          action: "get",
          reportId: "audit_1",
          writeMarkdown: true,
          outputPath,
        }) as never
      );

      const savedContent = readFileSync(
        join(process.cwd(), outputPath),
        "utf-8"
      );
      expect(savedContent).toContain("# Test Audit");

      const parsed = parseToolResponse(result) as Record<string, unknown>;
      const localReportWrite = parsed.localReportWrite as {
        saved: boolean;
      };
      expect(localReportWrite.saved).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
