
export function getApiUrl(): string {
  return  "https://staging-api.testdino.com";
}

export function getApiKey(args?: any): string | undefined {
  return process.env.TESTDINO_API_KEY || args?.token;
}

