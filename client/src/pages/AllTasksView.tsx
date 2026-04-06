import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import TaskList from "@/components/TaskList";
import { Layers } from "lucide-react";

export default function AllTasksView() {
  const tasksQuery = trpc.tasks.list.useQuery({});
  const usersQuery = trpc.users.list.useQuery();
  const areasQuery = trpc.areas.list.useQuery();
  const projectsQuery = trpc.projects.list.useQuery();

  const incompleteTasks = tasksQuery.data?.filter(t => !t.isDone) ?? [];
  const completedTasks = tasksQuery.data?.filter(t => t.isDone) ?? [];

  const areasData = useMemo(() => areasQuery.data?.map(a => ({ id: a.id, name: a.name })) ?? [], [areasQuery.data]);
  const projectsData = useMemo(() => projectsQuery.data?.map(p => ({ id: p.id, name: p.name })) ?? [], [projectsQuery.data]);

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
          areas={areasData}
          projects={projectsData}
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
            areas={areasData}
            projects={projectsData}
            showCreateInline={false}
          />
        </div>
      )}
    </div>
  );
}
