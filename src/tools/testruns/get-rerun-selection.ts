/**
 * Get re-run selection tool — read-only. Pairs with rerun_test: this one
 * answers what would run and how, that one acts.
 */

import { endpoints } from "../../lib/endpoints.js";
import { getApiKey } from "../../lib/env.js";
import { postRerun } from "./_rerun.js";

interface GetRerunSelectionArgs {
  projectId?: string;
  runId?: string;
  scope?: string;
  testIds?: string[];
  excludeTestIds?: string[];
}

export const getRerunSelectionTool = {
  name: "get_rerun_selection",
  description:
    "Resolve which of a finished run's tests a re-run should execute — its failed tests, its flaky tests, both, or an explicit list — as the exact Playwright --test-list lines plus the CLI command that runs them. " +
    "Returns `selected` / `in_scope` ('7 of 9'), the lines, any requested ids the run does not have, any test whose title cannot be carried as a line, and `command` (null when nothing is selected). " +
    '`rerun_mechanism` says what a same-commit re-run of this selection would do, so you can tell the user before they confirm one: "in-run" re-runs the failed jobs inside the run\'s own GitHub run, whose check can then turn green (`only_failed_tests` says whether each job runs just its failed tests or repeats in full), while "new-workflow" starts a separate run and carries the `reason` — "flaky-only" and "hand-picked" change if the selection changes, "not-github-actions" and "environment" do not. It is absent when nothing is selected or the answer could not be established. ' +
    "Read-only; nothing runs. To start the run in CI, call rerun_test. " +
    "A 409 means the run is still running (RUN_NOT_FINALIZED) or its results are still being processed (SELECTION_NOT_READY — retry in a few seconds).",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID (Required). The TestDino project identifier.",
      },
      runId: {
        type: "string",
        description:
          "The finished run to re-run from (Required). Example: 'test_run_abc123'.",
      },
      scope: {
        type: "string",
        enum: ["failed", "flaky", "failed-and-flaky"],
        description:
          "failed (default; includes timed out), flaky (passed only on retry), or failed-and-flaky.",
      },
      testIds: {
        type: "array",
        items: { type: "string" },
        description:
          "Exactly these Playwright test ids, overriding scope. Ids the run does not have are reported back.",
      },
      excludeTestIds: {
        type: "array",
        items: { type: "string" },
        description:
          "Playwright test ids to drop from the scope. Ignored when testIds is set.",
      },
    },
    required: ["projectId", "runId"],
  },
};

export async function handleGetRerunSelection(args?: GetRerunSelectionArgs) {
  const token = getApiKey(args);

  if (!token) {
    throw new Error(
      "Missing TESTDINO_PAT environment variable. " +
        "Please configure it in your .cursor/mcp.json file under the 'env' section."
    );
  }

  if (!args?.projectId) {
    throw new Error("projectId is required");
  }

  if (!args?.runId) {
    throw new Error("runId is required");
  }

  try {
    return await postRerun(
      endpoints.getRerunSelection(String(args.projectId)),
      token,
      // An unset field is absent from the JSON, not null.
      {
        runId: String(args.runId),
        scope: args.scope,
        testIds: args.testIds,
        excludeTestIds: args.excludeTestIds,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to resolve the re-run selection: ${errorMessage}`);
  }
}
