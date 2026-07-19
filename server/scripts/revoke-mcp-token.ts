import "dotenv/config";
import * as db from "../db";

async function main() {
  const idArg = process.argv[2];
  const id = idArg ? parseInt(idArg, 10) : NaN;
  if (!Number.isFinite(id)) {
    console.error("Usage: pnpm mcp:revoke-token <id>");
    console.error("Find the id with: pnpm mcp:list-tokens");
    process.exit(1);
  }
  await db.revokeMcpToken(id);
  console.log(`Revoked MCP token #${id}.`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
