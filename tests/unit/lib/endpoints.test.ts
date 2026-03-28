import { describe, it, expect } from "vitest";
import { endpoints } from "../../../src/lib/endpoints.js";

describe("endpoints", () => {
  describe("buildQueryString behavior", () => {
    it("should include provided query params and skip undefined ones", () => {
      const url = endpoints.listTestRuns({
        projectId: "proj-1",
        by_branch: "main",
        limit: 10,
        by_author: undefined,
      });
      expect(url).toContain("by_branch=main");
      expect(url).toContain("limit=10");
      expect(url).not.toContain("by_author");
      expect(url).not.toContain("projectId=");
    });

    it("should produce clean URL when all query params are undefined", () => {
      const url = endpoints.listTestRuns({
        projectId: "proj-1",
        by_branch: undefined,
      });
      expect(url).not.toContain("?");
    });
  });

  describe("debugTestCase", () => {
    it("should URL-encode testcase_name with special characters", () => {
      const url = endpoints.debugTestCase({
        projectId: "proj-1",
        testcase_name: "Login test with spaces & symbols",
      });
      expect(url).toContain("testcase_name=Login+test");
      expect(url).toContain("%26"); // & encoded
    });
  });

  describe("listManualTestCases", () => {
    it("should forward filter params as query string", () => {
      const url = endpoints.listManualTestCases({
        projectId: "proj-1",
        status: "active",
        priority: "high",
      });
      expect(url).toContain("status=active");
      expect(url).toContain("priority=high");
    });
  });

  describe("listManualTestSuites", () => {
    it("should include parentSuiteId when provided", () => {
      const url = endpoints.listManualTestSuites({
        projectId: "proj-1",
        parentSuiteId: "suite-1",
      });
      expect(url).toContain("parentSuiteId=suite-1");
    });
  });
});
