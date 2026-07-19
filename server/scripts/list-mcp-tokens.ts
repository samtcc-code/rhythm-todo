import "dotenv/config";
import * as db from "../db";

async function main() {
  const tokens = await db.listMcpTokens();
  if (tokens.length === 0) {
    console.log("No MCP tokens yet. Create one with: pnpm mcp:create-token \"label\"");
    process.exit(0);
  }
  for (const t of tokens) {
    const status = t.revokedAt ? `revoked ${t.revokedAt.toISOString()}` : "active";
    console.log(`#${t.id}  ${t.label}  (created ${t.createdAt.toISOString()}, ${status})`);
  }
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
