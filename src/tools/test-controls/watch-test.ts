import { endpoints } from "../../lib/endpoints.js";
import { callTestControls } from "./_shared.js";

export const watchTestTool = {
  name: "watch_test",
  title: "Watch Test",
  description:
    'Watch (watching: true) or stop watching (watching: false) a test for yourself. Watched tests are listed by list_test_controls with view "watched".',
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
      watching: {
        type: "boolean",
      },
    },
    required: ["projectId", "testcase_id", "watching"],
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

export async function handleWatchTest(args?: Record<string, unknown>) {
  return callTestControls(
    args,
    `${endpoints.testControl(String(args?.projectId), String(args?.testcase_id))}/watch`,
    "PUT"
  );
}
