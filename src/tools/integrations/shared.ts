/**
 * Shared constants for the integrations tool suite.
 *
 * Mirrors the streaming MCP's schemas (`services/mcp/node/src/mcp/streaming/
 * modules/integrations/schemas.ts`). Kept as a plain list so we can reuse it
 * in tool `enum` inputSchemas AND in runtime validation without pulling in
 * zod on the client.
 */

export const INTEGRATION_PROVIDERS = [
  "jira",
  "linear",
  "asana",
  "monday",
  "github",
] as const;

export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];

export function assertProvider(value: unknown): IntegrationProvider {
  if (
    typeof value === "string" &&
    (INTEGRATION_PROVIDERS as readonly string[]).includes(value)
  ) {
    return value as IntegrationProvider;
  }
  throw new Error(
    `provider must be one of: ${INTEGRATION_PROVIDERS.join(", ")}`
  );
}

/**
 * TestDino entity types the external issue can be linked to. Mirrors the
 * streaming `externalIssueSourceTypeSchema`.
 */
export const EXTERNAL_ISSUE_SOURCE_TYPES = [
  "test_run",
  "test_suite",
  "test_case",
  "manual_test_case",
  "manual_test_suite",
  "release",
  "manual_run",
  "manual_run_test_case",
  "session",
] as const;

export type ExternalIssueSourceType =
  (typeof EXTERNAL_ISSUE_SOURCE_TYPES)[number];
