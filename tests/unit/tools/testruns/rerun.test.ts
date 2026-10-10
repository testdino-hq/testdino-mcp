// The two re-run tools. What is specific to them: they POST a JSON body (a
// selection carries up to 10000 ids), and a refusal is a 400 whose body is the
// answer, so it has to reach the agent intact rather than as a thrown string.
// The no-retry-on-write rule and the 429 hint are covered in lib/request.test.ts.

import { describe, it, expect, afterEach } from "vitest";
import {
  mockFetchSuccess,
  mockFetchError,
  mockFetchNetworkError,
  restoreFetch,
  getLastFetchUrl,
  getLastFetchOptions,
} from "../../../helpers/mockFetch.js";
import { createArgs, parseToolResponse } from "../../../helpers/mockTypes.js";
import { handleGetRerunSelection } from "../../../../src/tools/testruns/get-rerun-selection.js";
import { handleRerunTest } from "../../../../src/tools/testruns/rerun-test.js";

const RUN = "test_run_abc123";

const bodyOf = (): Record<string, unknown> =>
  JSON.parse(String(getLastFetchOptions()?.body)) as Record<string, unknown>;

afterEach(() => {
  restoreFetch();
  delete process.env.TESTDINO_PAT;
});

describe("handleGetRerunSelection", () => {
  it("throws when args are undefined", async () => {
    process.env.TESTDINO_PAT = "test-pat";
    await expect(handleGetRerunSelection(undefined)).rejects.toThrow(
      "projectId is required"
    );
  });

  it("throws when runId is missing", async () => {
    await expect(
      handleGetRerunSelection(createArgs() as never)
    ).rejects.toThrow("runId is required");
  });

  it("throws when no PAT is configured", async () => {
    await expect(
      handleGetRerunSelection({ projectId: "p1", runId: RUN })
    ).rejects.toThrow("Missing TESTDINO_PAT");
  });

  it("POSTs the selection to the right endpoint", async () => {
    mockFetchSuccess({ selected: 2 });

    await handleGetRerunSelection(
      createArgs({ runId: RUN, scope: "failed-and-flaky" }) as never
    );

    expect(getLastFetchUrl()).toContain(
      "/api/mcp/test-project-id/get-rerun-selection"
    );
    expect(getLastFetchOptions()?.method).toBe("POST");
    expect(bodyOf()).toEqual({ runId: RUN, scope: "failed-and-flaky" });
  });

  // The gateway schema is `.strict()`, so a key sent as undefined would be a
  // 400 rather than an omitted field.
  it("omits the fields the caller did not set", async () => {
    mockFetchSuccess({ selected: 2 });

    await handleGetRerunSelection(createArgs({ runId: RUN }) as never);

    expect(Object.keys(bodyOf()).sort()).toEqual(["runId"]);
  });

  it("forwards the id lists", async () => {
    mockFetchSuccess({ selected: 1 });

    await handleGetRerunSelection(
      createArgs({ runId: RUN, testIds: ["a"], excludeTestIds: ["b"] }) as never
    );

    expect(bodyOf()).toMatchObject({ testIds: ["a"], excludeTestIds: ["b"] });
  });

  it("returns the mechanism so the agent can tell the user what would happen", async () => {
    mockFetchSuccess({
      selected: 2,
      rerun_mechanism: {
        same_commit: "in-run",
        reason: null,
        github_run: "4242",
        only_failed_tests: true,
      },
    });

    const res = await handleGetRerunSelection(
      createArgs({ runId: RUN }) as never
    );

    expect(parseToolResponse(res)).toMatchObject({
      rerun_mechanism: { same_commit: "in-run", github_run: "4242" },
    });
  });
});

describe("handleRerunTest", () => {
  it("throws when runId is missing", async () => {
    await expect(handleRerunTest(createArgs() as never)).rejects.toThrow(
      "runId is required"
    );
  });

  it("POSTs every dispatch field it was given", async () => {
    mockFetchSuccess({ dispatched: true });

    await handleRerunTest(
      createArgs({
        runId: RUN,
        mode: "latest",
        workflow: "CI",
        ref: "main",
        tags: ["nightly"],
        confirm: true,
      }) as never
    );

    expect(getLastFetchUrl()).toContain("/api/mcp/test-project-id/rerun-test");
    expect(getLastFetchOptions()?.method).toBe("POST");
    expect(bodyOf()).toEqual({
      runId: RUN,
      mode: "latest",
      workflow: "CI",
      ref: "main",
      tags: ["nightly"],
      confirm: true,
    });
  });

  // The rule this release exists for. A mutation to `args.mode ?? "same-commit"`
  // passed every other test here: the server would then dispatch a re-run
  // instead of answering MODE_REQUIRED, and nobody would have been asked.
  it("sends no mode when the caller did not give one", async () => {
    mockFetchError(
      400,
      JSON.stringify({
        success: false,
        error: { code: "MODE_REQUIRED", message: "ask the user" },
      })
    );

    await handleRerunTest(createArgs({ runId: RUN, confirm: true }) as never);

    expect(Object.keys(bodyOf()).sort()).toEqual(["confirm", "runId"]);
  });

  // `false` must survive as `false`: dropping it would read as "not sent" and
  // sending it as a string would be coerced somewhere into a yes.
  it("forwards confirm: false rather than dropping it", async () => {
    mockFetchError(
      400,
      JSON.stringify({
        success: false,
        error: { code: "CONFIRM_REQUIRED", message: "ask first" },
      })
    );

    await handleRerunTest(createArgs({ runId: RUN, confirm: false }) as never);

    expect(bodyOf()).toMatchObject({ confirm: false });
  });
});

