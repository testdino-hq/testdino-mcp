/**
 * Tests for endpoints configuration
 */

import { jest } from "@jest/globals";
import { endpoints, getBaseUrl } from "../../src/lib/endpoints.js";
import * as env from "../../src/lib/env.js";

jest.mock("../../src/lib/env.js");

describe("Endpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (env.getApiUrl as jest.Mock).mockReturnValue("https://api.testdino.com/");
  });

  describe("getBaseUrl", () => {
    it("should return the API URL from env", () => {
      const baseUrl = getBaseUrl();
      expect(baseUrl).toBe("https://api.testdino.com/");
      expect(env.getApiUrl).toHaveBeenCalled();
    });
  });

  describe("endpoints.hello", () => {
    it("should return hello endpoint URL", () => {
      const url = endpoints.hello();
      expect(url).toBe("https://api.testdino.com/api/mcp/hello");
    });
  });

  describe("endpoints.listTestRuns", () => {
    it("should return URL without query params when no params provided", () => {
      const url = endpoints.listTestRuns({ projectId: "proj_123" });
      expect(url).toContain("/api/mcp/proj_123/list-testruns");
      expect(url).not.toContain("?");
    });

    it("should include projectId in URL path", () => {
      const url = endpoints.listTestRuns({ projectId: "proj_abc" });
      expect(url).toBe("https://api.testdino.com/api/mcp/proj_abc/list-testruns");
    });

    it("should build query string with filter parameters", () => {
      const url = endpoints.listTestRuns({
        projectId: "proj_123",
        by_branch: "main",
        by_environment: "production",
        limit: 10,
        page: 2,
      });

      expect(url).toContain("by_branch=main");
      expect(url).toContain("by_environment=production");
      expect(url).toContain("limit=10");
      expect(url).toContain("page=2");
    });

    it("should exclude undefined and null values from query string", () => {
      const url = endpoints.listTestRuns({
        projectId: "proj_123",
        by_branch: "main",
        by_environment: undefined,
        limit: null as any,
      });

      expect(url).toContain("by_branch=main");
      expect(url).not.toContain("by_environment");
      expect(url).not.toContain("limit");
    });
  });

  describe("endpoints.getRunDetails", () => {
    it("should return URL with testrun_id", () => {
      const url = endpoints.getRunDetails({
        projectId: "proj_123",
        testrun_id: "run_456",
      });
      expect(url).toContain("/api/mcp/proj_123/get-run-details");
      expect(url).toContain("testrun_id=run_456");
    });

    it("should return URL with counter", () => {
      const url = endpoints.getRunDetails({
        projectId: "proj_123",
        counter: 42,
      });
      expect(url).toContain("counter=42");
    });

    it("should handle batch testrun_id", () => {
      const url = endpoints.getRunDetails({
        projectId: "proj_123",
        testrun_id: "run1,run2,run3",
      });
      expect(url).toContain("testrun_id=run1%2Crun2%2Crun3");
    });
  });

  describe("endpoints.listTestCases", () => {
    it("should build URL with all filter parameters", () => {
      const url = endpoints.listTestCases({
        projectId: "proj_123",
        by_testrun_id: "run_456",
        by_status: "failed",
        by_browser_name: "chromium",
        limit: 50,
      });

      expect(url).toContain("/api/mcp/proj_123/list-testcase");
      expect(url).toContain("by_testrun_id=run_456");
      expect(url).toContain("by_status=failed");
      expect(url).toContain("by_browser_name=chromium");
      expect(url).toContain("limit=50");
    });
  });

  describe("endpoints.getTestCaseDetails", () => {
    it("should build URL with testcaseid", () => {
      const url = endpoints.getTestCaseDetails({
        projectId: "proj_123",
        testcaseid: "case_789",
      });
      expect(url).toContain("/api/mcp/proj_123/get-testcase-details");
      expect(url).toContain("testcaseid=case_789");
    });

    it("should build URL with by_title and by_testrun_id", () => {
      const url = endpoints.getTestCaseDetails({
        projectId: "proj_123",
        by_title: "Test Case Name",
        by_testrun_id: "run_456",
      });
      expect(url).toContain("by_title=Test+Case+Name");
      expect(url).toContain("by_testrun_id=run_456");
    });
  });
});
