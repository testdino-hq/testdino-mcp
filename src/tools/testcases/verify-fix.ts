/**
 * Verify Fix tool — splits a test's run history at a baseline run and reports
 * whether the fix held. Mirrors the streaming `verify_fix` tool; the
 * comparison runs on the gateway.
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface VerifyFixArgs {
  projectId: string;
  testcase_name: string;
  baseline_run_id: string;
  suite_file_path?: string;
}

export const verifyFixTool = {
  name: "verify_fix",
  description:
    "Check whether a fix actually held for one test, against the run you saw when you proposed it. " +
    'Splits the test\'s run history at that baseline and compares after against before, returning "fixed" (passing with no retries since), "not_fixed" (still failing with the same error), "changed_failure" (still failing, but a different error — a new investigation, and only when every failure since carried a comparable fingerprint), "still_failing" (still failing, but the errors cannot be compared, so neither same nor different can be claimed), "unstable" (passing only after retries, which is not fixed), "no_runs_since_baseline", or "baseline_not_found" (the run id is not one this test executed in). ' +
    "Call this after a new run lands. An unchanged error means the fix missed, not that the test is flaky. " +
    "The baseline run must be one this test actually executed in — an id from another project or another test is rejected rather than answered.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID (e.g. project_<id>)",
      },
      testcase_name: {
        type: "string",
        description: "Full test title, same identifier debug_testcase takes",
      },
      baseline_run_id: {
        type: "string",
        description: "The run you saw the failure in when you proposed the fix",
      },
      suite_file_path: {
        type: "string",
        description:
          "Spec file path — only needed when the title is shared across files",
      },
    },
    required: ["projectId", "testcase_name", "baseline_run_id"],
  },
};

export async function handleVerifyFix(args?: VerifyFixArgs) {
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
  if (!args.testcase_name) {
    throw new Error("testcase_name is required");
  }
  if (!args.baseline_run_id) {
    throw new Error("baseline_run_id is required");
  }

  try {
    const url = endpoints.verifyFix({
      projectId: String(args.projectId),
      testcase_name: String(args.testcase_name),
      baseline_run_id: String(args.baseline_run_id),
      ...(args.suite_file_path
        ? { suite_file_path: String(args.suite_file_path) }
        : {}),
    });

    const response = await apiRequestJson<unknown>(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to verify fix: ${errorMessage}`);
  }
}
