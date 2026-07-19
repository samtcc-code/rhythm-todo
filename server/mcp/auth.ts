import type { Request, Response, NextFunction } from "express";
import * as db from "../db";

export interface McpAuthedRequest extends Request {
  mcpTokenId?: number;
}

// Requires "Authorization: Bearer <token>", checked against mcp_tokens.
// Tokens are minted via `pnpm mcp:create-token` and revoked via
// `pnpm mcp:revoke-token` - there is no in-app UI for this.
export async function requireMcpToken(req: McpAuthedRequest, res: Response, next: NextFunction) {
  const header = req.header("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    res.status(401).json({ error: "Missing or malformed Authorization header" });
    return;
  }
  try {
    const record = await db.verifyMcpToken(token);
    if (!record) {
      res.status(401).json({ error: "Invalid or revoked token" });
      return;
    }
    req.mcpTokenId = record.id;
    next();
  } catch (err) {
    console.error("[MCP] Token verification failed:", err);
    res.status(503).json({ error: "MCP server unavailable" });
  }
}
