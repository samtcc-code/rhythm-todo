import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Mock db module ──────────────────────────────────────────────
vi.mock("./db", () => {
  let areas: any[] = [];
  let projects: any[] = [];
  let tags: any[] = [];
  let tasksList: any[] = [];
  let subtasksList: any[] = [];
  let taskTagsList: any[] = [];
  let nextId = 1;

  function resetState() {
    areas = [];
    projects = [];
    tags = [];
    tasksList = [];
    subtasksList = [];
    taskTagsList = [];
    nextId = 1;
  }

  function computeQuadrant(isUrgent: boolean, isImportant: boolean) {
    if (isUrgent && isImportant) return "doNow";
    if (!isUrgent && isImportant) return "doLater";
    if (isUrgent && !isImportant) return "delegate";
    return "delete";
  }

  return {
    __resetState: resetState,
    getAllUsers: vi.fn(async () => [
      { id: 1, name: "Sam", email: "sam@test.com", role: "admin" },
      { id: 2, name: "Isma", email: "isma@test.com", role: "user" },
    ]),
    // Areas
    listAreas: vi.fn(async () => areas),
    createArea: vi.fn(async (data: any) => {
      const id = nextId++;
      areas.push({ id, name: data.name, sortOrder: data.sortOrder ?? 0 });
      return { id };
    }),
    updateArea: vi.fn(async (id: number, data: any) => {
      const a = areas.find(x => x.id === id);
      if (a) { if (data.name) a.name = data.name; if (data.sortOrder !== undefined) a.sortOrder = data.sortOrder; }
    }),
    deleteArea: vi.fn(async (id: number) => {
      areas = areas.filter(x => x.id !== id);
    }),
    // Projects
    listProjects: vi.fn(async (areaId?: number) => {
      if (areaId !== undefined) return projects.filter(p => p.areaId === areaId);
      return projects;
    }),
    createProject: vi.fn(async (data: any) => {
      const id = nextId++;
      projects.push({ id, name: data.name, areaId: data.areaId ?? null, sortOrder: data.sortOrder ?? 0 });
      return { id };
    }),
    updateProject: vi.fn(async (id: number, data: any) => {
      const p = projects.find(x => x.id === id);
      if (p) { if (data.name) p.name = data.name; if (data.areaId !== undefined) p.areaId = data.areaId; }
    }),
    deleteProject: vi.fn(async (id: number) => {
      projects = projects.filter(x => x.id !== id);
    }),
    // Tags
    listTags: vi.fn(async () => tags),
    createTag: vi.fn(async (data: any) => {
      const id = nextId++;
      tags.push({ id, name: data.name, color: data.color ?? "#6366f1" });
      return { id };
    }),
    updateTag: vi.fn(async (id: number, data: any) => {
      const t = tags.find(x => x.id === id);
      if (t) { if (data.name) t.name = data.name; if (data.color) t.color = data.color; }
    }),
    deleteTag: vi.fn(async (id: number) => {
      tags = tags.filter(x => x.id !== id);
      taskTagsList = taskTagsList.filter(x => x.tagId !== id);
    }),
    // Tasks
    listTasks: vi.fn(async (filters?: any) => {
      let result = [...tasksList];
      if (filters?.doDate === "someday") result = result.filter(t => t.doDateSomeday);
      else if (filters?.doDate && filters.doDate !== "all") result = result.filter(t => t.doDate === filters.doDate && !t.doDateSomeday);
      if (filters?.isDone !== undefined) result = result.filter(t => t.isDone === filters.isDone);
      if (filters?.quadrant) result = result.filter(t => t.quadrant === filters.quadrant);
      if (filters?.areaId !== undefined) result = result.filter(t => t.areaId === filters.areaId);
      if (filters?.projectId !== undefined) result = result.filter(t => t.projectId === filters.projectId);
      if (filters?.ownerId !== undefined) result = result.filter(t => t.ownerId === filters.ownerId);
      if (filters?.tagId !== undefined) {
        const taggedIds = new Set(taskTagsList.filter(tt => tt.tagId === filters.tagId).map(tt => tt.taskId));
        result = result.filter(t => taggedIds.has(t.id));
      }
      return result;
    }),
    getTask: vi.fn(async (id: number) => tasksList.find(t => t.id === id) ?? null),
    getTaskTagIds: vi.fn(async (taskId: number) => taskTagsList.filter(tt => tt.taskId === taskId).map(tt => tt.tagId)),
    listSubtasks: vi.fn(async (taskId: number) => subtasksList.filter(s => s.taskId === taskId)),
    createTask: vi.fn(async (data: any) => {
      const id = nextId++;
      const isUrgent = data.isUrgent ?? false;
      const isImportant = data.isImportant ?? false;
      const task = {
        id, title: data.title, notes: data.notes ?? null,
        isDone: false, isUrgent, isImportant,
        quadrant: computeQuadrant(isUrgent, isImportant),
        doDate: data.doDate ?? null, doDateSomeday: data.doDateSomeday ?? false,
        dueDate: data.dueDate ?? null, ownerId: data.ownerId ?? null,
        areaId: data.areaId ?? null, projectId: data.projectId ?? null,
        sortOrder: data.sortOrder ?? 0,
      };
      tasksList.push(task);
      if (data.tagIds) data.tagIds.forEach((tagId: number) => taskTagsList.push({ taskId: id, tagId }));
      return { id };
    }),
    updateTask: vi.fn(async (id: number, data: any) => {
      const t = tasksList.find(x => x.id === id);
      if (!t) return;
      if (data.title !== undefined) t.title = data.title;
      if (data.notes !== undefined) t.notes = data.notes;
      if (data.isDone !== undefined) t.isDone = data.isDone;
      if (data.doDate !== undefined) t.doDate = data.doDate;
      if (data.doDateSomeday !== undefined) t.doDateSomeday = data.doDateSomeday;
      if (data.dueDate !== undefined) t.dueDate = data.dueDate;
      if (data.ownerId !== undefined) t.ownerId = data.ownerId;
      if (data.areaId !== undefined) t.areaId = data.areaId;
      if (data.projectId !== undefined) t.projectId = data.projectId;
      if (data.sortOrder !== undefined) t.sortOrder = data.sortOrder;
      if (data.isUrgent !== undefined || data.isImportant !== undefined) {
        t.isUrgent = data.isUrgent ?? t.isUrgent;
        t.isImportant = data.isImportant ?? t.isImportant;
        t.quadrant = computeQuadrant(t.isUrgent, t.isImportant);
      }
      if (data.tagIds !== undefined) {
        taskTagsList = taskTagsList.filter(tt => tt.taskId !== id);
        data.tagIds.forEach((tagId: number) => taskTagsList.push({ taskId: id, tagId }));
      }
    }),
    deleteTask: vi.fn(async (id: number) => {
      tasksList = tasksList.filter(x => x.id !== id);
      subtasksList = subtasksList.filter(x => x.taskId !== id);
      taskTagsList = taskTagsList.filter(x => x.taskId !== id);
    }),
    reorderTasks: vi.fn(async (orderedIds: number[]) => {
      orderedIds.forEach((id, i) => {
        const t = tasksList.find(x => x.id === id);
        if (t) t.sortOrder = i;
      });
    }),
    bulkMoveTasks: vi.fn(async (taskIds: number[], doDate: string | null, doDateSomeday?: boolean) => {
      taskIds.forEach(id => {
        const t = tasksList.find(x => x.id === id);
        if (t) { t.doDate = doDate; t.doDateSomeday = doDateSomeday ?? false; }
      });
    }),
    // Subtasks
    createSubtask: vi.fn(async (data: any) => {
      const id = nextId++;
      subtasksList.push({ id, taskId: data.taskId, title: data.title, isDone: false, sortOrder: data.sortOrder ?? 0 });
      return { id };
    }),
    updateSubtask: vi.fn(async (id: number, data: any) => {
      const s = subtasksList.find(x => x.id === id);
      if (s) { if (data.title !== undefined) s.title = data.title; if (data.isDone !== undefined) s.isDone = data.isDone; }
    }),
    deleteSubtask: vi.fn(async (id: number) => {
      subtasksList = subtasksList.filter(x => x.id !== id);
    }),
  };
});

