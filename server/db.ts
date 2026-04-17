import { eq, and, sql, isNull, inArray, asc, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  InsertUser, users,
  areas, InsertArea,
  projects, InsertProject,
  tags, InsertTag,
  tasks, InsertTask,
  subtasks, InsertSubtask,
  taskTags, InsertTaskTag,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db!;
}

// ─── Users ───────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  return db.select({ id: users.id, name: users.name, email: users.email, role: users.role }).from(users);
}

// ─── Areas ───────────────────────────────────────────────────────

export async function listAreas() {
  const db = await getDb();
  return db.select().from(areas).orderBy(asc(areas.sortOrder), asc(areas.id));
}

export async function createArea(data: { name: string; sortOrder?: number }) {
  const db = await getDb();
  const result = await db.insert(areas).values({ name: data.name, sortOrder: data.sortOrder ?? 0 }).returning({ id: areas.id });
  return { id: result[0].id };
}

export async function updateArea(id: number, data: { name?: string; sortOrder?: number }) {
  const db = await getDb();
  const set: Record<string, unknown> = {};
  if (data.name !== undefined) set.name = data.name;
  if (data.sortOrder !== undefined) set.sortOrder = data.sortOrder;
  await db.update(areas).set(set).where(eq(areas.id, id));
}

export async function deleteArea(id: number) {
  const db = await getDb();
  await db.update(tasks).set({ areaId: null }).where(eq(tasks.areaId, id));
  await db.update(projects).set({ areaId: null }).where(eq(projects.areaId, id));
  await db.delete(areas).where(eq(areas.id, id));
}

// ─── Projects ────────────────────────────────────────────────────

export async function listProjects(areaId?: number) {
  const db = await getDb();
  if (areaId !== undefined) {
    return db.select().from(projects).where(eq(projects.areaId, areaId)).orderBy(asc(projects.sortOrder), asc(projects.id));
  }
  return db.select().from(projects).orderBy(asc(projects.sortOrder), asc(projects.id));
}

export async function createProject(data: { name: string; areaId?: number; sortOrder?: number }) {
  const db = await getDb();
  const result = await db.insert(projects).values({ name: data.name, areaId: data.areaId ?? null, sortOrder: data.sortOrder ?? 0 }).returning({ id: projects.id });
  return { id: result[0].id };
}

export async function updateProject(id: number, data: { name?: string; areaId?: number | null; sortOrder?: number }) {
  const db = await getDb();
  const set: Record<string, unknown> = {};
  if (data.name !== undefined) set.name = data.name;
  if (data.areaId !== undefined) set.areaId = data.areaId;
  if (data.sortOrder !== undefined) set.sortOrder = data.sortOrder;
  await db.update(projects).set(set).where(eq(projects.id, id));
}

export async function deleteProject(id: number) {
  const db = await getDb();
  await db.update(tasks).set({ projectId: null }).where(eq(tasks.projectId, id));
  await db.delete(projects).where(eq(projects.id, id));
}

// ─── Tags ────────────────────────────────────────────────────────

export async function listTags() {
  const db = await getDb();
  return db.select().from(tags).orderBy(asc(tags.name));
}

export async function createTag(data: { name: string; color?: string }) {
  const db = await getDb();
  const result = await db.insert(tags).values({ name: data.name, color: data.color ?? "#6366f1" }).returning({ id: tags.id });
  return { id: result[0].id };
}

export async function updateTag(id: number, data: { name?: string; color?: string }) {
  const db = await getDb();
  const set: Record<string, unknown> = {};
  if (data.name !== undefined) set.name = data.name;
  if (data.color !== undefined) set.color = data.color;
  await db.update(tags).set(set).where(eq(tags.id, id));
}

export async function deleteTag(id: number) {
  const db = await getDb();
  await db.delete(taskTags).where(eq(taskTags.tagId, id));
  await db.delete(tags).where(eq(tags.id, id));
}

// ─── Tasks ───────────────────────────────────────────────────────

