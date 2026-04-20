/**
 * API request utilities
 */

export interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
}

const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
const MAX_ERROR_BODY_LENGTH = 500;

function formatApiErrorBody(errorText: string): string {
  const compactError = errorText.replace(/\s+/g, " ").trim();
  if (!compactError) {
    return "";
  }

  const redactedError = compactError
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+\b/gi, "Bearer [REDACTED]")
    .replace(
      /("?(?:token|patId|apiKey|authorization)"?\s*:\s*")([^"]+)(")/gi,
      "$1[REDACTED]$3"
    );

  if (redactedError.length <= MAX_ERROR_BODY_LENGTH) {
    return redactedError;
  }

  return `${redactedError.slice(0, MAX_ERROR_BODY_LENGTH)}... [truncated]`;
}

function createRequestSignal(timeoutMs: number, upstreamSignal?: AbortSignal) {
  const controller = new AbortController();
  let didTimeout = false;

  const handleTimeout = () => {
    didTimeout = true;
    controller.abort();
  };

  const handleUpstreamAbort = () => {
    controller.abort();
  };

  const timeoutId = setTimeout(handleTimeout, timeoutMs);

  if (upstreamSignal) {
    if (upstreamSignal.aborted) {
      controller.abort();
    } else {
      upstreamSignal.addEventListener("abort", handleUpstreamAbort, {
        once: true,
      });
    }
  }

  return {
    signal: controller.signal,
    didTimeout: () => didTimeout,
    cleanup: () => {
      clearTimeout(timeoutId);
      upstreamSignal?.removeEventListener("abort", handleUpstreamAbort);
    },
  };
}

export async function apiRequest(
  url: string,
  options: RequestOptions = {}
): Promise<Response> {
  const method = options.method ?? "GET";
  const headers = options.headers ?? {};
  const body = options.body;
  const timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const requestSignal = createRequestSignal(timeoutMs, options.signal);

  try {
    return await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: requestSignal.signal,
    });
  } catch (error) {
    if (requestSignal.didTimeout()) {
      throw new Error(`API request timed out after ${timeoutMs}ms`);
    }

    throw error;
  } finally {
    requestSignal.cleanup();
  }
}

export async function apiRequestJson<T = unknown>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const response = await apiRequest(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    const formattedErrorText = formatApiErrorBody(errorText);
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}${
        formattedErrorText ? `\n${formattedErrorText}` : ""
      }`
    );
  }

  return response.json() as T;
}
