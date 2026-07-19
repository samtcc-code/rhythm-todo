import "dotenv/config";
import * as db from "../db";

async function main() {
  const label = process.argv[2];
  if (!label) {
    console.error('Usage: pnpm mcp:create-token "Label (e.g. a colleague\'s name, or a bot name)"');
    process.exit(1);
  }
  const { id, token } = await db.createMcpToken(label);
  console.log(`Created MCP token #${id} for "${label}".`);
  console.log("");
  console.log("Token (copy this now - it will not be shown again):");
  console.log(token);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
