#!/usr/bin/env node

import express from "express";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "./server.js";
import { createSession, getSession, deleteSession } from "./frontend/auth/session.js";

// Load .env file manually — works on all Node/tsx versions and all OS
try {
  const envFile = readFileSync(resolve(process.cwd(), ".env"), "utf-8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const val = trimmed.slice(eqIndex + 1).trim();
    if (key && !(key in process.env)) process.env[key] = val;
  }
} catch {
  // no .env file found — using existing environment variables
}

process.env.TESTDINO_IS_HTTP = "1";

const app = express();
app.set("trust proxy", 1); // trust X-Forwarded-Proto / X-Forwarded-Host from ngrok / reverse proxies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3002;  // 3001 is used by testdino server locally
const TESTDINO_APP_URL = (process.env.TESTDINO_APP_URL || "https://app.testdino.com").trim();
const TESTDINO_API_URL = (process.env.TESTDINO_API_URL || "https://api.testdino.com").trim();
const SESSION_COOKIE = "td_mcp_session";

// In-memory state store for CSRF protection
interface PendingState {
  timestamp: number;
  clientRedirectUri?: string; // Claude Web's redirect_uri (for OAuth2 flow)
  clientState?: string;       // Claude Web's original state param to echo back
}
const pendingStates = new Map<string, PendingState>();
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// ─── Token resolution ─────────────────────────────────────────────────────────

function resolveToken(req: express.Request): string | undefined {
  // 1. Session cookie (OAuth flow)
  const sessionId = parseCookie(req.headers.cookie, SESSION_COOKIE);
  if (sessionId) {
    const session = getSession(sessionId);
    if (session) return session.pat;
  }

  // 2. Authorization: Bearer header (ChatGPT / backwards compat)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const t = authHeader.slice(7);
    if (t) return t;
  }

  // 3. ?token= query param (Claude Web backwards compat)
  if (typeof req.query.token === "string" && req.query.token) {
    return req.query.token;
  }

  // 4. Environment variable (local / server deployments)
  return process.env.TESTDINO_PAT;
}

function parseCookie(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.split(";").find((c) => c.trim().startsWith(`${name}=`));
  return match ? match.trim().slice(name.length + 1) : undefined;
}

// ─── Auth HTML helpers ────────────────────────────────────────────────────────

function successPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connected — TestDino</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #f5f5f5; display: flex; align-items: center;
           justify-content: center; min-height: 100vh; }
    .card { background: #fff; border-radius: 16px; box-shadow: 0 4px 32px rgba(0,0,0,.08);
            padding: 3rem 2.5rem; width: 100%; max-width: 400px; text-align: center; }
    .icon { width: 72px; height: 72px; background: #d1fae5; border-radius: 50%;
            display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; }
    .icon svg { width: 36px; height: 36px; color: #059669; }
    h1 { font-size: 1.35rem; font-weight: 700; color: #111; margin-bottom: .5rem; }
    p { font-size: .9rem; color: #666; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
      </svg>
    </div>
    <h1>Connected!</h1>
    <p>TestDino is now connected to your AI client.<br>You can close this tab and return to your conversation.</p>
  </div>
</body>
</html>`;
}

function errorPage(message: string): string {
  const safe = message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connection Failed — TestDino</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #f5f5f5; display: flex; align-items: center;
           justify-content: center; min-height: 100vh; }
    .card { background: #fff; border-radius: 16px; box-shadow: 0 4px 32px rgba(0,0,0,.08);
            padding: 3rem 2.5rem; width: 100%; max-width: 400px; text-align: center; }
    .icon { width: 72px; height: 72px; background: #fee2e2; border-radius: 50%;
            display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; }
    .icon svg { width: 36px; height: 36px; color: #dc2626; }
    h1 { font-size: 1.35rem; font-weight: 700; color: #111; margin-bottom: .5rem; }
    p { font-size: .9rem; color: #666; line-height: 1.6; margin-bottom: 1.5rem; }
    a { display: inline-block; padding: .6rem 1.4rem; background: #111; color: #fff;
        border-radius: 8px; font-size: .875rem; font-weight: 600; text-decoration: none; }
    a:hover { background: #333; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
      </svg>
    </div>
    <h1>Connection Failed</h1>
    <p>${safe}</p>
    <a href="javascript:window.close()">Close Tab</a>
  </div>
</body>
</html>`;
}

// ─── OAuth discovery & registration (required by Claude Web / MCP spec) ───────

/**
 * GET /.well-known/oauth-authorization-server
 * RFC 8414 — OAuth 2.0 Authorization Server Metadata.
 * Claude Web fetches this first to discover all OAuth endpoints.
 */
app.get("/.well-known/oauth-authorization-server", (req, res) => {
  const base = req.protocol + "://" + req.get("host");
  res.json({
    issuer: base,
    authorization_endpoint: `${base}/auth`,
    token_endpoint: `${base}/token`,
    registration_endpoint: `${base}/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
  });
});

/**
 * POST /register
 * RFC 7591 — OAuth 2.0 Dynamic Client Registration.
 * Claude Web registers itself before starting the OAuth flow.
 */
app.post("/register", (req, res) => {
  const { redirect_uris, client_name, grant_types, response_types } = req.body;
  res.status(201).json({
    client_id: "mcp-client-" + crypto.randomBytes(8).toString("hex"),
    client_id_issued_at: Math.floor(Date.now() / 1000),
    redirect_uris: redirect_uris || [],
    grant_types: grant_types || ["authorization_code"],
    response_types: response_types || ["code"],
    client_name: client_name || "MCP Client",
    token_endpoint_auth_method: "none",
  });
});

/**
 * POST /token
 * Token endpoint — Claude Web calls this to exchange the auth code for a Bearer token.
 * We proxy the exchange to the TestDino API and return the access_token to Claude Web.
 */
app.post("/token", async (req, res) => {
  const { code, grant_type } = req.body;

  if (grant_type !== "authorization_code") {
    return res.status(400).json({ error: "unsupported_grant_type" });
  }
  if (!code) {
    return res.status(400).json({ error: "invalid_request", error_description: "Missing code" });
  }

  const connectorBase = req.protocol + "://" + req.get("host");
  const redirectUri = `${connectorBase}/auth/callback`;

  try {
    const tokenRes = await fetch(`${TESTDINO_API_URL}/api/mcp/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, redirect_uri: redirectUri }),
    });

    const tokenData = await tokenRes.json() as any;

    if (!tokenRes.ok || !tokenData.access_token) {
      return res.status(400).json({
        error: "invalid_grant",
        error_description: tokenData.error_description || tokenData.error || "Token exchange failed",
      });
    }

    console.log("[token] issued access_token to client");
    res.json({
      access_token: tokenData.access_token,
      token_type: "Bearer",
      scope: tokenData.scope || "",
    });
  } catch (err) {
    console.error("[token] exchange error:", err);
    res.status(500).json({ error: "server_error" });
  }
});

