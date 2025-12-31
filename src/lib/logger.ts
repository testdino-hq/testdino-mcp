/**
 * Logger utilities
 */

export function logError(message: string, ...args: unknown[]): void {
  console.error(`[TestDino] ${message}`, ...args);
}

export function logInfo(message: string, ...args: unknown[]): void {
  console.error(`[TestDino] ${message}`, ...args);
}
