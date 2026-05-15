/**
 * List the per-case execution records inside a manual run.
 * Each row shows the test case identity, current assignee, and current result.
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface ListRunTestCasesArgs {
  projectId: string;
  runId: string;
  search?: string;
  assignee?: string;
  result?: string;
  status?: string;
  sortBy?: "createdAt" | "updatedAt" | "status" | "caseKey";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export const listRunTestCasesTool = {
  name: "list_run_test_cases",
  description:
    "Get the per-case execution records inside a manual run — what the UI shows as rows in the run's test-case table. Each row carries the test case identity (caseKey like 'TC-156', title), the current assignee, and the current result/status ('untested', 'passed', 'failed', etc.). Filter by assignee (email or User _id) or result/status. Use this before update_run_test_case so you have the rtcRef for each case you want to update.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: { type: "string", description: "Project ID (required)." },
      runId: {
        type: "string",
        description: "Internal run _id or counter-style ID e.g. 'RUN-12' (required).",
      },
      search: { type: "string", description: "Match by case title or caseKey." },
      assignee: {
        type: "string",
        description: "Filter by assignee — User _id OR email (server resolves email).",
      },
      result: {
        type: "string",
        description:
          "Filter by result/status. Display ('Passed') or canonical ('passed') form.",
      },
      status: { type: "string", description: "Alias for result." },
      sortBy: {
        type: "string",
        enum: ["createdAt", "updatedAt", "status", "caseKey"],
      },
      sortOrder: { type: "string", enum: ["asc", "desc"] },
      page: { type: "number" },
      limit: { type: "number", description: "Default 25 (max 200)." },
    },
    required: ["projectId", "runId"],
  },
};

export async function handleListRunTestCases(args?: ListRunTestCasesArgs) {
  const token = getApiKey(args);
  if (!token) {
    throw new Error(
      "Missing TESTDINO_PAT environment variable. Configure it in your .cursor/mcp.json under 'env'."
    );
  }
  if (!args?.projectId) throw new Error("projectId is required");
  if (!args?.runId) throw new Error("runId is required");

  try {
    const url = endpoints.listRunTestCases(args);
    const response = await apiRequestJson<unknown>(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to list run test cases: ${msg}`);
  }
}
