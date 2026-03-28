import { describe, it, expect, afterEach } from "vitest";
import {
  mockFetchSuccess,
  restoreFetch,
  getLastFetchUrl,
  getLastFetchOptions,
} from "../../../helpers/mockFetch.js";
import { createArgs } from "../../../helpers/mockTypes.js";
import { handleGetRunDetails } from "../../../../src/tools/testruns/get-run-details.js";

describe("handleGetRunDetails", () => {
  afterEach(() => {
    restoreFetch();
    delete process.env.TESTDINO_PAT;
  });

  it("throws when args are undefined", async () => {
    process.env.TESTDINO_PAT = "test-pat";
    await expect(handleGetRunDetails(undefined)).rejects.toThrow(
      "projectId is required"
    );
  });

  it("passes testrun_id as query param", async () => {
    mockFetchSuccess({ id: "run-1" });

    await handleGetRunDetails(
      createArgs({
        projectId: "proj-1",
        testrun_id: "run-abc",
      }) as never
    );

    const url = getLastFetchUrl();
    expect(url).toContain("testrun_id=run-abc");
  });

  it("passes counter as query param", async () => {
    mockFetchSuccess({ id: "run-1" });

    await handleGetRunDetails(
      createArgs({
        projectId: "proj-1",
        counter: 42,
      }) as never
    );

    const url = getLastFetchUrl();
    expect(url).toContain("counter=42");
  });

  it("supports comma-separated testrun_id for batch", async () => {
    mockFetchSuccess([{ id: "run-1" }, { id: "run-2" }]);

    await handleGetRunDetails(
      createArgs({
        projectId: "proj-1",
        testrun_id: "run-1,run-2,run-3",
      }) as never
    );

    const url = getLastFetchUrl();
    expect(url).toContain("testrun_id=run-1%2Crun-2%2Crun-3");
  });

  it("works with only projectId (no testrun_id or counter)", async () => {
    mockFetchSuccess({ runs: [] });

    const result = await handleGetRunDetails(
      createArgs({ projectId: "proj-1" }) as never
    );

    expect(result.content).toHaveLength(1);
    const url = getLastFetchUrl();
    expect(url).toContain("/api/mcp/proj-1/get-run-details");
    expect(url).not.toContain("testrun_id");
    expect(url).not.toContain("counter");
  });

  it("should forward params through full handler pipeline", async () => {
    const mockData = {
      id: "run-abc",
      stats: { passed: 10, failed: 2, skipped: 1 },
      branch: "main",
    };
    mockFetchSuccess(mockData);

    const result = await handleGetRunDetails(
      createArgs({
        projectId: "proj-42",
        testrun_id: "run-abc",
        counter: 7,
      }) as never
    );

    // Verify URL was built correctly with all params
    const url = getLastFetchUrl();
    expect(url).toContain("/api/mcp/proj-42/get-run-details");
    expect(url).toContain("testrun_id=run-abc");
    expect(url).toContain("counter=7");

    // Verify auth header was sent
    const options = getLastFetchOptions();
    expect(options?.headers).toEqual(
      expect.objectContaining({ Authorization: "Bearer test-pat-token" })
    );

    // Verify response is properly formatted as MCP content
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.id).toBe("run-abc");
    expect(parsed.stats.failed).toBe(2);
  });
});