// ─── OAuth routes ─────────────────────────────────────────────────────────────

/**
 * GET /auth
 * Starts the OAuth flow — generates a state nonce and redirects to the
 * TestDino /connect/mcp page.
 * Supports both:
 *   - Claude Web flow: passes redirect_uri + state query params
 *   - Direct browser flow: no params, server manages the whole exchange
 */
app.get("/auth", (req, res) => {
  const internalState = crypto.randomBytes(16).toString("hex");

  // Capture Claude Web's redirect_uri and state so we can echo them back
  const clientRedirectUri = typeof req.query.redirect_uri === "string" ? req.query.redirect_uri : undefined;
  const clientState = typeof req.query.state === "string" ? req.query.state : undefined;

  pendingStates.set(internalState, { timestamp: Date.now(), clientRedirectUri, clientState });

  // Clean up stale states
  const cutoff = Date.now() - STATE_TTL_MS;
  for (const [s, data] of pendingStates) {
    if (data.timestamp < cutoff) pendingStates.delete(s);
  }

  const connectorBase = req.protocol + "://" + req.get("host");
  const redirectUri = `${connectorBase}/auth/callback`;

  const authorizeUrl = `${TESTDINO_APP_URL}/connect/mcp?redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(internalState)}`;

  console.log(`[auth] redirecting to: ${authorizeUrl}`);

  // Use JS redirect instead of 302 — avoids an extra ngrok round-trip and
  // bypasses the ngrok browser warning page on free tier tunnels.
  res.setHeader("ngrok-skip-browser-warning", "true");
  res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<meta http-equiv="refresh" content="0;url=${authorizeUrl}">
<script>window.location.replace(${JSON.stringify(authorizeUrl)});</script>
</head><body><p>Redirecting...</p></body></html>`);
});

/**
 * GET /auth/callback
 * Receives the auth code from TestDino /connect/mcp.
 *
 * - Claude Web flow: redirects code back to Claude Web's redirect_uri so it
 *   can exchange it at POST /token.
 * - Direct browser flow: exchanges code here, sets session cookie, shows success page.
 */
app.get("/auth/callback", async (req, res) => {
  const { code, state } = req.query as Record<string, string>;

  // Validate state
  if (!state || !pendingStates.has(state)) {
    return res.status(400).send(errorPage("Invalid or expired state. Please try connecting again."));
  }

  const stateData = pendingStates.get(state)!;
  pendingStates.delete(state);

  if (Date.now() - stateData.timestamp > STATE_TTL_MS) {
    return res.status(400).send(errorPage("Connection request expired. Please try again."));
  }

  if (!code) {
    return res.status(400).send(errorPage("Missing authorization code."));
  }

  // ── Claude Web flow ──────────────────────────────────────────────────────
  // Claude Web supplied its own redirect_uri — send the code back to it.
  // Claude Web will then call POST /token to exchange the code for a Bearer token.
  if (stateData.clientRedirectUri) {
    const callbackUrl = new URL(stateData.clientRedirectUri);
    callbackUrl.searchParams.set("code", code);
    if (stateData.clientState) callbackUrl.searchParams.set("state", stateData.clientState);
    console.log(`[auth/callback] redirecting code to Claude Web: ${callbackUrl.origin}...`);
    return res.redirect(callbackUrl.toString());
  }

  // ── Direct browser flow ──────────────────────────────────────────────────
  // No client redirect_uri — exchange the code here and set a session cookie.
  const connectorBase = req.protocol + "://" + req.get("host");
  const redirectUri = `${connectorBase}/auth/callback`;

  try {
    const tokenRes = await fetch(`${TESTDINO_API_URL}/api/mcp/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, redirect_uri: redirectUri }),
    });

    const tokenData = await tokenRes.json() as any;

    if (!tokenRes.ok || !tokenData.access_token) {
      const desc = tokenData.error_description || tokenData.error || "Token exchange failed";
      return res.status(400).send(errorPage(desc));
    }

    const sessionId = createSession(tokenData.access_token);

    const isProd = process.env.NODE_ENV === "production";
    const cookieOptions = [
      `${SESSION_COOKIE}=${sessionId}`,
      "HttpOnly",
      "Path=/",
      "SameSite=Lax",
      isProd ? "Secure" : "",
      `Max-Age=${365 * 24 * 60 * 60}`,
    ]
      .filter(Boolean)
      .join("; ");

    res.setHeader("Set-Cookie", cookieOptions);
    return res.send(successPage());
  } catch (err) {
    console.error("[auth/callback] token exchange error:", err);
    return res.status(500).send(errorPage("Failed to complete connection. Please try again."));
  }
});

