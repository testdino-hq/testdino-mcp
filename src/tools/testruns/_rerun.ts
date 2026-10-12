// Shared POST helper for the two re-run tools: a longer timeout, and a
// timed-out write is reported as possibly started.

import {
  ApiError,
  apiRequest,
  formatApiErrorBody,
  rateLimitHint,
} from "../../lib/request.js";

// A timed-out write is never retried, so 15s would leave CI's state unknown.
const RERUN_TIMEOUT_MS = 30_000;

export interface RerunToolOutput {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export async function postRerun(
  url: string,
  token: string,
  body: Record<string, unknown>
): Promise<RerunToolOutput> {
  let response: Response;
  try {
    response = await apiRequest(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
      timeoutMs: RERUN_TIMEOUT_MS,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // A timeout is the one failure where the write may still have landed: say so
    // instead of letting the agent read it as "nothing happened" and try again.
    if (message.includes("timed out")) {
      throw new Error(
        `${message}. The re-run may already have started — check list_testruns ` +
          `or the repository's GitHub Actions before calling this again.`
      );
    }
    throw error;
  }

  const text = await response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    parsed = undefined;
  }

  if (response.ok) {
    return {
      content: [
        {
          type: "text",
          text: parsed === undefined ? text : JSON.stringify(parsed, null, 2),
        },
      ],
    };
  }

  const formattedErrorText = formatApiErrorBody(text);
  throw new ApiError(
    `API request failed: ${response.status} ${response.statusText}${
      formattedErrorText ? `\n${formattedErrorText}` : ""
    }${rateLimitHint(response)}`,
    response.status,
    parsed === undefined ? text : parsed
  );
}
