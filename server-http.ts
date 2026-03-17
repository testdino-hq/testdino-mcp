#!/usr/bin/env node

import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "./server.js";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

app.post("/mcp", async (req, res) => {
  const server = createServer();
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
