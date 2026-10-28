import { endpoints } from "../../lib/endpoints.js";
import { callTestControls } from "./_shared.js";

export const quarantineTestsTool = {
  name: "quarantine_tests",
  title: "Quarantine Tests",
  description:
    "Call this only when the user asks for it. Quarantine 1 to 100 tests: until the end date, their failures stop failing the build (they still run and are reported). reason is required and becomes the quarantine note. ends_in_days defaults to the project's default length. assignee defaults to the test's assignee for one test, else to you; the assignee also starts watching the test and is notified when it changes state. only_this_error (one test only) takes an error line and covers only failures with that error; other failures still fail the build. Pass the error of the test's final attempt, the one the build is judged on. dry_run: true creates nothing and reports what would be quarantined, what would be skipped and why, and the quarantine limit — use it before a large quarantine. It does not check only_this_error or that the assignee is a project member; the real call does. Several tests are all-or-nothing against the limit; already quarantined tests are skipped. A quarantine cannot be deleted, only released.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project ID (e.g. project_<id>)",
      },
      testcase_ids: {
        type: "array",
        items: {
          type: "string",
          maxLength: 128,
        },
        minItems: 1,
        maxItems: 100,
        description: "Playwright pw_test_ids, as list_testcase returns them",
      },
      reason: {
        type: "string",
        minLength: 1,
        maxLength: 1000,
        description: "Why these tests are quarantined",
      },
      ends_in_days: {
        type: "integer",
        minimum: 1,
        maximum: 90,
      },
      assignee: {
        type: "string",
        maxLength: 254,
        description: '"me", a user id or a teammate\'s email',
      },
      only_this_error: {
        type: "string",
        minLength: 1,
        maxLength: 4096,
        description:
          "The error line to cover, from the test's final attempt; one test only",
      },
      dry_run: {
        type: "boolean",
      },
    },
    required: ["projectId", "testcase_ids", "reason"],
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

export async function handleQuarantineTests(args?: Record<string, unknown>) {
  return callTestControls(
    args,
    endpoints.quarantines(String(args?.projectId)),
    "POST"
  );
}
