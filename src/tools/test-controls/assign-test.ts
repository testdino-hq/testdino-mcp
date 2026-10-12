import { endpoints } from "../../lib/endpoints.js";
import { callTestControls } from "./_shared.js";

export const assignTestTool = {
  name: "assign_test",
  title: "Assign Test",
  description:
    'Assign a test to a project member by email or user id, to yourself with "me", or unassign it with null. The assignee also starts watching the test and is notified when it changes state. Someone who is not on the project gets "Owner is not a member of this project."',
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
      assignee: {
        anyOf: [
          {
            type: "string",
            maxLength: 254,
            description: '"me", a user id or a teammate\'s email',
          },
          {
            type: "null",
          },
        ],
        description:
          '"me", a user id, a teammate\'s email, or null to unassign',
      },
    },
    required: ["projectId", "testcase_id", "assignee"],
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

export async function handleAssignTest(args?: Record<string, unknown>) {
  return callTestControls(
    args,
    `${endpoints.testControl(String(args?.projectId), String(args?.testcase_id))}/assignee`,
    "PUT"
  );
}
