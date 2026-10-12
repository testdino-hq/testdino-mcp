/**
 * Get Trace Analysis tool — Playwright trace-CLI runbook + hosted trace URL.
 * Mirrors the streaming `get_trace_analysis` tool. Forwards to the gateway,
 * which resolves a short-lived signed trace download URL for the case and
 * returns the runbook. The analysis itself runs on the caller's machine.
 *
 * Note: unlike the streaming tool (where projectId is optional), this surface
 * routes on `/:projectId/get-trace-analysis`, so projectId is required here;
 * passing it alone still returns the runbook for a local trace.zip.
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface GetTraceAnalysisArgs {
  projectId: string;
  testcase_id?: string;
  testrun_id?: string;
}

export const getTraceAnalysisTool = {
  name: "get_trace_analysis",
  title: "Get Trace Analysis",
  description:
    "Debug a failing Playwright test from its trace.zip using the Playwright agent CLI (npx playwright trace …, Playwright 1.59+). Returns a runbook that teaches the exact CLI protocol (open → actions → action → snapshot → close) plus how to classify the failure and propose a fix. Pass projectId + testcase_id (the Playwright pw_test_id) to also get a short-lived download URL for that case's hosted trace; optionally scope with testrun_id. Omit the ids to just get the runbook for a trace.zip you already have locally. The analysis runs on your machine — download the trace, run the CLI commands yourself, then report the root cause and fix.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: ["string", "null"],
        description:
          "Project ID — required to resolve the hosted trace download URL",
      },
      testcase_id: {
        type: ["string", "null"],
        description:
          "Playwright pw_test_id of the failing case whose hosted trace to resolve",
      },
      testrun_id: {
        type: ["string", "null"],
        description: "Optional run scope for testcase_id (single run)",
      },
    },
    additionalProperties: false,
    $schema: "http://json-schema.org/draft-07/schema#",
  },
  annotations: {
    readOnlyHint: true,
  },
  execution: {
    taskSupport: "forbidden",
  },
};

export async function handleGetTraceAnalysis(args?: GetTraceAnalysisArgs) {
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

  try {
    const url = endpoints.getTraceAnalysis({
      projectId: String(args.projectId),
      ...(args.testcase_id ? { testcase_id: String(args.testcase_id) } : {}),
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
    throw new Error(`Failed to retrieve trace analysis: ${errorMessage}`, {
      cause: error,
    });
  }
}
