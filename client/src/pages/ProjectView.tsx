import { trpc } from "@/lib/trpc";
import TaskList from "@/components/TaskList";
import { useParams } from "wouter";
import { ClipboardList } from "lucide-react";

export default function ProjectView() {
  const params = useParams<{ id: string }>();
  const projectId = parseInt(params.id ?? "0");

  const projectsQuery = trpc.projects.list.useQuery();
  const tasksQuery = trpc.tasks.list.useQuery({ projectId });
  const usersQuery = trpc.users.list.useQuery();

  const project = projectsQuery.data?.find(p => p.id === projectId);
  const incompleteTasks = tasksQuery.data?.filter(t => !t.isDone) ?? [];
  const completedTasks = tasksQuery.data?.filter(t => t.isDone) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {project?.name ?? "Project"}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          All tasks in this project
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
          defaultProjectId={projectId}
          emptyMessage="No tasks in this project yet."
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
