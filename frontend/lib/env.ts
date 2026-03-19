let _requestToken: string | undefined;

export function setRequestToken(token: string | undefined): void {
  _requestToken = token;
}

export function getApiUrl(): string {
  return process.env.TESTDINO_API_URL || "https://api.testdino.com";
}

export function getApiKey(args?: unknown): string | undefined {
  if (_requestToken) return _requestToken;
  const tokenFromArgs =
    args &&
    typeof args === "object" &&
    "token" in args &&
    typeof args.token === "string"
      ? args.token
      : undefined;
  return process.env.TESTDINO_PAT || tokenFromArgs;
}