function computeQuadrant(isUrgent: boolean, isImportant: boolean): "doNow" | "doLater" | "delegate" | "delete" {
  if (isUrgent && isImportant) return "doNow";
  if (!isUrgent && isImportant) return "doLater";
  if (isUrgent && !isImportant) return "delegate";
  return "delete";
}

export async function listTasks(filters?: {
  doDate?: string;
  isDone?: boolean;
  quadrant?: string;
  areaId?: number;
  projectId?: number;
  ownerId?: number;
  tagId?: number;
}) {
  const db = await getDb();
  const conditions = [];

  if (filters?.doDate === "someday") {
    conditions.push(eq(tasks.doDateSomeday, true));
  } else if (filters?.doDate && filters.doDate !== "all") {
    conditions.push(
      sql`(${tasks.doDate} = ${filters.doDate} OR ${tasks.doDateToday} = true)`
    );
    conditions.push(eq(tasks.doDateSomeday, false));
  }

  if (filters?.isDone !== undefined) conditions.push(eq(tasks.isDone, filters.isDone));
  if (filters?.quadrant) conditions.push(eq(tasks.quadrant, filters.quadrant as any));
  if (filters?.areaId !== undefined) conditions.push(eq(tasks.areaId, filters.areaId));
  if (filters?.projectId !== undefined) conditions.push(eq(tasks.projectId, filters.projectId));
  if (filters?.ownerId !== undefined) conditions.push(eq(tasks.ownerId, filters.ownerId));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const taskRows = await db.select().from(tasks).where(where).orderBy(asc(tasks.sortOrder), asc(tasks.id));

  if (filters?.tagId !== undefined) {
    const taggedTaskIds = await db.select({ taskId: taskTags.taskId }).from(taskTags).where(eq(taskTags.tagId, filters.tagId));
    const idSet = new Set(taggedTaskIds.map(r => r.taskId));
    return taskRows.filter(t => idSet.has(t.id));
  }

  return taskRows;
}

