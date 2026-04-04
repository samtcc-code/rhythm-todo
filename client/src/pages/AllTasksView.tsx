import { trpc } from "@/lib/trpc";
import TaskList from "@/components/TaskList";
import { Layers } from "lucide-react";

export default function AllTasksView() {
  const tasksQuery = trpc.tasks.list.useQuery({});
  const usersQuery = trpc.users.list.useQuery();

  const incompleteTasks = tasksQuery.data?.filter(t => !t.isDone) ?? [];
  const completedTasks = tasksQuery.data?.filter(t => t.isDone) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">All Tasks</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every task across all areas, projects, and dates.
        </p>
      </div>

      <div>
        {incompleteTasks.length > 0 && (
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 px-1">
            To Do ({incompleteTasks.length})
          </p>
        )}
        <TaskList
          tasks={incompleteTasks}
          users={usersQuery.data}
          emptyMessage="No tasks yet. Create your first task to get started."
        />
      </div>

      {completedTasks.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 px-1">
            Done ({completedTasks.length})
          </p>
          <TaskList
            tasks={completedTasks}
            users={usersQuery.data}
            showCreateInline={false}
          />
        </div>
      )}
    </div>
  );
}
