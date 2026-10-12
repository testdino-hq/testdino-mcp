import { endpoints } from "../../lib/endpoints.js";
import { callTestControls } from "./_shared.js";

export const setTestCriticalTool = {
  name: "set_test_critical",
  title: "Set Test Critical",
  description:
    "Call this only when the user asks for it. Mark (critical: true) or unmark (critical: false) a test as critical. A critical test that passes only on retry fails the build; unmarking relaxes that. Owners and admins only. A quarantined test cannot be marked critical, and a project has at most 50 critical tests.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID (e.g. project_<id>)",
      },
      testcase_id: {
        type: "string",
        maxLength: 128,
        description: "Playwright pw_test_id of the test",
      },
      critical: {
        type: "boolean",
      },
    },
    required: ["projectId", "testcase_id", "critical"],
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

export async function handleSetTestCritical(args?: Record<string, unknown>) {
  return callTestControls(
    args,
    `${endpoints.testControl(String(args?.projectId), String(args?.testcase_id))}/critical`,
    "PUT"
  );
}
