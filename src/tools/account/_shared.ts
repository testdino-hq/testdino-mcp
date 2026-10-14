import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

// Account reads (org, project, pull requests): GET routes whose arguments
// travel as the path and the query string.
export async function callAccount(
  args: Record<string, unknown> | undefined,
  url: string,
  action: string
) {
  const token = getApiKey(args);
  if (!token) {
    throw new Error(
      "Missing TESTDINO_PAT environment variable. Please configure it in your .cursor/mcp.json file under the 'env' section."
    );
  }
  try {
    const response = await apiRequestJson<unknown>(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    return {
      content: [{ type: "text", text: JSON.stringify(response) }],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to ${action}: ${msg}`, { cause: error });
  }
}
