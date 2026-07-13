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

describe("handleHealth", () => {
  afterEach(() => {
    restoreFetch();
    delete process.env.TESTDINO_PAT;
  });

  it("returns error content (not throw) when PAT is missing", async () => {
    const result = await handleHealth({});

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("Missing TESTDINO_PAT");
  });

  it("returns Connection Successful on valid API response", async () => {
    const apiResponse = {
      success: true,
      data: {
        user: {
          id: "user-1",
          email: "test@example.com",
          firstName: "Test",
          lastName: "User",
          fullName: "Test User",
        },
        pat: {
          id: "pat-1",
          name: "My PAT",
        },
        access: [
          {
            organizationId: "org-1",
            organizationName: "Test Org",
            projects: [
              {
                projectId: "proj-1",
                projectName: "Test Project",
                modules: {
                  testRuns: true,
                  manualTestCases: false,
                },
                permissions: {
                  canRead: true,
                  canWrite: true,
                  role: "admin",
                },
              },
            ],
          },
        ],
      },
    };

    mockFetchSuccess(apiResponse);

    const result = await handleHealth({ token: "test-pat-token" });

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("Connection Successful");
    expect(result.content[0].text).toContain("Test User");
    expect(result.content[0].text).toContain("My PAT");
  });

  it("calls the hello endpoint with Bearer token", async () => {
    const apiResponse = {
      success: true,
      data: {
        user: {
          id: "user-1",
          email: "test@example.com",
          fullName: "Test User",
        },
        pat: { id: "pat-1", name: "My PAT" },
        access: [],
      },
    };

    mockFetchSuccess(apiResponse);

    await handleHealth({ token: "my-secret-token" });

    expect(getLastFetchUrl()).toContain("/api/mcp/hello");
    const options = getLastFetchOptions();
    expect(options?.headers).toEqual(
      expect.objectContaining({
        Authorization: "Bearer my-secret-token",
      })
    );
  });

  it("returns error content when API returns an error", async () => {
    mockFetchError(401, "Unauthorized", "Unauthorized");

    const result = await handleHealth({ token: "bad-token" });

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("Error");
  });

  it("shows no organizations warning when access array is empty", async () => {
    const apiResponse = {
      success: true,
      data: {
        user: {
          id: "user-1",
          email: "test@example.com",
          fullName: "Test User",
        },
        pat: { id: "pat-1", name: "My PAT" },
        access: [],
      },
    };

    mockFetchSuccess(apiResponse);

    const result = await handleHealth({ token: "test-pat-token" });

    expect(result.content[0].text).toContain("No Organizations Found");
  });

  it("formats the MCP service flat shape (orgs, no user envelope)", async () => {
    // Regression: the MCP microservice hello returns {userId, orgs, ...} with
    // no data/user/pat envelope; the old guard rejected it as "Unexpected
    // response" even though auth succeeded.
    const apiResponse = {
      userId: "user_abc123",
      tokenType: "pat",
      patValid: true,
      authSource: "pat",
      orgs: [
        {
          orgId: "org_1",
          orgName: "ABC-XYZ",
          projects: [{ projectId: "project_1", projectName: "TCM - TESTING" }],
        },
      ],
      expiresAt: "2026-10-11T10:40:29.775Z",
    };

    mockFetchSuccess(apiResponse);

    const result = await handleHealth({ token: "test-pat-token" });

    expect(result.content[0].text).toContain("Connection Successful");
    expect(result.content[0].text).toContain("ABC-XYZ");
    expect(result.content[0].text).toContain("project_1");
    expect(result.content[0].text).toContain("expires 2026-10-11");
    expect(result.content[0].text).not.toContain("Unexpected response");
  });

  it("describes wildcard scopes in the MCP service shape", async () => {
    mockFetchSuccess({
      userId: "user_abc123",
      patValid: true,
      orgs: [
        {
          orgId: "org_1",
          orgName: "Wild Org",
          projects: { allProjects: true },
        },
      ],
    });

    const result = await handleHealth({ token: "test-pat-token" });

    expect(result.content[0].text).toContain("all projects (wildcard scope)");
  });

  it("shows no organizations warning for the MCP service shape with empty orgs", async () => {
    mockFetchSuccess({ userId: "user_abc123", patValid: true, orgs: [] });

    const result = await handleHealth({ token: "test-pat-token" });

    expect(result.content[0].text).toContain("No Organizations Found");
  });

  it("reads PAT from process.env.TESTDINO_PAT when no args token", async () => {
    process.env.TESTDINO_PAT = "env-pat-token";

    const apiResponse = {
      success: true,
      data: {
        user: {
          id: "user-1",
          email: "test@example.com",
          fullName: "Env User",
        },
        pat: { id: "pat-1", name: "Env PAT" },
        access: [],
      },
    };

    mockFetchSuccess(apiResponse);

    const result = await handleHealth({});

    expect(result.content[0].text).toContain("Connection Successful");
    const options = getLastFetchOptions();
    expect(options?.headers).toEqual(
      expect.objectContaining({
        Authorization: "Bearer env-pat-token",
      })
    );
  });
});
