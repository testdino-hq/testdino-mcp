/**
 * Debug test case tool for AI-assisted failure analysis
 * Fetches historical test case data and debugging prompt from the API
 * The AI client handles aggregation, pattern detection, and root cause analysis
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface DebugTestCaseArgs {
  projectId: string;
  testcase_id?: string;
  testcase_name?: string;
  suite_file_path?: string;
  include_ai_insights?: boolean;
  testrun_id?: string;
}

export const debugTestCaseTool = {
  name: "debug_testcase",
  description:
    "Fetch historical execution and failure data for a specific test case. Returns raw historical data with test run details (ID, counter, branch), test runs summary, and a debugging prompt from the API. Each execution includes its associated test run information (testRunId, testRunCounter, branch) to help correlate failures across different test runs and branches. The AI client will analyze the data to identify failure patterns, find root causes, and provide fix suggestions. Use this when you need to debug a failing test case. Example: 'Debug test case \"Verify user login\"'. " +
    "Identify the test by testcase_id (its pw_test_id, exact) or testcase_name (its title). A title can match several tests (the same test under several Playwright projects, or the same title in several files): pair it with suite_file_path, and if the response is 409 AMBIGUOUS_IDENTITY, call again with testcase_id set to the pw_test_id of the candidate you mean. " +
    "Set include_ai_insights=true to also get TestDino's stored AI analysis for this test under `ai_fixes`: recommendations (investigation/remediation steps + reasoning + historical insight) and quick fixes (concrete fixes, often with code snippets, plus long-term stabilization steps). By default they target the most recent failing execution; pass testrun_id to target a specific run. " +
    'AI payloads are generated lazily — if `ai_fixes` sections report status "in_progress", poll get_ai_insights(testrun_id=..., testcase_id=...) until they report "completed". An "unavailable" section carries the upstream statusCode: a 5xx or timeout is transient (retry once via get_ai_insights); a 4xx (bad ids) is terminal.',
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID (Required). The TestDino project identifier.",
      },
      testcase_name: {
        type: "string",
        description:
          "Test case name/title to debug. Required unless testcase_id is given. Example: 'Verify user can logout and login'.",
      },
      testcase_id: {
        type: "string",
        description:
          "The test's pw_test_id — exact, never ambiguous. Wins over testcase_name and suite_file_path.",
      },
      suite_file_path: {
        type: "string",
        description:
          "Optional spec file path to disambiguate when several tests share the same title. Example: 'tests/checkout.spec.ts'.",
      },
      include_ai_insights: {
        type: "boolean",
        description:
          "Attach AI recommendations + quick fixes for this test under `ai_fixes` (targets the most recent failing execution unless testrun_id is set). If a section reports `in_progress`, poll get_ai_insights(testrun_id=..., testcase_id=...) instead of re-calling this tool.",
      },
      testrun_id: {
        type: "string",
        description:
          "Only with include_ai_insights: target the AI fixes at this specific run instead of the most recent failure.",
      },
    },
    required: ["projectId"],
  },
};

export async function handleDebugTestCase(args?: DebugTestCaseArgs) {
  const token = getApiKey(args);

  if (!token) {
    throw new Error(
      "Missing TESTDINO_PAT (PAT) environment variable. " +
        "Please configure it in your .cursor/mcp.json file under the 'env' section."
    );
  }

  if (!args?.projectId) {
    throw new Error("projectId is required");
  }

  if (!args?.testcase_id && !args?.testcase_name) {
    throw new Error("testcase_id or testcase_name is required");
  }

  try {
    // Call the debug endpoint - API returns historical data and debugging_prompt
    const debugUrl = endpoints.debugTestCase({
      projectId: String(args.projectId),
      ...(args.testcase_id ? { testcase_id: String(args.testcase_id) } : {}),
      ...(args.testcase_name
        ? { testcase_name: String(args.testcase_name) }
        : {}),
      ...(args.suite_file_path
        ? { suite_file_path: String(args.suite_file_path) }
        : {}),
      ...(args.include_ai_insights === true
        ? { include_ai_insights: true }
        : {}),
      ...(args.testrun_id ? { testrun_id: String(args.testrun_id) } : {}),
    });

    const response = await apiRequestJson<unknown>(debugUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // TDV2-112: keep the tool response a single VALID STANDALONE JSON block.
    // The screenshot guidance was previously pushed as a SECOND text block after
    // the JSON payload; fold it INTO the JSON (a `_agent_guidance` field) instead
    // so the raw response parses cleanly on its own.
    const probe = JSON.stringify(response, null, 2);
    const hasImages =
      probe.includes('"contentType": "image/') ||
      probe.includes('"name": "screenshot"');
    const isPlainObject =
      response !== null &&
      typeof response === "object" &&
      !Array.isArray(response);

    const payload =
      hasImages && isPlainObject
        ? {
            ...(response as Record<string, unknown>),
            _agent_guidance:
              "Screenshot images are available in the historical test data. Fetch and view the screenshot URLs in the attempts' attachments to visually inspect the application state at the time of each failure — this is critical for accurate root cause analysis.",
          }
        : response;

    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to debug test case: ${errorMessage}`);
  }
}
