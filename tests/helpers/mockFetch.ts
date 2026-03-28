import { vi } from "vitest";

/**
 * Mock a successful fetch response with JSON body.
 */
export function mockFetchSuccess(data: unknown, status = 200): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status,
      statusText: "OK",
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
    })
  );
}

/**
 * Mock a failed fetch response.
 */
export function mockFetchError(
  status: number,
  body: string,
  statusText = "Error"
): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      statusText,
      json: () => Promise.reject(new Error("not json")),
      text: () => Promise.resolve(body),
    })
  );
}

/**
 * Mock fetch to throw a network error.
 */
export function mockFetchNetworkError(message = "Network error"): void {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error(message)));
}

/**
 * Restore the real fetch.
 */
export function restoreFetch(): void {
  vi.unstubAllGlobals();
}

/**
 * Get the URL that fetch was last called with.
 */
export function getLastFetchUrl(): string {
  const mock = vi.mocked(globalThis.fetch);
  const lastCall = mock.mock.calls[mock.mock.calls.length - 1];
  return lastCall?.[0] as string;
}

/**
 * Get the options that fetch was last called with.
 */
export function getLastFetchOptions(): RequestInit | undefined {
  const mock = vi.mocked(globalThis.fetch);
  const lastCall = mock.mock.calls[mock.mock.calls.length - 1];
  return lastCall?.[1] as RequestInit | undefined;
}
