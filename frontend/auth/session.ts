import crypto from "node:crypto";

interface Session {
  pat: string;
  expiresAt: Date;
}

// In-memory session store: sessionId → Session
const sessions = new Map<string, Session>();

const SESSION_TTL_MS = 365 * 24 * 60 * 60 * 1000; // 1 year (matches PAT expiry)
const PRUNE_INTERVAL_MS = 60 * 60 * 1000; // prune every hour

export function createSession(pat: string): string {
  const sessionId = crypto.randomBytes(32).toString("hex");
  sessions.set(sessionId, {
    pat,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  return sessionId;
}

export function getSession(sessionId: string): Session | undefined {
  const session = sessions.get(sessionId);
  if (!session) return undefined;
  if (new Date() > session.expiresAt) {
    sessions.delete(sessionId);
    return undefined;
  }
  return session;
}

export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}

// Periodically remove expired sessions to prevent memory leak
setInterval(() => {
  const now = new Date();
  for (const [id, session] of sessions) {
    if (now > session.expiresAt) sessions.delete(id);
  }
}, PRUNE_INTERVAL_MS);