// ── Helpers ─────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1, openId: "test-user", email: "sam@test.com", name: "Sam",
    loginMethod: "manus", role: "admin",
    createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function getCaller() {
  return appRouter.createCaller(createAuthContext());
}

// Reset mock state before each test
beforeEach(async () => {
  const db = await import("./db") as any;
  db.__resetState();
});

// ── Tests ───────────────────────────────────────────────────────

describe("users.list", () => {
  it("returns all users", async () => {
    const caller = getCaller();
    const users = await caller.users.list();
    expect(users).toHaveLength(2);
    expect(users[0].name).toBe("Sam");
    expect(users[1].name).toBe("Isma");
  });
});

describe("areas CRUD", () => {
  it("creates, lists, updates, and deletes an area", async () => {
    const caller = getCaller();

    const { id } = await caller.areas.create({ name: "Sales" });
    expect(id).toBeGreaterThan(0);

    let list = await caller.areas.list();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("Sales");

    await caller.areas.update({ id, name: "Sales Team" });
    list = await caller.areas.list();
    expect(list[0].name).toBe("Sales Team");

    await caller.areas.delete({ id });
    list = await caller.areas.list();
    expect(list).toHaveLength(0);
  });
});

describe("projects CRUD", () => {
  it("creates, lists, updates, and deletes a project", async () => {
    const caller = getCaller();

    const area = await caller.areas.create({ name: "Work" });
    const { id } = await caller.projects.create({ name: "Website Redesign", areaId: area.id });
    expect(id).toBeGreaterThan(0);

    let list = await caller.projects.list();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("Website Redesign");

    await caller.projects.update({ id, name: "Website V2" });
    list = await caller.projects.list();
    expect(list[0].name).toBe("Website V2");

    await caller.projects.delete({ id });
    list = await caller.projects.list();
    expect(list).toHaveLength(0);
  });
});

