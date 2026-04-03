export function getApiUrl(): string {
  const configuredUrl = process.env.TESTDINO_API_URL?.trim();
  return configuredUrl || "https://api.testdino.com";
}

export function getApiKey(args?: unknown): string | undefined {
  const tokenFromArgs =
    args &&
    typeof args === "object" &&
    "token" in args &&
    typeof args.token === "string"
      ? args.token
      : undefined;
  return tokenFromArgs || process.env.TESTDINO_PAT;
}
