/**
 * Shared POST helper for the two re-run tools. Not `apiRequestJson`: a refusal
 * is a 400 whose body is the answer, and that throws it as a 500-char string.
 */

import {
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

/**
 * A refusal the caller can act on. Two envelopes reach here: the gateway's
 * `{error: {code, message}}`, and integration's `{error: "<CODE>", message}`
 * passed through unchanged when GitHub refuses the dispatch.
 */
function isContractRefusal(status: number, body: unknown): boolean {
  if (status !== 400 || typeof body !== "object" || body === null) {
    return false;
  }
  const error = (body as { error?: unknown }).error;
  if (typeof error === "string") {
    return error.length > 0;
  }
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as { code?: unknown }).code === "string"
  );
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

  if (isContractRefusal(response.status, parsed)) {
    // statusCode first and isError set, exactly as the hosted server shapes a
    // failed tool result, so a client that branches on either behaves the same
    // on both surfaces.
    const shaped = { statusCode: response.status, ...(parsed as object) };
    return {
      content: [{ type: "text", text: JSON.stringify(shaped, null, 2) }],
      isError: true,
    };
  }

  const formattedErrorText = formatApiErrorBody(text);
  throw new Error(
    `API request failed: ${response.status} ${response.statusText}${
      formattedErrorText ? `\n${formattedErrorText}` : ""
    }${rateLimitHint(response)}`
  );
}