describe("tags CRUD", () => {
  it("creates, lists, updates, and deletes a tag", async () => {
    const caller = getCaller();

    const { id } = await caller.tags.create({ name: "urgent", color: "#ef4444" });
    expect(id).toBeGreaterThan(0);

    let list = await caller.tags.list();
    expect(list).toHaveLength(1);
    expect(list[0].color).toBe("#ef4444");

    await caller.tags.update({ id, name: "critical" });
    list = await caller.tags.list();
    expect(list[0].name).toBe("critical");

    await caller.tags.delete({ id });
    list = await caller.tags.list();
    expect(list).toHaveLength(0);
  });
});

describe("tasks", () => {
  it("creates a task with default quadrant (delete)", async () => {
    const caller = getCaller();
    const { id } = await caller.tasks.create({ title: "Test task" });
    expect(id).toBeGreaterThan(0);

    const task = await caller.tasks.get({ id });
    expect(task).not.toBeNull();
    expect(task!.title).toBe("Test task");
    expect(task!.quadrant).toBe("delete"); // not urgent, not important
    expect(task!.isDone).toBe(false);
  });

  it("computes Eisenhower quadrant correctly", async () => {
    const caller = getCaller();

    const doNow = await caller.tasks.create({ title: "Do Now", isUrgent: true, isImportant: true });
    const doLater = await caller.tasks.create({ title: "Do Later", isUrgent: false, isImportant: true });
    const delegate = await caller.tasks.create({ title: "Delegate", isUrgent: true, isImportant: false });
    const del = await caller.tasks.create({ title: "Delete", isUrgent: false, isImportant: false });

    const t1 = await caller.tasks.get({ id: doNow.id });
    expect(t1!.quadrant).toBe("doNow");

    const t2 = await caller.tasks.get({ id: doLater.id });
    expect(t2!.quadrant).toBe("doLater");

    const t3 = await caller.tasks.get({ id: delegate.id });
    expect(t3!.quadrant).toBe("delegate");

    const t4 = await caller.tasks.get({ id: del.id });
    expect(t4!.quadrant).toBe("delete");
  });

  it("updates quadrant when urgency/importance changes", async () => {
    const caller = getCaller();
    const { id } = await caller.tasks.create({ title: "Evolving task", isUrgent: false, isImportant: false });

    let task = await caller.tasks.get({ id });
    expect(task!.quadrant).toBe("delete");

    await caller.tasks.update({ id, isUrgent: true, isImportant: true });
    task = await caller.tasks.get({ id });
    expect(task!.quadrant).toBe("doNow");
  });

  it("filters tasks by doDate", async () => {
    const caller = getCaller();
    await caller.tasks.create({ title: "Today task", doDate: "2026-04-04" });
    await caller.tasks.create({ title: "Tomorrow task", doDate: "2026-04-05" });
    await caller.tasks.create({ title: "Someday task", doDateSomeday: true });

    const todayTasks = await caller.tasks.list({ doDate: "2026-04-04" });
    expect(todayTasks).toHaveLength(1);
    expect(todayTasks[0].title).toBe("Today task");

    const somedayTasks = await caller.tasks.list({ doDate: "someday" });
    expect(somedayTasks).toHaveLength(1);
    expect(somedayTasks[0].title).toBe("Someday task");
  });

  it("toggles task done status", async () => {
    const caller = getCaller();
    const { id } = await caller.tasks.create({ title: "Toggle me" });

    await caller.tasks.update({ id, isDone: true });
    let task = await caller.tasks.get({ id });
    expect(task!.isDone).toBe(true);

    await caller.tasks.update({ id, isDone: false });
    task = await caller.tasks.get({ id });
    expect(task!.isDone).toBe(false);
  });

  it("reorders tasks", async () => {
    const caller = getCaller();
    const t1 = await caller.tasks.create({ title: "First" });
    const t2 = await caller.tasks.create({ title: "Second" });
    const t3 = await caller.tasks.create({ title: "Third" });

    await caller.tasks.reorder({ orderedIds: [t3.id, t1.id, t2.id] });

    const task3 = await caller.tasks.get({ id: t3.id });
    const task1 = await caller.tasks.get({ id: t1.id });
    const task2 = await caller.tasks.get({ id: t2.id });
    expect(task3!.sortOrder).toBe(0);
    expect(task1!.sortOrder).toBe(1);
    expect(task2!.sortOrder).toBe(2);
  });

  it("bulk moves tasks to a new date", async () => {
    const caller = getCaller();
    const t1 = await caller.tasks.create({ title: "Move me 1", doDate: "2026-04-04" });
    const t2 = await caller.tasks.create({ title: "Move me 2", doDate: "2026-04-04" });

    await caller.tasks.bulkMove({ taskIds: [t1.id, t2.id], doDate: "2026-04-05", doDateSomeday: false });

    const moved1 = await caller.tasks.get({ id: t1.id });
    const moved2 = await caller.tasks.get({ id: t2.id });
    expect(moved1!.doDate).toBe("2026-04-05");
    expect(moved2!.doDate).toBe("2026-04-05");
  });

  it("deletes a task and its subtasks", async () => {
    const caller = getCaller();
    const { id } = await caller.tasks.create({ title: "Delete me" });
    await caller.subtasks.create({ taskId: id, title: "Sub 1" });

    await caller.tasks.delete({ id });
    const task = await caller.tasks.get({ id });
    expect(task).toBeNull();

    const subs = await caller.subtasks.list({ taskId: id });
    expect(subs).toHaveLength(0);
  });
});

