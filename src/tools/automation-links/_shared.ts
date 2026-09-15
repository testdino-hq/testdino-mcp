/**
 * Shared bits for the automation-link tools (manual case ↔ automated test).
 */

export const MISSING_PAT_MESSAGE =
  "Missing TESTDINO_PAT environment variable. " +
  "Please configure it in your .cursor/mcp.json file under the 'env' section.";

export function toolResult(response: unknown) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(response, null, 2),
      },
    ],
  };
}
