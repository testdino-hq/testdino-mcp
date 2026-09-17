/**
 * Get Debug Evidence tool — one call for the cheap tier of the debug ladder:
 * flake verdict, regression boundary, and every artifact link. Mirrors the
 * streaming `get_debug_evidence` tool; the composition runs on the gateway.
 */

import { endpoints } from "../../lib/endpoints.js";
import {
  apiRequest,
  apiRequestJson,
  formatApiErrorBody,
} from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface GetDebugEvidenceArgs {
  projectId: string;
  testcase_name?: string;
  testcase_id?: string;
  testrun_id?: string;
  suite_file_path?: string;
  format?: "json" | "md";
  include_instructions?: boolean;
  maxLength?: number;
}

export const getDebugEvidenceTool = {
  name: "get_debug_evidence",
  description:
    "Start every failing-test investigation here. One call returns the whole cheap tier of the evidence ladder: the computed flake verdict with its per-attempt failure signatures, the regression boundary (the last run this test passed and the first it failed), and download links for every stored artifact — trace, screenshots, and the expected/actual/diff images on a visual failure. " +
    'Read all of it before forming a hypothesis. The verdict says whether the failure repeats, never why, so it rules fixes out rather than pointing at a cause; the boundary turns "why does this fail" into "what changed between these two runs", which is a far smaller question. ' +
    "Artifact links are minutes-scale: download what you need immediately, and call this again to mint fresh ones rather than treating an expired link as a missing artifact.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID (e.g. project_<id>)",
      },
      testcase_name: {
        type: "string",
        description:
          "Full test title. Required for the regression boundary — prefer it when known.",
      },
      testcase_id: {
        type: "string",
        description: "The case's pw_test_id.",
      },
      testrun_id: {
        type: "string",
        description:
          "Run scope. Omit to use the most recently started run carrying this case.",
      },
      suite_file_path: {
        type: "string",
        description:
          "Spec file path — only needed when the title is shared across files.",
      },
      format: {
        type: "string",
        enum: ["json", "md"],
        description:
          'Response shape. "md" is markdown, and markedly cheaper for the same content.',
      },
      include_instructions: {
        type: "boolean",
        description:
          "Default true. The procedure and the trace runbook are identical on every call and about half the response — set false on repeat calls once you have read them.",
      },
      maxLength: {
        type: "integer",
        description:
          'Cap the markdown length. Applies to format="md" only; anything cut is announced in the output. JSON is never truncated, because a cut payload would not parse and would read as a complete one.',
      },
    },
    required: ["projectId"],
  },
};

export async function handleGetDebugEvidence(args?: GetDebugEvidenceArgs) {
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

  const format = args.format === "md" ? "md" : "json";

  try {
    const url = endpoints.getDebugEvidence({
      projectId: String(args.projectId),
      ...(args.testcase_name
        ? { testcase_name: String(args.testcase_name) }
        : {}),
      ...(args.testcase_id ? { testcase_id: String(args.testcase_id) } : {}),
      ...(args.testrun_id ? { testrun_id: String(args.testrun_id) } : {}),
      ...(args.suite_file_path
        ? { suite_file_path: String(args.suite_file_path) }
        : {}),
      ...(format === "md" ? { format } : {}),
      // Query-string boolean: only an explicit false is worth sending.
      ...(args.include_instructions === false
        ? { include_instructions: "false" }
        : {}),
      ...(typeof args.maxLength === "number" && args.maxLength > 0
        ? { maxLength: Math.floor(args.maxLength) }
        : {}),
    });
    const headers = { Authorization: `Bearer ${token}` };

    // Markdown must reach the agent as raw text; parsing it as JSON would fail.
    if (format === "md") {
      const response = await apiRequest(url, { headers });
      const text = await response.text();
      if (!response.ok) {
        const formattedErrorText = formatApiErrorBody(text);
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}${
            formattedErrorText ? `\n${formattedErrorText}` : ""
          }`
        );
      }
      return { content: [{ type: "text", text }] };
    }

    const response = await apiRequestJson<unknown>(url, { headers });
    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get debug evidence: ${errorMessage}`);
  }
}
