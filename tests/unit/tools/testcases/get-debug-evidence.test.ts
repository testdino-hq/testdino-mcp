import { describe, it, expect, afterEach, vi } from "vitest";
import {
  mockFetchSuccess,
  mockFetchError,
  restoreFetch,
  getLastFetchUrl,
} from "../../../helpers/mockFetch.js";
import { createArgs } from "../../../helpers/mockTypes.js";
import { handleGetDebugEvidence } from "../../../../src/tools/testcases/get-debug-evidence.js";

function mockFetchText(text: string, ok = true, status = 200): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok,
      status,
      statusText: ok ? "OK" : "Error",
      json: () => Promise.reject(new Error("not json")),
      text: () => Promise.resolve(text),
    })
  );
}

describe("handleGetDebugEvidence", () => {
  afterEach(() => {
    restoreFetch();
    delete process.env.TESTDINO_PAT;
  });

  it("throws when PAT is missing", async () => {
    await expect(
      handleGetDebugEvidence({ projectId: "proj-1", testcase_id: "pw-1" })
    ).rejects.toThrow("Missing TESTDINO_PAT");
  });

  it("throws when projectId is missing", async () => {
    process.env.TESTDINO_PAT = "test-pat";
    await expect(
      handleGetDebugEvidence(
        createArgs({ projectId: undefined, testcase_id: "pw-1" }) as never
      )
    ).rejects.toThrow("projectId is required");
  });

  it("defaults to JSON and sends no format/instructions/maxLength params", async () => {
    mockFetchSuccess({ test: { title: "login works" } });

    const result = await handleGetDebugEvidence(
      createArgs({ projectId: "proj-1", testcase_name: "login works" }) as never
    );

    const url = getLastFetchUrl();
    expect(url).toContain("/api/mcp/proj-1/get-debug-evidence");
    expect(url).toContain("testcase_name=login+works");
    expect(url).not.toContain("format=");
    expect(url).not.toContain("include_instructions");
    expect(url).not.toContain("maxLength");
    expect(JSON.parse(result.content[0].text)).toEqual({
      test: { title: "login works" },
    });
  });

  it("forwards every identifier and only an explicit include_instructions=false", async () => {
    mockFetchSuccess({});

    await handleGetDebugEvidence(
      createArgs({
        projectId: "proj-1",
        testcase_id: "pw-1",
        testrun_id: "run-1",
        suite_file_path: "e2e/login.spec.ts",
        include_instructions: false,
      }) as never
    );

    const url = getLastFetchUrl();
    expect(url).toContain("testcase_id=pw-1");
    expect(url).toContain("testrun_id=run-1");
    expect(url).toContain("suite_file_path=e2e%2Flogin.spec.ts");
    expect(url).toContain("include_instructions=false");
  });

  it("returns markdown as raw text (not JSON-parsed) and forwards maxLength", async () => {
    mockFetchText("# Evidence\n\nverdict: flaky");

    const result = await handleGetDebugEvidence(
      createArgs({
        projectId: "proj-1",
        testcase_id: "pw-1",
        format: "md",
        maxLength: 4000,
      }) as never
    );

    const url = getLastFetchUrl();
    expect(url).toContain("format=md");
    expect(url).toContain("maxLength=4000");
    expect(result.content[0].text).toBe("# Evidence\n\nverdict: flaky");
  });

  it("drops a non-positive maxLength instead of sending it", async () => {
    mockFetchText("# Evidence");

    await handleGetDebugEvidence(
      createArgs({
        projectId: "proj-1",
        testcase_id: "pw-1",
        format: "md",
        maxLength: 0,
      }) as never
    );

    expect(getLastFetchUrl()).not.toContain("maxLength");
  });

  it("surfaces a non-2xx on the markdown path with the response body", async () => {
    mockFetchText("case not found", false, 404);

    await expect(
      handleGetDebugEvidence(
        createArgs({
          projectId: "proj-1",
          testcase_id: "nope",
          format: "md",
        }) as never
      )
    ).rejects.toThrow(
      /Failed to get debug evidence: API request failed: 404[\s\S]*case not found/
    );
  });

  it("wraps an API failure on the JSON path with context", async () => {
    mockFetchError(500, "boom");

    await expect(
      handleGetDebugEvidence(
        createArgs({ projectId: "proj-1", testcase_id: "pw-1" }) as never
      )
    ).rejects.toThrow("Failed to get debug evidence");
  });
});
