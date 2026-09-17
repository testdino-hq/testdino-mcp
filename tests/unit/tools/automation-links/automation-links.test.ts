import { describe, it, expect, afterEach } from "vitest";
import {
  mockFetchSuccess,
  mockFetchError,
  restoreFetch,
  getLastFetchUrl,
  getLastFetchOptions,
} from "../../../helpers/mockFetch.js";
import { createArgs, parseToolResponse } from "../../../helpers/mockTypes.js";
import { handleListAutomatedTests } from "../../../../src/tools/automation-links/list-automated-tests.js";
import { handleGetTestCaseLinks } from "../../../../src/tools/automation-links/get-test-case-links.js";
import { handleLinkAutomatedTest } from "../../../../src/tools/automation-links/link-automated-test.js";
import { handleUnlinkAutomatedTest } from "../../../../src/tools/automation-links/unlink-automated-test.js";
import { handleBulkLinkAutomatedTests } from "../../../../src/tools/automation-links/bulk-link-automated-tests.js";

const AUTH = expect.objectContaining({
  Authorization: "Bearer test-pat-token",
});

afterEach(() => {
  restoreFetch();
});

describe("handleListAutomatedTests", () => {
  it("GETs /manual-tests/:p/automated-tests with the filters as query params", async () => {
    mockFetchSuccess({ tests: [] });
    await handleListAutomatedTests(
      createArgs({
        projectId: "p1",
        search: "cart",
        linkStatus: "unlinked",
        cursor: "c2",
        limit: 100,
      })
    );
    const url = getLastFetchUrl();
    expect(url).toContain("/api/mcp/manual-tests/p1/automated-tests?");
    expect(url).toContain("search=cart");
    expect(url).toContain("linkStatus=unlinked");
    expect(url).toContain("cursor=c2");
    expect(url).toContain("limit=100");
    expect(getLastFetchOptions()?.headers).toEqual(AUTH);
  });

  it("returns the identities so the agent can read pwTestId + fullTitle", async () => {
    mockFetchSuccess({
      tests: [{ pwTestId: "pw1", fullTitle: "a.spec.ts > A > t" }],
    });
    const result = await handleListAutomatedTests(
      createArgs({ projectId: "p1" })
    );
    const parsed = parseToolResponse(result) as {
      tests: Array<{ fullTitle: string }>;
    };
    expect(parsed.tests[0].fullTitle).toBe("a.spec.ts > A > t");
  });
});

describe("handleGetTestCaseLinks", () => {
  it("throws when caseId is missing", async () => {
    await expect(
      handleGetTestCaseLinks(createArgs({ caseId: undefined }))
    ).rejects.toThrow("caseId is required");
  });

  it("GETs /test-cases/:caseId/links and forwards days", async () => {
    mockFetchSuccess([]);
    await handleGetTestCaseLinks(
      createArgs({ projectId: "p1", caseId: "TC-7", days: 30 })
    );
    expect(getLastFetchUrl()).toContain(
      "/api/mcp/manual-tests/p1/test-cases/TC-7/links?days=30"
    );
  });
});

describe("handleLinkAutomatedTest", () => {
  it("throws on each missing required field, before any request", async () => {
    await expect(
      handleLinkAutomatedTest(
        createArgs({ caseId: "TC-1", fullTitle: "a > b" })
      )
    ).rejects.toThrow("pwTestId is required");
    await expect(
      handleLinkAutomatedTest(createArgs({ caseId: "TC-1", pwTestId: "pw" }))
    ).rejects.toThrow("fullTitle is required");
  });

  it("POSTs a flat {pwTestId, fullTitle, displayTitle} body to the case links URL", async () => {
    mockFetchSuccess({ _id: "tcm_link_1" });
    await handleLinkAutomatedTest(
      createArgs({
        projectId: "p1",
        caseId: "TC-7",
        pwTestId: "pw1",
        fullTitle: "a.spec.ts > A > t",
        displayTitle: "t",
      })
    );
    expect(getLastFetchUrl()).toContain(
      "/api/mcp/manual-tests/p1/test-cases/TC-7/links"
    );
    const options = getLastFetchOptions();
    expect(options?.method).toBe("POST");
    expect(JSON.parse(String(options?.body))).toEqual({
      pwTestId: "pw1",
      fullTitle: "a.spec.ts > A > t",
      displayTitle: "t",
    });
  });

  it("surfaces the server's plan-gate 403 message instead of swallowing it", async () => {
    // Bug caught: a generic "request failed" would hide that the fix is an upgrade, not a retry.
    mockFetchError(
      403,
      JSON.stringify({
        success: false,
        message:
          "Automated-test linking is not available on your current plan.",
      })
    );
    await expect(
      handleLinkAutomatedTest(
        createArgs({ caseId: "TC-7", pwTestId: "pw1", fullTitle: "a > b" })
      )
    ).rejects.toThrow(/not available on your current plan/);
  });
});

describe("handleUnlinkAutomatedTest", () => {
  it("throws when linkId is missing", async () => {
    await expect(
      handleUnlinkAutomatedTest(createArgs({ caseId: "TC-1" }))
    ).rejects.toThrow("linkId is required");
  });

  it("DELETEs /test-cases/:caseId/links/:linkId with no body", async () => {
    mockFetchSuccess({ removed: { _id: "tcm_link_1" } });
    await handleUnlinkAutomatedTest(
      createArgs({ projectId: "p1", caseId: "TC-7", linkId: "tcm_link_1" })
    );
    expect(getLastFetchUrl()).toContain(
      "/api/mcp/manual-tests/p1/test-cases/TC-7/links/tcm_link_1"
    );
    const options = getLastFetchOptions();
    expect(options?.method).toBe("DELETE");
    expect(options?.body).toBeUndefined();
  });
});

describe("handleBulkLinkAutomatedTests", () => {
  it("rejects an empty or oversized links array locally", async () => {
    await expect(
      handleBulkLinkAutomatedTests(createArgs({ links: [] }))
    ).rejects.toThrow("links must be a non-empty array");
    const tooMany = Array.from({ length: 501 }, (_, i) => ({
      manualTestCaseId: `tcm_tc_${i}`,
      pwTestId: `pw${i}`,
      fullTitle: `s > t${i}`,
    }));
    await expect(
      handleBulkLinkAutomatedTests(createArgs({ links: tooMany }))
    ).rejects.toThrow("at most 500");
  });

  it("POSTs { links } to /test-case-links/bulk and returns per-item results verbatim", async () => {
    // Bug caught: a wrapper that re-shaped the array would hide per-item failures.
    const links = [
      { manualTestCaseId: "tcm_tc_1", pwTestId: "pw1", fullTitle: "s > t1" },
      { manualTestCaseId: "tcm_tc_2", pwTestId: "pw2", fullTitle: "s > t2" },
    ];
    mockFetchSuccess([
      { manualTestCaseId: "tcm_tc_1", fullTitle: "s > t1", success: true },
      {
        manualTestCaseId: "tcm_tc_2",
        fullTitle: "s > t2",
        success: false,
        error: "not found",
      },
    ]);
    const result = await handleBulkLinkAutomatedTests(
      createArgs({ projectId: "p1", links })
    );
    expect(getLastFetchUrl()).toContain(
      "/api/mcp/manual-tests/p1/test-case-links/bulk"
    );
    const options = getLastFetchOptions();
    expect(options?.method).toBe("POST");
    expect(JSON.parse(String(options?.body))).toEqual({ links });
    const parsed = parseToolResponse(result) as Array<{ success: boolean }>;
    expect(parsed.map((r) => r.success)).toEqual([true, false]);
  });
});
