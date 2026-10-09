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

export function formatApiErrorBody(errorText: string): string {
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

// Two retries with exponential backoff; jitter keeps parallel callers from retrying in lockstep.
const NETWORK_RETRY_DELAYS_MS = [500, 1_500];

export async function apiRequest(
  url: string,
  options: RequestOptions = {}
): Promise<Response> {
  const method = options.method ?? "GET";
  // Only reads are retried: a write whose response was lost may already have applied.
  const retryDelays = method === "GET" ? NETWORK_RETRY_DELAYS_MS : [];

  for (let attempt = 0; ; attempt++) {
    try {
      return await fetchOnce(url, method, options);
    } catch (error) {
      // undici reports a dropped connection as TypeError; timeouts and aborts are not retried.
      const retryable = error instanceof TypeError && !options.signal?.aborted;
      if (!retryable || attempt >= retryDelays.length) {
        throw error;
      }
      const delay = retryDelays[attempt] * (0.5 + Math.random());
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

async function fetchOnce(
  url: string,
  method: string,
  options: RequestOptions
): Promise<Response> {
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
      }${rateLimitHint(response)}`
    );
  }

  return response.json() as T;
}

// The API sends Retry-After and RateLimit-Reset (seconds) on a 429; callers need the wait, not just the status.
function rateLimitHint(response: Response): string {
  if (response.status !== 429) {
    return "";
  }
  const seconds =
    response.headers?.get("retry-after") ??
    response.headers?.get("ratelimit-reset");
  return seconds ? `\nRate limited: retry after ${seconds}s.` : "";
}
