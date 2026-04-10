import { integer, pgEnum, pgTable, text, timestamp, varchar, boolean, date, serial } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const quadrantEnum = pgEnum("quadrant", ["doNow", "doLater", "delegate", "delete"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const areas = pgTable("areas", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Area = typeof areas.$inferSelect;
export type InsertArea = typeof areas.$inferInsert;

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  areaId: integer("areaId"),
  name: varchar("name", { length: 255 }).notNull(),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 7 }).default("#6366f1"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Tag = typeof tags.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  notes: text("notes"),
  isDone: boolean("isDone").default(false).notNull(),
  isUrgent: boolean("isUrgent").default(false).notNull(),
  isImportant: boolean("isImportant").default(false).notNull(),
  quadrant: quadrantEnum("quadrant").default("doLater").notNull(),
  doDate: date("doDate"),
  doDateSomeday: boolean("doDateSomeday").default(false).notNull(),
  dueDate: date("dueDate"),
  ownerId: integer("ownerId"),
  areaId: integer("areaId"),
  projectId: integer("projectId"),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

export const subtasks = pgTable("subtasks", {
  id: serial("id").primaryKey(),
  taskId: integer("taskId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  isDone: boolean("isDone").default(false).notNull(),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Subtask = typeof subtasks.$inferSelect;
export type InsertSubtask = typeof subtasks.$inferInsert;

export const taskTags = pgTable("task_tags", {
  id: serial("id").primaryKey(),
  taskId: integer("taskId").notNull(),
  tagId: integer("tagId").notNull(),
});

export type TaskTag = typeof taskTags.$inferSelect;
export type InsertTaskTag = typeof taskTags.$inferInsert;
