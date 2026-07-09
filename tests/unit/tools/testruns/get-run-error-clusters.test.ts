import { describe, it, expect, afterEach } from "vitest";
import {
  mockFetchSuccess,
  restoreFetch,
  getLastFetchUrl,
  getLastFetchOptions,
} from "../../../helpers/mockFetch.js";
import { createArgs, parseToolResponse } from "../../../helpers/mockTypes.js";
import { handleGetRunErrorClusters } from "../../../../src/tools/testruns/get-run-error-clusters.js";

describe("handleGetRunErrorClusters", () => {
  afterEach(() => {
    restoreFetch();
  });

  it("rejects a missing testrun_id", async () => {
    // Both testrun_id AND projectId are marked required in the schema, but
    // an AI can drop testrun_id and expect the tool to "figure it out." Fail
    // fast client-side with a clear message pointing at the missing arg.
    await expect(
      handleGetRunErrorClusters(createArgs({}) as never)
    ).rejects.toThrow(/testrun_id is required/);
  });

  it("rejects a testrun_id that is a whitespace-only string", async () => {
    // A silent trim-fail would call the endpoint with an empty testrun_id and
    // hit the data-handler's 400 with a less useful message.
    await expect(
      handleGetRunErrorClusters(
        createArgs({ testrun_id: "   " }) as never
      )
    ).rejects.toThrow(/testrun_id is required/);
  });

  it("rejects an invalid status", async () => {
    // Status is the only enum on this tool. Catching it client-side prevents
    // the AI from inventing values like 'timeout' that would round-trip to
    // the backend and return an unhelpful 400.
    await expect(
      handleGetRunErrorClusters(
        createArgs({ testrun_id: "tr_1", status: "timeout" }) as never
      )
    ).rejects.toThrow(/Invalid status 'timeout'/);
  });

  it("hits the error-clusters endpoint with testrun_id query param", async () => {
    mockFetchSuccess({
      success: true,
      data: {
        clusters: [],
        unclustered: [],
        categoryRollup: {},
        totals: { failed: 0, flaky: 0 },
      },
    });

    await handleGetRunErrorClusters(
      createArgs({ testrun_id: "tr_abc" }) as never
    );

    const url = getLastFetchUrl();
    expect(url).toContain(
      "/api/mcp/test-project-id/get-run-error-clusters?testrun_id=tr_abc"
    );
    expect(getLastFetchOptions()?.method ?? "GET").toBe("GET");
    expect(getLastFetchOptions()?.headers).toEqual(
      expect.objectContaining({ Authorization: "Bearer test-pat-token" })
    );
  });

  it("appends status to the query when supplied", async () => {
    mockFetchSuccess({
      success: true,
      data: { clusters: [], unclustered: [], categoryRollup: {}, totals: {} },
    });

    await handleGetRunErrorClusters(
      createArgs({ testrun_id: "tr_abc", status: "failed" }) as never
    );

    const url = getLastFetchUrl();
    expect(url).toContain("testrun_id=tr_abc");
    expect(url).toContain("status=failed");
  });

  it("does NOT add status to the URL when omitted (server default applies)", async () => {
    // Behavior test: passing status=undefined should not send `status=`
    // (would query-string as "status=undefined" or "status=" with a naive
    // implementation and confuse the data-handler).
    mockFetchSuccess({
      success: true,
      data: { clusters: [], unclustered: [], categoryRollup: {}, totals: {} },
    });

    await handleGetRunErrorClusters(
      createArgs({ testrun_id: "tr_abc" }) as never
    );

    const url = getLastFetchUrl();
    expect(url).not.toContain("status=");
  });

  it("returns the response body verbatim", async () => {
    // Downstream shape includes `clusters[]`, `unclustered[]`, `categoryRollup`,
    // and run `totals`. The client must not reshape any of these — the AI
    // needs the raw structure to reason about distinct failures.
    mockFetchSuccess({
      success: true,
      data: {
        clusters: [
          {
            signature: "TimeoutError: waiting for locator",
            category: "timeout",
            affectedTests: [{ id: "tc_1" }, { id: "tc_2" }],
          },
        ],
        unclustered: [],
        categoryRollup: { timeout: 2 },
        totals: { failed: 2, flaky: 0 },
      },
    });

    const result = await handleGetRunErrorClusters(
      createArgs({ testrun_id: "tr_abc" }) as never
    );

    const parsed = parseToolResponse(result) as {
      data: {
        clusters: Array<{ category: string; affectedTests: unknown[] }>;
        categoryRollup: Record<string, number>;
      };
    };
    expect(parsed.data.clusters[0].category).toBe("timeout");
    expect(parsed.data.clusters[0].affectedTests).toHaveLength(2);
    expect(parsed.data.categoryRollup.timeout).toBe(2);
  });
});
