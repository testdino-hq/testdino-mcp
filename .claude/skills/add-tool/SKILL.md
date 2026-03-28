---
name: add-tool
description: Scaffold and implement a new MCP tool end-to-end — endpoint, handler, registration, docs
argument-hint: "[tool-name and description]"
---

Add a new MCP tool: $ARGUMENTS

Do NOT start coding immediately. Follow this workflow.

## Phase 1 — Understand

1. What does this tool do? Restate in one sentence
2. Which API endpoint does it call? (GET/POST/PATCH/DELETE + path)
3. What category does it belong to? (testruns, testcases, manual-testcases, manual-testsuites, or new category)
4. What params does it need? (required vs optional)
5. What does the API response look like?

If any of these are unclear, ask before proceeding.

## Phase 2 — Plan

List every file that needs to be created or modified:

1. `src/lib/endpoints.ts` — new endpoint URL builder
2. `src/tools/<category>/<tool-name>.ts` — new tool file
3. `src/tools/index.ts` — barrel export
4. `src/index.ts` — tool registration + routing
5. `docs/TOOLS.md` — tool documentation
6. `docs/SKILL.md` — if it affects AI agent workflows

**Get user approval before writing code.**

## Phase 3 — Implement

Follow this exact order:

### Step 1: Endpoint (src/lib/endpoints.ts)

Add a new method to the `endpoints` object. Follow the existing pattern:

```typescript
toolName: (params: { projectId: string /* other params */ }): string => {
  const baseUrl = getBaseUrl();
  const { projectId, ...queryParams } = params;
  const queryString = buildQueryString(queryParams);
  return `${baseUrl}/api/mcp/${projectId}/endpoint-path${queryString}`;
};
```

**Run:** `npm run typecheck`

### Step 2: Tool file (src/tools/<category>/<tool-name>.ts)

Create the tool file with exactly two exports:

```typescript
export const toolNameTool = {
  name: "tool_name",
  description: "...",  // Write for AI agents — be specific about when to use this
  inputSchema: {
    type: "object",
    properties: { /* every property MUST have a description */ },
    required: [/* required params */]
  }
};

export async function handleToolName(args: Record<string, unknown>) {
  // 1. Auth
  const token = getApiKey(args);
  if (!token) throw new Error("Missing TESTDINO_PAT...");

  // 2. Validate required params
  if (!args?.projectId) throw new Error("projectId is required");

  // 3. Build URL
  const url = endpoints.toolName({ projectId: String(args.projectId), ... });

  // 4. Fetch
  const response = await apiRequestJson(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  // 5. Return formatted
  return {
    content: [{ type: "text", text: JSON.stringify(response, null, 2) }]
  };
}
```

**Run:** `npm run typecheck`

### Step 3: Barrel export (src/tools/index.ts)

Add export line following existing pattern:

```typescript
export { toolNameTool, handleToolName } from "./<category>/<tool-name>.js";
```

**Run:** `npm run typecheck`

### Step 4: Registration (src/index.ts)

Two changes:

1. Add to imports at the top
2. Add to the `tools` array
3. Add routing if-block in the CallToolRequestSchema handler

**Run:** `npm run typecheck && npm run lint`

### Step 5: Tests

Add test file at `tests/tools/<category>/<tool-name>.test.ts` covering:

- Missing PAT returns error
- Missing required params returns error
- Successful response is properly formatted
- API error is properly wrapped

**Run:** `npm run test`

## Phase 4 — Document

1. Add full documentation to `docs/TOOLS.md` following existing format
2. Update `docs/SKILL.md` if the tool creates a new workflow or decision path
3. Update the tool count in `README.md` if applicable

## Phase 5 — Final Verify

```bash
npm run format && npm run typecheck && npm run lint && npm run test && npm run build
```

All must pass. `git diff` to confirm only intentional changes.

## Rules

- Follow existing patterns exactly — consistency over cleverness
- Every inputSchema property MUST have a description (AI agents depend on these)
- Tool descriptions must be specific enough for an AI to choose the right tool
- Never skip the endpoint step — all URLs go through endpoints.ts
- Run typecheck after EACH step, not just at the end
