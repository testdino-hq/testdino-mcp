import { buildFixCaseMessage, toFixCaseArgs } from "./fix-case.js";
import { buildFixFlakeMessage, toFixFlakeArgs } from "./fix-flake.js";
import { buildFixRunMessage, toFixRunArgs } from "./fix-run.js";

// The hosted MCP's prompts/list, copied.
export const PROMPTS = [
  {
    name: "testdino_guide",
    description:
      "TestDino AI agent skills guide — tool selection rules, decision trees, workflow patterns, and the TestDino audit protocol. Read this before making any TestDino tool calls.",
  },
  {
    name: "fix_run",
    title: "Triage a failing run",
    description:
      "Triage a test run's failures into an ordered fix plan. Groups the failures by shared root cause so one fix can close many tests, instead of walking them one at a time.",
    arguments: [
      {
        name: "projectId",
        description: "Project ID (e.g. project_<id>)",
        required: true,
      },
      {
        name: "testrun_id",
        description: "Run to triage. Omit to pick from the recent runs first.",
        required: false,
      },
    ],
  },
  {
    name: "fix_case",
    title: "Fix a failing test case",
    description:
      "Root-cause and fix one failing test case using its TestDino history. Pulls the failure, its past executions, what changed since it last passed, and any stored AI analysis, then proposes a code change for you to review.",
    arguments: [
      {
        name: "projectId",
        description: "Project ID (e.g. project_<id>)",
        required: true,
      },
      {
        name: "testrun_id",
        description:
          "Run the failure was seen in. Narrows discovery when no case is named.",
        required: false,
      },
      {
        name: "testcase_id",
        description: "The case's pw_test_id, when the title is not known.",
        required: false,
      },
      {
        name: "testcase_name",
        description:
          "Full test title. The most direct identifier — prefer it when known.",
        required: false,
      },
      {
        name: "suite_file_path",
        description:
          "Spec file path — only needed when the title is shared across files.",
        required: false,
      },
    ],
  },
  {
    name: "fix_flake",
    title: "Fix a flaky or failing test correctly",
    description:
      "Decide whether a failing test is genuinely broken or just flaky, then fix it in the right place. Compares the retry attempts before proposing any change, so a real bug does not get papered over with a longer wait.",
    arguments: [
      {
        name: "projectId",
        description: "Project ID (e.g. project_<id>)",
        required: true,
      },
      {
        name: "testcase_id",
        description:
          "The case's pw_test_id. Omit to pick from the run's retried tests first.",
        required: false,
      },
      {
        name: "testrun_id",
        description: "Run the failure was seen in.",
        required: false,
      },
    ],
  },
];

// Builds a fix prompt's text from its arguments, as the hosted server does.
export const FIX_PROMPT_TEXT: Record<
  string,
  (args: Record<string, unknown>) => string
> = {
  fix_run: (args) => buildFixRunMessage(toFixRunArgs(args)),
  fix_case: (args) => buildFixCaseMessage(toFixCaseArgs(args)),
  fix_flake: (args) => buildFixFlakeMessage(toFixFlakeArgs(args)),
};
