/**
 * Tests for get run details tool
 */

import { jest } from "@jest/globals";
import { getRunDetailsTool, handleGetRunDetails } from "../../src/tools/testruns/get-run-details.js";
import { endpoints } from "../../src/lib/endpoints.js";
import { apiRequestJson } from "../../src/lib/request.js";
import { getApiKey } from "../../src/lib/env.js";

jest.mock("../../src/lib/endpoints.js");
jest.mock("../../src/lib/request.js");
jest.mock("../../src/lib/env.js");

describe("Get Run Details Tool", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getRunDetailsTool", () => {
    it("should have correct name", () => {
      expect(getRunDetailsTool.name).toBe("get_run_details");
    });

    it("should have projectId and testrun_id or counter in schema", () => {
      const properties = getRunDetailsTool.inputSchema.properties;
      expect(properties).toHaveProperty("projectId");
      expect(properties).toHaveProperty("testrun_id");
      expect(properties).toHaveProperty("counter");
    });
  });

  describe("handleGetRunDetails", () => {
    const mockApiKey = "test_api_key_123";
    const mockProjectId = "proj_123";
    const mockTestRunId = "test_run_456";
    const mockResponse = {
      success: true,
      data: {
        testRun: {
          _id: mockTestRunId,
          counter: 42,
          status: "completed",
          testStats: {
            total: 10,
            passed: 8,
            failed: 2,
            skipped: 0,
            flaky: 0,
          },
        },
        testSuites: [],
      },
    };

    it("should throw error when API key is missing", async () => {
      (getApiKey as jest.Mock).mockReturnValue(undefined);

      await expect(
        handleGetRunDetails({ projectId: mockProjectId, testrun_id: mockTestRunId })
      ).rejects.toThrow("Missing TESTDINO_API_KEY");
    });

    it("should call endpoint with testrun_id", async () => {
      (getApiKey as jest.Mock).mockReturnValue(mockApiKey);
      (endpoints.getRunDetails as jest.Mock).mockReturnValue(
        "https://api.testdino.com/api/mcp/proj_123/get-run-details?testrun_id=test_run_456"
      );
      (apiRequestJson as jest.Mock).mockResolvedValue(mockResponse);

      await handleGetRunDetails({
        projectId: mockProjectId,
        testrun_id: mockTestRunId,
      });

      expect(endpoints.getRunDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: mockProjectId,
          testrun_id: mockTestRunId,
        })
      );
    });

    it("should call endpoint with counter", async () => {
      (getApiKey as jest.Mock).mockReturnValue(mockApiKey);
      (endpoints.getRunDetails as jest.Mock).mockReturnValue(
        "https://api.testdino.com/api/mcp/proj_123/get-run-details?counter=42"
      );
      (apiRequestJson as jest.Mock).mockResolvedValue(mockResponse);

      await handleGetRunDetails({
        projectId: mockProjectId,
        counter: 42,
      });

      expect(endpoints.getRunDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: mockProjectId,
          counter: 42,
        })
      );
    });

    it("should handle batch testrun_id", async () => {
      (getApiKey as jest.Mock).mockReturnValue(mockApiKey);
      (endpoints.getRunDetails as jest.Mock).mockReturnValue(
        "https://api.testdino.com/api/mcp/proj_123/get-run-details?testrun_id=run1,run2,run3"
      );
      (apiRequestJson as jest.Mock).mockResolvedValue(mockResponse);

      await handleGetRunDetails({
        projectId: mockProjectId,
        testrun_id: "run1,run2,run3",
      });

      expect(endpoints.getRunDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          testrun_id: "run1,run2,run3",
        })
      );
    });

    it("should return formatted response", async () => {
      (getApiKey as jest.Mock).mockReturnValue(mockApiKey);
      (endpoints.getRunDetails as jest.Mock).mockReturnValue(
        "https://api.testdino.com/api/mcp/proj_123/get-run-details"
      );
      (apiRequestJson as jest.Mock).mockResolvedValue(mockResponse);

      const result = await handleGetRunDetails({
        projectId: mockProjectId,
        testrun_id: mockTestRunId,
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe("text");
      expect(JSON.parse(result.content[0].text)).toEqual(mockResponse);
    });

    it("should handle API errors", async () => {
      (getApiKey as jest.Mock).mockReturnValue(mockApiKey);
      (endpoints.getRunDetails as jest.Mock).mockReturnValue(
        "https://api.testdino.com/api/mcp/proj_123/get-run-details"
      );
      (apiRequestJson as jest.Mock).mockRejectedValue(new Error("Not found"));

      await expect(
        handleGetRunDetails({ projectId: mockProjectId, testrun_id: mockTestRunId })
      ).rejects.toThrow("Failed to retrieve test run details");
    });
  });
});

