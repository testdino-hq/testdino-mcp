import { endpoints } from "../../lib/endpoints.js";
import { callTestControls } from "./_shared.js";

export const getTestControlsTool = {
  name: "get_test_controls",
  title: "Get Test Controls",
  description:
    "Read the Test Controls of one test: its assignee, whether it is critical, whether you watch it, and its active quarantine. Also returns affectedRuns from the last 90 days (a total plus the 10 latest): excluded — runs a quarantine kept this test from failing; critical — runs this test failed because it passed only on retry while marked critical. Takes the Playwright test id (testcase_id), as list_testcase returns it.",
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
    },
    required: ["projectId", "testcase_id"],
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

export async function handleGetTestControls(args?: Record<string, unknown>) {
  return callTestControls(
    args,
    endpoints.testControl(String(args?.projectId), String(args?.testcase_id))
  );
}
