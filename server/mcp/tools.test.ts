import { describe, expect, it, vi, beforeEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createRhythmMcpServer } from "./server";

// ── Mock db module ──────────────────────────────────────────────
const dbMock = vi.hoisted(() => ({
  listTasks: vi.fn(async () => []),
  getTask: vi.fn(async () => null),
  getTaskTagIds: vi.fn(async () => []),
  listSubtasks: vi.fn(async () => []),
  listAreas: vi.fn(async () => []),
  listProjects: vi.fn(async () => []),
  listTags: vi.fn(async () => []),
  getAllUsers: vi.fn(async () => []),
  createTask: vi.fn(async () => ({ id: 1 })),
  createSubtask: vi.fn(async () => ({ id: 1 })),
  createArea: vi.fn(async () => ({ id: 1 })),
  createProject: vi.fn(async () => ({ id: 1 })),
  createTag: vi.fn(async () => ({ id: 1 })),
  updateTask: vi.fn(async () => undefined),
  updateSubtask: vi.fn(async () => undefined),
  updateArea: vi.fn(async () => undefined),
  updateProject: vi.fn(async () => undefined),
  updateTag: vi.fn(async () => undefined),
}));
vi.mock("../db", () => dbMock);

async function connectedClient() {
  const client = new Client({ name: "test-client", version: "1.0.0" });
  const server = createRhythmMcpServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
  return client;
}

describe("Rhythm MCP tools", () => {
  beforeEach(() => {
    Object.values(dbMock).forEach(fn => fn.mockClear());
  });

  it("never exposes a tool that can complete or delete anything", async () => {
    const client = await connectedClient();
    const { tools } = await client.listTools();
    const names = tools.map(t => t.name);

    expect(names.sort()).toEqual([
      "create_area",
      "create_project",
      "create_subtask",
      "create_tag",
      "create_task",
      "get_task",
      "list_areas",
      "list_projects",
      "list_tags",
      "list_tasks",
      "list_users",
      "update_area",
      "update_project",
      "update_subtask",
      "update_tag",
      "update_task",
    ].sort());

    for (const name of names) {
      expect(name).not.toMatch(/delete/i);
      expect(name).not.toMatch(/complete/i);
      expect(name).not.toMatch(/^mark_/i);
    }
  });

  it("update_task's schema does not accept isDone, even if the caller sends it", async () => {
    const client = await connectedClient();
    const { tools } = await client.listTools();
    const updateTaskTool = tools.find(t => t.name === "update_task")!;
    expect(Object.keys(updateTaskTool.inputSchema.properties ?? {})).not.toContain("isDone");

    await client.callTool({
      name: "update_task",
      arguments: { id: 1, title: "Renamed", isDone: true } as Record<string, unknown>,
    });

    expect(dbMock.updateTask).toHaveBeenCalledTimes(1);
    const [, data] = dbMock.updateTask.mock.calls[0]!;
    expect(data).not.toHaveProperty("isDone");
    expect(data).toMatchObject({ title: "Renamed" });
  });

  it("update_subtask's schema does not accept isDone, even if the caller sends it", async () => {
    const client = await connectedClient();
    const { tools } = await client.listTools();
    const updateSubtaskTool = tools.find(t => t.name === "update_subtask")!;
    expect(Object.keys(updateSubtaskTool.inputSchema.properties ?? {})).not.toContain("isDone");

    await client.callTool({
      name: "update_subtask",
      arguments: { id: 1, title: "Renamed", isDone: true } as Record<string, unknown>,
    });

    expect(dbMock.updateSubtask).toHaveBeenCalledTimes(1);
    const [, data] = dbMock.updateSubtask.mock.calls[0]!;
    expect(data).not.toHaveProperty("isDone");
  });

  it("create_task can actually create a task", async () => {
    const client = await connectedClient();
    const result = await client.callTool({ name: "create_task", arguments: { title: "New task" } });
    expect(result.isError).toBeFalsy();
    expect(dbMock.createTask).toHaveBeenCalledWith(expect.objectContaining({ title: "New task" }));
  });

  it("list_tasks reads through to db.listTasks", async () => {
    const client = await connectedClient();
    await client.callTool({ name: "list_tasks", arguments: { isDone: false } });
    expect(dbMock.listTasks).toHaveBeenCalledWith(expect.objectContaining({ isDone: false }));
  });
});
