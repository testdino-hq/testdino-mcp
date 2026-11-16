// Same actionable errors as the hosted MCP when the package itself fails (TDV2-1176).
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
import { createServer } from "../../src/server.js";
import {
  INTERNAL_ERROR_HINT,
  SERVER_ERROR_HINT,
} from "../../src/lib/tool-result.js";

let client: Client;
const realFetch = globalThis.fetch;

beforeAll(async () => {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await createServer().connect(serverSide);
  client = new Client({ name: "error-result", version: "0" });
  await client.connect(clientSide);
  process.env.TESTDINO_PAT = "td_pat_test";
});
afterEach(() => {
  globalThis.fetch = realFetch;
});
afterAll(async () => {
  delete process.env.TESTDINO_PAT;
  await client.close();
});

const text = (r: unknown) =>
  (r as { content: { text: string }[] }).content[0].text;

describe("errors from the package itself", () => {
  it("TestDino unreachable: coded UPSTREAM_ERROR with the retry hint", async () => {
    process.env.TESTDINO_PAT = "td_pat_test";
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    const r = await client.callTool({
      name: "list_testruns",
      arguments: { projectId: "p1" },
    });
    expect(r.isError).toBe(true);
    expect(JSON.parse(text(r))).toMatchObject({
      statusCode: 502,
      error: { code: "UPSTREAM_ERROR" },
      hint: SERVER_ERROR_HINT,
    });
  }, 20_000);

  it("a code bug: coded INTERNAL_ERROR, never the raw JS message", async () => {
    process.env.TESTDINO_PAT = "td_pat_test";
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError(
        "Cannot read properties of undefined (reading 'slice')"
      );
    }) as unknown as typeof fetch;
    const r = await client.callTool({
      name: "list_testruns",
      arguments: { projectId: "p1" },
    });
    expect(text(r)).not.toMatch(/Cannot read properties/);
    expect(JSON.parse(text(r))).toMatchObject({
      statusCode: 500,
      error: {
        code: "INTERNAL_ERROR",
        message: "TestDino hit an error running list_testruns.",
      },
      hint: INTERNAL_ERROR_HINT,
    });
  });

  it("the package's own refusal keeps its written message", async () => {
    delete process.env.TESTDINO_PAT;
    try {
      const r = await client.callTool({
        name: "list_testruns",
        arguments: { projectId: "p1" },
      });
      expect(text(r)).toMatch(/TESTDINO_PAT/);
    } finally {
      process.env.TESTDINO_PAT = "td_pat_test";
    }
  });
});
