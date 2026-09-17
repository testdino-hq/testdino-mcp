/**
 * Bulk link automated tests tool — up to 500 case ↔ test pairs in one call
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";
import { MISSING_PAT_MESSAGE, toolResult } from "./_shared.js";

interface BulkLinkRow {
  manualTestCaseId: string;
  pwTestId: string;
  fullTitle: string;
  displayTitle?: string;
}

interface BulkLinkAutomatedTestsArgs {
  projectId: string;
  links: BulkLinkRow[];
}

export const bulkLinkAutomatedTestsTool = {
  name: "bulk_link_automated_tests",
  description:
    "Link up to 500 manual case ↔ automated test pairs in one call. Requires write permission and the automation_linking plan feature. " +
    "Returns per-item results ({ manualTestCaseId, fullTitle, success, error?, link? }) — one bad row never fails the batch, so ALWAYS check each item's success. " +
    "manualTestCaseId is the case internal _id (tcm_tc_…), not the TC-123 key. Take pwTestId + fullTitle for every row from list_automated_tests.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID (Required). The TestDino project identifier.",
      },
      links: {
        type: "array",
        description: "Pairs to link (1–500).",
        minItems: 1,
        maxItems: 500,
        items: {
          type: "object",
          properties: {
            manualTestCaseId: {
              type: "string",
              description: "Case internal _id (tcm_tc_…).",
            },
            pwTestId: { type: "string" },
            fullTitle: { type: "string" },
            displayTitle: { type: "string" },
          },
          required: ["manualTestCaseId", "pwTestId", "fullTitle"],
        },
      },
    },
    required: ["projectId", "links"],
  },
};

export async function handleBulkLinkAutomatedTests(
  args?: BulkLinkAutomatedTestsArgs
) {
  const token = getApiKey(args);
  if (!token) {
    throw new Error(MISSING_PAT_MESSAGE);
  }
  if (!args?.projectId) {
    throw new Error("projectId is required");
  }
  if (!Array.isArray(args?.links) || args.links.length === 0) {
    throw new Error("links must be a non-empty array");
  }
  if (args.links.length > 500) {
    throw new Error("links accepts at most 500 items per call");
  }

  try {
    const url = endpoints.bulkLinkAutomatedTests(String(args.projectId));
    const response = await apiRequestJson<unknown>(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { links: args.links },
    });
    return toolResult(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to bulk link automated tests: ${errorMessage}`);
  }
}
