import { describe, it, expect, afterEach } from "vitest";
import {
  mockFetchSuccess,
  mockFetchError,
  restoreFetch,
  getLastFetchUrl,
} from "../../../helpers/mockFetch.js";
import { createArgs } from "../../../helpers/mockTypes.js";
import { handleListTestRuns } from "../../../../src/tools/testruns/list-testruns.js";

describe("handleListTestRuns", () => {
  afterEach(() => {
    restoreFetch();
    delete process.env.TESTDINO_PAT;
  });

  it("throws when PAT is missing", async () => {
    await expect(handleListTestRuns({ projectId: "proj-1" })).rejects.toThrow(
      "Missing TESTDINO_PAT"
    );
  });

  it("throws when projectId is missing", async () => {
    await expect(
      handleListTestRuns({ projectId: "", token: "test-pat" } as never)
    ).rejects.toThrow("projectId is required");
  });

  it("throws when args are undefined", async () => {
    process.env.TESTDINO_PAT = "test-pat";
    await expect(handleListTestRuns(undefined)).rejects.toThrow(
      "projectId is required"
    );
  });

  it("passes query params correctly", async () => {
    mockFetchSuccess({ testRuns: [] });

    await handleListTestRuns(
      createArgs({
        projectId: "proj-1",
        by_branch: "develop",
        limit: 10,
        page: 2,
        by_time_interval: "1d",
        by_author: "alice",
        by_environment: "staging",
        get_all: true,
      }) as never
    );

    const url = getLastFetchUrl();
    expect(url).toContain("by_branch=develop");
    expect(url).toContain("limit=10");
    expect(url).toContain("page=2");
    expect(url).toContain("by_time_interval=1d");
    expect(url).toContain("by_author=alice");
    expect(url).toContain("by_environment=staging");
    expect(url).toContain("get_all=true");
  });

  it("wraps API errors with context message", async () => {
    mockFetchError(500, "Internal Server Error");

    await expect(
      handleListTestRuns(createArgs({ projectId: "proj-1" }) as never)
    ).rejects.toThrow("Failed to list test runs");
  });
});
