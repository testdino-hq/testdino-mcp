export function getApiUrl(): string {
  return "http://localhost:3001";
}

export function getApiKey(args?: unknown): string | undefined {
  const tokenFromArgs =
    args &&
    typeof args === "object" &&
    "token" in args &&
    typeof args.token === "string"
      ? args.token
      : undefined;
  return process.env.TESTDINO_PAT || tokenFromArgs;
}
