// The package exposes what the hosted MCP exposed on sync day
// (tests/fixtures/hosted-catalogue.json): same tools, prompts and guide.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../../../src/server.js";

type Tool = { name: string; inputSchema: Record<string, unknown> };
const hosted = JSON.parse(
  readFileSync(join(__dirname, "../../fixtures/hosted-catalogue.json"), "utf-8")
) as {
  tools: Tool[];
  prompts: unknown[];
  promptSamples: Record<string, { messages: unknown[] }>;
  guideSha256: string;
};

// The only additions: audit report files only a local package can read or write.
const LOCAL_ARGS: Record<string, string[]> = {
  get_audit_report: ["writeMarkdown", "outputPath"],
  submit_audit_report: ["markdownReportPath", "writeMarkdown", "outputPath"],
};

function withoutLocalArgs(tool: Tool): Tool {
  const local = LOCAL_ARGS[tool.name];
  if (!local) return tool;
  const schema = tool.inputSchema as {
    properties: Record<string, unknown>;
    required?: string[];
  };
  const properties = Object.fromEntries(
    Object.entries(schema.properties).filter(([key]) => !local.includes(key))
  );
  return { ...tool, inputSchema: { ...schema, properties } };
}

let client: Client;

beforeAll(async () => {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await createServer().connect(serverSide);
  client = new Client({ name: "catalogue-test", version: "0" });
  await client.connect(clientSide);
});

afterAll(() => client.close());

describe("same catalogue as the hosted MCP", () => {
  it("lists the hosted tools, definition for definition", async () => {
    const { tools } = await client.listTools();
    const hostedTools = hosted.tools.map((t) =>
      t.name === "submit_audit_report"
        ? {
            ...t,
            inputSchema: {
              ...t.inputSchema,
              // markdownReportPath can stand in for markdownReport here.
              required: (t.inputSchema.required as string[]).filter(
                (r) => r !== "markdownReport"
              ),
            },
          }
        : t
    );
    expect(tools.map((t) => withoutLocalArgs(t as Tool))).toEqual(hostedTools);
  });

  it("adds only the local audit-file arguments", async () => {
    const { tools } = await client.listTools();
    for (const [name, args] of Object.entries(LOCAL_ARGS)) {
      const tool = tools.find((t) => t.name === name)!;
      const hostedTool = hosted.tools.find((t) => t.name === name)!;
      const extra = Object.keys(
        (tool.inputSchema as { properties: object }).properties
      ).filter(
        (key) =>
          !(
            key in (hostedTool.inputSchema as { properties: object }).properties
          )
      );
      expect(extra.sort()).toEqual([...args].sort());
    }
  });

  it("lists the hosted prompts", async () => {
    const { prompts } = await client.listPrompts();
    expect(prompts).toEqual(hosted.prompts);
  });

  it.each([
    [
      "fix_run_a",
      "fix_run",
      { projectId: "project_x", testrun_id: "test_run_y" },
    ],
    ["fix_run_b", "fix_run", { projectId: "project_x" }],
    [
      "fix_case_a",
      "fix_case",
      { projectId: "project_x", testcase_id: "abc-123" },
    ],
    [
      "fix_case_b",
      "fix_case",
      {
        projectId: "project_x",
        testcase_name: "it's a test",
        suite_file_path: "e2e/a.spec.ts",
      },
    ],
    [
      "fix_case_c",
      "fix_case",
      { projectId: "project_x", testrun_id: "test_run_y" },
    ],
    [
      "fix_flake_a",
      "fix_flake",
      {
        projectId: "project_x",
        testcase_id: "abc-123",
        testrun_id: "test_run_y",
      },
    ],
    ["fix_flake_b", "fix_flake", { projectId: "project_x" }],
    ["optimize_swarm_a", "optimize_swarm", { projectId: "project_x" }],
    [
      "optimize_swarm_b",
      "optimize_swarm",
      { projectId: "project_x", testrun_id: "test_run_y" },
    ],
    [
      "optimize_swarm_c",
      "optimize_swarm",
      {
        projectId: "it's",
        testrun_id: "test_run_y",
        compare_to_run_id: "test_run_z",
      },
    ],
  ])("builds %s exactly as the hosted MCP", async (sample, name, args) => {
    const result = await client.getPrompt({ name, arguments: args });
    expect(result).toEqual(hosted.promptSamples[sample]);
  });

  it("serves the hosted skills guide, as resource and as prompt", async () => {
    const sha = (text: string) =>
      createHash("sha256").update(text).digest("hex");
    const resource = await client.readResource({
      uri: "testdino://skills/guide",
    });
    const prompt = await client.getPrompt({ name: "testdino_guide" });
    const text = (resource.contents[0] as { text: string }).text;
    expect(sha(text)).toBe(hosted.guideSha256);
    expect(prompt.messages[0].content).toEqual({ type: "text", text });
  });
});
