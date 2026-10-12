import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { join, relative } from "path";
import {
  mockFetchSuccess,
  restoreFetch,
  getLastFetchOptions,
  getLastFetchUrl,
} from "../../../helpers/mockFetch.js";
import { createArgs, parseToolResponse } from "../../../helpers/mockTypes.js";
import { handleSubmitAuditReport } from "../../../../src/tools/audits/submit-audit-report.js";

describe("handleSubmitAuditReport", () => {
  afterEach(() => {
    restoreFetch();
  });

  it("leaves a missing orgId to the server, as the hosted tool does", async () => {
    mockFetchSuccess({ success: true });

    await handleSubmitAuditReport(
      createArgs({ markdownReport: "# Report" }) as never
    );

    const body = JSON.parse(String(getLastFetchOptions()?.body));
    expect(body).not.toHaveProperty("orgId");
  });

  it("submits without a score; the server computes it", async () => {
    mockFetchSuccess({ success: true });

    await handleSubmitAuditReport(
      createArgs({ orgId: "org_1", markdownReport: "# Report" }) as never
    );

    expect(getLastFetchUrl()).toContain("/audit");
  });

  it("rejects a missing markdown", async () => {
    await expect(
      handleSubmitAuditReport(
        createArgs({
          orgId: "org_1",
          score: 80,
        }) as never
      )
    ).rejects.toThrow(/markdownReport/);
  });

  it("POSTs a completed report with orgId in the body", async () => {
    mockFetchSuccess({
      success: true,
      data: { auditId: "audit_new", score: 88 },
    });

    const result = await handleSubmitAuditReport(
      createArgs({
        orgId: "org_1",
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

    expect(getLastFetchUrl()).toContain(
      "/api/mcp/test-project-id/audit-report"
    );

    const options = getLastFetchOptions();
    expect(options?.method).toBe("POST");
    const body = JSON.parse(String(options?.body));

    expect(body.orgId).toBe("org_1");
    expect(body.branch).toBe("main");
    expect(body.scope).toBe("suite");
    expect(body.target.specPath).toBe("tests/auth.spec.ts");
    expect(body.score).toBe(88);
    expect(body.findings[0].category).toBe("surface_level_tests");
    expect(body.recommendations).toEqual(["Expand post-action assertions"]);
    expect(body.markdownReport).toContain("# Test Audit");

    const parsed = parseToolResponse(result);
    expect(parsed).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({ auditId: "audit_new" }),
      })
    );
  });

  it("sends findings as given; the server normalizes categories", async () => {
    mockFetchSuccess({ success: true });

    await handleSubmitAuditReport(
      createArgs({
        orgId: "org_1",
        findings: [{ title: "Timing", category: "determinism_flakiness" }],
        markdownReport: "# Legacy category",
      }) as never
    );

    const body = JSON.parse(String(getLastFetchOptions()?.body));
    expect(body.findings).toEqual([
      { title: "Timing", category: "determinism_flakiness" },
    ]);
  });

  it("reads markdownReportPath (relative to workspace) instead of inline markdown", async () => {
    const tempDir = mkdtempSync(join(process.cwd(), "tmp-submit-path-"));
    const reportPath = relative(process.cwd(), join(tempDir, "report.md"));

    writeFileSync(
      join(process.cwd(), reportPath),
      "# Audit From Path\n",
      "utf-8"
    );

    mockFetchSuccess({
      success: true,
      data: { auditId: "audit_from_path", score: 91 },
    });

    try {
      await handleSubmitAuditReport(
        createArgs({
          orgId: "org_1",
          score: 91,
          markdownReportPath: reportPath,
        }) as never
      );

      const body = JSON.parse(String(getLastFetchOptions()?.body));
      expect(body.markdownReport).toContain("# Audit From Path");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
