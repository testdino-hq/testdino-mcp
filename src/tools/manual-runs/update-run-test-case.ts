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
  title: "Update Test Case In A Run",
  description:
    'Update one test case inside a manual run. Two modes, same tool: (1) Quick verdict — pass updates.assigneeUserId and/or updates.result/status to do what clicking "Assign to" and the result pill does in the UI. (2) Detailed result — additionally pass any of updates.comment (rich HTML), updates.linkedIssues, updates.stepResults to record a full result entry, exactly like the UI\'s "Add detailed result…" dialog. Whenever any of those rich fields are present the server logs a complete result instead of a bare status change. NOTE: combining updates.assigneeUserId with any detailed-result field in one call is rejected — make two calls (one to assign, one to record the result), mirroring the UI\'s separate "Assign to" and "Add detailed result…" actions. Requires write permission. rtcRef accepts the caseKey ("TC-156"), the internal `tcm_rtc_...` RTC ID, or the underlying test case _id. Works for both already-touched cases and "untested" virtual cases (the server auto-creates the per-case record on first edit). Closed runs reject result writes. IMPORTANT: send updates.assigneeUserId as an email OR User _id — both are accepted. updates.result accepts the UI labels — the canonical values are "untested", "passed", "failed", "blocked", "skipped", "retest". Pass display ("Passed", "Blocked") or canonical ("passed", "blocked") form — the server normalizes lowercase+underscored. To update multiple cases at once, call this tool in parallel (one call per case). Files cannot be added to a result over MCP — tell the user to use the TestDino UI.',
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID",
      },
      runId: {
        type: "string",
        description: 'Internal run _id or counter-style ID e.g. "RUN-12"',
      },
      rtcRef: {
        type: "string",
        description:
          'Per-case record reference — `tcm_rtc_...` _id, caseKey ("TC-156"), or underlying test case _id.',
      },
      updates: {
        type: "object",
        additionalProperties: {},
        description:
          'Quick verdict: assigneeUserId (email or _id; null to unassign), result/status (display or canonical), elapsed (seconds). Detailed result (any of these triggers a full result entry): comment (rich HTML), linkedIssues (array of linked-issue objects), stepResults (array, e.g. [{ "order": 1, "status": "passed", "comment": "" }]), configuration (the browser/platform this result is for). configuration is REQUIRED when the run covers more than one browser — a result naming none belongs to no cell and is rejected.',
      },
    },
    required: ["projectId", "runId", "rtcRef", "updates"],
    additionalProperties: false,
    $schema: "http://json-schema.org/draft-07/schema#",
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
  },
  execution: {
    taskSupport: "forbidden",
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
    throw new Error(`Failed to update run test case: ${msg}`, { cause: error });
  }
}
