import { describe, it, expect, afterEach } from "vitest";
import {
  mockFetchSuccess,
  restoreFetch,
  getLastFetchUrl,
  getLastFetchOptions,
} from "../../../helpers/mockFetch.js";
import { createArgs } from "../../../helpers/mockTypes.js";
import { handleCreateManualTestSuite } from "../../../../src/tools/manual-testsuites/create-manual-test-suite.js";

describe("handleCreateManualTestSuite", () => {
  afterEach(() => {
    restoreFetch();
  });

  it("throws when name is missing", async () => {
    await expect(
      handleCreateManualTestSuite(createArgs({ name: undefined }))
    ).rejects.toThrow("name is required");
  });

  it("sends POST request with correct body", async () => {
    mockFetchSuccess({ id: "suite-new" });

    await handleCreateManualTestSuite(
      createArgs({
        name: "Auth Suite",
        description: "Suite for auth tests",
        parentSuiteId: "parent-1",
      })
    );

    const options = getLastFetchOptions();
    expect(options?.method).toBe("POST");

    const body = JSON.parse(options?.body as string);
    expect(body.projectId).toBe("test-project-id");
    expect(body.name).toBe("Auth Suite");
    expect(body.description).toBe("Suite for auth tests");
    expect(body.parentSuiteId).toBe("parent-1");
  });

  it("should forward params through full handler pipeline", async () => {
    const mockData = {
      id: "suite-new-99",
      name: "E2E Payments",
      description: "End-to-end payment flow tests",
    };
    mockFetchSuccess(mockData);

    const result = await handleCreateManualTestSuite(
      createArgs({
        projectId: "proj-pay",
        name: "E2E Payments",
        description: "End-to-end payment flow tests",
      })
    );

    // Verify URL path
    const url = getLastFetchUrl();
    expect(url).toContain("/api/mcp/manual-tests/proj-pay/test-suites");

    // Verify POST method, auth header, and body
    const options = getLastFetchOptions();
    expect(options?.method).toBe("POST");
    expect(options?.headers).toEqual(
      expect.objectContaining({ Authorization: "Bearer test-pat-token" })
    );
    const body = JSON.parse(options?.body as string);
    expect(body.projectId).toBe("proj-pay");
    expect(body.name).toBe("E2E Payments");
    expect(body.description).toBe("End-to-end payment flow tests");

    // Verify MCP response format with actual data
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.id).toBe("suite-new-99");
    expect(parsed.name).toBe("E2E Payments");
  });
});
