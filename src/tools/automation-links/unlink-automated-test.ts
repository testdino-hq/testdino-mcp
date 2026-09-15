/**
 * Unlink automated test tool — remove one link by linkId
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";
import { MISSING_PAT_MESSAGE, toolResult } from "./_shared.js";

interface UnlinkAutomatedTestArgs {
  projectId: string;
  caseId: string;
  linkId: string;
}

export const unlinkAutomatedTestTool = {
  name: "unlink_automated_test",
  description:
    "Remove one automated-test link from a manual test case by its linkId (the `_id` of a linkedTests entry — from get_test_case_links or get_manual_test_case). Requires write permission; not gated by plan so a downgraded org can still detach. " +
    "When the last link is removed the case automationStatus reverts to Manual. 404 when the linkId is not on that case.",
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
          "Manual test case ID (Required). Internal _id or 'TC-123' style ID.",
      },
      linkId: {
        type: "string",
        description: "linkedTests[]._id (Required), e.g. 'tcm_link_…'.",
      },
    },
    required: ["projectId", "caseId", "linkId"],
  },
};

export async function handleUnlinkAutomatedTest(
  args?: UnlinkAutomatedTestArgs
) {
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
  if (!args?.linkId) {
    throw new Error("linkId is required");
  }

  try {
    const url = endpoints.unlinkAutomatedTest(
      String(args.projectId),
      String(args.caseId),
      String(args.linkId)
    );
    const response = await apiRequestJson<unknown>(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    return toolResult(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to unlink automated test: ${errorMessage}`);
  }
}
