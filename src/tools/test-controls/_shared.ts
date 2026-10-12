import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";

// Test Controls routes take the tool's own arguments: a read as its query,
// a write as its JSON body (the route validates it with the hosted tool's schema).
export async function callTestControls(
  args: Record<string, unknown> | undefined,
  url: string,
  method: "GET" | "POST" | "PATCH" | "PUT" = "GET"
) {
  const token = getApiKey(args);
  if (!token) {
    throw new Error(
      "Missing TESTDINO_PAT environment variable. Please configure it in your .cursor/mcp.json file under the 'env' section."
    );
  }
  const { projectId: _projectId, token: _token, ...rest } = args ?? {};

  try {
    const response = await apiRequestJson<unknown>(url, {
      method,
      headers: { Authorization: `Bearer ${token}` },
      ...(method === "GET" ? {} : { body: rest }),
    });
    return {
      content: [{ type: "text", text: JSON.stringify(response) }],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to call Test Controls: ${msg}`, { cause: error });
  }
}
