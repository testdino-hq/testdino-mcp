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

  it("should throw when action is missing", async () => {
    await expect(handleGetAuditReport(createArgs() as never)).rejects.toThrow(
      "action is required"
    );
  });

  it("should reject an invalid action", async () => {
    await expect(
      handleGetAuditReport(createArgs({ action: "submit" }) as never)
    ).rejects.toThrow("Invalid action 'submit'");
  });

  it("should require reportId for get", async () => {
    await expect(
      handleGetAuditReport(
        createArgs({
          action: "get",
          reportId: undefined,
        }) as never
      )
    ).rejects.toThrow("reportId is required for get action");
  });

  it("should fetch audit context for action=context", async () => {
    mockFetchSuccess({
      success: true,
      data: {
        prompt: "Audit prompt",
        branchSignals: {
          branch: "main",
        },
        lastAudit: null,
      },
    });

    const result = await handleGetAuditReport(
      createArgs({
        action: "context",
        branch: "main",
      }) as never
    );

    const url = getLastFetchUrl();
    expect(url).toContain("/api/mcp/test-project-id/audit-context?branch=main");

    const options = getLastFetchOptions();
    expect(options?.method ?? "GET").toBe("GET");
    expect(options?.headers).toEqual(
      expect.objectContaining({ Authorization: "Bearer test-pat-token" })
    );

    const parsed = parseToolResponse(result);
    expect(parsed).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          prompt: "Audit prompt",
        }),
      })
    );
  });

  it("should call GET list endpoint for list", async () => {
    mockFetchSuccess({
      success: true,
      data: {
        reports: [],
        pagination: {
          page: 2,
          limit: 10,
          total: 0,
          totalPages: 1,
        },
      },
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

    const options = getLastFetchOptions();
    expect(options?.method ?? "GET").toBe("GET");
  });

  it("should not auto-apply the detected git branch to list", async () => {
    mockFetchSuccess({
      success: true,
      data: {
        reports: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 1,
        },
      },
    });

    await handleGetAuditReport(
      createArgs({
        action: "list",
      }) as never
    );

    const url = getLastFetchUrl();
    expect(url).toContain("/api/mcp/test-project-id/audit-reports");
    expect(url).not.toContain("branch=");
  });

  it("should get a saved report and write markdown locally when requested", async () => {
    const tempDir = mkdtempSync(join(process.cwd(), "tmp-get-audit-"));
    const outputPath = relative(process.cwd(), join(tempDir, "TEST-AUDIT.md"));

    mockFetchSuccess({
      success: true,
      data: {
        auditId: "guided_audit_4",
        status: "completed",
        markdownReport: "# Test Audit\n\n- Score: 88/100",
      },
    });

    try {
      const result = await handleGetAuditReport(
        createArgs({
          action: "get",
          reportId: "guided_audit_4",
          writeMarkdown: true,
          outputPath,
        }) as never
      );

      const savedPath = join(process.cwd(), outputPath);
      const savedContent = readFileSync(savedPath, "utf-8");
      expect(savedContent).toContain("# Test Audit");

      const url = getLastFetchUrl();
      expect(url).toContain(
        "/api/mcp/test-project-id/audit-reports/guided_audit_4"
      );

      const parsed = parseToolResponse(result) as Record<string, unknown>;
      const localReportWrite = parsed.localReportWrite as Record<
        string,
        unknown
      >;
      expect(localReportWrite.saved).toBe(true);
      expect(localReportWrite.path).toBe(savedPath);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
