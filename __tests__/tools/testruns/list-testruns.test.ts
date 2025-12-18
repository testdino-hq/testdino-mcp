/**
 * Tests for list test runs tool
 */

import { jest } from "@jest/globals";
import { listTestRunsTool, handleListTestRuns } from "../../src/tools/testruns/list-testruns.js";
import { endpoints } from "../../src/lib/endpoints.js";
import { apiRequestJson } from "../../src/lib/request.js";
import { getApiKey } from "../../src/lib/env.js";

jest.mock("../../src/lib/endpoints.js");
jest.mock("../../src/lib/request.js");
jest.mock("../../src/lib/env.js");

describe("List Test Runs Tool", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("listTestRunsTool", () => {
    it("should have correct name", () => {
      expect(listTestRunsTool.name).toBe("list_testruns");
    });

    it("should require projectId", () => {
      expect(listTestRunsTool.inputSchema.required).toContain("projectId");
    });

    it("should have all filter parameters in schema", () => {
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
    const mockApiKey = "test_api_key_123";
    const mockProjectId = "proj_123";
    const mockResponse = {
      success: true,
      data: {
        count: 2,
        testRuns: [
          {
            _id: "run_1",
            counter: 1,
            status: "completed",
            testStats: { total: 10, passed: 8, failed: 2 },
          },
          {
            _id: "run_2",
            counter: 2,
            status: "completed",
            testStats: { total: 10, passed: 10, failed: 0 },
          },
        ],
      },
    };

    it("should throw error when API key is missing", async () => {
      (getApiKey as jest.Mock).mockReturnValue(undefined);

      await expect(handleListTestRuns({ projectId: mockProjectId })).rejects.toThrow(
        "Missing TESTDINO_API_KEY"
      );
    });

    it("should call endpoint with projectId", async () => {
      (getApiKey as jest.Mock).mockReturnValue(mockApiKey);
      (endpoints.listTestRuns as jest.Mock).mockReturnValue(
        "https://api.testdino.com/api/mcp/proj_123/list-testruns"
      );
      (apiRequestJson as jest.Mock).mockResolvedValue(mockResponse);

      await handleListTestRuns({ projectId: mockProjectId });

      expect(endpoints.listTestRuns).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: mockProjectId,
        })
      );
    });

    it("should include Authorization header", async () => {
      (getApiKey as jest.Mock).mockReturnValue(mockApiKey);
      (endpoints.listTestRuns as jest.Mock).mockReturnValue(
        "https://api.testdino.com/api/mcp/proj_123/list-testruns"
      );
      (apiRequestJson as jest.Mock).mockResolvedValue(mockResponse);

      await handleListTestRuns({ projectId: mockProjectId });

      expect(apiRequestJson).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockApiKey}`,
          }),
        })
      );
    });

    it("should pass filter parameters", async () => {
      (getApiKey as jest.Mock).mockReturnValue(mockApiKey);
      (endpoints.listTestRuns as jest.Mock).mockReturnValue(
        "https://api.testdino.com/api/mcp/proj_123/list-testruns?by_branch=main"
      );
      (apiRequestJson as jest.Mock).mockResolvedValue(mockResponse);

      await handleListTestRuns({
        projectId: mockProjectId,
        by_branch: "main",
        by_environment: "production",
        limit: 50,
        page: 2,
      });

      expect(endpoints.listTestRuns).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: mockProjectId,
          by_branch: "main",
          by_environment: "production",
          limit: 50,
          page: 2,
        })
      );
    });

    it("should return formatted response", async () => {
      (getApiKey as jest.Mock).mockReturnValue(mockApiKey);
      (endpoints.listTestRuns as jest.Mock).mockReturnValue(
        "https://api.testdino.com/api/mcp/proj_123/list-testruns"
      );
      (apiRequestJson as jest.Mock).mockResolvedValue(mockResponse);

      const result = await handleListTestRuns({ projectId: mockProjectId });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe("text");
      expect(JSON.parse(result.content[0].text)).toEqual(mockResponse);
    });

    it("should handle API errors", async () => {
      (getApiKey as jest.Mock).mockReturnValue(mockApiKey);
      (endpoints.listTestRuns as jest.Mock).mockReturnValue(
        "https://api.testdino.com/api/mcp/proj_123/list-testruns"
      );
      (apiRequestJson as jest.Mock).mockRejectedValue(new Error("API error"));

      await expect(handleListTestRuns({ projectId: mockProjectId })).rejects.toThrow(
        "Failed to list test runs"
      );
    });

    it("should handle get_all parameter", async () => {
      (getApiKey as jest.Mock).mockReturnValue(mockApiKey);
      (endpoints.listTestRuns as jest.Mock).mockReturnValue(
        "https://api.testdino.com/api/mcp/proj_123/list-testruns"
      );
      (apiRequestJson as jest.Mock).mockResolvedValue(mockResponse);

      await handleListTestRuns({
        projectId: mockProjectId,
        get_all: true,
      });

      expect(endpoints.listTestRuns).toHaveBeenCalledWith(
        expect.objectContaining({
          get_all: true,
        })
      );
    });
  });
});

