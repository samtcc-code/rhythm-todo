import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import TaskItem from "@/components/TaskItem";
import TaskDetailPanel from "@/components/TaskDetailPanel";
import { cn } from "@/lib/utils";

const quadrants = [
  {
    key: "doNow",
    title: "Do Now",
    subtitle: "Urgent & Important",
    color: "border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20",
    headerColor: "text-red-600 dark:text-red-400",
    targets: [
      { key: "doLater", label: "→ Do Later" },
      { key: "delegate", label: "→ Delegate" },
      { key: "delete", label: "→ Delete" },
    ],
  },
  {
    key: "doLater",
    title: "Do Later",
    subtitle: "Not Urgent & Important",
    color: "border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20",
    headerColor: "text-blue-600 dark:text-blue-400",
    targets: [
      { key: "doNow", label: "→ Do Now" },
      { key: "delegate", label: "→ Delegate" },
      { key: "delete", label: "→ Delete" },
    ],
  },
  {
    key: "delegate",
    title: "Delegate",
    subtitle: "Urgent & Not Important",
    color: "border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20",
    headerColor: "text-amber-600 dark:text-amber-400",
    targets: [
      { key: "doNow", label: "→ Do Now" },
      { key: "doLater", label: "→ Do Later" },
      { key: "delete", label: "→ Delete" },
    ],
  },
  {
    key: "delete",
    title: "Delete",
    subtitle: "Not Urgent & Not Important",
    color: "border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20",
    headerColor: "text-gray-500 dark:text-gray-400",
    targets: [
      { key: "doNow", label: "→ Do Now" },
      { key: "doLater", label: "→ Do Later" },
      { key: "delegate", label: "→ Delegate" },
    ],
  },
];

// Map quadrant key to urgency/importance values
function quadrantToFlags(key: string): { isUrgent: boolean; isImportant: boolean } {
  switch (key) {
    case "doNow":    return { isUrgent: true,  isImportant: true  };
    case "doLater":  return { isUrgent: false, isImportant: true  };
    case "delegate": return { isUrgent: true,  isImportant: false };
    case "delete":   return { isUrgent: false, isImportant: false };
    default:         return { isUrgent: false, isImportant: false };
  }
}

export default function MatrixView() {
  const utils = trpc.useUtils();
  const allTasks = trpc.tasks.list.useQuery({ isDone: false });
  const usersQuery = trpc.users.list.useQuery();
  const areasQuery = trpc.areas.list.useQuery();
  const projectsQuery = trpc.projects.list.useQuery();
  const updateTask = trpc.tasks.update.useMutation({ onSuccess: () => utils.tasks.invalidate() });

  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const areasData = useMemo(() => areasQuery.data?.map(a => ({ id: a.id, name: a.name })) ?? [], [areasQuery.data]);
  const projectsData = useMemo(() => projectsQuery.data?.map(p => ({ id: p.id, name: p.name })) ?? [], [projectsQuery.data]);

  const tasksByQuadrant = (key: string) =>
    allTasks.data?.filter(t => t.quadrant === key) ?? [];

  const moveToQuadrant = (taskId: number, targetKey: string) => {
    const flags = quadrantToFlags(targetKey);
    updateTask.mutate({ id: taskId, ...flags });
    if (selectedTaskId === taskId) setSelectedTaskId(null);
  };

  return (
    <div className="space-y-8 md:space-y-6">
      <div>
        <h1 className="text-3xl md:text-2xl font-semibold tracking-tight text-foreground">Eisenhower Matrix</h1>
        <p className="text-base md:text-sm text-muted-foreground mt-1">
          Click a task to edit it, or use the move buttons to reassign quadrants.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-4">
        {quadrants.map(q => {
          const tasks = tasksByQuadrant(q.key);
          return (
            <div key={q.key} className={cn("rounded-2xl md:rounded-xl border p-5 md:p-4 min-h-[200px]", q.color)}>
              <div className="mb-4 md:mb-3">
                <h2 className={cn("text-lg md:text-sm font-semibold", q.headerColor)}>{q.title}</h2>
                <p className="text-sm md:text-[11px] text-muted-foreground">{q.subtitle}</p>
              </div>

              <div className="space-y-1 md:space-y-0.5">
                {tasks.map(task => (
                  <div key={task.id}>
                    {selectedTaskId === task.id ? (
                      <div>
                        <TaskDetailPanel
                          taskId={task.id}
                          onClose={() => setSelectedTaskId(null)}
                        />
                        {/* Quick move buttons shown below expanded task */}
                        <div className="flex items-center gap-1.5 px-1 py-1.5 flex-wrap">
                          <span className="text-xs text-muted-foreground mr-1">Move to:</span>
                          {q.targets.map(t => (
                            <button
                              key={t.key}
                              onClick={() => moveToQuadrant(task.id, t.key)}
                              className="text-xs px-2 py-0.5 rounded-full border border-current text-muted-foreground hover:text-foreground hover:bg-white/40 transition-colors"
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="relative group/task">
                        <TaskItem
                          task={task}
                          onClick={() => setSelectedTaskId(task.id)}
                          users={usersQuery.data}
                          areas={areasData}
                          projects={projectsData}
                        />
                        {/* Hover quick-move pills */}
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover/task:flex items-center gap-1">
                          {q.targets.map(t => (
                            <button
                              key={t.key}
                              onClick={e => { e.stopPropagation(); moveToQuadrant(task.id, t.key); }}
                              className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/80 border border-black/10 text-muted-foreground hover:text-foreground hover:bg-white transition-colors shadow-sm whitespace-nowrap"
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {tasks.length === 0 && (
                  <p className="text-base md:text-xs text-muted-foreground py-6 md:py-4 text-center">No tasks</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
