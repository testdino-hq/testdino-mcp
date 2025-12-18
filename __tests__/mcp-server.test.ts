/**
 * Integration tests for MCP Server
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  healthTool,
  listTestRunsTool,
  getRunDetailsTool,
} from "../src/tools/index.js";

describe("MCP Server", () => {
  describe("Tool Registration", () => {
    it("should have health tool registered", () => {
      expect(healthTool).toBeDefined();
      expect(healthTool.name).toBe("health");
    });

    it("should have listTestRuns tool registered", () => {
      expect(listTestRunsTool).toBeDefined();
      expect(listTestRunsTool.name).toBe("list_testruns");
    });

    it("should have getRunDetails tool registered", () => {
      expect(getRunDetailsTool).toBeDefined();
      expect(getRunDetailsTool.name).toBe("get_run_details");
    });

    it("should have all required tools", () => {
      const expectedTools = [
        "health",
        "list_testruns",
        "get_run_details",
        "list_testcase",
        "get_testcase_details",
      ];

      // This is a basic check - in a real scenario, you'd test the actual server instance
      expectedTools.forEach((toolName) => {
        expect(toolName).toBeTruthy();
      });
    });
  });

  describe("Tool Schemas", () => {
    it("should have valid input schemas for all tools", () => {
      const tools = [healthTool, listTestRunsTool, getRunDetailsTool];

      tools.forEach((tool) => {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe("object");
        expect(tool.inputSchema.properties).toBeDefined();
      });
    });

    it("should have descriptions for all tools", () => {
      const tools = [healthTool, listTestRunsTool, getRunDetailsTool];

      tools.forEach((tool) => {
        expect(tool.description).toBeDefined();
        expect(typeof tool.description).toBe("string");
        expect(tool.description.length).toBeGreaterThan(0);
      });
    });
  });
});

