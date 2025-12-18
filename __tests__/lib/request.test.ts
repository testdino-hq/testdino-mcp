/**
 * Tests for request utilities
 */

import { jest } from "@jest/globals";
import { apiRequest, apiRequestJson } from "../../src/lib/request.js";

// Mock fetch globally
global.fetch = jest.fn() as typeof fetch;

describe("Request Utilities", () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  describe("apiRequest", () => {
    it("should make a GET request by default", async () => {
      const mockResponse = new Response(JSON.stringify({ data: "test" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      await apiRequest("https://api.test.com/test");

      expect(fetch).toHaveBeenCalledWith(
        "https://api.test.com/test",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("should make a POST request with body", async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
      });
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const body = { name: "test" };
      await apiRequest("https://api.test.com/test", {
        method: "POST",
        body,
      });

      expect(fetch).toHaveBeenCalledWith(
        "https://api.test.com/test",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(body),
        })
      );
    });

    it("should include custom headers", async () => {
      const mockResponse = new Response(JSON.stringify({}), { status: 200 });
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      await apiRequest("https://api.test.com/test", {
        headers: { Authorization: "Bearer token123" },
      });

      expect(fetch).toHaveBeenCalledWith(
        "https://api.test.com/test",
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: "Bearer token123",
          }),
        })
      );
    });
  });

  describe("apiRequestJson", () => {
    it("should parse JSON response", async () => {
      const mockData = { success: true, data: "test" };
      const mockResponse = new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await apiRequestJson("https://api.test.com/test");

      expect(result).toEqual(mockData);
    });

    it("should throw error on non-OK response", async () => {
      const mockResponse = new Response("Not Found", {
        status: 404,
        statusText: "Not Found",
      });
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(apiRequestJson("https://api.test.com/test")).rejects.toThrow(
        "API request failed: 404 Not Found"
      );
    });

    it("should handle error response with JSON body", async () => {
      const errorData = { error: "Invalid request" };
      const mockResponse = new Response(JSON.stringify(errorData), {
        status: 400,
        statusText: "Bad Request",
        headers: { "Content-Type": "application/json" },
      });
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(apiRequestJson("https://api.test.com/test")).rejects.toThrow(
        expect.stringContaining("400 Bad Request")
      );
    });
  });
});
