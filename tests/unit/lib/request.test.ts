import { describe, it, expect, afterEach } from "vitest";
import { apiRequest, apiRequestJson } from "../../../src/lib/request.js";
import {
  mockFetchSuccess,
  mockFetchError,
  mockFetchNetworkError,
  restoreFetch,
} from "../../helpers/mockFetch.js";

describe("request", () => {
  afterEach(() => {
    restoreFetch();
  });

  describe("apiRequest", () => {
    it("should JSON.stringify body when provided and omit when not", async () => {
      mockFetchSuccess({});
      await apiRequest("https://api.testdino.com/test", {
        method: "POST",
        body: { key: "value" },
      });

      const fetchMock = globalThis.fetch as ReturnType<
        typeof import("vitest").vi.fn
      >;
      expect(fetchMock.mock.calls[0][1].body).toBe('{"key":"value"}');

      // Without body
      await apiRequest("https://api.testdino.com/test");
      expect(fetchMock.mock.calls[1][1].body).toBeUndefined();
    });
  });

  describe("apiRequestJson", () => {
    it("should throw with status and body on non-ok response", async () => {
      mockFetchError(401, "Unauthorized access");
      await expect(
        apiRequestJson("https://api.testdino.com/test")
      ).rejects.toThrow("API request failed: 401");
    });

    it("should include full error body text in thrown error", async () => {
      mockFetchError(500, "Internal server error details");
      await expect(
        apiRequestJson("https://api.testdino.com/test")
      ).rejects.toThrow("Internal server error details");
    });

    it("should throw on network error", async () => {
      mockFetchNetworkError("Connection refused");
      await expect(
        apiRequestJson("https://api.testdino.com/test")
      ).rejects.toThrow("Connection refused");
    });
  });
});
