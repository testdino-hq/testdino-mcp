/**
 * Tests for health tool
 */

import { jest } from "@jest/globals";
import { healthTool, handleHealth } from "../../src/tools/health.js";
import { endpoints } from "../../src/lib/endpoints.js";
import { apiRequestJson } from "../../src/lib/request.js";
import { getApiKey } from "../../src/lib/env.js";

jest.mock("../../src/lib/endpoints.js");
jest.mock("../../src/lib/request.js");
jest.mock("../../src/lib/env.js");

describe("Health Tool", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("healthTool", () => {
    it("should have correct name", () => {
      expect(healthTool.name).toBe("health");
    });

    it("should have description", () => {
      expect(healthTool.description).toBeTruthy();
      expect(typeof healthTool.description).toBe("string");
    });

    it("should have inputSchema", () => {
      expect(healthTool.inputSchema).toBeDefined();
      expect(healthTool.inputSchema.type).toBe("object");
    });
  });

  describe("handleHealth", () => {
    const mockApiKey = "test_api_key_123";

    it("should return error when API key is missing", async () => {
      (getApiKey as jest.Mock).mockReturnValue(undefined);

      const result = await handleHealth({});

      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toContain("Missing TESTDINO_API_KEY");
    });

    it("should call hello endpoint with API key", async () => {
      (getApiKey as jest.Mock).mockReturnValue(mockApiKey);
      (endpoints.hello as jest.Mock).mockReturnValue("https://api.testdino.com/api/mcp/hello");
      (apiRequestJson as jest.Mock).mockResolvedValue({
        data: {
          user: {
            id: "user_123",
            email: "test@example.com",
            fullName: "Test User",
          },
          pat: {
            id: "pat_123",
            name: "Test PAT",
          },
          access: [],
        },
      });

      await handleHealth({});

      expect(getApiKey).toHaveBeenCalledWith({});
      expect(endpoints.hello).toHaveBeenCalled();
      expect(apiRequestJson).toHaveBeenCalledWith(
        "https://api.testdino.com/api/mcp/hello",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockApiKey}`,
          }),
        })
      );
    });

    it("should format successful response with user info", async () => {
      (getApiKey as jest.Mock).mockReturnValue(mockApiKey);
      (endpoints.hello as jest.Mock).mockReturnValue("https://api.testdino.com/api/mcp/hello");
      (apiRequestJson as jest.Mock).mockResolvedValue({
        data: {
          user: {
            id: "user_123",
            email: "test@example.com",
            firstName: "Test",
            lastName: "User",
            fullName: "Test User",
          },
          pat: {
            id: "pat_123",
            name: "Test PAT",
          },
          access: [
            {
              organizationId: "org_123",
              organizationName: "Test Org",
              projects: [
                {
                  projectId: "proj_123",
                  projectName: "Test Project",
                  modules: {
                    testRuns: true,
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
      });

      const result = await handleHealth({});

      expect(result.content[0].type).toBe("text");
      const text = result.content[0].text;
      expect(text).toContain("TestDino Connection Successful");
      expect(text).toContain("Test User");
      expect(text).toContain("Test PAT");
      expect(text).toContain("Test Org");
      expect(text).toContain("Test Project");
    });

    it("should handle response without access", async () => {
      (getApiKey as jest.Mock).mockReturnValue(mockApiKey);
      (endpoints.hello as jest.Mock).mockReturnValue("https://api.testdino.com/api/mcp/hello");
      (apiRequestJson as jest.Mock).mockResolvedValue({
        data: {
          user: {
            id: "user_123",
            email: "test@example.com",
            fullName: "Test User",
          },
          pat: {
            id: "pat_123",
            name: "Test PAT",
          },
          access: [],
        },
      });

      const result = await handleHealth({});

      const text = result.content[0].text;
      expect(text).toContain("No Organizations Found");
    });

    it("should handle API errors gracefully", async () => {
      (getApiKey as jest.Mock).mockReturnValue(mockApiKey);
      (endpoints.hello as jest.Mock).mockReturnValue("https://api.testdino.com/api/mcp/hello");
      (apiRequestJson as jest.Mock).mockRejectedValue(new Error("Network error"));

      const result = await handleHealth({});

      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toContain("Error validating API key");
      expect(result.content[0].text).toContain("Network error");
    });

    it("should handle unexpected response format", async () => {
      (getApiKey as jest.Mock).mockReturnValue(mockApiKey);
      (endpoints.hello as jest.Mock).mockReturnValue("https://api.testdino.com/api/mcp/hello");
      (apiRequestJson as jest.Mock).mockResolvedValue({
        data: "unexpected format",
      });

      const result = await handleHealth({});

      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toContain("Unexpected response");
    });
  });
});
