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

  it("rejects a missing orgId", async () => {
    // orgId is the streaming contract — the backend 400s without it, so the
    // client must surface a helpful message pointing to health() rather than
    // let the server rejection bubble as a mystery 400.
    await expect(
      handleSubmitAuditReport(
        createArgs({
          score: 80,
          markdownReport: "# Report",
        }) as never
      )
    ).rejects.toThrow(/orgId is required/);
  });

  it("rejects a missing score", async () => {
    await expect(
      handleSubmitAuditReport(
        createArgs({
          orgId: "org_1",
          markdownReport: "# Report",
        }) as never
      )
    ).rejects.toThrow(/score is required/);
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

  it("normalizes legacy audit categories before submitting", async () => {
    // Behavior test: legacy categories from prior prompts (e.g.
    // "determinism_flakiness") get mapped to the canonical taxonomy on the
    // way out, so users don't need to migrate their AI-agent instructions.
    mockFetchSuccess({
      success: true,
      data: { auditId: "audit_legacy", score: 84 },
    });

    await handleSubmitAuditReport(
      createArgs({
        orgId: "org_1",
        score: 84,
        findings: [
          {
            title: "Timing problems",
            category: "determinism_flakiness",
            subCategory: "Hard Wait",
          },
        ],
        markdownReport: "# Legacy category",
      }) as never
    );

    const body = JSON.parse(String(getLastFetchOptions()?.body));
    expect(body.findings[0].category).toBe("stability_issues");
    expect(body.findings[0].subCategory).toBe("hard_wait");
  });

  it("rejects unknown audit categories", async () => {
    await expect(
      handleSubmitAuditReport(
        createArgs({
          orgId: "org_1",
          score: 80,
          findings: [{ title: "?", category: "not_a_thing" }],
          markdownReport: "# X",
        }) as never
      )
    ).rejects.toThrow(/'not_a_thing' is invalid/);
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
