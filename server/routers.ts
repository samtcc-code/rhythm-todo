import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const SAM_USER_ID = 1;

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  users: router({
    list: protectedProcedure.query(async () => {
      return db.getAllUsers();
    }),
  }),

  // ─── Areas ─────────────────────────────────────────────────────
  areas: router({
    list: protectedProcedure.query(async () => {
      return db.listAreas();
    }),
    create: protectedProcedure
      .input(z.object({ name: z.string().min(1), sortOrder: z.number().optional() }))
      .mutation(async ({ input }) => {
        return db.createArea(input);
      }),
    update: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), sortOrder: z.number().optional() }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateArea(id, data);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteArea(input.id);
      }),
  }),

  // ─── Projects ──────────────────────────────────────────────────
  projects: router({
    list: protectedProcedure
      .input(z.object({ areaId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return db.listProjects(input?.areaId);
      }),
    create: protectedProcedure
      .input(z.object({ name: z.string().min(1), areaId: z.number().optional(), sortOrder: z.number().optional() }))
      .mutation(async ({ input }) => {
        return db.createProject(input);
      }),
    update: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), areaId: z.number().nullable().optional(), sortOrder: z.number().optional() }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateProject(id, data);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteProject(input.id);
      }),
  }),

  // ─── Tags ──────────────────────────────────────────────────────
  tags: router({
    list: protectedProcedure.query(async () => {
      return db.listTags();
    }),
    create: protectedProcedure
      .input(z.object({ name: z.string().min(1), color: z.string().optional() }))
      .mutation(async ({ input }) => {
        return db.createTag(input);
      }),
    update: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), color: z.string().optional() }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateTag(id, data);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteTag(input.id);
      }),
  }),

  // ─── Tasks ─────────────────────────────────────────────────────
  tasks: router({
    list: protectedProcedure
      .input(z.object({
        doDate: z.string().optional(),
        isDone: z.boolean().optional(),
        quadrant: z.string().optional(),
        areaId: z.number().optional(),
        projectId: z.number().optional(),
        ownerId: z.number().optional(),
        tagId: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.listTasks(input ?? undefined);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const task = await db.getTask(input.id);
        if (!task) return null;
        const tagIds = await db.getTaskTagIds(input.id);
        const subs = await db.listSubtasks(input.id);
        return { ...task, tagIds, subtasks: subs };
      }),

    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1),
        notes: z.string().optional(),
        isUrgent: z.boolean().optional(),
        isImportant: z.boolean().optional(),
        doDate: z.string().nullable().optional(),
        doDateSomeday: z.boolean().optional(),
        doDateToday: z.boolean().optional(),
        dueDate: z.string().nullable().optional(),
        ownerId: z.number().nullable().optional(),
        areaId: z.number().nullable().optional(),
        projectId: z.number().nullable().optional(),
        sortOrder: z.number().optional(),
        tagIds: z.array(z.number()).optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createTask({
          ...input,
          isUrgent: input.isUrgent ?? true,
          isImportant: input.isImportant ?? true,
          doDateToday: input.doDateToday ?? (input.doDateSomeday ? false : true),
          ownerId: input.ownerId ?? SAM_USER_ID,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        notes: z.string().nullable().optional(),
        isDone: z.boolean().optional(),
        isUrgent: z.boolean().optional(),
        isImportant: z.boolean().optional(),
        doDate: z.string().nullable().optional(),
        doDateSomeday: z.boolean().optional(),
        doDateToday: z.boolean().optional(),
        dueDate: z.string().nullable().optional(),
        ownerId: z.number().nullable().optional(),
        areaId: z.number().nullable().optional(),
        projectId: z.number().nullable().optional(),
        sortOrder: z.number().optional(),
        tagIds: z.array(z.number()).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;

        if (
          data.doDate !== undefined &&
          data.doDate !== null &&
          data.doDate > todayString() &&
          data.isUrgent === undefined &&
          data.isImportant === undefined
        ) {
          const current = await db.getTask(id);
          if (current?.isUrgent && current?.isImportant) {
            data.isUrgent = false;
            data.doDateToday = false;
          }
        }

        return db.updateTask(id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteTask(input.id);
      }),

    reorder: protectedProcedure
      .input(z.object({ orderedIds: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        return db.reorderTasks(input.orderedIds);
      }),

    bulkMove: protectedProcedure
      .input(z.object({
        taskIds: z.array(z.number()),
        doDate: z.string().nullable(),
        doDateSomeday: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.bulkMoveTasks(input.taskIds, input.doDate, input.doDateSomeday);
      }),
  }),

  // ─── Subtasks ──────────────────────────────────────────────────
  subtasks: router({
    list: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .query(async ({ input }) => {
        return db.listSubtasks(input.taskId);
      }),
    create: protectedProcedure
      .input(z.object({ taskId: z.number(), title: z.string().min(1), sortOrder: z.number().optional() }))
      .mutation(async ({ input }) => {
        return db.createSubtask(input);
      }),
    update: protectedProcedure
      .input(z.object({ id: z.number(), title: z.string().optional(), isDone: z.boolean().optional(), sortOrder: z.number().optional() }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateSubtask(id, data);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteSubtask(input.id);
      }),
  }),
});

export type AppRouter = typeof appRouter;
