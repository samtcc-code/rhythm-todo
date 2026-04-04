import { useState } from "react";
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
  },
  {
    key: "doLater",
    title: "Do Later",
    subtitle: "Not Urgent & Important",
    color: "border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20",
    headerColor: "text-blue-600 dark:text-blue-400",
  },
  {
    key: "delegate",
    title: "Delegate",
    subtitle: "Urgent & Not Important",
    color: "border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20",
    headerColor: "text-amber-600 dark:text-amber-400",
  },
  {
    key: "delete",
    title: "Delete",
    subtitle: "Not Urgent & Not Important",
    color: "border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20",
    headerColor: "text-gray-500 dark:text-gray-400",
  },
];

export default function MatrixView() {
  const allTasks = trpc.tasks.list.useQuery({ isDone: false });
  const usersQuery = trpc.users.list.useQuery();
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const tasksByQuadrant = (key: string) =>
    allTasks.data?.filter(t => t.quadrant === key) ?? [];

  return (
    <div className="space-y-8 md:space-y-6">
      <div>
        <h1 className="text-3xl md:text-2xl font-semibold tracking-tight text-foreground">Eisenhower Matrix</h1>
        <p className="text-base md:text-sm text-muted-foreground mt-1">
          Prioritize by urgency and importance. Re-evaluate Do Later items daily.
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
                  <TaskItem
                    key={task.id}
                    task={task}
                    onClick={() => setSelectedTaskId(task.id)}
                    users={usersQuery.data}
                  />
                ))}
                {tasks.length === 0 && (
                  <p className="text-base md:text-xs text-muted-foreground py-6 md:py-4 text-center">No tasks</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <TaskDetailPanel
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
      />
    </div>
  );
}
