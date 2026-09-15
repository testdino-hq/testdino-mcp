/**
 * List automated tests tool — the source of pwTestId + fullTitle for linking
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";
import { MISSING_PAT_MESSAGE, toolResult } from "./_shared.js";

interface ListAutomatedTestsArgs {
  projectId: string;
  search?: string;
  linkStatus?: "all" | "linked" | "unlinked";
  cursor?: string;
  limit?: number;
}

export const listAutomatedTestsTool = {
  name: "list_automated_tests",
  description:
    "Search the automated (Playwright) test identities recorded for a project — the source of the `pwTestId` and `fullTitle` pair that link_automated_test / bulk_link_automated_tests require. " +
    'ALWAYS take fullTitle from this tool: it is a server-reconstructed join key ("<spec file> > <describe…> > <test title>") and a hand-built one fails identity validation. ' +
    'Filter with search (title substring), linkStatus ("all" | "linked" | "unlinked") and page with cursor/limit. Each row also reports whether it is already linked to a manual case.',
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID (Required). The TestDino project identifier.",
      },
      search: {
        type: "string",
        description: "Substring match on the test title.",
      },
      linkStatus: {
        type: "string",
        enum: ["all", "linked", "unlinked"],
        description:
          'Default "all". "unlinked" lists tests no manual case links to yet.',
      },
      cursor: {
        type: "string",
        description: "Opaque cursor from a previous page.",
      },
      limit: {
        type: "number",
        description: "Page size (default 50, max 500).",
      },
    },
    required: ["projectId"],
  },
};

export async function handleListAutomatedTests(args?: ListAutomatedTestsArgs) {
  const token = getApiKey(args);
  if (!token) {
    throw new Error(MISSING_PAT_MESSAGE);
  }
  if (!args?.projectId) {
    throw new Error("projectId is required");
  }

  try {
    const url = endpoints.listAutomatedTests({
      projectId: String(args.projectId),
      search: args.search ? String(args.search) : undefined,
      linkStatus: args.linkStatus ? String(args.linkStatus) : undefined,
      cursor: args.cursor ? String(args.cursor) : undefined,
      limit: args.limit !== undefined ? Number(args.limit) : undefined,
    });
    const response = await apiRequestJson<unknown>(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return toolResult(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to list automated tests: ${errorMessage}`);
  }
}
