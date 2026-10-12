// Copied from the hosted MCP (test-runs/prompts/fixFlake.prompt.ts); keep the two identical.
// Carries scope only. The verdict comes from get_debug_evidence, not from here.

import { HUMAN_APPROVAL_GATE } from "./approval-gate.js";
import { quoteIdentifier } from "./fix-case.js";

export const FIX_FLAKE_PROMPT_NAME = "fix_flake";

export const FIX_FLAKE_DESCRIPTION =
  "Decide whether a failing test is genuinely broken or just flaky, then fix it in the right place. Compares the retry attempts before proposing any change, so a real bug does not get papered over with a longer wait.";

export interface FixFlakeArgs {
  projectId: string;
  testcase_id?: string;
  testrun_id?: string;
}

export function toFixFlakeArgs(args: Record<string, unknown>): FixFlakeArgs {
  const text = (value: unknown): string | undefined =>
    typeof value === "string" && value.trim().length > 0
      ? value.trim()
      : undefined;
  return {
    projectId: text(args.projectId) ?? "",
    testcase_id: text(args.testcase_id),
    testrun_id: text(args.testrun_id),
  };
}

export function buildFixFlakeMessage(args: FixFlakeArgs): string {
  const runScope = args.testrun_id
    ? `, testrun_id='${quoteIdentifier(args.testrun_id)}'`
    : "";
  const verdictStep = args.testcase_id
    ? `Call get_debug_evidence(projectId='${quoteIdentifier(args.projectId)}', testcase_id='${quoteIdentifier(args.testcase_id)}'${runScope}).`
    : `No test case was given. Call list_testcase(projectId='${quoteIdentifier(args.projectId)}'${runScope}, status='failed') and again with status='flaky', then ask which one to work on and call get_debug_evidence with its pw_test_id. Both lists matter: 'flaky' is only the tests that passed on a retry, so listing it alone hides the retried test that failed every attempt — which is the case this whole prompt exists to stop you papering over with a wait.`;

  return `You are working out how to fix a retried test failure in TestDino project ${quoteIdentifier(args.projectId)}. The mistake to avoid is reaching for the fix the error text suggests: adding a wait to a genuinely broken test hides a real bug and ships it.

1. Get the verdict. Do not form your own first.
${verdictStep}
One call returns the computed \`verdict\` with the per-attempt failure signatures behind it, the regression boundary, and download links for every stored artifact. Read the verdict before you look at any code, and do not override it with an impression from the error text. Its own \`reason\` says what was seen and \`rules_out\` says which fixes the evidence cannot support. The verdict tells you whether the behaviour repeats — it does not tell you the cause, so do not treat it as one.

2. Respect what each verdict rules OUT.
The verdict constrains which fixes the evidence can support. It does not tell you the cause is impossible, so keep the unlikely branch open if later evidence contradicts it.
- \`deterministic\` — every attempt carried the same signature, and the retry ran in a fresh worker process, so no timing variance was observed. Adding or extending a wait is unjustified on this evidence, and so is raising a retry count or a pixel threshold.
- \`flaky\` — an attempt passed on retry, so the code under test did not change between attempts. Changing the assertion is unjustified: it passed once. What made the two attempts differ is still open — timing, test data, state left by another test, an intermittent API, or a real intermittent bug in the product all produce this. Read the evidence before deciding, and if it does turn out to be timing, wait on a condition the test can assert on rather than on a duration.
- \`inconclusive\` — do not guess, and do not pick the likelier-sounding branch. The response says why. Too few attempts means the test needs a run with retries enabled; differing signatures means comparing this test across other runs before changing anything, since that pattern often points at shared state rather than a defect in this test.

3. Look at what the test actually saw.
For \`flaky\` and \`inconclusive\`, the error text is the weakest evidence available. Step 1 returned the trace for the attempt that FAILED and, when one exists, the trace for the attempt that passed. Compare them: what the page actually looked like at the moment of failure separates a race from a wrong locator far more reliably than a stack trace does. The same response carries \`trace_runbook\` with the instructions for reading them, so no further call is needed.

4. Propose one change, and say what it proves.
Name the file and line, state which verdict it follows from, and state what the next run should show if you are right. Do not change retry counts or timeouts to make a test pass — that hides the signal this verdict is built on.

5. Check it after the next run, do not assume it.
Step 1's \`test\` block carries the test's pw_test_id and the run id you saw this failure in. Once a new run lands, call verify_fix(projectId='${quoteIdentifier(args.projectId)}', testcase_id='<the pw_test_id from step 1>', baseline_run_id='<the run id from step 1>'). An intermittent failure is exactly the kind that looks fixed by chance, and verify_fix reports "passing, but only on a retry" separately from "fixed" — which is the distinction you cannot make by eye.

${HUMAN_APPROVAL_GATE}`;
}
