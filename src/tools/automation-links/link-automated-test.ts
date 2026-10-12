/**
 * Link automated test tool — one automated test → one manual test case
 */

import { endpoints } from "../../lib/endpoints.js";
import { apiRequestJson } from "../../lib/request.js";
import { getApiKey } from "../../lib/env.js";
import { MISSING_PAT_MESSAGE, toolResult } from "./_shared.js";

interface LinkAutomatedTestArgs {
  projectId: string;
  caseId: string;
  pwTestId: string;
  fullTitle: string;
  displayTitle?: string;
}

export const linkAutomatedTestTool = {
  name: "link_automated_test",
  title: "Link Automated Test",
  description:
    "Link one automated (Playwright) test to one manual test case so automation results surface on the case. Requires write permission and the automation_linking plan feature (403 otherwise). Get pwTestId + fullTitle from list_automated_tests (or list_testcase, whose pw_test_id matches pwTestId — but fullTitle must still come from list_automated_tests). Rejects with 400 when the identity is unknown to this project, the pwTestId is already linked to the case, or the case already has 50 links. Linking sets the case automationStatus to Automated. For many cases in one call use bulk_link_automated_tests.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID",
      },
      caseId: {
        type: "string",
        description: 'Manual case: internal _id or "TC-123" style ID',
      },
      pwTestId: {
        type: "string",
        minLength: 1,
        maxLength: 200,
        description: "Stable Playwright test id (pw_test_id)",
      },
      fullTitle: {
        type: "string",
        minLength: 1,
        maxLength: 2000,
        description:
          "Server join key from list_automated_tests — never hand-built",
      },
      displayTitle: {
        type: "string",
        minLength: 1,
        maxLength: 500,
        description:
          "Optional label shown on the case; defaults to the test title",
      },
    },
    required: ["projectId", "caseId", "pwTestId", "fullTitle"],
    additionalProperties: false,
    $schema: "http://json-schema.org/draft-07/schema#",
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
  },
  execution: {
    taskSupport: "forbidden",
  },
};

export async function handleLinkAutomatedTest(args?: LinkAutomatedTestArgs) {
  const token = getApiKey(args);
  if (!token) {
    throw new Error(MISSING_PAT_MESSAGE);
  }
  if (!args?.projectId) {
    throw new Error("projectId is required");
  }
  if (!args?.caseId) {
    throw new Error("caseId is required");
  }
  if (!args?.pwTestId) {
    throw new Error("pwTestId is required");
  }
  if (!args?.fullTitle) {
    throw new Error("fullTitle is required");
  }

  try {
    const body: Record<string, string> = {
      pwTestId: String(args.pwTestId),
      fullTitle: String(args.fullTitle),
    };
    if (args.displayTitle) {
      body.displayTitle = String(args.displayTitle);
    }
    const url = endpoints.linkAutomatedTest(
      String(args.projectId),
      String(args.caseId)
    );
    const response = await apiRequestJson<unknown>(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
    });
    return toolResult(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to link automated test: ${errorMessage}`, {
      cause: error,
    });
  }
}
