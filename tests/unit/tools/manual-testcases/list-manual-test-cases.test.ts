import { describe, it, expect, afterEach } from "vitest";
import {
  mockFetchSuccess,
  restoreFetch,
  getLastFetchUrl,
  getLastFetchOptions,
} from "../../../helpers/mockFetch.js";
import { createArgs } from "../../../helpers/mockTypes.js";
import { handleListManualTestCases } from "../../../../src/tools/manual-testcases/list-manual-test-cases.js";

describe("handleListManualTestCases", () => {
  afterEach(() => {
    restoreFetch();
  });

  it("passes filter params to the URL", async () => {
    mockFetchSuccess({ testCases: [] });

    await handleListManualTestCases(
      createArgs({
        status: "active",
        priority: "high",
        search: "login",
        limit: 25,
      })
    );

    const url = getLastFetchUrl();
    expect(url).toContain("status=active");
    expect(url).toContain("priority=high");
    expect(url).toContain("search=login");
    expect(url).toContain("limit=25");
  });

  it("uses default limit of 10 when not specified", async () => {
    mockFetchSuccess({ testCases: [] });

    await handleListManualTestCases(createArgs());

    const url = getLastFetchUrl();
    expect(url).toContain("limit=10");
  });

  it("should forward all optional filter params to the API", async () => {
    mockFetchSuccess({ testCases: [] });

    await handleListManualTestCases(
      createArgs({
        time: "last 7 days",
        search: "checkout",
        suiteId: "suite-abc",
        status: "draft",
        priority: "medium",
        severity: "major",
        type: "regression",
        layer: "api",
        behavior: "negative",
        automationStatus: "To be automated",
        tags: "smoke,e2e",
        limit: 50,
      })
    );

    const url = getLastFetchUrl();
    expect(url).toContain("time=last+7+days");
    expect(url).toContain("search=checkout");
    expect(url).toContain("suiteId=suite-abc");
    expect(url).toContain("status=draft");
    expect(url).toContain("priority=medium");
    expect(url).toContain("severity=major");
    expect(url).toContain("type=regression");
    expect(url).toContain("layer=api");
    expect(url).toContain("behavior=negative");
    expect(url).toContain("automationStatus=To+be+automated");
    expect(url).toContain("tags=smoke%2Ce2e");
    expect(url).toContain("limit=50");
  });

  it("should forward params through full handler pipeline", async () => {
    const mockData = {
      testCases: [
        {
          id: "mtc-1",
          title: "Login flow",
          status: "active",
          priority: "high",
        },
      ],
      total: 1,
    };
    mockFetchSuccess(mockData);

    const result = await handleListManualTestCases(
      createArgs({
        projectId: "proj-manual",
        search: "login",
        status: "active",
        priority: "high",
      })
    );

    // Verify URL has all query params
    const url = getLastFetchUrl();
    expect(url).toContain("/api/mcp/manual-tests/proj-manual/test-cases");
    expect(url).toContain("search=login");
    expect(url).toContain("status=active");
    expect(url).toContain("priority=high");

    // Verify auth header
    const options = getLastFetchOptions();
    expect(options?.headers).toEqual(
      expect.objectContaining({ Authorization: "Bearer test-pat-token" })
    );

    // Verify MCP response format with actual data
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.testCases).toHaveLength(1);
    expect(parsed.testCases[0].title).toBe("Login flow");
  });
});
