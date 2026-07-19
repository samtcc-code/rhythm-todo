import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import * as db from "../db";

// Every tool in this file is read, create, or update-non-completion only.
// There is intentionally no tool anywhere in this file that can set a
// task/subtask's isDone to true, and no delete_* tool of any kind. Do not
// add one without updating the access-control note in server/mcp/server.ts.

function jsonResult(data: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

const doDateField = z.string().nullable().optional();
const dueDateField = z.string().nullable().optional();

export function registerRhythmTools(server: McpServer) {
  // ─── Read ──────────────────────────────────────────────────────

  server.registerTool(
    "list_tasks",
    {
      title: "List tasks",
      description: "List tasks, optionally filtered by do-date, completion, quadrant, area, project, owner, or tag.",
      inputSchema: {
        doDate: z.string().optional().describe("YYYY-MM-DD, 'today', 'someday', or 'all'"),
        isDone: z.boolean().optional(),
        quadrant: z.enum(["doNow", "doLater", "delegate", "delete"]).optional(),
        areaId: z.number().optional(),
        projectId: z.number().optional(),
        ownerId: z.number().optional(),
        tagId: z.number().optional(),
      },
    },
    async (args) => jsonResult(await db.listTasks(args))
  );

  server.registerTool(
    "get_task",
    {
      title: "Get task",
      description: "Get a single task by id, including its tag ids and subtasks.",
      inputSchema: { id: z.number() },
    },
    async ({ id }) => {
      const task = await db.getTask(id);
      if (!task) return jsonResult(null);
      const tagIds = await db.getTaskTagIds(id);
      const subtasks = await db.listSubtasks(id);
      return jsonResult({ ...task, tagIds, subtasks });
    }
  );

  server.registerTool(
    "list_areas",
    { title: "List areas", description: "List all areas.", inputSchema: {} },
    async () => jsonResult(await db.listAreas())
  );

  server.registerTool(
    "list_projects",
    {
      title: "List projects",
      description: "List all projects, optionally filtered by area.",
      inputSchema: { areaId: z.number().optional() },
    },
    async ({ areaId }) => jsonResult(await db.listProjects(areaId))
  );

  server.registerTool(
    "list_tags",
    { title: "List tags", description: "List all tags.", inputSchema: {} },
    async () => jsonResult(await db.listTags())
  );

  server.registerTool(
    "list_users",
    { title: "List users", description: "List all users who can own a task.", inputSchema: {} },
    async () => jsonResult(await db.getAllUsers())
  );

  // ─── Create ────────────────────────────────────────────────────

  server.registerTool(
    "create_task",
    {
      title: "Create task",
      description: "Create a new task.",
      inputSchema: {
        title: z.string().min(1),
        notes: z.string().optional(),
        isUrgent: z.boolean().optional(),
        isImportant: z.boolean().optional(),
        doDate: doDateField,
        doDateSomeday: z.boolean().optional(),
        doDateToday: z.boolean().optional(),
        dueDate: dueDateField,
        ownerId: z.number().nullable().optional(),
        areaId: z.number().nullable().optional(),
        projectId: z.number().nullable().optional(),
        tagIds: z.array(z.number()).optional(),
      },
    },
    async (args) => jsonResult(await db.createTask(args))
  );

  server.registerTool(
    "create_subtask",
    {
      title: "Create subtask",
      description: "Add a subtask to an existing task.",
      inputSchema: { taskId: z.number(), title: z.string().min(1) },
    },
    async (args) => jsonResult(await db.createSubtask(args))
  );

  server.registerTool(
    "create_area",
    {
      title: "Create area",
      description: "Create a new area.",
      inputSchema: { name: z.string().min(1) },
    },
    async (args) => jsonResult(await db.createArea(args))
  );

  server.registerTool(
    "create_project",
    {
      title: "Create project",
      description: "Create a new project, optionally under an area.",
      inputSchema: { name: z.string().min(1), areaId: z.number().optional() },
    },
    async (args) => jsonResult(await db.createProject(args))
  );

  server.registerTool(
    "create_tag",
    {
      title: "Create tag",
      description: "Create a new tag.",
      inputSchema: { name: z.string().min(1), color: z.string().optional() },
    },
    async (args) => jsonResult(await db.createTag(args))
  );

  // ─── Update (never isDone, never delete) ──────────────────────

  server.registerTool(
    "update_task",
    {
      title: "Update task",
      description: "Update an existing task's details. Cannot mark a task done or delete it.",
      inputSchema: {
        id: z.number(),
        title: z.string().min(1).optional(),
        notes: z.string().nullable().optional(),
        isUrgent: z.boolean().optional(),
        isImportant: z.boolean().optional(),
        doDate: doDateField,
        doDateSomeday: z.boolean().optional(),
        doDateToday: z.boolean().optional(),
        dueDate: dueDateField,
        ownerId: z.number().nullable().optional(),
        areaId: z.number().nullable().optional(),
        projectId: z.number().nullable().optional(),
        tagIds: z.array(z.number()).optional(),
      },
    },
    async ({ id, ...data }) => { await db.updateTask(id, data); return jsonResult({ ok: true }); }
  );

  server.registerTool(
    "update_subtask",
    {
      title: "Update subtask",
      description: "Rename an existing subtask. Cannot mark a subtask done or delete it.",
      inputSchema: { id: z.number(), title: z.string().min(1) },
    },
    async ({ id, title }) => { await db.updateSubtask(id, { title }); return jsonResult({ ok: true }); }
  );

  server.registerTool(
    "update_area",
    {
      title: "Update area",
      description: "Rename an existing area.",
      inputSchema: { id: z.number(), name: z.string().min(1) },
    },
    async ({ id, name }) => { await db.updateArea(id, { name }); return jsonResult({ ok: true }); }
  );

  server.registerTool(
    "update_project",
    {
      title: "Update project",
      description: "Rename an existing project or move it to a different area.",
      inputSchema: { id: z.number(), name: z.string().min(1).optional(), areaId: z.number().nullable().optional() },
    },
    async ({ id, ...data }) => { await db.updateProject(id, data); return jsonResult({ ok: true }); }
  );

  server.registerTool(
    "update_tag",
    {
      title: "Update tag",
      description: "Rename or recolor an existing tag.",
      inputSchema: { id: z.number(), name: z.string().min(1).optional(), color: z.string().optional() },
    },
    async ({ id, ...data }) => { await db.updateTag(id, data); return jsonResult({ ok: true }); }
  );
}
