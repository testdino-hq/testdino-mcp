/**
 * get_run_error_clusters — read-only. Groups ONE run's failing tests by
 * shared error signature (normalized error fingerprint), computed for that
 * run alone.
 *
 * Returns error clusters (each = one signature + affected tests + a category),
 * an `unclustered` bucket for blank/unfingerprintable errors, a per-category
 * rollup, and run totals. Failed/timed-out tests cluster on their final-attempt
 * error; flaky tests cluster on the error they recovered from (pre-recovery).
 *
 * Answers "what are the distinct failures in this run?" and "which error
 * affected the most tests?" — cheaper than paging every failed case.
 *
 * Workflow: list_testruns → pick a testrun_id → get_run_error_clusters.
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

type RunErrorClusterStatus = "all" | "failed" | "flaky";

interface GetRunErrorClustersArgs {
  token?: string;
  projectId: string;
  testrun_id: string;
  status?: RunErrorClusterStatus;
}

export const getRunErrorClustersTool = {
  name: "get_run_error_clusters",
  description:
    "Group ONE run's failing tests by shared error signature (normalized error fingerprint), computed for that run only. " +
    "Returns error clusters (each = one signature + its affected tests + an error category: assertion, timeout, element_not_found, network, other), an `unclustered` bucket for blank/unfingerprintable errors, a per-category rollup, and run totals. " +
    "Failed/timed-out tests cluster on their final-attempt error; flaky tests cluster on the error they recovered from (pre-recovery). " +
    "Use this to answer 'what are the distinct failures in this run?' or 'which error affected the most tests?' — far cheaper than paging every failed case. " +
    "Optionally narrow with status='failed' or status='flaky' (default 'all'). " +
    "Workflow: list_testruns() → pick a testrun_id → get_run_error_clusters(projectId, testrun_id).",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID (Required). The TestDino project identifier.",
      },
      testrun_id: {
        type: "string",
        description:
          "The test run ID to cluster errors for (single run, Required).",
      },
      status: {
        type: "string",
        enum: ["all", "failed", "flaky"],
        description:
          "Which contributing tests populate the clusters. Defaults to 'all'.",
      },
    },
    required: ["projectId", "testrun_id"],
  },
};

export async function handleGetRunErrorClusters(
  args?: GetRunErrorClustersArgs
) {
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

  if (typeof args.testrun_id !== "string" || !args.testrun_id.trim()) {
    throw new Error("testrun_id is required");
  }

  if (
    args.status !== undefined &&
    !["all", "failed", "flaky"].includes(String(args.status))
  ) {
    throw new Error(
      `Invalid status '${String(args.status)}'. Must be one of: all, failed, flaky`
    );
  }

  try {
    const url = endpoints.getRunErrorClusters({
      projectId: String(args.projectId),
      testrun_id: String(args.testrun_id),
      status: args.status,
    });

    const response = await apiRequestJson(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get run error clusters: ${errorMessage}`);
  }
}
