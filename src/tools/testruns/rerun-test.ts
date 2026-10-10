/**
 * Re-run tests in CI — the tool that spends CI minutes. Refusals arrive as a
 * 400 body, not an exception; see _rerun.ts.
 */

import { endpoints } from "../../lib/endpoints.js";
import { getApiKey } from "../../lib/env.js";
import { postRerun } from "./_rerun.js";

interface RerunTestArgs {
  projectId?: string;
  runId?: string;
  workflow?: string;
  ref?: string;
  mode?: string;
  scope?: string;
  testIds?: string[];
  excludeTestIds?: string[];
  tags?: string[];
  confirm?: boolean;
}

export const rerunTestTool = {
  name: "rerun_test",
  description:
    "Re-run a finished run's failed or flaky tests (or an explicit list) in CI, using the same selection as get_rerun_selection. " +
    '`mode` picks which code runs and the two are not interchangeable: "same-commit" repeats the source run\'s commit (a difference in the result is the test, not the code); "latest" runs the branch tip (did the fix land?). ' +
    "There is no default and it is never inferred: ask the user, and call get_rerun_selection first to tell them what each mode would do on this run. An omitted mode is refused with MODE_REQUIRED, carrying both options. " +
    "A same-commit re-run of a GitHub Actions run with a failed or failed-and-flaky scope re-runs the failed jobs inside that original run, exactly as the dashboard does: no `workflow` is needed, the run's check can turn green, and the result says whether each job runs only its failed tests. Otherwise it dispatches `workflow`, which must declare the testdino_rerun_* inputs. " +
    "Costs CI minutes, so it needs the user's explicit yes: call with confirm: true only after showing the user the selection and the workflow. Every refusal happens before anything is dispatched and, where it applies, carries the CLI `command` as the fallback.",
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
      mode: {
        type: "string",
        enum: ["same-commit", "latest"],
        description:
          'Which code runs: "same-commit" repeats the failed commit, "latest" runs the branch tip. No default — ask the user which one they want.',
      },
      workflow: {
        type: "string",
        description:
          "Workflow path, file name, or name declaring a testdino_rerun_from input. Not needed when a same-commit re-run happens inside the original GitHub run.",
      },
      ref: {
        type: "string",
        description:
          "Branch to dispatch on. Defaults to the source run's branch.",
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
        description: "Exactly these Playwright test ids, overriding scope.",
      },
      excludeTestIds: {
        type: "array",
        items: { type: "string" },
        description:
          "Playwright test ids to drop from the scope. Ignored when testIds is set.",
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description:
          "Run tags to add to the re-run (at most 10); it also keeps the source run's tags. Needs a workflow declaring testdino_rerun_tags.",
      },
      confirm: {
        type: "boolean",
        description:
          "Must be literally true, after the user said yes. Anything else is refused.",
      },
    },
    required: ["projectId", "runId", "confirm"],
  },
};

export async function handleRerunTest(args?: RerunTestArgs) {
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
      endpoints.rerunTest(String(args.projectId)),
      token,
      // An unset field is absent from the JSON, not null.
      {
        runId: String(args.runId),
        workflow: args.workflow,
        ref: args.ref,
        mode: args.mode,
        scope: args.scope,
        testIds: args.testIds,
        excludeTestIds: args.excludeTestIds,
        tags: args.tags,
        // Forwarded as given, never coerced: the gateway refuses a non-boolean,
        // and coercing the string "false" would start a re-run nobody approved.
        confirm: args.confirm,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to re-run the tests: ${errorMessage}`);
  }
}
