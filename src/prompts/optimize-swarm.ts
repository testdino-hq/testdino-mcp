// Copied from the hosted MCP (test-runs/prompts/optimizeSwarm.prompt.ts); keep the two identical.
// Uneven packing and one long spec file have opposite remedies (scheduler vs
// user), so the prompt reads the makespan machine's numbers instead of guessing.

import { quoteIdentifier } from "./fix-case.js";

export const OPTIMIZE_SWARM_PROMPT_NAME = "optimize_swarm";

export const OPTIMIZE_SWARM_DESCRIPTION =
  "Explain why a swarm (multi-machine) run took as long as it did, what it cost in wasted CI minutes, and the one change that would actually make it faster. Separates uneven packing across machines from a single long spec file, because only the first is the scheduler’s to fix.";

export interface OptimizeSwarmArgs {
  projectId: string;
  testrun_id?: string;
  compare_to_run_id?: string;
}

export function toOptimizeSwarmArgs(
  args: Record<string, unknown>
): OptimizeSwarmArgs {
  const text = (value: unknown): string | undefined =>
    typeof value === "string" && value.trim().length > 0
      ? value.trim()
      : undefined;
  return {
    projectId: text(args.projectId) ?? "",
    testrun_id: text(args.testrun_id),
    compare_to_run_id: text(args.compare_to_run_id),
  };
}

export function buildOptimizeSwarmMessage(args: OptimizeSwarmArgs): string {
  const project = quoteIdentifier(args.projectId);
  // Two genuinely different tasks: diagnose one run, or verify a change between
  // two. They share the field vocabulary but not the steps, so mixing them into
  // one message would bloat both.
  if (args.compare_to_run_id && args.testrun_id) {
    return buildCompareMessage(
      project,
      args.testrun_id,
      args.compare_to_run_id
    );
  }
  const runStep = args.testrun_id
    ? `Call get_run_details(projectId='${project}', testrun_id='${quoteIdentifier(args.testrun_id)}').`
    : `No run was given. Call list_testruns(projectId='${project}') first, pick the swarm run to analyse, then call get_run_details(projectId='${project}', testrun_id=<that run>).`;

  return `You are explaining the wall-clock cost of a swarm Playwright run in TestDino project ${project}. Report what the numbers show. Do not propose a configuration change until you have identified which constraint actually bound the run.

1. Get the run and confirm it was swarm.
${runStep}
Check \`is_swarm\`. If it is false there is no per-machine breakdown to analyse — say so and stop, rather than reasoning about machines that do not exist.

2. Check how many machines actually reported.
Read \`machine_summary.machine_count\` FIRST. If it is 1, this run got no parallelism at all: one machine ran the whole suite. \`imbalance_ratio\` will be null and idle time will be zero, and those are NOT signs of a healthy run — there was simply nothing to balance. Say that the run ran on a single machine and stop the timing analysis there; the remedy is finding out why only one machine took work, not rebalancing. Do NOT describe such a run as well balanced or near its floor.

3. Find the binding constraint.
A swarm run distributes whole spec FILES across machines; a file never splits across machines. So the run is never faster than its slowest machine. Read:
- \`machine_summary.slowest\` — the makespan machine. This machine's duration IS the run's duration.
- \`machine_summary.imbalance_ratio\` — slowest/fastest wall-clock. Near 1.0 means the work was packed evenly and the suite is already near its floor for this machine count. Well above 1.0 means machines sat idle while one kept working.
- \`machines[].idle_tail_ms\` — how long each machine sat finished while the makespan machine kept going. This is the wasted capacity, per machine.
- \`machines[].spec_files\` — how many distinct spec files that machine ran.

4. Distinguish the two causes, because the fixes are opposite.
Look at \`spec_files\` on the makespan machine:
- **Several files** — the packing was uneven. More machines or better duration estimates will help. This is the scheduler's problem.
- **One file** — that file is likely the floor, but CHECK the Playwright project before saying so. The scheduler's atomic unit is (spec file × Playwright project), not the file alone, so the same file can legitimately sit on two machines under different browsers. Compare the makespan machine against the next-slowest: call list_testcase(by_machine=<machine_id>) for each and compare the \`platform\` field (the Playwright project) as well as the file name.
  - **Same file, different projects** — the file is already split, by browser. The story is then the BROWSER, not the file: report that this project takes N× longer than the same file on another project and point the user at that browser. Do NOT tell them to split the file; it would not help, and it is not what is slow.
  - **Same file, same project, no other machine holding it** — now the file genuinely is the hard floor. Adding machines CANNOT make this run faster, because a (file, project) unit cannot be split across machines. The fix is the user's: split that spec file, or enable \`fullyParallel\` so its tests spread across that machine's workers instead of running serially on one. Say this explicitly — recommending more runners here would waste CI spend for no gain.

5. Quantify the waste in minutes.
Sum \`idle_tail_ms\` across all machines. That total is CI capacity the run paid for and did not use — machines sitting finished while the makespan machine kept working. Report it in minutes alongside how many machines finished early. This is the cost of the imbalance, stated as a number rather than a ratio.

6. Check for work that never ran.
Read \`could_not_execute_specs\`. A non-empty list means specs that no machine could execute, so the run is NOT a clean pass regardless of what the pass counts say. Surface this first if present — it outranks any timing advice.

7. Attribute the failures before blaming the code.
For each failing test, call get_flake_verdict(projectId='${project}', testcase_id=<pw_test_id>, testrun_id=<run>). A known flake that failed on the makespan machine is not a code regression, and saying so prevents a wasted investigation. To see what ran where, call list_testcase with by_machine=<machine_id> from \`machines[]\`, or read \`machine_id\` on each case. Report the machine a failure landed on only as an observation — a machine being slow does not cause a test to fail, and you have no evidence linking the two.

8. If one file is the floor, name the split point.
When the makespan machine ran a single dominant spec file, find where to cut it: call list_testcase(projectId='${project}', by_testrun_id=<run>, search='<that spec file>', sort='duration_desc'). There is no spec-file filter, but search matches every title-path segment and the spec file is one of them. The top entries by duration are the tests to move into a second file. Say how much of the file's total time they represent, so the user can judge whether splitting is worth it.

9. Report, with the limits stated.
Give: the run's duration, the makespan machine and its share, the imbalance ratio, total idle capacity across machines, and the one change most likely to help. State these limits honestly rather than implying more precision than the data supports:
- Add up \`total_tests\` across \`machines[]\` and compare it to the run's own total. If the per-machine sum is LOWER, the difference is cases that carry no machine attribution and are absent from the breakdown entirely. Report the gap instead of presenting the machine numbers as the whole run — the imbalance and idle figures are computed only over attributed work.
- Machine durations are observed wall-clock for machines that reported, not a declared plan. The machine count the run was CONFIGURED with is not recoverable after the run, so you cannot tell whether every requested machine actually connected — do not claim it did.
- A still-running run has incomplete end times, so \`idle_tail_ms\` and the imbalance ratio are provisional. Say so if the run is not finished.
- Any speedup you quote from adding machines is an estimate from this one run's placement, not a measured result. Give it as an approximation, never a promise.
- Machine ids are supplied by the CI provider and are commonly fresh per run, so do NOT compare a machine against itself across runs or call one a persistently slow runner. Every machine statement is scoped to THIS run.
- Idle time is wasted capacity, not a billing figure. Report it in minutes; do not convert it to money unless the user gives you their CI rate.`;
}

