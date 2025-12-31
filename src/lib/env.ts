
export function getApiUrl(): string {
  return  "http://localhost:3000";
}

export function getApiKey(args?: any): string | undefined {
  return process.env.TESTDINO_API_KEY || args?.token;
}

