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
  title: "Bulk Link Automated Tests",
  description:
    "Link up to 500 manual case ↔ automated test pairs in one call. Requires write permission and the automation_linking plan feature. Returns per-item results ({ manualTestCaseId, fullTitle, success, error?, link? }) — one bad row never fails the batch, so ALWAYS check each item's success. manualTestCaseId is the case internal _id (tcm_tc_…), not the TC-123 key. Take pwTestId + fullTitle for every row from list_automated_tests.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID",
      },
      links: {
        type: "array",
        items: {
          type: "object",
          properties: {
            manualTestCaseId: {
              type: "string",
              minLength: 1,
              maxLength: 80,
              description: "Case internal _id (tcm_tc_…)",
            },
            pwTestId: {
              type: "string",
              minLength: 1,
              maxLength: 200,
            },
            fullTitle: {
              type: "string",
              minLength: 1,
              maxLength: 2000,
            },
            displayTitle: {
              type: "string",
              minLength: 1,
              maxLength: 500,
            },
          },
          required: ["manualTestCaseId", "pwTestId", "fullTitle"],
          additionalProperties: false,
        },
        minItems: 1,
        maxItems: 500,
        description: "Pairs to link (1–500)",
      },
    },
    required: ["projectId", "links"],
    additionalProperties: false,
    $schema: "http://json-schema.org/draft-07/schema#",
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
  },
  execution: {
    taskSupport: "forbidden",
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
    throw new Error(`Failed to bulk link automated tests: ${errorMessage}`, {
      cause: error,
    });
  }
}
