// Every argument a tool declares must reach the request: a handler that maps
// arguments one by one can drop a new one silently, and then the package
// accepts it without the hosted MCP's effect.

import { afterEach, describe, expect, it, vi } from "vitest";
import * as toolModule from "../../../src/tools/index.js";
import { restoreFetch } from "../../helpers/mockFetch.js";

type Schema = {
  type?: string | string[];
  enum?: unknown[];
  items?: Schema;
  anyOf?: Schema[];
  properties?: Record<string, Schema>;
  required?: string[];
};
type ToolDef = {
  name: string;
  inputSchema: { properties?: Record<string, Schema> };
};
type Handler = (args: Record<string, unknown>) => Promise<unknown>;

// Arguments consumed on the user's machine, never sent.
const LOCAL_ONLY = new Set([
  "markdownReportPath",
  "writeMarkdown",
  "outputPath",
]);
// Arguments that pick the route instead of travelling as a value.
const ROUTE_SELECTORS: Record<string, string[]> = {
  get_audit_report: ["action"],
};

const tools: { def: ToolDef; handler: Handler }[] = Object.entries(toolModule)
  .filter(([key]) => key.endsWith("Tool"))
  .map(([key, def]) => {
    const base = key.slice(0, -"Tool".length);
    const handler = (toolModule as Record<string, unknown>)[
      `handle${base[0].toUpperCase()}${base.slice(1)}`
    ] as Handler;
    return { def: def as ToolDef, handler };
  });

function firstType(schema: Schema): string | undefined {
  if (schema.anyOf) {
    return schema.anyOf.map(firstType).find((t) => t && t !== "null");
  }
  return Array.isArray(schema.type)
    ? schema.type.find((t) => t !== "null")
    : schema.type;
}

// A value that can be found again in the request: strings and numbers are
// unique per argument; other types are found by their argument name.
function sample(name: string, schema: Schema, n: number, alt = false): unknown {
  if (schema.enum)
    return alt ? schema.enum[schema.enum.length - 1] : schema.enum[0];
  switch (firstType(schema)) {
    case "string":
      return `v_${name}`;
    case "integer":
    case "number":
      return 900 + n;
    case "boolean":
      return !alt;
    case "array":
      return firstType(schema.items ?? {}) === "string" ? [`v_${name}`] : [{}];
    default: {
      const value: Record<string, unknown> = { k: `v_${name}` };
      for (const key of schema.required ?? []) {
        value[key] = sample(
          `${name}.${key}`,
          schema.properties?.[key] ?? {},
          n,
          alt
        );
      }
      return value;
    }
  }
}

afterEach(() => {
  restoreFetch();
  delete process.env.TESTDINO_PAT;
});

describe("every declared argument reaches the request", () => {
  it("covers all tools", () => {
    expect(tools.length).toBeGreaterThanOrEqual(54);
    for (const { def, handler } of tools) {
      expect(typeof handler, def.name).toBe("function");
    }
  });

  it.each(tools.map((t) => [t.def.name, t]))("%s", async (_name, tool) => {
    process.env.TESTDINO_PAT = "td_pat_test";
    const sent: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: { body?: string }) => {
        sent.push(decodeURIComponent(url), init?.body ?? "");
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => ({}),
          text: async () => "{}",
        };
      })
    );

    const props = Object.entries(tool.def.inputSchema.properties ?? {}).filter(
      ([name]) => !LOCAL_ONLY.has(name)
    );
    // Two passes, so an argument a handler omits at its default value is still
    // seen once at a non-default one.
    let args: Record<string, unknown> = {};
    for (const alt of [false, true]) {
      args = {};
      props.forEach(([name, schema], i) => {
        args[name] = sample(name, schema, i, alt);
      });
      // Ids that pick a route must look like ids; any extra value still has to arrive.
      if (args.projectId !== undefined) args.projectId = "project_x";

      // A tool with modes sends different arguments per mode: run every mode.
      const actions = (tool.def.inputSchema.properties?.action?.enum ?? [
        args.action,
      ]) as unknown[];
      for (const action of actions) {
        await tool
          .handler(action === undefined ? args : { ...args, action })
          .catch(() => undefined);
      }
    }

    const request = sent.join("\n");
    const missing = props
      .filter(([name]) => name !== "projectId")
      .filter(([name]) => !ROUTE_SELECTORS[tool.def.name]?.includes(name))
      .filter(([name]) => {
        const value = args[name];
        if (typeof value === "string" || typeof value === "number") {
          return !request.includes(String(value));
        }
        return !request.includes(name);
      })
      .map(([name]) => name);
    expect(missing, `${tool.def.name} drops ${missing.join(", ")}`).toEqual([]);
  });
});
