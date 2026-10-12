import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import type { ToolResult } from "./tool-result.js";

// The hosted MCP validates with zod before any request: a bad argument is
// refused there, and an unknown one is dropped. removeAdditional does the
// dropping here for schemas that close additionalProperties, as zod's do.
const ajv = new Ajv({ allErrors: true, strict: false, removeAdditional: true });

export function compileValidators(
  tools: ReadonlyArray<{ name: string; inputSchema: object }>
): Map<string, ValidateFunction> {
  return new Map(
    tools.map((tool) => [tool.name, ajv.compile(tool.inputSchema)])
  );
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
