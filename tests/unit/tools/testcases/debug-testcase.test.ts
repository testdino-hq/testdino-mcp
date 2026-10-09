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

  it("should throw when neither testcase_id nor testcase_name is given", async () => {
    await expect(handleDebugTestCase(createArgs() as never)).rejects.toThrow(
      "testcase_id or testcase_name is required"
    );
  });

  // A title shared by several Playwright projects answers 409; the gateway then asks for testcase_id.
  it("should debug a test named by testcase_id alone", async () => {
    mockFetchSuccess({ debugging_prompt: "x" });

    await handleDebugTestCase(
      createArgs({ testcase_id: "pw_chromium_1" }) as never
    );

    const url = new URL(getLastFetchUrl());
    expect(url.searchParams.get("testcase_id")).toBe("pw_chromium_1");
    expect(url.searchParams.has("testcase_name")).toBe(false);
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

  it("forwards include_ai_insights and testrun_id when set", async () => {
    mockFetchSuccess({ debugging_prompt: "x", ai_fixes: {} });

    await handleDebugTestCase(
      createArgs({
        projectId: "proj-1",
        testcase_name: "Verify login",
        include_ai_insights: true,
        testrun_id: "run-1",
      }) as never
    );

    const url = getLastFetchUrl();
    expect(url).toContain("include_ai_insights=true");
    expect(url).toContain("testrun_id=run-1");
  });

  it("omits include_ai_insights when not set", async () => {
    mockFetchSuccess({ debugging_prompt: "x" });

    await handleDebugTestCase(
      createArgs({
        projectId: "proj-1",
        testcase_name: "Verify login",
      }) as never
    );

    const url = getLastFetchUrl();
    expect(url).not.toContain("include_ai_insights");
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

    // TDV2-112: single valid-JSON block, guidance folded in — no loose prose.
    expect(result.content.length).toBe(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed._agent_guidance).toContain("Screenshot");
  });

  it("should forward suite_file_path into the request URL", async () => {
    mockFetchSuccess({ historicalData: [] });

    await handleDebugTestCase(
      createArgs({
        testcase_name: "Verify user login",
        suite_file_path: "tests/checkout.spec.ts",
      }) as never
    );

    const url = getLastFetchUrl();
    expect(url).toContain(
      `suite_file_path=${encodeURIComponent("tests/checkout.spec.ts")}`
    );
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
