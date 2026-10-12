// A refused argument reads exactly as the hosted MCP's zod refusal
// (tests/fixtures/hosted-validation.json, captured from the hosted server).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../../../src/server.js";

const { cases } = JSON.parse(
  readFileSync(
    join(__dirname, "../../fixtures/hosted-validation.json"),
    "utf-8"
  )
) as {
  cases: {
    label: string;
    tool: string;
    arguments: Record<string, unknown>;
    text: string;
  }[];
};

let client: Client;

beforeAll(async () => {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await createServer().connect(serverSide);
  client = new Client({ name: "validation-test", version: "0" });
  await client.connect(clientSide);
});

afterAll(() => client.close());

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.TESTDINO_PAT;
});

describe("same refusal text as the hosted MCP", () => {
  it.each(cases.map((c) => [c.label, c] as const))("%s", async (_, c) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await client.callTool({
      name: c.tool,
      arguments: c.arguments,
    });
    expect(result.isError).toBe(true);
    expect((result.content as { text: string }[])[0].text).toBe(c.text);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("hosted transforms", () => {
  it("trims run tags before checking them, as hosted zod does", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers(),
      json: async () => ({}),
      text: async () => "{}",
    }));
    vi.stubGlobal("fetch", fetchMock);
    process.env.TESTDINO_PAT = "td_pat_test";
    const result = await client.callTool({
      name: "rerun_test",
      arguments: {
        projectId: "project_x",
        runId: "test_run_a1",
        confirm: false,
        tags: [" smoke "],
      },
    });
    expect(result.isError).toBe(false);
    const sent = JSON.parse(
      (fetchMock.mock.calls[0] as unknown as [string, { body: string }])[1].body
    );
    expect(sent.tags).toEqual(["smoke"]);
  });
});
