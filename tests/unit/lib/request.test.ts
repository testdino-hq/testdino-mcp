import { describe, it, expect, afterEach, vi } from "vitest";
import { apiRequest, apiRequestJson } from "../../../src/lib/request.js";
import {
  getLastFetchOptions,
  mockFetchSuccess,
  mockFetchError,
  mockFetchNetworkError,
  restoreFetch,
} from "../../helpers/mockFetch.js";

describe("request", () => {
  afterEach(() => {
    restoreFetch();
    vi.useRealTimers();
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

    it("should abort stalled requests after the default timeout", async () => {
      vi.useFakeTimers();

      const fetchMock = vi.fn().mockImplementation(
        (_url: string, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            const signal = init?.signal as AbortSignal | undefined;
            signal?.addEventListener(
              "abort",
              () => {
                reject(new Error("request aborted"));
              },
              { once: true }
            );
          })
      );
      vi.stubGlobal("fetch", fetchMock);

      const requestPromise = apiRequest("https://api.testdino.com/test");
      const requestExpectation = expect(requestPromise).rejects.toThrow(
        "API request timed out after 15000ms"
      );
      expect(getLastFetchOptions()?.signal).toBeDefined();

      await vi.advanceTimersByTimeAsync(15_000);

      await requestExpectation;
    });
  });

  describe("apiRequestJson", () => {
    it("should throw with status and body on non-ok response", async () => {
      mockFetchError(401, "Unauthorized access");
      await expect(
        apiRequestJson("https://api.testdino.com/test")
      ).rejects.toThrow("API request failed: 401");
    });

    it("should truncate and redact error body text in thrown errors", async () => {
      const oversizedErrorBody = `Authorization: Bearer secret-token ${"x".repeat(
        600
      )}`;
      mockFetchError(500, oversizedErrorBody);

      expect.assertions(4);

      try {
        await apiRequestJson("https://api.testdino.com/test");
      } catch (error) {
        const message = (error as Error).message;

        expect(message).toContain("API request failed: 500");
        expect(message).toContain("Bearer [REDACTED]");
        expect(message).toContain("[truncated]");
        expect(message).not.toContain("secret-token");
      }
    });

    it("should throw on network error", async () => {
      mockFetchNetworkError("Connection refused");
      await expect(
        apiRequestJson("https://api.testdino.com/test")
      ).rejects.toThrow("Connection refused");
    });
  });
});
