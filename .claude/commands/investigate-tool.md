Investigate why a tool is not working as expected. This command is for debugging tool behavior — wrong responses, auth failures, missing data, or unexpected errors.

**Input:** $ARGUMENTS — description of the problem (e.g., "list_testruns returns empty for valid projectId", "health tool says PAT is invalid but it works in curl")

---

## Phase 1: Reproduce the Problem

1. **Identify the tool** — Which tool is affected?
2. **Read the tool source** — Read the handler file completely
3. **Trace the data flow:**
   - What args does the handler expect?
   - How does it build the API URL? (check `endpoints.ts`)
   - What does `apiRequestJson` do with the response?
   - How does it format the output?

---

## Phase 2: Check Each Layer

Work from the outside in:

1. **Input layer** — Is the tool schema correct? Are required/optional fields right? Would the AI agent send the right args based on the description?
2. **Auth layer** — Does `getApiKey(args)` resolve correctly? Is the token being passed in the Authorization header?
3. **URL layer** — Is the endpoint URL correct? Are query params properly built? Log the URL if needed
4. **API layer** — Does the API actually return what we expect? Check if the response is wrapped (`{ success, data }` vs direct)
5. **Response layer** — Is the response being formatted correctly for MCP? Is JSON.stringify applied?

---

## Phase 3: Fix

1. Fix the root cause — don't add workarounds
2. Run `npm run typecheck && npm run lint`
3. If the fix changes tool behavior, update `docs/TOOLS.md`

---

## Anti-Patterns

| Don't                                            | Why                              |
| ------------------------------------------------ | -------------------------------- |
| Add try/catch that swallows errors               | Hides the real problem           |
| Change the tool description to work around a bug | Fixes the symptom, not the cause |
| Hardcode values to make it "work"                | Breaks for other inputs          |
| Skip checking endpoints.ts                       | Most URL bugs live there         |
