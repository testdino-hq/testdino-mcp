import { describe, it, expect, afterEach } from "vitest";
import {
  mockFetchSuccess,
  restoreFetch,
  getLastFetchUrl,
  getLastFetchOptions,
} from "../../../helpers/mockFetch.js";
import { createArgs } from "../../../helpers/mockTypes.js";
import { handleListManualTestSuites } from "../../../../src/tools/manual-testsuites/list-manual-test-suites.js";

describe("handleListManualTestSuites", () => {
  afterEach(() => {
    restoreFetch();
  });

  it("includes parentSuiteId in URL when provided", async () => {
    mockFetchSuccess({ suites: [] });

    await handleListManualTestSuites(
      createArgs({ parentSuiteId: "parent-suite-1" })
    );

    const url = getLastFetchUrl();
    expect(url).toContain("parentSuiteId=parent-suite-1");
  });

  it("should forward params through full handler pipeline", async () => {
    const mockData = {
      suites: [
        { id: "suite-1", name: "Smoke Tests", testCaseCount: 12 },
        { id: "suite-2", name: "Regression", testCaseCount: 45 },
      ],
    };
    mockFetchSuccess(mockData);

    const result = await handleListManualTestSuites(
      createArgs({ projectId: "proj-suites" })
    );

    // Verify URL path
    const url = getLastFetchUrl();
    expect(url).toContain("/api/mcp/manual-tests/proj-suites/test-suites");

    // Verify auth header
    const options = getLastFetchOptions();
    expect(options?.headers).toEqual(
      expect.objectContaining({ Authorization: "Bearer test-pat-token" })
    );

    // Verify MCP response format with actual data
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.suites).toHaveLength(2);
    expect(parsed.suites[0].name).toBe("Smoke Tests");
  });
});
