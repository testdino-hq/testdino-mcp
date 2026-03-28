import { describe, it, expect, afterEach } from "vitest";
import {
  mockFetchSuccess,
  restoreFetch,
  getLastFetchUrl,
  getLastFetchOptions,
} from "../../../helpers/mockFetch.js";
import { createArgs } from "../../../helpers/mockTypes.js";
import { handleDebugTestCase } from "../../../../src/tools/testcases/debug-testcase.js";

describe("handleDebugTestCase", () => {
  afterEach(() => {
    restoreFetch();
  });

  it("should throw when testcase_name is missing", async () => {
    await expect(handleDebugTestCase(createArgs() as never)).rejects.toThrow(
      "testcase_name is required"
    );
  });

  it("should throw when projectId is missing", async () => {
    await expect(
      handleDebugTestCase(
        createArgs({
          projectId: undefined,
          testcase_name: "Some test",
        }) as never
      )
    ).rejects.toThrow("projectId is required");
  });

  it("should append screenshot hint when response contains screenshot attachments", async () => {
    const mockData = {
      historicalData: [
        {
          attempts: [
            {
              attachments: [
                { name: "screenshot", path: "https://example.com/img.png" },
              ],
            },
          ],
        },
      ],
    };
    mockFetchSuccess(mockData);

    const result = await handleDebugTestCase(
      createArgs({ testcase_name: "Verify user login" }) as never
    );

    expect(result.content.length).toBe(2);
    expect(result.content[1].text).toContain("Screenshot");
  });

  it("should forward params through full handler pipeline", async () => {
    const mockData = {
      historicalData: [
        {
          testRunId: "run-101",
          testRunCounter: 5,
          branch: "feature/auth",
          status: "failed",
          attempts: [{ error: "Element not found" }],
        },
      ],
      debugging_prompt: "Analyze the failure pattern",
    };
    mockFetchSuccess(mockData);

    const result = await handleDebugTestCase(
      createArgs({
        projectId: "proj-debug",
        testcase_name: "Verify user login",
      }) as never
    );

    // Verify URL was built with correct path and query param
    const url = getLastFetchUrl();
    expect(url).toContain("/api/mcp/proj-debug/debug-testcase");
    expect(url).toContain("testcase_name=Verify+user+login");

    // Verify auth header
    const options = getLastFetchOptions();
    expect(options?.headers).toEqual(
      expect.objectContaining({ Authorization: "Bearer test-pat-token" })
    );

    // Verify MCP response format with actual data
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.historicalData).toHaveLength(1);
    expect(parsed.historicalData[0].branch).toBe("feature/auth");
    expect(parsed.debugging_prompt).toBe("Analyze the failure pattern");
  });
});
