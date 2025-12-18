/**
 * Test cases for List Test Runs Tool
 */

import { jest } from "@jest/globals";
import { handleListTestRuns, listTestRunsTool } from "../../src/tools/testruns/list-testruns.js";
import { getApiKey } from "../../src/lib/env.js";
import { endpoints } from "../../src/lib/endpoints.js";
import { apiRequestJson } from "../../src/lib/request.js";

// Mock dependencies
jest.mock("../../src/lib/env.js");
jest.mock("../../src/lib/endpoints.js");
jest.mock("../../src/lib/request.js");

const mockGetApiKey = getApiKey as jest.MockedFunction<typeof getApiKey>;
const mockEndpoints = endpoints as jest.Mocked<typeof endpoints>;
const mockApiRequestJson = apiRequestJson as jest.MockedFunction<typeof apiRequestJson>;

describe("List Test Runs Tool", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("listTestRunsTool schema", () => {
    test("should have correct tool name", () => {
      expect(listTestRunsTool.name).toBe("list_testruns");
    });

    test("should have description", () => {
      expect(listTestRunsTool.description).toBeDefined();
    });

    test("should require projectId", () => {
      expect(listTestRunsTool.inputSchema.required).toContain("projectId");
    });

    test("should have all filter parameters in schema", () => {
      const properties = listTestRunsTool.inputSchema.properties;
      expect(properties).toHaveProperty("projectId");
      expect(properties).toHaveProperty("by_branch");
      expect(properties).toHaveProperty("by_time_interval");
      expect(properties).toHaveProperty("by_author");
      expect(properties).toHaveProperty("by_commit");
      expect(properties).toHaveProperty("by_environment");
      expect(properties).toHaveProperty("limit");
      expect(properties).toHaveProperty("page");
      expect(properties).toHaveProperty("get_all");
    });
  });

  describe("handleListTestRuns", () => {
    test("should throw error when API key is missing", async () => {
      mockGetApiKey.mockReturnValue(undefined);

      await expect(handleListTestRuns({ projectId: "proj_123" })).rejects.toThrow(
        "Missing TESTDINO_API_KEY"
      );
    });

    test("should successfully list test runs with projectId only", async () => {
      const mockToken = "test_api_key_123";
      const mockResponse = {
        success: true,
        data: {
          count: 2,
          testRuns: [
            { _id: "run_1", counter: 1, status: "completed" },
            { _id: "run_2", counter: 2, status: "completed" },
          ],
        },
      };

      mockGetApiKey.mockReturnValue(mockToken);
      mockEndpoints.listTestRuns = jest
        .fn()
        .mockReturnValue("https://api.testdino.com/api/mcp/proj_123/list-testruns");
      mockApiRequestJson.mockResolvedValue(mockResponse);

      const result = await handleListTestRuns({ projectId: "proj_123" });

      expect(mockEndpoints.listTestRuns).toHaveBeenCalledWith({ projectId: "proj_123" });
      expect(mockApiRequestJson).toHaveBeenCalledWith(
        "https://api.testdino.com/api/mcp/proj_123/list-testruns",
        {
          headers: {
            Authorization: `Bearer ${mockToken}`,
          },
        }
      );

      expect(result.content[0].type).toBe("text");
      expect(JSON.parse(result.content[0].text)).toEqual(mockResponse);
    });

    test("should handle all filter parameters", async () => {
      const mockToken = "test_api_key_123";
      const mockResponse = { success: true, data: { count: 0, testRuns: [] } };

      mockGetApiKey.mockReturnValue(mockToken);
      mockEndpoints.listTestRuns = jest
        .fn()
        .mockReturnValue("https://api.testdino.com/api/mcp/proj_123/list-testruns?by_branch=main");
      mockApiRequestJson.mockResolvedValue(mockResponse);

      const args = {
        projectId: "proj_123",
        by_branch: "main",
        by_time_interval: "1d",
        by_author: "john",
        by_commit: "abc123",
        by_environment: "production",
        limit: 50,
        page: 2,
        get_all: false,
      };

      await handleListTestRuns(args);

      expect(mockEndpoints.listTestRuns).toHaveBeenCalledWith({
        projectId: "proj_123",
        by_branch: "main",
        by_time_interval: "1d",
        by_author: "john",
        by_commit: "abc123",
        by_environment: "production",
        limit: 50,
        page: 2,
        get_all: false,
      });
    });

    test("should handle API errors", async () => {
      const mockToken = "test_api_key_123";
      const mockError = new Error("API request failed: 404 Not Found");

      mockGetApiKey.mockReturnValue(mockToken);
      mockEndpoints.listTestRuns = jest
        .fn()
        .mockReturnValue("https://api.testdino.com/api/mcp/proj_123/list-testruns");
      mockApiRequestJson.mockRejectedValue(mockError);

      await expect(handleListTestRuns({ projectId: "proj_123" })).rejects.toThrow(
        "Failed to list test runs"
      );
    });

    test("should handle empty results", async () => {
      const mockToken = "test_api_key_123";
      const mockResponse = {
        success: true,
        data: {
          count: 0,
          testRuns: [],
        },
      };

      mockGetApiKey.mockReturnValue(mockToken);
      mockEndpoints.listTestRuns = jest
        .fn()
        .mockReturnValue("https://api.testdino.com/api/mcp/proj_123/list-testruns");
      mockApiRequestJson.mockResolvedValue(mockResponse);

      const result = await handleListTestRuns({ projectId: "proj_123" });

      expect(JSON.parse(result.content[0].text).data.count).toBe(0);
    });

    test("should convert get_all boolean to string", async () => {
      const mockToken = "test_api_key_123";
      const mockResponse = { success: true, data: { count: 0, testRuns: [] } };

      mockGetApiKey.mockReturnValue(mockToken);
      mockEndpoints.listTestRuns = jest.fn().mockReturnValue("https://api.testdino.com/api/mcp/proj_123/list-testruns");
      mockApiRequestJson.mockResolvedValue(mockResponse);

      await handleListTestRuns({ projectId: "proj_123", get_all: true });

      expect(mockEndpoints.listTestRuns).toHaveBeenCalledWith(
        expect.objectContaining({
          get_all: true,
        })
      );
    });
  });
});