describe("re-run refusals reach the agent instead of being thrown", () => {
  // Without this, apiRequestJson would throw the body as a string truncated at
  // 500 characters and the agent would lose the question, the mechanism and
  // the fallback command — the entire content of the refusal.
  it("returns a 400 contract refusal as tool output, in full", async () => {
    const refusal = {
      success: false,
      error: {
        code: "MODE_REQUIRED",
        message:
          'Ask the user which code to re-run; there is no default, because the two answer different questions. mode "same-commit" re-runs the commit that failed, which tells them whether the failures are real or flaky; `rerun_mechanism` says what that would do on this run. mode "latest" runs the branch tip, which tells them whether a fix landed, and always starts a separate workflow run that leaves this run\'s check red. Then call again with mode and confirm: true.',
      },
      rerun_mechanism: {
        same_commit: "in-run",
        reason: null,
        github_run: "4242",
        only_failed_tests: true,
      },
      command: `npx tdpw test --rerun failed --from-run ${RUN}`,
    };
    expect(JSON.stringify(refusal).length).toBeGreaterThan(500);
    mockFetchError(400, JSON.stringify(refusal));

    const res = await handleRerunTest(
      createArgs({ runId: RUN, confirm: true }) as never
    );

    const parsed = parseToolResponse(res) as typeof refusal;
    expect(parsed.error.code).toBe("MODE_REQUIRED");
    expect(parsed.error.message).toBe(refusal.error.message);
    expect(parsed.rerun_mechanism.github_run).toBe("4242");
    expect(parsed.command).toContain("npx tdpw test");
  });

  it("returns a 400 refusal from the preview too", async () => {
    mockFetchError(
      400,
      JSON.stringify({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "runId: a TestDino run id",
        },
      })
    );

    const res = await handleGetRerunSelection(
      createArgs({ runId: RUN }) as never
    );

    expect(parseToolResponse(res)).toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    });
  });

  // The hosted server sets isError and puts statusCode first on every result
  // over 400; a client branching on either must not see a refusal as a success.
  it("marks a refusal as an error and carries the status, like the hosted server", async () => {
    mockFetchError(
      400,
      JSON.stringify({
        success: false,
        error: { code: "CONFIRM_REQUIRED", message: "ask first" },
      })
    );

    const res = await handleRerunTest(
      createArgs({ runId: RUN, confirm: true }) as never
    );

    expect(res.isError).toBe(true);
    expect(parseToolResponse(res)).toMatchObject({
      statusCode: 400,
      error: { code: "CONFIRM_REQUIRED" },
    });
  });

  // Integration passes its own 400s through the gateway unchanged, and its
  // envelope is `error: "<CODE>"` as a string. Treating only the object form as
  // a refusal threw every GitHub refusal as a truncated string.
  it("accepts integration's string error envelope as a refusal", async () => {
    mockFetchError(
      400,
      JSON.stringify({
        success: false,
        error: "GITHUB_DISPATCH_FAILED",
        message: "GitHub rejected the workflow_dispatch",
      })
    );

    const res = await handleRerunTest(
      createArgs({
        runId: RUN,
        confirm: true,
        mode: "latest",
        workflow: "CI",
      }) as never
    );

    expect(res.isError).toBe(true);
    expect(parseToolResponse(res)).toMatchObject({
      error: "GITHUB_DISPATCH_FAILED",
    });
  });

  // A timed-out write is never retried, so the agent cannot tell whether CI
  // started. Saying "may already have started" is the difference between one
  // re-run and two. The timer itself is request.ts's; this is what postRerun
  // adds on top of it, so the stub throws exactly what fetchOnce throws.
  it("tells the agent a timeout may still have started the re-run", async () => {
    mockFetchNetworkError("API request timed out after 30000ms");

    await expect(
      handleRerunTest(createArgs({ runId: RUN, confirm: true }) as never)
    ).rejects.toThrow(
      /timed out after 30000ms\. The re-run may already have started/
    );
  });

  // Any other transport failure keeps its message untouched.
  it("does not add the timeout warning to an unrelated network error", async () => {
    mockFetchNetworkError("fetch failed");

    await expect(
      handleRerunTest(createArgs({ runId: RUN, confirm: true }) as never)
    ).rejects.not.toThrow(/may already have started/);
  });

  it.each([
    [401, "Unauthorized"],
    [403, "Forbidden"],
    [404, "Not Found"],
    [409, "Conflict"],
    [500, "Internal Server Error"],
  ])("still throws on %i, which is not a re-run refusal", async (status) => {
    mockFetchError(
      status,
      JSON.stringify({ success: false, error: { code: "NOPE", message: "x" } })
    );

    await expect(
      handleRerunTest(createArgs({ runId: RUN, confirm: true }) as never)
    ).rejects.toThrow(`API request failed: ${status}`);
  });

  // A 400 that is not the documented envelope is a transport-level failure, not
  // an answer to show the user.
  it.each([
    ["a plain-text body", "upstream exploded"],
    ["JSON without an error code", JSON.stringify({ success: false })],
    [
      "JSON whose error has no code",
      JSON.stringify({ error: { message: "x" } }),
    ],
  ])("still throws on a 400 with %s", async (_name, body) => {
    mockFetchError(400, body);

    await expect(
      handleRerunTest(createArgs({ runId: RUN, confirm: true }) as never)
    ).rejects.toThrow("API request failed: 400");
  });
});