// Two runs can differ because the suite or the machine count changed, not the
// placement; both gates are mandatory before any verdict.
function buildCompareMessage(
  project: string,
  runId: string,
  baselineId: string
): string {
  const run = quoteIdentifier(runId);
  const baseline = quoteIdentifier(baselineId);

  return `You are checking whether a change made a swarm Playwright run faster in TestDino project ${project}. Compare the two runs and say whether the change helped, made no difference, or made things worse. Do not give a verdict until you have checked that the two runs are actually comparable.

1. Fetch both runs in one call.
Call get_run_details(projectId='${project}', testrun_id='${run},${baseline}'). It accepts a comma-separated batch, so this is one request, not two. Treat '${run}' as the AFTER run and '${baseline}' as the BEFORE run.

2. Confirm both were swarm.
Check \`is_swarm\` on each. If either is false there is no per-machine breakdown to compare — say which one and stop. Comparing a swarm run against a plain one measures the execution mode, not the change.

3. Check the two comparability gates. Both are mandatory.
- **Suite size.** Compare \`total_tests\`. If they differ, part of the wall-clock difference is tests being added or removed, NOT better placement. Report the difference and label the comparison confounded. A faster run that also has 40 fewer tests has not been optimized.
- **Machine count.** Compare \`machine_summary.machine_count\`. If they differ, you are comparing two different amounts of hardware. That is a valid thing to measure, but it is a capacity change, not a placement improvement — name it as such. If either run reports a count of 1, that run had no parallelism at all and its null imbalance ratio and zero idle time are not a good result — report it as a single-machine run rather than as the balanced side of the comparison.

4. State which branches you are comparing.
Read \`git.branch\` on each run.
- **Same branch** — the cleanest comparison. Differences are most likely the change you are testing.
- **Different branches** — call this out explicitly. Two branches can carry different tests, different fixtures and different application code, so any timing difference has several possible causes and the suite-size gate above is the only one you can actually check. Report it as an observation, never as proof the change worked.

5. Compare the four numbers that matter.
For each run, take: total run duration, \`machine_summary.slowest\` (the makespan machine — the run is never faster than this), \`machine_summary.imbalance_ratio\`, and the sum of \`idle_tail_ms\` across machines (wasted capacity). Present them side by side as before/after with the delta, in minutes and seconds rather than raw milliseconds.

6. Give a verdict, and say what still binds the run.
Say plainly whether the change helped. Then name the remaining constraint: if the makespan machine still runs a single dominant spec file, that file is still the floor and the next gain has to come from splitting it, not from more machines. If the imbalance ratio is now near 1.0, the suite is close to its floor for this machine count and further packing work will return little.

Limits to state rather than gloss over:
- Two runs are two samples. CI timing varies between identical runs, so a small improvement may be noise. Do not report a single-digit-percent change as a proven win; say another run would be needed to tell.
- Machine ids are supplied by the CI provider and are commonly fresh per run, so do NOT pair up machines between the two runs or track one machine across them. Compare the runs in aggregate.
- The machine count each run was CONFIGURED with is not recoverable after the fact — \`machine_count\` is how many machines REPORTED. A run where a requested machine never connected is indistinguishable from one configured with fewer, so never state that a run used all the machines it asked for.
- Report wasted capacity in minutes; do not convert it to money unless the user gives you their CI rate.`;
}
