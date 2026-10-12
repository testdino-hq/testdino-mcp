// A tool call through the server answers as the hosted MCP does: the same
// result shape, the same error shape, and the same input validation.

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

let client: Client;
const P = "project_x";

beforeAll(async () => {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await createServer().connect(serverSide);
  client = new Client({ name: "dispatch-test", version: "0" });
  await client.connect(clientSide);
});

afterAll(() => client.close());

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.TESTDINO_PAT;
});

function respond(status: number, body: unknown) {
  const fetchMock = vi.fn(async () => ({
    ok: status < 400,
    status,
    statusText: status < 400 ? "OK" : "Error",
    headers: new Headers(),
    json: async () => body,
    text: async () => JSON.stringify(body),
  }));
  vi.stubGlobal("fetch", fetchMock);
  process.env.TESTDINO_PAT = "td_pat_test";
  return fetchMock;
}

const sentBody = (fetchMock: ReturnType<typeof respond>) =>
  JSON.parse(
    (fetchMock.mock.calls[0] as unknown as [string, { body?: string }])[1]
      ?.body ?? "{}"
  );

describe("tool results", () => {
  it("returns the body as compact JSON text and structuredContent", async () => {
    respond(200, { items: [{ id: "r1" }], pagination: { page: 1 } });
    const result = await client.callTool({
      name: "list_testruns",
      arguments: { projectId: P },
    });
    expect(result.isError).toBe(false);
    expect(result.content).toEqual([
      { type: "text", text: '{"items":[{"id":"r1"}],"pagination":{"page":1}}' },
    ]);
    expect(result.structuredContent).toEqual({
      items: [{ id: "r1" }],
      pagination: { page: 1 },
    });
  });

  it("returns a server refusal as isError with the body and statusCode", async () => {
    respond(404, { success: false, message: "Release not found" });
    const result = await client.callTool({
      name: "get_release",
      arguments: { projectId: P, releaseId: "nope" },
    });
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toEqual({
      statusCode: 404,
      success: false,
      message: "Release not found",
    });
  });

  it("returns a re-run refusal the same way", async () => {
    respond(400, {
      success: false,
      error: { code: "MODE_REQUIRED", message: "ask" },
    });
    const result = await client.callTool({
      name: "rerun_test",
      arguments: { projectId: P, runId: "test_run_a1", confirm: true },
    });
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      statusCode: 400,
      error: { code: "MODE_REQUIRED" },
    });
  });
});

describe("input validation", () => {
  it("refuses a wrong type before any request", async () => {
    const fetchMock = respond(200, {});
    const result = await client.callTool({
      name: "list_testruns",
      arguments: { projectId: P, limit: "ten" },
    });
    expect(result.isError).toBe(true);
    expect((result.content as { text: string }[])[0].text).toMatch(
      /^MCP error -32602: Input validation error: Invalid arguments for tool list_testruns:/
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a missing required argument and an out-of-range value", async () => {
    const fetchMock = respond(200, {});
    const missing = await client.callTool({
      name: "get_release",
      arguments: { projectId: P },
    });
    const range = await client.callTool({
      name: "quarantine_tests",
      arguments: {
        projectId: P,
        testcase_ids: ["t1"],
        reason: "r",
        ends_in_days: 91,
      },
    });
    expect(missing.isError).toBe(true);
    expect(range.isError).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("drops an argument the tool does not declare", async () => {
    const fetchMock = respond(200, {});
    await client.callTool({
      name: "quarantine_tests",
      arguments: {
        projectId: P,
        testcase_ids: ["t1"],
        reason: "r",
        surprise: "x",
      },
    });
    expect(sentBody(fetchMock)).not.toHaveProperty("surprise");
  });

  it("answers an unknown tool as not found", async () => {
    await expect(
      client.callTool({ name: "no_such_tool", arguments: {} })
    ).rejects.toThrow(/Tool no_such_tool not found/);
  });
});

describe("strict objects", () => {
  it("refuses an unknown key in submit_audit_report's target, as hosted zod does", async () => {
    const fetchMock = respond(201, {});
    const result = await client.callTool({
      name: "submit_audit_report",
      arguments: {
        projectId: P,
        orgId: "org_x",
        markdownReport: "# r",
        target: { value: "checkout", featureName: "checkout" },
      },
    });
    expect(result.isError).toBe(true);
    expect((result.content as { text: string }[])[0].text).toContain(
      "Unrecognized key(s) in object: 'featureName'"
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("attachments", () => {
  it("refuses a local file path, as the hosted schema does", async () => {
    const fetchMock = respond(201, {});
    for (const [name, extra] of [
      ["create_manual_test_case", { title: "t", suiteName: "s" }],
      ["create_manual_run", { name: "r" }],
    ] as const) {
      const result = await client.callTool({
        name,
        arguments: { projectId: P, ...extra, attachments: ["/tmp/a.png"] },
      });
      expect(result.isError).toBe(true);
      expect((result.content as { text: string }[])[0].text).toMatch(
        /Expected object, received string/
      );
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards attachment objects unchanged", async () => {
    const fetchMock = respond(201, { success: true });
    const attachment = { url: "https://example.com/a.png", fileName: "a.png" };
    await client.callTool({
      name: "create_manual_test_case",
      arguments: {
        projectId: P,
        title: "t",
        suiteName: "s",
        attachments: [attachment],
      },
    });
    expect(sentBody(fetchMock).attachments).toEqual([attachment]);
  });
});
