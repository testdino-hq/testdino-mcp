import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { join, relative } from "path";
import {
  mockFetchSuccess,
  restoreFetch,
  getLastFetchUrl,
  getLastFetchOptions,
} from "../../../helpers/mockFetch.js";
import { createArgs } from "../../../helpers/mockTypes.js";
import { handleSubmitAuditReport } from "../../../../src/tools/audits/submit-audit-report.js";

const ORG = "org_test";

describe("handleSubmitAuditReport", () => {
  afterEach(() => {
    restoreFetch();
  });

  it("should throw when score is missing", async () => {
    await expect(
      handleSubmitAuditReport(
        createArgs({
          orgId: ORG,
          markdownReport: "# Test Audit\n\nReport",
        }) as never
      )
    ).rejects.toThrow("score is required");
  });

  it("should throw when orgId is missing", async () => {
    await expect(
      handleSubmitAuditReport(
        createArgs({
          score: 80,
          markdownReport: "# Test Audit\n\nReport",
        }) as never
      )
    ).rejects.toThrow("orgId is required");
  });

  it("should throw when no markdown report is provided", async () => {
    await expect(
      handleSubmitAuditReport(
        createArgs({
          orgId: ORG,
          score: 80,
        }) as never
      )
    ).rejects.toThrow("A markdown report is required");
  });

  it("should submit a completed audit report", async () => {
    mockFetchSuccess({
      success: true,
      data: {
        auditId: "guided_audit_22",
        score: 88,
      },
    });

    const result = await handleSubmitAuditReport(
      createArgs({
        orgId: ORG,
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
    expect(body.orgId).toBe(ORG);
    expect(body.branch).toBe("main");
    expect(body.scope).toBe("suite");
    expect(body.target.specPath).toBe("tests/auth.spec.ts");
    expect(body.score).toBe(88);
    expect(body.findings).toHaveLength(1);
    expect(body.findings[0].category).toBe("surface_level_tests");
    expect(body.recommendations).toEqual(["Expand post-action assertions"]);
    expect(body.markdownReport).toContain("# Test Audit");

    expect(result.content[0].type).toBe("text");
  });

  it("should read markdownReportPath from a relative file when submitting", async () => {
    const tempDir = mkdtempSync(join(process.cwd(), "tmp-submit-audit-"));
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
      await handleSubmitAuditReport(
        createArgs({
          orgId: ORG,
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

    await handleSubmitAuditReport(
      createArgs({
        orgId: ORG,
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

    await handleSubmitAuditReport(
      createArgs({
        orgId: ORG,
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
      handleSubmitAuditReport(
        createArgs({
          orgId: ORG,
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
    const tempDir = mkdtempSync(join(process.cwd(), "tmp-submit-audit-abs-"));
    const absPath = join(tempDir, "report.md");
    writeFileSync(absPath, "# Absolute path audit\n", "utf-8");

    mockFetchSuccess({
      success: true,
      data: { auditId: "guided_audit_abs", score: 90 },
    });

    try {
      await handleSubmitAuditReport(
        createArgs({
          orgId: ORG,
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
    const tempDir = mkdtempSync(join(process.cwd(), "tmp-submit-audit-ws-"));
    writeFileSync(join(tempDir, "report.md"), "# Workspace base\n", "utf-8");

    const prevWorkspace = process.env.TESTDINO_MCP_WORKSPACE;
    process.env.TESTDINO_MCP_WORKSPACE = tempDir;

    mockFetchSuccess({
      success: true,
      data: { auditId: "guided_audit_ws", score: 92 },
    });

    try {
      await handleSubmitAuditReport(
        createArgs({
          orgId: ORG,
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
});
