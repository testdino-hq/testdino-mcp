/**
 * Get Flake Verdict tool — compares a failing test's retry attempts within one
 * run and says whether the failure repeats. Mirrors the streaming
 * `get_flake_verdict` tool; the classification runs on the gateway.
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface GetFlakeVerdictArgs {
  projectId: string;
  testcase_id: string;
  testrun_id?: string;
}

export const getFlakeVerdictTool = {
  name: "get_flake_verdict",
  description:
    "Say whether a failing test behaves the same way every time, by comparing its retry attempts within one run. " +
    "If you are debugging a failing test, call get_debug_evidence first — it returns this plus the regression boundary and every artifact link in one call, so calling this separately afterwards repeats work already done. " +
    'Returns a computed verdict — "deterministic" (every attempt failed with the same signature, so the failure repeats), "flaky" (an attempt passed on retry, so the outcome is not consistent), or "inconclusive" (too few attempts, or the attempts failed differently) — plus the per-attempt signatures behind it. ' +
    "The verdict describes the behaviour, not the cause. It tells you which fixes the evidence cannot support; it does not tell you where the fix goes. Decide that after reading the artifacts, the trace and the code. " +
    "Needs a test that ran with retries enabled; a single attempt is always inconclusive.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID (e.g. project_<id>)",
      },
      testcase_id: {
        type: "string",
        description: "Playwright pw_test_id of the failing case",
      },
      testrun_id: {
        type: "string",
        description:
          "Run scope. Omit to use the most recently started run carrying this case.",
      },
    },
    required: ["projectId", "testcase_id"],
  },
};

export async function handleGetFlakeVerdict(args?: GetFlakeVerdictArgs) {
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
  if (!args.testcase_id) {
    throw new Error("testcase_id is required");
  }

  try {
    const url = endpoints.getFlakeVerdict({
      projectId: String(args.projectId),
      testcase_id: String(args.testcase_id),
      ...(args.testrun_id ? { testrun_id: String(args.testrun_id) } : {}),
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
    throw new Error(`Failed to get flake verdict: ${errorMessage}`);
  }
}
