#!/usr/bin/env node

import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "./server.js";

process.env.TESTDINO_IS_HTTP = "1";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

app.post("/mcp", async (req, res) => {
  const authHeader = req.headers.authorization;
  const tokenFromHeader = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;
  const tokenFromQuery = typeof req.query.token === "string" ? req.query.token : undefined;
  const token = tokenFromHeader ?? tokenFromQuery ?? process.env.TESTDINO_PAT;

  const server = createServer(token);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  res.on("close", () => {
    transport.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.get("/mcp", (_req, res) => {
  res.status(405).json({
    error: "Method not allowed. Use POST to interact with the MCP server.",
  });
});

app.delete("/mcp", (_req, res) => {
  res.status(405).json({
    error: "Method not allowed. Use POST to interact with the MCP server.",
  });
});

const httpServer = app.listen(PORT, () => {
  console.log(`TestDino MCP server running at http://localhost:${PORT}/mcp`);
});

process.on("SIGINT", () => {
  httpServer.close();
  process.exit(0);
});