describe("subtasks", () => {
  it("creates, lists, updates, and deletes subtasks", async () => {
    const caller = getCaller();
    const task = await caller.tasks.create({ title: "Parent task" });

    const sub = await caller.subtasks.create({ taskId: task.id, title: "Step 1" });
    expect(sub.id).toBeGreaterThan(0);

    let list = await caller.subtasks.list({ taskId: task.id });
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe("Step 1");
    expect(list[0].isDone).toBe(false);

    await caller.subtasks.update({ id: sub.id, isDone: true });
    list = await caller.subtasks.list({ taskId: task.id });
    expect(list[0].isDone).toBe(true);

    await caller.subtasks.delete({ id: sub.id });
    list = await caller.subtasks.list({ taskId: task.id });
    expect(list).toHaveLength(0);
  });
});

describe("task tags", () => {
  it("creates a task with tags and retrieves them", async () => {
    const caller = getCaller();
    const tag1 = await caller.tags.create({ name: "work" });
    const tag2 = await caller.tags.create({ name: "priority" });

    const task = await caller.tasks.create({ title: "Tagged task", tagIds: [tag1.id, tag2.id] });
    const fetched = await caller.tasks.get({ id: task.id });
    expect(fetched!.tagIds).toEqual(expect.arrayContaining([tag1.id, tag2.id]));
  });

  it("updates task tags", async () => {
    const caller = getCaller();
    const tag1 = await caller.tags.create({ name: "alpha" });
    const tag2 = await caller.tags.create({ name: "beta" });
    const task = await caller.tasks.create({ title: "Tag update test", tagIds: [tag1.id] });

    await caller.tasks.update({ id: task.id, tagIds: [tag2.id] });
    const fetched = await caller.tasks.get({ id: task.id });
    expect(fetched!.tagIds).toEqual([tag2.id]);
  });

  it("filters tasks by tag", async () => {
    const caller = getCaller();
    const tag = await caller.tags.create({ name: "filter-tag" });
    await caller.tasks.create({ title: "Tagged", tagIds: [tag.id] });
    await caller.tasks.create({ title: "Untagged" });

    const filtered = await caller.tasks.list({ tagId: tag.id });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toBe("Tagged");
  });
});
