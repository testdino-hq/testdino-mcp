// Copied from the hosted MCP (test-runs/prompts/fixRun.prompt.ts); keep the two identical.
// A plan, not a batch instruction: "fix all failed tests" does not survive a
// context window, and the agent's truncation is invisible to the user.

import { HUMAN_APPROVAL_GATE } from "./approval-gate.js";
import { quoteIdentifier } from "./fix-case.js";

export const FIX_RUN_PROMPT_NAME = "fix_run";

export const FIX_RUN_DESCRIPTION =
  "Triage a test run's failures into an ordered fix plan. Groups the failures by shared root cause so one fix can close many tests, instead of walking them one at a time.";

export interface FixRunArgs {
  projectId: string;
  testrun_id?: string;
}

export function toFixRunArgs(args: Record<string, unknown>): FixRunArgs {
  const text = (value: unknown): string | undefined =>
    typeof value === "string" && value.trim().length > 0
      ? value.trim()
      : undefined;
  return {
    projectId: text(args.projectId) ?? "",
    testrun_id: text(args.testrun_id),
  };
}

export function buildFixRunMessage(args: FixRunArgs): string {
  const runStep = args.testrun_id
    ? `Call get_run_error_clusters(projectId='${quoteIdentifier(args.projectId)}', testrun_id='${quoteIdentifier(args.testrun_id)}', status='failed').`
    : `No run was given. Call list_testruns(projectId='${quoteIdentifier(args.projectId)}') first, confirm which run to triage, then call get_run_error_clusters(projectId='${quoteIdentifier(args.projectId)}', testrun_id=<that run>, status='failed').`;

  return `You are triaging a failing test run in TestDino project ${quoteIdentifier(args.projectId)}. Produce a plan first. Do not start fixing tests one by one, and do not attempt to fix every failure in a single pass.

1. Group the failures by root cause.
${runStep}
Each entry in \`error_clusters\` is a set of tests that failed the same way, with \`test_count\` (how many tests share it), \`template\` (the normalized error), \`error_category\`, and a sample of the affected \`tests\`. The \`unclustered\` bucket holds failures with no shared signature — treat each of those individually.

2. Report the true scope before proposing work.
\`test_count\` is always the real number of affected tests. The embedded \`tests\` list is capped: when \`tests_truncated\` is true you are seeing a sample, not the full set, and when the response's \`truncated\` flag is true the run itself had more cases than were read. Say so explicitly in your plan. Never present a capped list as the complete picture.

3. Add the run's AI categorization.
Call get_ai_insights(projectId='${quoteIdentifier(args.projectId)}', testrun_id=<run>) for the run-level analysis — failure categorization, the error table, and the written summary. Use it to label and order the clusters. Do NOT call get_ai_insights per test case here: case-level analysis is generated on demand per case, so requesting it for every failure in a run multiplies cost by the failure count. Case-level analysis belongs in the per-case workflow, one test at a time.

4. Order the plan by leverage.
Rank clusters by \`test_count\` descending — the largest cluster is usually one defect closing many tests, and is worth fixing before a one-off failure. Call out any cluster whose category suggests an environment or configuration cause rather than a test defect, since those often close an entire cluster with no test changes at all.

5. Present the plan and stop.
Output an ordered list: cluster, how many tests it affects, the shared error, and what you would investigate. Then ask which cluster to start on. Fix one cluster at a time — use the fix_case workflow for a specific test inside it.

${HUMAN_APPROVAL_GATE}`;
}
