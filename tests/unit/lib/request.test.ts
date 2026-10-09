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

    it("should send the same per-process id header on every request", async () => {
      mockFetchSuccess({});
      await apiRequest("https://api.testdino.com/a");
      await apiRequest("https://api.testdino.com/b", {
        method: "PATCH",
        body: {},
      });

      const fetchMock = globalThis.fetch as ReturnType<
        typeof import("vitest").vi.fn
      >;
      const first = fetchMock.mock.calls[0][1].headers["mcp-session-id"];
      const second = fetchMock.mock.calls[1][1].headers["mcp-session-id"];
      expect(first).toMatch(/^[A-Za-z0-9_-]{8,128}$/);
      expect(second).toBe(first);
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

    // A caller told only "429" cannot tell a one-second wait from a one-minute one.
    it("should name the wait from Retry-After on a 429", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 429,
          statusText: "Too Many Requests",
          headers: new Headers({
            "Retry-After": "42",
            "RateLimit-Remaining": "0",
          }),
          text: () =>
            Promise.resolve('{"error":{"message":"Too many MCP requests."}}'),
        })
      );

      await expect(
        apiRequestJson("https://api.testdino.com/test")
      ).rejects.toThrow(
        /API request failed: 429 Too Many Requests[\s\S]*retry after 42s/
      );
    });
  });

  // undici reports a dropped connection as TypeError("fetch failed").
  describe("network failures", () => {
    const networkFailure = () => Promise.reject(new TypeError("fetch failed"));
    const okResponse = {
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    };

    it("should retry a read and return the response once the network recovers", async () => {
      vi.useFakeTimers();
      const fetchMock = vi
        .fn()
        .mockImplementationOnce(networkFailure)
        .mockResolvedValue(okResponse);
      vi.stubGlobal("fetch", fetchMock);

      const pending = apiRequest("https://api.testdino.com/test");
      await vi.runAllTimersAsync();

      await expect(pending).resolves.toBe(okResponse);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("should give up after three attempts", async () => {
      vi.useFakeTimers();
      const fetchMock = vi.fn().mockImplementation(networkFailure);
      vi.stubGlobal("fetch", fetchMock);

      const pending = apiRequest("https://api.testdino.com/test");
      const expectation = expect(pending).rejects.toThrow("fetch failed");
      await vi.runAllTimersAsync();

      await expectation;
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    // A write whose response was lost may already have been applied.
    it("should not retry a write", async () => {
      const fetchMock = vi.fn().mockImplementation(networkFailure);
      vi.stubGlobal("fetch", fetchMock);

      await expect(
        apiRequest("https://api.testdino.com/test", {
          method: "PATCH",
          body: {},
        })
      ).rejects.toThrow("fetch failed");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    // A malformed TESTDINO_API_URL also throws a TypeError; retrying it only delays the error.
    it("should not retry a TypeError that is not a dropped connection", async () => {
      const fetchMock = vi
        .fn()
        .mockRejectedValue(new TypeError("Failed to parse URL from not a url"));
      vi.stubGlobal("fetch", fetchMock);

      await expect(apiRequest("not a url")).rejects.toThrow(
        "Failed to parse URL"
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
