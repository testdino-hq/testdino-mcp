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
      // As undici throws it: the socket error is the cause, so "fetch failed" is never the root.
      throw new TypeError("fetch failed", {
        cause: new Error("connect ECONNREFUSED 127.0.0.1:443"),
      });
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

  it("TestDino unreachable on a write, with Node's real fetch: coded, with the check-first hint", async () => {
    process.env.TESTDINO_PAT = "td_pat_test";
    process.env.TESTDINO_API_URL = "http://127.0.0.1:1";
    try {
      const r = await client.callTool({
        name: "create_release",
        arguments: { projectId: "p1", name: "r1" },
      });
      expect(r.isError).toBe(true);
      expect(JSON.parse(text(r))).toMatchObject({
        statusCode: 502,
        error: { code: "UPSTREAM_ERROR" },
        hint: SERVER_ERROR_HINT,
      });
    } finally {
      delete process.env.TESTDINO_API_URL;
    }
  });

  it("TestDino too slow: a timed-out write is coded, with the check-first hint", async () => {
    process.env.TESTDINO_PAT = "td_pat_test";
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    globalThis.fetch = vi.fn(
      (_url: unknown, init?: { signal?: AbortSignal }) =>
        new Promise((_, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError"))
          );
        })
    ) as unknown as typeof fetch;
    try {
      const pending = client.callTool({
        name: "create_release",
        arguments: { projectId: "p1", name: "r1" },
      });
      await vi.advanceTimersByTimeAsync(15_000);
      const r = await pending;
      expect(r.isError).toBe(true);
      expect(JSON.parse(text(r))).toMatchObject({
        statusCode: 502,
        error: { code: "UPSTREAM_ERROR" },
        hint: SERVER_ERROR_HINT,
      });
    } finally {
      vi.useRealTimers();
    }
  });

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
