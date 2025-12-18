/**
 * Tests for list test case tool
 */

import { jest } from "@jest/globals";
import { listTestCasesTool, handleListTestCases } from "../../src/tools/testcases/list-testcase.js";
import { endpoints } from "../../src/lib/endpoints.js";
import { apiRequestJson } from "../../src/lib/request.js";
import { getApiKey } from "../../src/lib/env.js";

jest.mock("../../src/lib/endpoints.js");
jest.mock("../../src/lib/request.js");
jest.mock("../../src/lib/env.js");

describe("List Test Cases Tool", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("listTestCasesTool", () => {
    it("should have correct name", () => {
      expect(listTestCasesTool.name).toBe("list_testcase");
    });

    it("should have comprehensive filter parameters", () => {
      const properties = listTestCasesTool.inputSchema.properties;
      expect(properties).toHaveProperty("projectId");
      expect(properties).toHaveProperty("by_testrun_id");
      expect(properties).toHaveProperty("by_status");
      expect(properties).toHaveProperty("by_browser_name");
      expect(properties).toHaveProperty("by_tag");
    });
  });

  describe("handleListTestCases", () => {
    const mockApiKey = "test_api_key_123";
    const mockProjectId = "proj_123";
    const mockResponse = {
      success: true,
      data: {
        count: 2,
        testCases: [
          {
            _id: "case_1",
            title: "Test Case 1",
            status: "passed",
            duration: 1000,
          },
          {
            _id: "case_2",
            title: "Test Case 2",
            status: "failed",
            duration: 2000,
          },
        ],
      },
    };

    it("should throw error when API key is missing", async () => {
      (getApiKey as jest.Mock).mockReturnValue(undefined);

      await expect(
        handleListTestCases({ projectId: mockProjectId, by_testrun_id: "run_123" })
      ).rejects.toThrow("Missing TESTDINO_API_KEY");
    });

    it("should call endpoint with projectId and testrun_id", async () => {
      (getApiKey as jest.Mock).mockReturnValue(mockApiKey);
      (endpoints.listTestCases as jest.Mock).mockReturnValue(
        "https://api.testdino.com/api/mcp/proj_123/list-testcase"
      );
      (apiRequestJson as jest.Mock).mockResolvedValue(mockResponse);

      await handleListTestCases({
        projectId: mockProjectId,
        by_testrun_id: "run_123",
      });

      expect(endpoints.listTestCases).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: mockProjectId,
          by_testrun_id: "run_123",
        })
      );
    });

    it("should pass filter parameters", async () => {
      (getApiKey as jest.Mock).mockReturnValue(mockApiKey);
      (endpoints.listTestCases as jest.Mock).mockReturnValue(
        "https://api.testdino.com/api/mcp/proj_123/list-testcase"
      );
      (apiRequestJson as jest.Mock).mockResolvedValue(mockResponse);

      await handleListTestCases({
        projectId: mockProjectId,
        by_testrun_id: "run_123",
        by_status: "failed",
        by_browser_name: "chromium",
        by_tag: "smoke",
      });

      expect(endpoints.listTestCases).toHaveBeenCalledWith(
        expect.objectContaining({
          by_status: "failed",
          by_browser_name: "chromium",
          by_tag: "smoke",
        })
      );
    });

    it("should return formatted response", async () => {
      (getApiKey as jest.Mock).mockReturnValue(mockApiKey);
      (endpoints.listTestCases as jest.Mock).mockReturnValue(
        "https://api.testdino.com/api/mcp/proj_123/list-testcase"
      );
      (apiRequestJson as jest.Mock).mockResolvedValue(mockResponse);

      const result = await handleListTestCases({
        projectId: mockProjectId,
        by_testrun_id: "run_123",
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe("text");
      expect(JSON.parse(result.content[0].text)).toEqual(mockResponse);
    });
  });
});

