/**
 * Tests for get test case details tool
 */

import { jest } from "@jest/globals";
import {
  getTestCaseDetailsTool,
  handleGetTestCaseDetails,
} from "../../src/tools/testcases/get-testcase-details.js";
import { endpoints } from "../../src/lib/endpoints.js";
import { apiRequestJson } from "../../src/lib/request.js";
import { getApiKey } from "../../src/lib/env.js";

jest.mock("../../src/lib/endpoints.js");
jest.mock("../../src/lib/request.js");
jest.mock("../../src/lib/env.js");

describe("Get Test Case Details Tool", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getTestCaseDetailsTool", () => {
    it("should have correct name", () => {
      expect(getTestCaseDetailsTool.name).toBe("get_testcase_details");
    });

    it("should have testcaseid or by_title in schema", () => {
      const properties = getTestCaseDetailsTool.inputSchema.properties;
      expect(properties).toHaveProperty("projectId");
      expect(properties).toHaveProperty("testcaseid");
      expect(properties).toHaveProperty("by_title");
    });
  });

  describe("handleGetTestCaseDetails", () => {
    const mockApiKey = "test_api_key_123";
    const mockProjectId = "proj_123";
    const mockTestCaseId = "test_case_456";
    const mockResponse = {
      success: true,
      data: {
        _id: mockTestCaseId,
        title: "Test Case Title",
        status: "failed",
        duration: 5000,
        error: {
          message: "Test failed",
        },
      },
    };

    it("should throw error when API key is missing", async () => {
      (getApiKey as jest.Mock).mockReturnValue(undefined);

      await expect(
        handleGetTestCaseDetails({ projectId: mockProjectId, testcaseid: mockTestCaseId })
      ).rejects.toThrow("Missing TESTDINO_API_KEY");
    });

    it("should call endpoint with testcaseid", async () => {
      (getApiKey as jest.Mock).mockReturnValue(mockApiKey);
      (endpoints.getTestCaseDetails as jest.Mock).mockReturnValue(
        "https://api.testdino.com/api/mcp/proj_123/get-testcase-details?testcaseid=test_case_456"
      );
      (apiRequestJson as jest.Mock).mockResolvedValue(mockResponse);

      await handleGetTestCaseDetails({
        projectId: mockProjectId,
        testcaseid: mockTestCaseId,
      });

      expect(endpoints.getTestCaseDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: mockProjectId,
          testcaseid: mockTestCaseId,
        })
      );
    });

    it("should call endpoint with by_title and by_testrun_id", async () => {
      (getApiKey as jest.Mock).mockReturnValue(mockApiKey);
      (endpoints.getTestCaseDetails as jest.Mock).mockReturnValue(
        "https://api.testdino.com/api/mcp/proj_123/get-testcase-details"
      );
      (apiRequestJson as jest.Mock).mockResolvedValue(mockResponse);

      await handleGetTestCaseDetails({
        projectId: mockProjectId,
        by_title: "Test Case Title",
        by_testrun_id: "run_123",
      });

      expect(endpoints.getTestCaseDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          by_title: "Test Case Title",
          by_testrun_id: "run_123",
        })
      );
    });

    it("should return formatted response", async () => {
      (getApiKey as jest.Mock).mockReturnValue(mockApiKey);
      (endpoints.getTestCaseDetails as jest.Mock).mockReturnValue(
        "https://api.testdino.com/api/mcp/proj_123/get-testcase-details"
      );
      (apiRequestJson as jest.Mock).mockResolvedValue(mockResponse);

      const result = await handleGetTestCaseDetails({
        projectId: mockProjectId,
        testcaseid: mockTestCaseId,
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe("text");
      expect(JSON.parse(result.content[0].text)).toEqual(mockResponse);
    });
  });
});

