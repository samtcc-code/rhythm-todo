import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerRhythmTools } from "./tools";

// Access model: every registered tool is read, create, or update (minus
// isDone/completion). No tool can mark a task/subtask done, and no delete_*
// tool exists at all - see server/mcp/tools.ts for the enforced list.
export function createRhythmMcpServer(): McpServer {
  const server = new McpServer({ name: "rhythm-todo", version: "1.0.0" });
  registerRhythmTools(server);
  return server;
}
