import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { createRhythmMcpServer } from "../mcp/server";
import { requireMcpToken } from "../mcp/auth";

function isPortAvailable(port: number): Promise<boolean> {
    return new Promise(resolve => {
          const server = net.createServer();
          server.listen(port, () => {
                  server.close(() => resolve(true));
          });
          server.on("error", () => resolve(false));
    });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
    for (let port = startPort; port < startPort + 20; port++) {
          if (await isPortAvailable(port)) {
                  return port;
          }
    }
    throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
    const app = express();
    const server = createServer(app);
    app.set("trust proxy", 1);

  app.use(express.json({ limit: "50mb" }));
    app.use(express.urlencoded({ limit: "50mb", extended: true }));
    app.use(cookieParser());

  registerOAuthRoutes(app);

  app.use(
        "/api/trpc",
        createExpressMiddleware({
                router: appRouter,
                createContext,
        })
      );

  // Stateless MCP endpoint for colleagues/bots with a minted token
  // (pnpm mcp:create-token). See server/mcp/tools.ts for exactly what
  // it can and can't do.
  app.post("/mcp", requireMcpToken, async (req, res) => {
        try {
              const mcpServer = createRhythmMcpServer();
              const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
              res.on("close", () => { transport.close(); mcpServer.close(); });
              await mcpServer.connect(transport);
              await transport.handleRequest(req, res, req.body);
        } catch (err) {
              console.error("[MCP] Request handling failed:", err);
              if (!res.headersSent) res.status(500).json({ error: "MCP request failed" });
        }
  });
  app.get("/mcp", (_req, res) => { res.status(405).json({ error: "This MCP server is stateless; only POST is supported." }); });
  app.delete("/mcp", (_req, res) => { res.status(405).json({ error: "This MCP server is stateless; only POST is supported." }); });

  if (process.env.NODE_ENV === "development") {
        await setupVite(app, server);
  } else {
        serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
    const port = await findAvailablePort(preferredPort);
    if (port !== preferredPort) {
          console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
    }
    server.listen(port, () => {
          console.log(`Server running on http://localhost:${port}/`);
    });
}

startServer().catch(console.error);
