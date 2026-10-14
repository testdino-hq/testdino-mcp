import { endpoints } from "../../lib/endpoints.js";
import { callAccount } from "./_shared.js";

export const getOrgDetailsTool = {
  name: "get_org_details",
  title: "Get Organization Details",
  description:
    'Answer plan and quota questions for one organization: "what plan are we on", "how many executions are left", "what happens when we run out", "can we buy more". Returns the plan, executions limit/used/remaining and the reset date, seats and projects used against the plan (limit null = unlimited), extra executions (top-ups) on offer and active, the projects this token can see with the executions each used, and org test health (pass/fail/flaky per project over `window` days). `quota.message` is TestDino\'s own answer for what the quota state means and what to do next — relay it to the user as written. Any section can be {status:"unavailable"}: that read failed, so say it could not be checked; it never means zero or none. Takes the orgId from health. A token covering only some projects of the org sees only those projects and no org-wide totals. Read-only: buying executions or changing the plan happens on the billing page, never through this tool.',
  inputSchema: {
    type: "object",
    properties: {
      orgId: {
        type: "string",
        maxLength: 64,
        description: "Organization ID (org_<id>), as health returns it",
      },
      window: {
        type: "number",
        enum: [7, 30, 90],
        description: "Days to cover (default 30)",
      },
    },
    required: ["orgId"],
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

export async function handleGetOrgDetails(args?: Record<string, unknown>) {
  const { orgId, token: _token, ...query } = args ?? {};
  return callAccount(
    args,
    endpoints.orgDetails(String(orgId), query),
    "get organization details"
  );
}
