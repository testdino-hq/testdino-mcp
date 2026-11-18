import { describe, it, expect, afterEach } from "vitest";
import {
  mockFetchSuccess,
  mockFetchError,
  restoreFetch,
  getLastFetchUrl,
} from "../../../helpers/mockFetch.js";
import { createArgs } from "../../../helpers/mockTypes.js";
import { handleGetTraceAnalysis } from "../../../../src/tools/ai-insights/get-trace-analysis.js";

describe("handleGetTraceAnalysis", () => {
  afterEach(() => {
    restoreFetch();
    delete process.env.TESTDINO_PAT;
  });

  it("throws when projectId is missing", async () => {
    process.env.TESTDINO_PAT = "test-pat";
    await expect(handleGetTraceAnalysis(undefined)).rejects.toThrow(
      "projectId is required"
    );
  });

  it("projectId alone returns the runbook (no id query params)", async () => {
    mockFetchSuccess({ skill: "runbook", trace_url: null });

    await handleGetTraceAnalysis(createArgs({ projectId: "proj-1" }) as never);

    const url = getLastFetchUrl();
    expect(url).toContain("/api/mcp/proj-1/get-trace-analysis");
    expect(url).not.toContain("testcase_id");
    expect(url).not.toContain("testrun_id");
  });

  it("forwards find and testcase_ids", async () => {
    mockFetchSuccess({ find: { status: "searched" } });
    await handleGetTraceAnalysis(
      createArgs({
        projectId: "proj-1",
        testcase_id: "pw-abc",
        testrun_id: "run-1",
        find: "cart",
      }) as never
    );
    expect(getLastFetchUrl()).toContain("find=cart");

    mockFetchSuccess({ tests: [] });
    await handleGetTraceAnalysis(
      createArgs({
        projectId: "proj-1",
        testrun_id: "run-1",
        testcase_ids: ["pw-1", "pw-2"],
      }) as never
    );
    expect(getLastFetchUrl()).toContain("testcase_ids=pw-1%2Cpw-2");
  });

  it("forwards testcase_id and testrun_id when resolving a hosted trace", async () => {
    mockFetchSuccess({ skill: "runbook", trace_url: "https://x/trace.zip" });

    await handleGetTraceAnalysis(
      createArgs({
        projectId: "proj-1",
        testcase_id: "pw-abc",
        testrun_id: "run-1",
      }) as never
    );

    const url = getLastFetchUrl();
    expect(url).toContain("testcase_id=pw-abc");
    expect(url).toContain("testrun_id=run-1");
  });

  it("wraps an API failure with context", async () => {
    mockFetchError(500, "boom");

    await expect(
      handleGetTraceAnalysis(
        createArgs({ projectId: "proj-1", testcase_id: "pw-abc" }) as never
      )
    ).rejects.toThrow("Failed to retrieve trace analysis");
  });
});
