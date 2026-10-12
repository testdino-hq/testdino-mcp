import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import type { ToolResult } from "./tool-result.js";

// The hosted MCP validates with zod before any request: a bad argument is
// refused there, and an unknown one is dropped. removeAdditional does the
// dropping here for schemas that close additionalProperties, as zod's do.
const ajv = new Ajv({ allErrors: true, strict: false, removeAdditional: true });

type ObjectSchema = {
  properties?: Record<string, { properties?: Record<string, unknown> }>;
};
const validatorSchemas = new Map<string, ObjectSchema>();

export function compileValidators(
  tools: ReadonlyArray<{ name: string; inputSchema: object }>
): Map<string, ValidateFunction> {
  for (const tool of tools) {
    validatorSchemas.set(tool.name, tool.inputSchema as ObjectSchema);
  }
  return new Map(
    tools.map((tool) => [tool.name, ajv.compile(tool.inputSchema)])
  );
}

// The one hosted object declared .strict(): an unknown key is refused there,
// not dropped (services/mcp/node/src/mcp/streaming/modules/test-runs/audit.tools.ts).
const STRICT_OBJECTS: Record<string, string[]> = {
  submit_audit_report: ["target"],
};

export function strictObjectIssues(
  toolName: string,
  args: Record<string, unknown>
): ErrorObject[] {
  const issues: ErrorObject[] = [];
  for (const field of STRICT_OBJECTS[toolName] ?? []) {
    const value = args[field];
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      continue;
    }
    const allowed = Object.keys(
      (validatorSchemas.get(toolName)?.properties?.[field]?.properties ??
        {}) as object
    );
    const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
    if (unknown.length > 0) {
      issues.push({
        keyword: "unrecognized_keys",
        instancePath: `/${field}`,
        schemaPath: "",
        params: { keys: unknown },
        message: `Unrecognized key(s) in object: ${unknown.map((k) => `'${k}'`).join(", ")}`,
      });
    }
  }
  return issues;
}

const ISSUE_CODE: Record<string, string> = {
  type: "invalid_type",
  required: "invalid_type",
  enum: "invalid_enum_value",
  minimum: "too_small",
  exclusiveMinimum: "too_small",
  minLength: "too_small",
  minItems: "too_small",
  maximum: "too_big",
  exclusiveMaximum: "too_big",
  maxLength: "too_big",
  maxItems: "too_big",
};

function toIssue(error: ErrorObject) {
  const path = error.instancePath.split("/").filter(Boolean);
  if (error.keyword === "required") {
    path.push(String(error.params.missingProperty));
  }
  return {
    code: ISSUE_CODE[error.keyword] ?? error.keyword,
    path,
    message:
      error.keyword === "required" ? "Required" : (error.message ?? "Invalid"),
  };
}

// Same envelope as the hosted server's input-validation refusal.
export function validationErrorResult(
  toolName: string,
  errors: ErrorObject[]
): ToolResult {
  const issues = errors.map(toIssue);
  return {
    content: [
      {
        type: "text",
        text: `MCP error -32602: Input validation error: Invalid arguments for tool ${toolName}: ${JSON.stringify(issues, null, 2)}`,
      },
    ],
    isError: true,
  };
}
