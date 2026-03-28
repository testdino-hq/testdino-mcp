import { describe, it, expect, afterEach } from "vitest";
import {
  mockFetchSuccess,
  restoreFetch,
  getLastFetchUrl,
  getLastFetchOptions,
} from "../../../helpers/mockFetch.js";
import { createArgs } from "../../../helpers/mockTypes.js";
import { handleGetTestCaseDetails } from "../../../../src/tools/testcases/get-testcase-details.js";

describe("handleGetTestCaseDetails", () => {
  afterEach(() => {
    restoreFetch();
  });

  it("should throw when no search parameter is provided", async () => {
    await expect(
      handleGetTestCaseDetails(createArgs() as never)
    ).rejects.toThrow("At least one of the following must be provided");
  });

  it("should include testcase_id as testcaseid in URL query params", async () => {
    mockFetchSuccess({ id: "tc_123" });

    await handleGetTestCaseDetails(
      createArgs({ testcase_id: "tc_123" }) as never
    );

    const url = getLastFetchUrl();
    expect(url).toContain("test-project-id");
    expect(url).toContain("testcaseid=tc_123");
  });

  it("should accept testcase_name as a search parameter", async () => {
    mockFetchSuccess({ results: [] });

    const result = await handleGetTestCaseDetails(
      createArgs({
        testcase_name: "Login test",
        testrun_id: "run_123",
      }) as never
    );

    expect(result).toHaveProperty("content");
    const url = getLastFetchUrl();
    expect(url).toContain("by_title=Login");
  });

  it("should accept by_status as a search parameter", async () => {
    mockFetchSuccess({ results: [] });

    const result = await handleGetTestCaseDetails(
      createArgs({ by_status: "failed" }) as never
    );

    expect(result).toHaveProperty("content");
    const url = getLastFetchUrl();
    expect(url).toContain("by_status=failed");
  });

  it("should append screenshot hint when response contains screenshots", async () => {
    const mockData = {
      id: "tc_123",
      screenshots: [{ url: "https://example.com/screenshot.png" }],
    };
    mockFetchSuccess(mockData);

    const result = await handleGetTestCaseDetails(
      createArgs({ testcase_id: "tc_123" }) as never
    );

    expect(result.content.length).toBe(2);
    expect(result.content[1].text).toContain("screenshot");
  });

  it("should forward all optional params to the API", async () => {
    mockFetchSuccess({ results: [] });

    await handleGetTestCaseDetails(
      createArgs({
        testcase_id: "tc_999",
        testcase_name: "Checkout test",
        testcase_fulltitle: "e2e > Checkout test",
        testrun_id: "run_100",
        testrun_ids: "run_100,run_101",
        testsuite_id: "suite_50",
        counter: 7,
        by_status: "flaky",
        by_error_message: "Timeout 15000ms exceeded",
        by_code_snippet: "await page.click",
        include_history: true,
        history_limit: 20,
        include_artifacts: true,
        include_screenshots: true,
        include_traces: true,
        include_videos: true,
        include_attachments: true,
        steps_filter: "failed_only",
        limit: 25,
        page: 3,
        sort_by: "duration",
        sort_order: "asc",
        get_all: true,
      }) as never
    );

    const url = getLastFetchUrl();
    expect(url).toContain("testcaseid=tc_999");
    expect(url).toContain("by_title=Checkout+test");
    expect(url).toContain("by_fulltitle=e2e+%3E+Checkout+test");
    expect(url).toContain("by_testrun_id=run_100");
    expect(url).toContain("by_testrun_ids=run_100%2Crun_101");
    expect(url).toContain("by_testsuite_id=suite_50");
    expect(url).toContain("counter=7");
    expect(url).toContain("by_status=flaky");
    expect(url).toContain("by_error_message=Timeout+15000ms+exceeded");
    expect(url).toContain("by_code_snippet=await+page.click");
    expect(url).toContain("include_history=true");
    expect(url).toContain("history_limit=20");
    expect(url).toContain("include_artifacts=true");
    expect(url).toContain("include_screenshots=true");
    expect(url).toContain("include_traces=true");
    expect(url).toContain("include_videos=true");
    expect(url).toContain("include_attachments=true");
    expect(url).toContain("steps_filter=failed_only");
    expect(url).toContain("limit=25");
    expect(url).toContain("page=3");
    expect(url).toContain("sort_by=duration");
    expect(url).toContain("sort_order=asc");
    expect(url).toContain("get_all=true");
  });

  it("should forward params through full handler pipeline", async () => {
    const mockData = {
      id: "tc_789",
      title: "Checkout flow",
      status: "failed",
      history: [{ runId: "run-old", status: "passed" }],
    };
    mockFetchSuccess(mockData);

    const result = await handleGetTestCaseDetails(
      createArgs({
        projectId: "proj-checkout",
        testcase_id: "tc_789",
        include_history: true,
      }) as never
    );

    // Verify URL has all params correctly mapped
    const url = getLastFetchUrl();
    expect(url).toContain("/api/mcp/proj-checkout/get-testcase-details");
    expect(url).toContain("testcaseid=tc_789");
    expect(url).toContain("include_history=true");

    // Verify auth header
    const options = getLastFetchOptions();
    expect(options?.headers).toEqual(
      expect.objectContaining({ Authorization: "Bearer test-pat-token" })
    );

    // Verify MCP response format with actual data
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.id).toBe("tc_789");
    expect(parsed.history).toHaveLength(1);
  });
});