export async function getTask(id: number) {
  const db = await getDb();
  const result = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createTask(data: {
  title: string;
  notes?: string;
  isUrgent?: boolean;
  isImportant?: boolean;
  doDate?: string | null;
  doDateSomeday?: boolean;
  doDateToday?: boolean;
  dueDate?: string | null;
  ownerId?: number | null;
  areaId?: number | null;
  projectId?: number | null;
  sortOrder?: number;
  tagIds?: number[];
}) {
  const db = await getDb();
  const isUrgent = data.isUrgent ?? false;
  const isImportant = data.isImportant ?? false;
  const quadrant = computeQuadrant(isUrgent, isImportant);

  const result = await db.insert(tasks).values({
    title: data.title,
    notes: data.notes ?? null,
    isUrgent,
    isImportant,
    quadrant,
    doDate: (data.doDate ?? null) as any,
    doDateSomeday: data.doDateSomeday ?? false,
    doDateToday: data.doDateToday ?? false,
    dueDate: (data.dueDate ?? null) as any,
    ownerId: data.ownerId ?? null,
    areaId: data.areaId ?? null,
    projectId: data.projectId ?? null,
    sortOrder: data.sortOrder ?? 0,
  }).returning({ id: tasks.id });

  const taskId = result[0].id;

  if (data.tagIds && data.tagIds.length > 0) {
    await db.insert(taskTags).values(data.tagIds.map(tagId => ({ taskId, tagId })));
  }

  return { id: taskId };
}

export async function updateTask(id: number, data: {
  title?: string;
  notes?: string | null;
  isDone?: boolean;
  isUrgent?: boolean;
  isImportant?: boolean;
  doDate?: string | null;
  doDateSomeday?: boolean;
  doDateToday?: boolean;
  dueDate?: string | null;
  ownerId?: number | null;
  areaId?: number | null;
  projectId?: number | null;
  sortOrder?: number;
  tagIds?: number[];
}) {
  const db = await getDb();
  const set: Record<string, unknown> = {};

  if (data.title !== undefined) set.title = data.title;
  if (data.notes !== undefined) set.notes = data.notes;
  if (data.isDone !== undefined) set.isDone = data.isDone;
  if (data.doDate !== undefined) set.doDate = data.doDate as any;
  if (data.doDateSomeday !== undefined) set.doDateSomeday = data.doDateSomeday;
  if (data.doDateToday !== undefined) set.doDateToday = data.doDateToday;
  if (data.dueDate !== undefined) set.dueDate = data.dueDate as any;
  if (data.ownerId !== undefined) set.ownerId = data.ownerId;
  if (data.areaId !== undefined) set.areaId = data.areaId;
  if (data.projectId !== undefined) set.projectId = data.projectId;
  if (data.sortOrder !== undefined) set.sortOrder = data.sortOrder;

  if (data.isUrgent !== undefined || data.isImportant !== undefined) {
    const current = await getTask(id);
    if (current) {
      const isUrgent = data.isUrgent ?? current.isUrgent;
      const isImportant = data.isImportant ?? current.isImportant;
      set.isUrgent = isUrgent;
      set.isImportant = isImportant;
      set.quadrant = computeQuadrant(isUrgent, isImportant);
    }
  }

  if (Object.keys(set).length > 0) {
    await db.update(tasks).set(set).where(eq(tasks.id, id));
  }

  if (data.tagIds !== undefined) {
    await db.delete(taskTags).where(eq(taskTags.taskId, id));
    if (data.tagIds.length > 0) {
      await db.insert(taskTags).values(data.tagIds.map(tagId => ({ taskId: id, tagId })));
    }
  }
}

export async function deleteTask(id: number) {
  const db = await getDb();
  await db.delete(subtasks).where(eq(subtasks.taskId, id));
  await db.delete(taskTags).where(eq(taskTags.taskId, id));
  await db.delete(tasks).where(eq(tasks.id, id));
}

export async function reorderTasks(orderedIds: number[]) {
  const db = await getDb();
  for (let i = 0; i < orderedIds.length; i++) {
    await db.update(tasks).set({ sortOrder: i }).where(eq(tasks.id, orderedIds[i]));
  }
}

export async function bulkMoveTasks(taskIds: number[], doDate: string | null, doDateSomeday?: boolean) {
  const db = await getDb();
  for (const id of taskIds) {
    await db.update(tasks).set({
      doDate: doDate as any,
      doDateSomeday: doDateSomeday ?? false,
    }).where(eq(tasks.id, id));
  }
}

// ─── Subtasks ────────────────────────────────────────────────────

export async function listSubtasks(taskId: number) {
  const db = await getDb();
  return db.select().from(subtasks).where(eq(subtasks.taskId, taskId)).orderBy(asc(subtasks.sortOrder), asc(subtasks.id));
}

export async function createSubtask(data: { taskId: number; title: string; sortOrder?: number }) {
  const db = await getDb();
  const result = await db.insert(subtasks).values({ taskId: data.taskId, title: data.title, sortOrder: data.sortOrder ?? 0 }).returning({ id: subtasks.id });
  return { id: result[0].id };
}

export async function updateSubtask(id: number, data: { title?: string; isDone?: boolean; sortOrder?: number }) {
  const db = await getDb();
  const set: Record<string, unknown> = {};
  if (data.title !== undefined) set.title = data.title;
  if (data.isDone !== undefined) set.isDone = data.isDone;
  if (data.sortOrder !== undefined) set.sortOrder = data.sortOrder;
  await db.update(subtasks).set(set).where(eq(subtasks.id, id));
}

export async function deleteSubtask(id: number) {
  const db = await getDb();
  await db.delete(subtasks).where(eq(subtasks.id, id));
}

// ─── Task Tags ───────────────────────────────────────────────────

export async function getTaskTagIds(taskId: number): Promise<number[]> {
  const db = await getDb();
  const rows = await db.select({ tagId: taskTags.tagId }).from(taskTags).where(eq(taskTags.taskId, taskId));
  return rows.map(r => r.tagId);
}
