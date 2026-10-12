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
  title: "Get Run Error Clusters",
  description:
    'Group ONE run\'s failing tests by shared error signature (normalized error fingerprint), computed for that run only. Returns error clusters (each = one signature + its affected tests + an error category), an `unclustered` bucket for blank/unfingerprintable errors, a per-category rollup, and run totals. Failed/timed-out tests cluster on their final-attempt error; flaky tests cluster on the error they recovered from (pre-recovery). Categories: assertion, timeout, element_not_found, network, filesystem, other. Use this to answer "what are the distinct failures in this run?" or "which error affected the most tests?" — it is far cheaper than paging every failed case. Optionally narrow with status="failed" or status="flaky" (default "all"). Workflow: list_testruns() → pick a testrun_id → get_run_error_clusters().',
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID (e.g. project_<id>)",
      },
      testrun_id: {
        type: "string",
        minLength: 1,
        description: "The test run ID to cluster errors for (single run)",
      },
      status: {
        type: "string",
        enum: ["all", "failed", "flaky"],
        description:
          'Which contributing tests populate the clusters (default "all")',
      },
    },
    required: ["projectId", "testrun_id"],
    additionalProperties: false,
    $schema: "http://json-schema.org/draft-07/schema#",
  },
  annotations: {
    readOnlyHint: true,
  },
  execution: {
    taskSupport: "forbidden",
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
    throw new Error(`Failed to get run error clusters: ${errorMessage}`, {
      cause: error,
    });
  }
}
