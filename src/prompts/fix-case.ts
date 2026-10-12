// Copied from the hosted MCP (test-runs/prompts/fixCase.prompt.ts); keep the two identical.
// Carries scope only, so the agent always reads fresh state. The root-cause
// procedure rides on get_debug_evidence's `debugging_prompt` — pointed at,
// never restated.

import { HUMAN_APPROVAL_GATE } from "./approval-gate.js";

export const FIX_CASE_PROMPT_NAME = "fix_case";

export const FIX_CASE_DESCRIPTION =
  "Root-cause and fix one failing test case using its TestDino history. Pulls the failure, its past executions, what changed since it last passed, and any stored AI analysis, then proposes a code change for you to review.";

export interface FixCaseArgs {
  projectId: string;
  testcase_name?: string;
  testcase_id?: string;
  testrun_id?: string;
  suite_file_path?: string;
}

function identityStep(args: FixCaseArgs): string {
  // The id is exact; a title 409s when the test runs under several Playwright projects.
  if (args.testcase_id) {
    return `Call debug_testcase(projectId='${quoteIdentifier(args.projectId)}', testcase_id='${quoteIdentifier(args.testcase_id)}', include_ai_insights=true).`;
  }
  if (args.testcase_name) {
    const suite = args.suite_file_path
      ? `, suite_file_path='${quoteIdentifier(args.suite_file_path)}'`
      : "";
    return `Call debug_testcase(projectId='${quoteIdentifier(args.projectId)}', testcase_name='${quoteIdentifier(args.testcase_name)}'${suite}, include_ai_insights=true). If it returns 409 AMBIGUOUS_IDENTITY, pick the candidate by its project and call it again with testcase_id set to that pw_test_id — step 1's \`test\` block carries this test's pw_test_id.`;
  }
  const runScope = args.testrun_id
    ? `testrun_id='${quoteIdentifier(args.testrun_id)}'`
    : "the most recent run from list_testruns";
  return `No test case was named. First call list_testcase(projectId='${quoteIdentifier(args.projectId)}', ${runScope}, status='failed') to list the failing cases, ask which one to fix, then call debug_testcase with that testcase_name and include_ai_insights=true.`;
}

// Every identifier interpolated into instruction text goes through this, not
// just the customer-repo ones. "Escape what came from the repo" needs a
// provenance judgement at each new interpolation; "escape all of them" does not.
// Titles and spec paths are the ones that actually carry repo text, and land
// inside single-quoted instruction text. A title carrying a quote breaks out of that
// quoting; one carrying imperative prose lands unfenced in the instruction
// stream. Neutralise the quote characters and let the fence handle the rest.
export function quoteIdentifier(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/[\r\n]+/g, " ");
}

// MCP clients send "" for an argument the user skipped, which would otherwise
// read as present and interpolate an empty identifier into a tool call.
export function toFixCaseArgs(args: Record<string, unknown>): FixCaseArgs {
  const text = (value: unknown): string | undefined =>
    typeof value === "string" && value.trim().length > 0
      ? value.trim()
      : undefined;
  return {
    projectId: text(args.projectId) ?? "",
    testcase_name: text(args.testcase_name),
    testcase_id: text(args.testcase_id),
    testrun_id: text(args.testrun_id),
    suite_file_path: text(args.suite_file_path),
  };
}

export function buildFixCaseMessage(args: FixCaseArgs): string {
  return `You are fixing one failing test in TestDino project ${quoteIdentifier(args.projectId)}. Work through these steps in order. Do not skip to a code change.

1. Gather the cheap evidence, all of it, before forming any hypothesis.
Call get_debug_evidence(projectId='${quoteIdentifier(args.projectId)}'${args.testcase_id ? `, testcase_id='${quoteIdentifier(args.testcase_id)}'` : ""}${args.testcase_name ? `, testcase_name='${quoteIdentifier(args.testcase_name)}'` : ""}${args.testrun_id ? `, testrun_id='${quoteIdentifier(args.testrun_id)}'` : ""}${args.suite_file_path ? `, suite_file_path='${quoteIdentifier(args.suite_file_path)}'` : ""}). One call returns the flake verdict with its per-attempt failure signatures, the regression boundary, and download links for every stored artifact. Read all three before deciding anything.
The verdict is computed from the attempts, not inferred, so do not argue with it and do not pre-judge it from how the error reads. It tells you which fixes the evidence can support, not which cause is impossible.
The boundary names the last run this test passed and the first it failed. That turns "why does this fail" into "what changed between these two runs" — call list_testruns(projectId='${quoteIdentifier(args.projectId)}') for the \`git_commit_hash\`, \`git_branch\` and author on that pair and read the range. If the boundary says the test never passed, treat it as new or always-broken and stop looking for a commit that broke it.

Step 1's response also carries \`debugging_prompt\` — the root-cause procedure, which owns the tier ordering, how to weigh evidence, and when a finding is reportable. Follow it rather than substituting your own. \`trace_runbook\` in the same response tells you how to read the traces it linked. You do not need a separate call for either.

2. Only when you need more than step 1 gave you.
${identityStep(args)}
Call this for \`ai_fixes\` — \`recommendations\` and \`quickFixes\` — or for the full execution history. These are generated from TestDino's execution data by a model that has never read this repository. A quick fix's code snippet may reference a locator, helper, or API that does not exist here. Check every one against the actual code before acting on it, and discard the ones that do not match. Never apply a snippet unverified.
If a section reports status "not_generated", "queued", "processing", or "in_progress", do not wait on it — continue, and poll get_ai_insights(projectId, testrun_id, testcase_id) later. A "disabled" status is terminal: AI features are off for this project and polling will not change that.
Skip this step entirely if step 1 already told you what you need. It is a second round trip for hypotheses, not a required stage.

3. Propose the fix at the root cause.
Name the file and line you would change and why that is the cause rather than a symptom. If the evidence points at timing, do not reach for a fixed wait — use a condition the test can actually assert on. If you do not have the application or test code for the failing area, stop at a diagnosis plus concrete investigation steps; do not invent a code change for code you cannot see.

4. Hand back for verification.
State plainly what you changed and what a passing run should look like. Step 1's \`test\` block gives you both things verification needs: the test's pw_test_id and the run id you saw the failure in. After the next run lands, call verify_fix(projectId='${quoteIdentifier(args.projectId)}', testcase_id='<the pw_test_id from step 1>', baseline_run_id='<the run id from step 1>') rather than re-reading the history yourself. It compares the new failure signature against the baseline one, so "still the same error", "a different error now" and "passing, but only on a retry" are answers it computes instead of ones you infer from prose.

${HUMAN_APPROVAL_GATE}`;
}
