import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { join, relative } from "path";
import {
  mockFetchSuccess,
  restoreFetch,
  getLastFetchUrl,
  getLastFetchOptions,
} from "../../../helpers/mockFetch.js";
import { createArgs, parseToolResponse } from "../../../helpers/mockTypes.js";
import { handleTestAudit } from "../../../../src/tools/audits/test-audit.js";

describe("handleTestAudit", () => {
  afterEach(() => {
    restoreFetch();
  });

  it("should throw when action is missing", async () => {
    await expect(handleTestAudit(createArgs() as never)).rejects.toThrow(
      "action is required"
    );
  });

  it("should require reportId for get", async () => {
    await expect(
      handleTestAudit(
        createArgs({
          action: "get",
          reportId: undefined,
        }) as never
      )
    ).rejects.toThrow("reportId is required for get action");
  });

  it("should fetch audit context for analyze", async () => {
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

    const result = await handleTestAudit(
      createArgs({
        action: "analyze",
        branch: "main",
      }) as never
    );

    const url = getLastFetchUrl();
    expect(url).toContain("/api/mcp/test-project-id/audit-context?branch=main");

    const options = getLastFetchOptions();
    expect(options?.method).toBe("GET");
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

  it("should submit a completed audit report through analyze", async () => {
    mockFetchSuccess({
      success: true,
      data: {
        auditId: "guided_audit_22",
        score: 88,
      },
    });

    const result = await handleTestAudit(
      createArgs({
        action: "analyze",
        branch: "main",
        scope: "suite",
        target: { specPath: "tests/auth.spec.ts" },
        score: 88,
        findings: [
          {
            title: "Shallow assertions",
            category: "surface_level_tests",
            severity: "high",
          },
        ],
        recommendations: ["Expand post-action assertions"],
        markdownReport: "# Test Audit\n\n- Score: 88/100",
      }) as never
    );

    const url = getLastFetchUrl();
    expect(url).toContain("/api/mcp/test-project-id/audit-report");

    const options = getLastFetchOptions();
    expect(options?.method).toBe("POST");

    const body = JSON.parse(String(options?.body));
    expect(body.branch).toBe("main");
    expect(body.scope).toBe("suite");
    expect(body.target.specPath).toBe("tests/auth.spec.ts");
    expect(body.score).toBe(88);
    expect(body.findings).toHaveLength(1);
    expect(body.findings[0].category).toBe("surface_level_tests");
    expect(body.recommendations).toEqual(["Expand post-action assertions"]);
    expect(body.markdownReport).toContain("# Test Audit");

    const parsed = parseToolResponse(result);
    expect(parsed).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          auditId: "guided_audit_22",
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

    await handleTestAudit(
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

    await handleTestAudit(
      createArgs({
        action: "list",
      }) as never
    );

    const url = getLastFetchUrl();
    expect(url).toContain("/api/mcp/test-project-id/audit-reports");
    expect(url).not.toContain("branch=");
  });

  it("should read markdownReportPath from a relative file when submitting", async () => {
    const tempDir = mkdtempSync(join(process.cwd(), "tmp-test-audit-"));
    const reportPath = relative(process.cwd(), join(tempDir, "report.md"));
    const absoluteReportPath = join(process.cwd(), reportPath);

    mockFetchSuccess({
      success: true,
      data: {
        auditId: "guided_audit_25",
        score: 91,
      },
    });

    writeFileSync(
      absoluteReportPath,
      "# Test Audit\n\n- Score: 91/100\n",
      "utf-8"
    );

    try {
      await handleTestAudit(
        createArgs({
          action: "analyze",
          branch: "main",
          score: 91,
          findings: [],
          recommendations: ["Tighten assertions"],
          markdownReportPath: reportPath,
        }) as never
      );

      const options = getLastFetchOptions();
      const body = JSON.parse(String(options?.body));
      expect(body.markdownReport).toContain("# Test Audit");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should normalize legacy audit categories before submission", async () => {
    mockFetchSuccess({
      success: true,
      data: {
        auditId: "guided_audit_legacy",
        score: 84,
      },
    });

    await handleTestAudit(
      createArgs({
        action: "analyze",
        branch: "main",
        score: 84,
        findings: [
          {
            title: "Timing problems",
            category: "determinism_flakiness",
            subCategory: "Hard Wait",
          },
        ],
        recommendations: [],
        markdownReport: "# Test Audit\n\nLegacy category",
      }) as never
    );

    const body = JSON.parse(String(getLastFetchOptions()?.body));
    expect(body.findings[0].category).toBe("stability_issues");
    expect(body.findings[0].subCategory).toBe("hard_wait");
  });

  it("should not infer a target from the markdown heading when target is omitted", async () => {
    mockFetchSuccess({
      success: true,
      data: {
        auditId: "guided_audit_heading",
        score: 80,
      },
    });

    await handleTestAudit(
      createArgs({
        action: "analyze",
        branch: "main",
        scope: "feature",
        score: 80,
        findings: [],
        recommendations: [],
        markdownReport: "# Login Flow Audit\n\nStatic analysis report",
      }) as never
    );

    const body = JSON.parse(String(getLastFetchOptions()?.body));
    expect(body.target).toEqual({});
  });

  it("should reject unknown audit categories before submission", async () => {
    await expect(
      handleTestAudit(
        createArgs({
          action: "analyze",
          branch: "main",
          score: 90,
          findings: [
            {
              title: "Unknown category finding",
              category: "foo_bar_baz",
            },
          ],
          recommendations: [],
          markdownReport: "# Test Audit\n\nInvalid category",
        }) as never
      )
    ).rejects.toThrow("findings[0].category 'foo_bar_baz' is invalid");
  });

  it("should read markdownReportPath from an absolute file when submitting", async () => {
    const tempDir = mkdtempSync(join(process.cwd(), "tmp-test-audit-abs-"));
    const absPath = join(tempDir, "report.md");
    writeFileSync(absPath, "# Absolute path audit\n", "utf-8");

    mockFetchSuccess({
      success: true,
      data: { auditId: "guided_audit_abs", score: 90 },
    });

    try {
      await handleTestAudit(
        createArgs({
          action: "analyze",
          branch: "main",
          score: 90,
          findings: [],
          recommendations: [],
          markdownReportPath: absPath,
        }) as never
      );

      const body = JSON.parse(String(getLastFetchOptions()?.body));
      expect(body.markdownReport).toContain("# Absolute path audit");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should resolve markdownReportPath relative to TESTDINO_MCP_WORKSPACE", async () => {
    const tempDir = mkdtempSync(join(process.cwd(), "tmp-test-audit-ws-"));
    writeFileSync(join(tempDir, "report.md"), "# Workspace base\n", "utf-8");

    const prevWorkspace = process.env.TESTDINO_MCP_WORKSPACE;
    process.env.TESTDINO_MCP_WORKSPACE = tempDir;

    mockFetchSuccess({
      success: true,
      data: { auditId: "guided_audit_ws", score: 92 },
    });

    try {
      await handleTestAudit(
        createArgs({
          action: "analyze",
          branch: "main",
          score: 92,
          findings: [],
          recommendations: [],
          markdownReportPath: "report.md",
        }) as never
      );

      const body = JSON.parse(String(getLastFetchOptions()?.body));
      expect(body.markdownReport).toContain("# Workspace base");
    } finally {
      if (prevWorkspace === undefined) {
        delete process.env.TESTDINO_MCP_WORKSPACE;
      } else {
        process.env.TESTDINO_MCP_WORKSPACE = prevWorkspace;
      }
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should get a saved report and write markdown locally when requested", async () => {
    const tempDir = mkdtempSync(join(process.cwd(), "tmp-test-audit-"));
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
      const result = await handleTestAudit(
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
