/**
 * Get test case links tool — a manual case's automated-test links with metrics
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";
import { MISSING_PAT_MESSAGE, toolResult } from "./_shared.js";

interface GetTestCaseLinksArgs {
  projectId: string;
  caseId: string;
  days?: number;
}

export const getTestCaseLinksTool = {
  name: "get_test_case_links",
  description:
    "List the automated tests linked to one manual test case, each enriched with recent automation metrics (successRate, lastExecution, platforms). " +
    'caseId accepts the internal _id or the "TC-123" key. get_manual_test_case also returns the raw linkedTests array; use this tool when you need the metrics or a linkId to pass to unlink_automated_test.',
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID (Required). The TestDino project identifier.",
      },
      caseId: {
        type: "string",
        description:
          "Test case ID (Required). Can be internal _id or human-readable ID like 'TC-123'.",
      },
      days: {
        type: "number",
        description:
          "Metrics window in days (server default applies when omitted).",
      },
    },
    required: ["projectId", "caseId"],
  },
};

export async function handleGetTestCaseLinks(args?: GetTestCaseLinksArgs) {
  const token = getApiKey(args);
  if (!token) {
    throw new Error(MISSING_PAT_MESSAGE);
  }
  if (!args?.projectId) {
    throw new Error("projectId is required");
  }
  if (!args?.caseId) {
    throw new Error("caseId is required");
  }

  try {
    const url = endpoints.getTestCaseLinks({
      projectId: String(args.projectId),
      caseId: String(args.caseId),
      days: args.days !== undefined ? Number(args.days) : undefined,
    });
    const response = await apiRequestJson<unknown>(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return toolResult(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get test case links: ${errorMessage}`);
  }
}
