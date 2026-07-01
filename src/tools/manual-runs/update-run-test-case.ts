/**
 * Update one per-case execution record inside a run — set assignee, result, elapsed.
 * Mirrors what clicking "Assign to" + the result pill does in the UI.
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";
import {
  attachmentItemSchema,
  linkedIssueItemSchema,
  stepResultItemSchema,
} from "../../lib/item-schemas.js";

interface UpdateRunTestCaseArgs {
  projectId: string;
  runId: string;
  rtcRef: string;
  updates: Record<string, unknown>;
}

export const updateRunTestCaseTool = {
  name: "update_run_test_case",
  description:
    "Update one test case inside a manual run. Two modes: (1) Quick verdict — pass updates.assigneeUserId and/or updates.result/status to do what clicking Assign to and the result pill does in the UI. (2) Detailed result — additionally pass updates.comment, updates.linkedIssues, updates.attachments, or updates.stepResults to record a full result entry. Combining updates.assigneeUserId with any detailed-result field in one call is rejected; make two calls. rtcRef accepts caseKey ('TC-156'), internal `tcm_rtc_...` RTC ID, or the underlying test case _id. Closed runs reject result writes.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: { type: "string", description: "Project ID (required)." },
      runId: {
        type: "string",
        description:
          "Internal run _id or counter-style ID e.g. 'RUN-12' (required).",
      },
      rtcRef: {
        type: "string",
        description:
          "Per-case record reference — `tcm_rtc_...` _id, caseKey ('TC-156'), or underlying test case _id (required).",
      },
      updates: {
        type: "object",
        description:
          "Quick verdict: assigneeUserId (email or _id, pass null to unassign), result/status (display or canonical form), elapsed (seconds). Detailed result: comment (rich HTML), linkedIssues, attachments, stepResults.",
        properties: {
          assigneeUserId: {
            type: "string",
            description:
              "User _id or email. Pass null in raw JSON to unassign.",
          },
          result: {
            type: "string",
            description:
              "Result/status. Display ('Passed') or canonical ('passed') form.",
          },
          status: {
            type: "string",
            description: "Alias for result.",
          },
          elapsed: {
            type: "number",
            description: "Elapsed time in seconds.",
          },
          comment: {
            type: "string",
            description: "Rich HTML comment for a detailed result entry.",
          },
          linkedIssues: {
            type: "array",
            items: linkedIssueItemSchema,
          },
          attachments: {
            type: "array",
            items: attachmentItemSchema,
          },
          stepResults: {
            type: "array",
            items: stepResultItemSchema,
          },
        },
        additionalProperties: true,
      },
    },
    required: ["projectId", "runId", "rtcRef", "updates"],
  },
};

export async function handleUpdateRunTestCase(args?: UpdateRunTestCaseArgs) {
  const token = getApiKey(args);
  if (!token) {
    throw new Error(
      "Missing TESTDINO_PAT environment variable. Configure it in your .cursor/mcp.json under 'env'."
    );
  }
  if (!args?.projectId) throw new Error("projectId is required");
  if (!args?.runId) throw new Error("runId is required");
  if (!args?.rtcRef) throw new Error("rtcRef is required");
  if (!args?.updates || typeof args.updates !== "object") {
    throw new Error("updates must be an object containing fields to modify");
  }

  try {
    const url = endpoints.updateRunTestCase(
      String(args.projectId),
      String(args.runId),
      String(args.rtcRef)
    );
    const response = await apiRequestJson<unknown>(url, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: { updates: args.updates },
    });
    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to update run test case: ${msg}`);
  }
}
