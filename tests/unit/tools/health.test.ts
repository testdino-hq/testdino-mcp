import { describe, it, expect, afterEach } from "vitest";
import {
  mockFetchSuccess,
  mockFetchError,
  restoreFetch,
  getLastFetchUrl,
  getLastFetchOptions,
} from "../../helpers/mockFetch.js";
import { createArgs } from "../../helpers/mockTypes.js";
import { handleHealth } from "../../../src/tools/health.js";
import { ApiError } from "../../../src/lib/request.js";

const BODY = {
  userId: "user_1",
  tokenType: "pat",
  patValid: true,
  orgs: [{ orgId: "org_1", orgName: "Org", role: "owner", projects: [] }],
};

describe("handleHealth", () => {
  afterEach(() => {
    restoreFetch();
    delete process.env.TESTDINO_PAT;
  });

  it("refuses without a PAT", async () => {
    await expect(handleHealth({})).rejects.toThrow("Missing TESTDINO_PAT");
  });

  it("returns the hello body unchanged, as the hosted health tool does", async () => {
    mockFetchSuccess(BODY);

    const result = await handleHealth(createArgs());

    expect(getLastFetchUrl()).toContain("/api/mcp/hello");
    expect(
      (getLastFetchOptions()?.headers as Record<string, string>).Authorization
    ).toBe("Bearer test-pat-token");
    expect(JSON.parse(result.content[0].text)).toEqual(BODY);
  });

  it("reads the PAT from TESTDINO_PAT", async () => {
    process.env.TESTDINO_PAT = "env-token";
    mockFetchSuccess(BODY);

    await handleHealth({});

    expect(
      (getLastFetchOptions()?.headers as Record<string, string>).Authorization
    ).toBe("Bearer env-token");
  });

  it("keeps the server's status and body for the tool result", async () => {
    mockFetchError(401, JSON.stringify({ error: { code: "UNAUTHORIZED" } }));

    const error = await handleHealth(createArgs()).catch((e: Error) => e);

    expect((error as Error).cause).toBeInstanceOf(ApiError);
    expect(((error as Error).cause as ApiError).statusCode).toBe(401);
    expect(((error as Error).cause as ApiError).body).toEqual({
      error: { code: "UNAUTHORIZED" },
    });
  });
});
