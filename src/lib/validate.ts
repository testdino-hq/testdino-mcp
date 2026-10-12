import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import type { ToolResult } from "./tool-result.js";

// The hosted MCP validates with zod before any request: a bad argument is
// refused there, and an unknown one is dropped. removeAdditional does the
// dropping here for schemas that close additionalProperties, as zod's do.
const ajv = new Ajv({
  allErrors: true,
  strict: false,
  removeAdditional: true,
  verbose: true,
});

type Schema = {
  type?: string | string[];
  enum?: unknown[];
  properties?: Record<string, Schema>;
  items?: Schema;
  anyOf?: Schema[];
  $ref?: string;
};
const validatorSchemas = new Map<string, Schema>();

export function compileValidators(
  tools: ReadonlyArray<{ name: string; inputSchema: object }>
): Map<string, ValidateFunction> {
  for (const tool of tools) {
    validatorSchemas.set(tool.name, tool.inputSchema as Schema);
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

// zod's .trim() runs before the pattern check, so hosted accepts " smoke" and
// forwards "smoke" (getRerunSelection.tool.ts runTagsSchema).
const TRIMMED_ITEMS: Record<string, string[]> = {
  rerun_test: ["tags"],
};

export function applyHostedTransforms(
  toolName: string,
  args: Record<string, unknown>
): void {
  for (const field of TRIMMED_ITEMS[toolName] ?? []) {
    const value = args[field];
    if (Array.isArray(value)) {
      args[field] = (value as unknown[]).map((v) =>
        typeof v === "string" ? v.trim() : v
      );
    }
  }
}

// zod's custom regex messages; JSON Schema cannot carry them.
const PATTERN_MESSAGE: Record<string, string> = {
  "^test_run_[0-9a-f]{1,64}$": "a TestDino run id (test_run_<hex>)",
  "^[A-Za-z0-9_-]{1,128}$": "a Playwright test id",
  "^[A-Za-z0-9][A-Za-z0-9._:/@+-]{0,99}$":
    "a run tag (no spaces, commas or quotes)",
};

const BOUNDS: Record<
  string,
  [
    code: "too_small" | "too_big",
    type: "number" | "string" | "array",
    inclusive: boolean,
  ]
> = {
  minimum: ["too_small", "number", true],
  exclusiveMinimum: ["too_small", "number", false],
  maximum: ["too_big", "number", true],
  exclusiveMaximum: ["too_big", "number", false],
  minLength: ["too_small", "string", true],
  maxLength: ["too_big", "string", true],
  minItems: ["too_small", "array", true],
  maxItems: ["too_big", "array", true],
};

type Path = (string | number)[];
type Issue = Record<string, unknown>;

function resolve(root: Schema, schema: Schema | undefined): Schema | undefined {
  let s = schema;
  while (s?.$ref) {
    let target: unknown = root;
    for (const part of s.$ref.replace(/^#\//, "").split("/")) {
      target = (target as Record<string, unknown>)?.[
        part.replace(/~1/g, "/").replace(/~0/g, "~")
      ];
    }
    s = target as Schema | undefined;
  }
  const branches = s?.anyOf;
  if (branches?.length === 2) {
    const inner = branches.filter((b) => b.type !== "null");
    if (inner.length === 1) return resolve(root, inner[0]);
  }
  return s;
}

const joinValues = (values: unknown[]) =>
  values.map((v) => (typeof v === "string" ? `'${v}'` : String(v))).join(" | ");

function expectedType(schema: Schema | undefined): string {
  if (schema?.enum) return joinValues(schema.enum);
  const type = Array.isArray(schema?.type)
    ? schema.type.find((t) => t !== "null")
    : schema?.type;
  return type === "integer" ? "number" : (type ?? "unknown");
}

function receivedType(data: unknown): string {
  if (data === null) return "null";
  if (Array.isArray(data)) return "array";
  if (typeof data === "number" && Number.isNaN(data)) return "nan";
  return typeof data;
}

// Key order follows the issue objects zod builds, so the JSON text matches.
function invalidType(
  schema: Schema | undefined,
  data: unknown,
  path: Path
): Issue {
  const received = receivedType(data);
  const integer =
    schema?.type === "integer" &&
    typeof data === "number" &&
    !Number.isInteger(data);
  if (integer) {
    return {
      code: "invalid_type",
      expected: "integer",
      received: "float",
      message: "Expected integer, received float",
      path,
    };
  }
  const expected = expectedType(schema);
  const message =
    received === "undefined"
      ? "Required"
      : `Expected ${expected}, received ${received}`;
  return schema?.enum
    ? { expected, received, code: "invalid_type", path, message }
    : { code: "invalid_type", expected, received, path, message };
}

function boundIssue(keyword: string, limit: number, path: Path): Issue {
  const [code, type, inclusive] = BOUNDS[keyword];
  const small = code === "too_small";
  const message =
    type === "number"
      ? `Number must be ${small ? "greater" : "less"} than ${inclusive ? "or equal to " : ""}${limit}`
      : `${type === "string" ? "String" : "Array"} must contain ${small ? "at least" : "at most"} ${limit} ${type === "string" ? "character(s)" : "element(s)"}`;
  return {
    code,
    [small ? "minimum" : "maximum"]: limit,
    type,
    inclusive,
    exact: false,
    message,
    path,
  };
}

function toPath(instancePath: string): Path {
  return instancePath
    .split("/")
    .filter(Boolean)
    .map((part) =>
      /^\d+$/.test(part)
        ? Number(part)
        : part.replace(/~1/g, "/").replace(/~0/g, "~")
    );
}

function toIssue(root: Schema, error: ErrorObject): Issue {
  const path = toPath(error.instancePath);
  if (error.keyword === "unrecognized_keys") {
    return {
      code: "unrecognized_keys",
      keys: error.params.keys,
      path,
      message: error.message,
    };
  }
  const schema = resolve(root, error.parentSchema as Schema | undefined);
  if (error.keyword === "required") {
    const name = String(error.params.missingProperty);
    return invalidType(resolve(root, schema?.properties?.[name]), undefined, [
      ...path,
      name,
    ]);
  }
  if (error.keyword === "type") {
    return invalidType(schema, error.data, path);
  }
  if (error.keyword === "enum") {
    const options = error.params.allowedValues as unknown[];
    return {
      received: error.data,
      code: "invalid_enum_value",
      options,
      path,
      message: `Invalid enum value. Expected ${joinValues(options)}, received '${String(error.data)}'`,
    };
  }
  if (error.keyword === "pattern") {
    return {
      validation: "regex",
      code: "invalid_string",
      message: PATTERN_MESSAGE[String(error.params.pattern)] ?? "Invalid",
      path,
    };
  }
  if (error.keyword in BOUNDS) {
    return boundIssue(error.keyword, Number(error.params.limit), path);
  }
  return { code: error.keyword, path, message: error.message ?? "Invalid" };
}

// zod reports in schema field order, a value's own fields before the value.
function fieldOrder(root: Schema, path: Path): number[] {
  let schema = resolve(root, root);
  return path.map((part) => {
    if (typeof part === "number") {
      schema = resolve(root, schema?.items);
      return part;
    }
    const names = Object.keys(schema?.properties ?? {});
    schema = resolve(root, schema?.properties?.[part]);
    const index = names.indexOf(part);
    return index < 0 ? names.length : index;
  });
}

function byFieldOrder(root: Schema) {
  return (a: Issue, b: Issue) => {
    const x = fieldOrder(root, a.path as Path);
    const y = fieldOrder(root, b.path as Path);
    for (let i = 0; i < Math.min(x.length, y.length); i++) {
      if (x[i] !== y[i]) return x[i] - y[i];
    }
    return y.length - x.length;
  };
}

function toIssues(root: Schema, errors: ErrorObject[]): Issue[] {
  const handled = new Set<ErrorObject>();
  const issues: Issue[] = [];
  for (const union of errors.filter((e) => e.keyword === "anyOf")) {
    handled.add(union);
    const branches = union.schema as Schema[];
    const inBranch = (e: ErrorObject, i: number) =>
      e.schemaPath.startsWith(`${union.schemaPath}/${i}/`);
    const nullBranch = branches.findIndex((b) => b.type === "null");
    if (branches.length === 2 && nullBranch >= 0) {
      // A nullable value is checked as its inner type, as zod's .nullable() is.
      errors
        .filter((e) => inBranch(e, nullBranch))
        .forEach((e) => handled.add(e));
      continue;
    }
    const unionErrors = branches.map((_, i) => {
      const members = errors.filter((e) => inBranch(e, i));
      members.forEach((e) => handled.add(e));
      return { issues: toIssues(root, members), name: "ZodError" };
    });
    issues.push({
      code: "invalid_union",
      unionErrors,
      path: toPath(union.instancePath),
      message: "Invalid input",
    });
  }
  // A value of the wrong type is not checked further, as in zod.
  const wrongType = new Set(
    errors
      .filter((e) => e.keyword === "type" && !handled.has(e))
      .map((e) => e.instancePath)
  );
  for (const error of errors) {
    if (handled.has(error)) continue;
    if (
      error.keyword !== "type" &&
      error.keyword !== "required" &&
      wrongType.has(error.instancePath)
    ) {
      continue;
    }
    issues.push(toIssue(root, error));
  }
  return issues.sort(byFieldOrder(root));
}

// Same refusal text as the hosted server's zod input validation.
export function validationErrorResult(
  toolName: string,
  errors: ErrorObject[]
): ToolResult {
  const issues = toIssues(validatorSchemas.get(toolName) ?? {}, errors);
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
