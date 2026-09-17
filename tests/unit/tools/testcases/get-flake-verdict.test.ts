import { describe, it, expect, afterEach } from "vitest";
import {
  mockFetchSuccess,
  mockFetchError,
  restoreFetch,
  getLastFetchUrl,
} from "../../../helpers/mockFetch.js";
import { createArgs } from "../../../helpers/mockTypes.js";
import { handleGetFlakeVerdict } from "../../../../src/tools/testcases/get-flake-verdict.js";

describe("handleGetFlakeVerdict", () => {
  afterEach(() => {
    restoreFetch();
    delete process.env.TESTDINO_PAT;
  });

  it("throws when PAT is missing", async () => {
    await expect(
      handleGetFlakeVerdict({ projectId: "proj-1", testcase_id: "pw-1" })
    ).rejects.toThrow("Missing TESTDINO_PAT");
  });

  it("throws when projectId is missing", async () => {
    process.env.TESTDINO_PAT = "test-pat";
    await expect(
      handleGetFlakeVerdict(
        createArgs({ projectId: undefined, testcase_id: "pw-1" }) as never
      )
    ).rejects.toThrow("projectId is required");
  });

  it("throws when testcase_id is missing", async () => {
    process.env.TESTDINO_PAT = "test-pat";
    await expect(
      handleGetFlakeVerdict(createArgs({ projectId: "proj-1" }) as never)
    ).rejects.toThrow("testcase_id is required");
  });

  it("forwards testcase_id and omits testrun_id when not given", async () => {
    mockFetchSuccess({ verdict: "flaky" });

    const result = await handleGetFlakeVerdict(
      createArgs({ projectId: "proj-1", testcase_id: "pw-1" }) as never
    );

    const url = getLastFetchUrl();
    expect(url).toContain("/api/mcp/proj-1/get-flake-verdict");
    expect(url).toContain("testcase_id=pw-1");
    expect(url).not.toContain("testrun_id");
    expect(JSON.parse(result.content[0].text)).toEqual({ verdict: "flaky" });
  });

  it("forwards testrun_id as the run scope", async () => {
    mockFetchSuccess({ verdict: "deterministic" });

    await handleGetFlakeVerdict(
      createArgs({
        projectId: "proj-1",
        testcase_id: "pw-1",
        testrun_id: "run-9",
      }) as never
    );

    expect(getLastFetchUrl()).toContain("testrun_id=run-9");
  });

  it("wraps an API failure with context", async () => {
    mockFetchError(404, "case not found");

    await expect(
      handleGetFlakeVerdict(
        createArgs({ projectId: "proj-1", testcase_id: "nope" }) as never
      )
    ).rejects.toThrow("Failed to get flake verdict");
  });
});
