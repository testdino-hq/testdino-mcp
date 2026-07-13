import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

interface GetRunErrorClustersArgs {
  token?: string;
  projectId: string;
  testrun_id: string;
  status?: "all" | "failed" | "flaky";
}

export const getRunErrorClustersTool = {
  name: "get_run_error_clusters",
  description:
    "Groups failing tests in a run by error signature to identify patterns and triage failures at scale. " +
    "Use this after list_testruns to drill into why a run failed — it surfaces clusters of tests sharing the same root-cause error. " +
    "Filter by status to focus on definitively failed tests, flaky tests, or all. " +
    "Requires projectId and testrun_id.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID (Required). The TestDino project identifier.",
      },
      testrun_id: {
        type: "string",
        description: "Test run ID (Required). The run to cluster errors for.",
      },
      status: {
        type: "string",
        enum: ["all", "failed", "flaky"],
        description:
          "Filter by test status. 'failed' shows definitively failed tests, 'flaky' shows flaky tests, 'all' (default) includes both.",
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

  if (!args?.testrun_id) {
    throw new Error("testrun_id is required");
  }

  try {
    const url = endpoints.runErrorClusters({
      projectId: String(args.projectId),
      testrun_id: String(args.testrun_id),
      ...(args.status ? { status: String(args.status) } : {}),
    });

    const response = await apiRequestJson<unknown>(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get run error clusters: ${errorMessage}`);
  }
}
