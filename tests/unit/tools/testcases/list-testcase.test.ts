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

  it("should throw when no run scope is provided", async () => {
    await expect(handleListTestCases(createArgs() as never)).rejects.toThrow(
      "A run scope is required"
    );
  });

  it("should throw when only page/limit are given (they do not select runs)", async () => {
    // Regression (TDV2-107): page/limit alone used to be treated as a valid
    // standalone trigger, which the gateway then answered with an empty result.
    // They paginate WITHIN a run scope, so on their own they must be rejected.
    await expect(
      handleListTestCases(createArgs({ page: 2, limit: 25 }) as never)
    ).rejects.toThrow("A run scope is required");
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
        by_testsuite_id: "suite_42",
        by_shard: 2,
        search: "login flow",
        sort: "name_asc",
        by_tag: "smoke,regression",
        by_total_runtime: ">5s",
        by_artifacts: true,
        by_attempt_number: 2,
        by_pages: 3,
        by_branch: "develop",
        by_time_interval: "weekly",
        limit: 500,
        by_environment: "staging",
        by_author: "alice",
        by_commit: "abc1234",
        page: 2,
      }) as never
    );

    const url = getLastFetchUrl();
    expect(url).toContain("by_testrun_id=run_abc");
    expect(url).toContain("counter=10");
    expect(url).toContain("by_status=failed");
    expect(url).toContain("by_testsuite_id=suite_42");
    expect(url).toContain("by_shard=2");
    expect(url).toContain("search=login+flow");
    expect(url).toContain("sort=name_asc");
    expect(url).toContain("by_tag=smoke%2Cregression");
    expect(url).toContain("by_total_runtime=%3E5s");
    expect(url).toContain("by_artifacts=true");
    expect(url).toContain("by_attempt_number=2");
    expect(url).toContain("by_pages=3");
    expect(url).toContain("by_branch=develop");
    expect(url).toContain("by_time_interval=weekly");
    expect(url).toContain("limit=500");
    expect(url).toContain("by_environment=staging");
    expect(url).toContain("by_author=alice");
    expect(url).toContain("by_commit=abc1234");
    expect(url).toContain("page=2");
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
