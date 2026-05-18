/**
 * Update one per-case execution record inside a run — set assignee, result, elapsed.
 * Mirrors what clicking "Assign to" + the result pill does in the UI.
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface UpdateRunTestCaseArgs {
  projectId: string;
  runId: string;
  rtcRef: string;
  updates: Record<string, unknown>;
}

export const updateRunTestCaseTool = {
  name: "update_run_test_case",
  description:
    "Set the assignee and/or result for one test case inside a manual run — exactly what clicking 'Assign to' and changing the result pill does in the UI. Requires write permission. rtcRef accepts the caseKey ('TC-156'), the internal `tcm_rtc_...` RTC ID, or the underlying test case _id. Works for both already-touched cases and 'untested' virtual cases (the server auto-creates the per-case record on first edit). IMPORTANT: updates.assigneeUserId accepts an email OR a User _id — both work. updates.result canonical values are 'untested', 'passed', 'failed', 'blocked', 'skipped', 'retest' — pass display ('Passed', 'Blocked') or canonical form, server normalizes lowercase+underscored. To assign or update multiple cases at once, call this tool in parallel (one call per case).",
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
          "Fields to update: assigneeUserId (email or _id, pass null to unassign), result/status (display or canonical form), elapsed (seconds).",
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