/**
 * POST /auth/logout
 * Clears the session cookie and removes the session from the store.
 */
app.post("/auth/logout", (req, res) => {
  const sessionId = parseCookie(req.headers.cookie, SESSION_COOKIE);
  if (sessionId) deleteSession(sessionId);

  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0`);
  res.json({ success: true });
});

/**
 * GET /auth/status
 * Returns whether the current request has a valid session.
 */
app.get("/auth/status", (req, res) => {
  const sessionId = parseCookie(req.headers.cookie, SESSION_COOKIE);
  const session = sessionId ? getSession(sessionId) : undefined;
  res.json({ authenticated: !!session });
});

// ─── MCP endpoint ─────────────────────────────────────────────────────────────

// Methods Claude Web calls before/during OAuth to discover tools and load the UI.
// These are safe to allow without a token — no user data is returned.
const UNAUTHED_METHODS = new Set([
  "initialize",
  "notifications/initialized",
  "tools/list",
  "resources/list",
  "resources/read",
  "ping",
]);

app.post("/mcp", async (req, res) => {
  const token = resolveToken(req);
  const method: string = req.body?.method ?? "";

  if (!token) {
    if (UNAUTHED_METHODS.has(method)) {
      // Allow discovery requests without auth so Claude Web can see the
      // show_testdino widget tool (_meta / resourceUri) before OAuth completes.
      const server = createServer(undefined);
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      res.on("close", () => transport.close());
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    }

    // All other methods (tools/call etc.) require auth — trigger OAuth flow
    res.setHeader("WWW-Authenticate", `Bearer realm="${req.protocol}://${req.get("host")}/auth"`);
    return res.status(401).json({ error: "unauthorized", message: "Authentication required. Please connect via /auth." });
  }

  const server = createServer(token);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  res.on("close", () => transport.close());

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.get("/mcp", (_req, res) => {
  res.status(405).json({ error: "Method not allowed. Use POST to interact with the MCP server." });
});

app.delete("/mcp", (_req, res) => {
  res.status(405).json({ error: "Method not allowed. Use POST to interact with the MCP server." });
});

// ─── Start ────────────────────────────────────────────────────────────────────

const httpServer = app.listen(PORT, () => {
  console.log(`TestDino MCP HTTP server running at http://localhost:${PORT}/mcp`);
  console.log(`OAuth flow: http://localhost:${PORT}/auth`);
  console.log(`TestDino app : ${TESTDINO_APP_URL}`);
  console.log(`TestDino api : ${TESTDINO_API_URL}`);
});

process.on("SIGINT", () => {
  httpServer.close();
  process.exit(0);
});
