/**
 * Shared POST helper for the two re-run tools.
 *
 * Why these two do not use `apiRequestJson`: a re-run endpoint answers a
 * refusal as a 400 whose body IS the answer — the question to put to the user,
 * what a same-commit re-run would do, and the CLI command to fall back to.
 * `apiRequestJson` turns any non-2xx into a thrown Error with the body
 * truncated to 500 characters, which would throw that away and leave the agent
 * with nothing to act on. So a refusal that matches the documented envelope is
 * passed through as tool output; everything else (401, 403, 404, 429, 5xx, or a
 * body that is not that envelope) still throws, so nothing else changes.
 */

import {
  apiRequest,
  formatApiErrorBody,
  rateLimitHint,
} from "../../lib/request.js";

// The dispatch path makes several upstream calls (selection, run detail, the
// GitHub targets read and its workflow files, then the dispatch itself), and a
// timeout here is NOT retried, so the caller cannot tell whether CI started.
// Longer than the 15s default for that reason.
const RERUN_TIMEOUT_MS = 30_000;

export interface RerunToolOutput {
  content: Array<{ type: "text"; text: string }>;
}

/** A refusal in the documented envelope: `{success:false, error:{code, message}, …}`. */
function isContractRefusal(status: number, body: unknown): boolean {
  if (status !== 400 || typeof body !== "object" || body === null) {
    return false;
  }
  const error = (body as { error?: unknown }).error;
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
  const response = await apiRequest(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body,
    timeoutMs: RERUN_TIMEOUT_MS,
  });

  const text = await response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    parsed = undefined;
  }

  if (response.ok || isContractRefusal(response.status, parsed)) {
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
  throw new Error(
    `API request failed: ${response.status} ${response.statusText}${
      formattedErrorText ? `\n${formattedErrorText}` : ""
    }${rateLimitHint(response)}`
  );
}
