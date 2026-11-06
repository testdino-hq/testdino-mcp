/**
 * Get Trace Analysis tool. Mirrors the streaming `get_trace_analysis` tool:
 * forwards to the gateway, which returns the stored trace facts when trace
 * analysis is on, and otherwise the signed trace URL and the Playwright CLI runbook.
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
  testcase_ids?: string[] | null;
  testrun_id?: string;
  find?: string | null;
}

export const getTraceAnalysisTool = {
  name: "get_trace_analysis",
  title: "Get Trace Analysis",
  description:
    "See what happened inside a failing test. Where trace analysis is on, this is the failing action, errors, console errors, failed requests and the page near the failure, with where to start and what each further step costs. If no analysis is available it returns a runbook for reading the trace with the Playwright CLI (Playwright 1.59+). Pass projectId + testcase_id (the Playwright pw_test_id) for that case's analysis and a short-lived trace download URL; optionally scope with testrun_id. Omit the ids to just get the runbook for a trace.zip you already have locally. If analysis_status is processing, call again shortly. To check anything else in an analysed trace, pass find with testcase_id and testrun_id: it searches actions and request file names without a download. Several failures from one run? Pass testcase_ids with testrun_id: one call, with the shared text sent once. Report the root cause and fix.",
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
      testcase_ids: {
        anyOf: [
          {
            type: "array",
            items: {
              type: "string",
              minLength: 1,
            },
            maxItems: 10,
          },
          {
            type: "null",
          },
        ],
        description:
          "Several pw_test_ids from one run, instead of testcase_id. Needs testrun_id. Results are under `tests`.",
      },
      find: {
        anyOf: [
          {
            type: "string",
            maxLength: 200,
          },
          {
            type: "null",
          },
        ],
        description:
          'Plain text to search for in this test\'s actions and requests, for example "quantity" or "cart|checkout" (| means or). Needs testcase_id and testrun_id, and a completed analysis.',
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
      ...(args.testcase_ids?.length
        ? { testcase_ids: args.testcase_ids.join(",") }
        : {}),
      ...(args.testrun_id ? { testrun_id: String(args.testrun_id) } : {}),
      ...(args.find ? { find: String(args.find) } : {}),
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
