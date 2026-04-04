import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, date } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Areas — top-level organizational buckets (Personal, Sales, Client X, etc.)
 */
export const areas = mysqlTable("areas", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Area = typeof areas.$inferSelect;
export type InsertArea = typeof areas.$inferInsert;

/**
 * Projects — nested within areas
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  areaId: int("areaId"),
  name: varchar("name", { length: 255 }).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Tags — freeform labels for flexible categorization
 */
export const tags = mysqlTable("tags", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 7 }).default("#6366f1"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Tag = typeof tags.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;

/**
 * Tasks — the core entity
 * - isUrgent / isImportant drive the Eisenhower quadrant
 * - quadrant is auto-derived: doNow, doLater, delegate, delete
 * - doDate: the date the user plans to work on it (NULL = Someday)
 * - doDateSomeday: true if the task is explicitly marked "Someday"
 * - dueDate: optional hard deadline
 * - ownerId: references users.id (the person responsible)
 * - sortOrder: for drag-and-drop reordering within a view
 */
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  notes: text("notes"),
  isDone: boolean("isDone").default(false).notNull(),
  isUrgent: boolean("isUrgent").default(false).notNull(),
  isImportant: boolean("isImportant").default(false).notNull(),
  quadrant: mysqlEnum("quadrant", ["doNow", "doLater", "delegate", "delete"]).default("doLater").notNull(),
  doDate: date("doDate"),
  doDateSomeday: boolean("doDateSomeday").default(false).notNull(),
  dueDate: date("dueDate"),
  ownerId: int("ownerId"),
  areaId: int("areaId"),
  projectId: int("projectId"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

/**
 * Subtasks — simple checkboxes within a task
 */
export const subtasks = mysqlTable("subtasks", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  isDone: boolean("isDone").default(false).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Subtask = typeof subtasks.$inferSelect;
export type InsertSubtask = typeof subtasks.$inferInsert;

/**
 * Task-Tag junction table
 */
export const taskTags = mysqlTable("task_tags", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  tagId: int("tagId").notNull(),
});

export type TaskTag = typeof taskTags.$inferSelect;
export type InsertTaskTag = typeof taskTags.$inferInsert;
