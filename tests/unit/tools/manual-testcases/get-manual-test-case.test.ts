import { describe, it, expect, afterEach } from "vitest";
import {
  mockFetchSuccess,
  restoreFetch,
  getLastFetchUrl,
  getLastFetchOptions,
} from "../../../helpers/mockFetch.js";
import { createArgs } from "../../../helpers/mockTypes.js";
import { handleGetManualTestCase } from "../../../../src/tools/manual-testcases/get-manual-test-case.js";

describe("handleGetManualTestCase", () => {
  afterEach(() => {
    restoreFetch();
  });

  it("throws when caseId is missing", async () => {
    await expect(
      handleGetManualTestCase(createArgs({ caseId: undefined }))
    ).rejects.toThrow("caseId is required");
  });

  it("should forward params through full handler pipeline", async () => {
    const mockData = {
      id: "TC-42",
      title: "Verify checkout flow",
      steps: [{ step: 1, action: "Click checkout", expected: "Cart opens" }],
      priority: "critical",
    };
    mockFetchSuccess(mockData);

    const result = await handleGetManualTestCase(
      createArgs({
        projectId: "proj-shop",
        caseId: "TC-42",
      })
    );

    // Verify URL path includes both projectId and caseId
    const url = getLastFetchUrl();
    expect(url).toContain("/api/mcp/manual-tests/proj-shop/test-cases/TC-42");

    // Verify auth header
    const options = getLastFetchOptions();
    expect(options?.headers).toEqual(
      expect.objectContaining({ Authorization: "Bearer test-pat-token" })
    );

    // Verify MCP response format with actual data
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.id).toBe("TC-42");
    expect(parsed.steps).toHaveLength(1);
    expect(parsed.priority).toBe("critical");
  });
});
