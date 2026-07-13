import { describe, it, expect, afterEach } from "vitest";
import {
  mockFetchSuccess,
  restoreFetch,
  getLastFetchUrl,
  getLastFetchOptions,
} from "../../../helpers/mockFetch.js";
import { createArgs } from "../../../helpers/mockTypes.js";
import { handleGetRunErrorClusters } from "../../../../src/tools/testruns/get-run-error-clusters.js";

describe("handleGetRunErrorClusters", () => {
  afterEach(() => {
    restoreFetch();
    delete process.env.TESTDINO_PAT;
  });

  it("throws when args are undefined", async () => {
    process.env.TESTDINO_PAT = "test-pat";
    await expect(handleGetRunErrorClusters(undefined)).rejects.toThrow(
      "projectId is required"
    );
  });

  it("throws when testrun_id is missing", async () => {
    await expect(
      handleGetRunErrorClusters(
        createArgs({ testrun_id: undefined }) as never
      )
    ).rejects.toThrow("testrun_id is required");
  });

  it("calls the correct endpoint with required params", async () => {
    mockFetchSuccess({ clusters: [] });

    await handleGetRunErrorClusters(
      createArgs({ testrun_id: "run-abc" }) as never
    );

    const url = getLastFetchUrl();
    expect(url).toContain("/api/mcp/test-project-id/run-error-clusters");
    expect(url).toContain("testrun_id=run-abc");
    expect(getLastFetchOptions()?.method ?? "GET").toBe("GET");
  });

  it("passes optional status param when provided", async () => {
    mockFetchSuccess({ clusters: [] });

    await handleGetRunErrorClusters(
      createArgs({ testrun_id: "run-abc", status: "failed" }) as never
    );

    expect(getLastFetchUrl()).toContain("status=failed");
  });

  it("omits status param when not provided", async () => {
    mockFetchSuccess({ clusters: [] });

    await handleGetRunErrorClusters(
      createArgs({ testrun_id: "run-abc" }) as never
    );

    expect(getLastFetchUrl()).not.toContain("status=");
  });

  it("passes flaky status correctly", async () => {
    mockFetchSuccess({ clusters: [] });

    await handleGetRunErrorClusters(
      createArgs({ testrun_id: "run-abc", status: "flaky" }) as never
    );

    expect(getLastFetchUrl()).toContain("status=flaky");
  });

  it("sends Bearer auth and returns formatted MCP content", async () => {
    const mockData = { clusters: [{ error: "TypeError: Cannot read", count: 5, tests: [] }] };
    mockFetchSuccess(mockData);

    const result = await handleGetRunErrorClusters(
      createArgs({ testrun_id: "run-xyz" }) as never
    );

    expect(getLastFetchOptions()?.headers).toEqual(
      expect.objectContaining({ Authorization: "Bearer test-pat-token" })
    );
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.clusters[0].count).toBe(5);
  });
});
