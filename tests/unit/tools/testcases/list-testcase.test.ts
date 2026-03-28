import { describe, it, expect, afterEach } from "vitest";
import {
  mockFetchSuccess,
  restoreFetch,
  getLastFetchUrl,
  getLastFetchOptions,
} from "../../../helpers/mockFetch.js";
import { createArgs } from "../../../helpers/mockTypes.js";
import { handleListTestCases } from "../../../../src/tools/testcases/list-testcase.js";

describe("handleListTestCases", () => {
  afterEach(() => {
    restoreFetch();
  });

  it("should throw when no test run identifier or filter is provided", async () => {
    await expect(handleListTestCases(createArgs() as never)).rejects.toThrow(
      "At least one of the following must be provided: by_testrun_id, counter, or any test run filter"
    );
  });

  it("should include query params in the URL", async () => {
    mockFetchSuccess({ testCases: [] });

    await handleListTestCases(
      createArgs({
        by_testrun_id: "run_123",
        by_status: "failed",
      }) as never
    );

    const url = getLastFetchUrl();
    expect(url).toContain("test-project-id");
    expect(url).toContain("by_testrun_id=run_123");
    expect(url).toContain("by_status=failed");
  });

  it("should accept counter as a test run identifier", async () => {
    mockFetchSuccess({ testCases: [] });

    const result = await handleListTestCases(
      createArgs({ counter: 43 }) as never
    );

    expect(result).toHaveProperty("content");
    const url = getLastFetchUrl();
    expect(url).toContain("counter=43");
  });

  it("should accept test run filter params without testrun_id or counter", async () => {
    mockFetchSuccess({ testCases: [] });

    const result = await handleListTestCases(
      createArgs({ by_branch: "main" }) as never
    );

    expect(result).toHaveProperty("content");
    const url = getLastFetchUrl();
    expect(url).toContain("by_branch=main");
  });

  it("should forward all optional params to the API", async () => {
    mockFetchSuccess({ testCases: [] });

    await handleListTestCases(
      createArgs({
        by_testrun_id: "run_abc",
        counter: 10,
        by_status: "failed",
        by_spec_file_name: "login.spec.ts",
        by_error_category: "timeout_issues",
        by_browser_name: "chromium",
        by_tag: "smoke,regression",
        by_total_runtime: "<60",
        by_artifacts: true,
        by_error_message: "Timeout exceeded",
        by_attempt_number: 2,
        by_pages: 3,
        by_branch: "develop",
        by_time_interval: "weekly",
        limit: 500,
        by_environment: "staging",
        by_author: "alice",
        by_commit: "abc1234",
        page: 2,
        get_all: true,
      }) as never
    );

    const url = getLastFetchUrl();
    expect(url).toContain("by_testrun_id=run_abc");
    expect(url).toContain("counter=10");
    expect(url).toContain("by_status=failed");
    expect(url).toContain("by_spec_file_name=login.spec.ts");
    expect(url).toContain("by_error_category=timeout_issues");
    expect(url).toContain("by_browser_name=chromium");
    expect(url).toContain("by_tag=smoke%2Cregression");
    expect(url).toContain("by_total_runtime=%3C60");
    expect(url).toContain("by_artifacts=true");
    expect(url).toContain("by_error_message=Timeout+exceeded");
    expect(url).toContain("by_attempt_number=2");
    expect(url).toContain("by_pages=3");
    expect(url).toContain("by_branch=develop");
    expect(url).toContain("by_time_interval=weekly");
    expect(url).toContain("limit=500");
    expect(url).toContain("by_environment=staging");
    expect(url).toContain("by_author=alice");
    expect(url).toContain("by_commit=abc1234");
    expect(url).toContain("page=2");
    expect(url).toContain("get_all=true");
  });

  it("should forward params through full handler pipeline", async () => {
    const mockData = {
      testCases: [
        { id: "tc-1", name: "Login test", status: "failed" },
        { id: "tc-2", name: "Signup test", status: "failed" },
      ],
    };
    mockFetchSuccess(mockData);

    const result = await handleListTestCases(
      createArgs({
        projectId: "proj-99",
        by_testrun_id: "run_456",
        by_status: "failed",
      }) as never
    );

    // Verify URL contains all query params
    const url = getLastFetchUrl();
    expect(url).toContain("/api/mcp/proj-99/list-testcase");
    expect(url).toContain("by_testrun_id=run_456");
    expect(url).toContain("by_status=failed");

    // Verify auth header
    const options = getLastFetchOptions();
    expect(options?.headers).toEqual(
      expect.objectContaining({ Authorization: "Bearer test-pat-token" })
    );

    // Verify MCP response format with actual data
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.testCases).toHaveLength(2);
    expect(parsed.testCases[0].status).toBe("failed");
  });
});
