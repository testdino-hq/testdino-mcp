import { describe, it, expect, afterEach } from "vitest";
import {
  mockFetchSuccess,
  mockFetchError,
  restoreFetch,
  getLastFetchUrl,
} from "../../../helpers/mockFetch.js";
import { createArgs } from "../../../helpers/mockTypes.js";
import { handleVerifyFix } from "../../../../src/tools/testcases/verify-fix.js";

const validArgs = {
  projectId: "proj-1",
  testcase_name: "login works",
  baseline_run_id: "run-9",
};

describe("handleVerifyFix", () => {
  afterEach(() => {
    restoreFetch();
    delete process.env.TESTDINO_PAT;
  });

  it("throws when PAT is missing", async () => {
    await expect(handleVerifyFix(validArgs)).rejects.toThrow(
      "Missing TESTDINO_PAT"
    );
  });

  it.each([
    [
      "projectId",
      { projectId: undefined, testcase_name: "t", baseline_run_id: "r" },
    ],
    ["testcase_name", { projectId: "p", baseline_run_id: "r" }],
    ["baseline_run_id", { projectId: "p", testcase_name: "t" }],
  ])("throws when %s is missing", async (param, args) => {
    process.env.TESTDINO_PAT = "test-pat";
    await expect(handleVerifyFix(createArgs(args) as never)).rejects.toThrow(
      `${param} is required`
    );
  });

  it("forwards the title and baseline run, omitting suite_file_path when not given", async () => {
    mockFetchSuccess({ status: "fixed" });

    const result = await handleVerifyFix(createArgs(validArgs) as never);

    const url = getLastFetchUrl();
    expect(url).toContain("/api/mcp/proj-1/verify-fix");
    expect(url).toContain("testcase_name=login+works");
    expect(url).toContain("baseline_run_id=run-9");
    expect(url).not.toContain("suite_file_path");
    expect(JSON.parse(result.content[0].text)).toEqual({ status: "fixed" });
  });

  it("forwards suite_file_path to disambiguate a shared title", async () => {
    mockFetchSuccess({ status: "not_fixed" });

    await handleVerifyFix(
      createArgs({
        ...validArgs,
        suite_file_path: "e2e/login.spec.ts",
      }) as never
    );

    expect(getLastFetchUrl()).toContain("suite_file_path=e2e%2Flogin.spec.ts");
  });

  it("wraps an API failure with context", async () => {
    mockFetchError(500, "boom");

    await expect(
      handleVerifyFix(createArgs(validArgs) as never)
    ).rejects.toThrow("Failed to verify fix");
  });
});
