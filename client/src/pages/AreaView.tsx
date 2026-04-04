import { trpc } from "@/lib/trpc";
import TaskList from "@/components/TaskList";
import { useParams } from "wouter";
import { FolderOpen } from "lucide-react";

export default function AreaView() {
  const params = useParams<{ id: string }>();
  const areaId = parseInt(params.id ?? "0");

  const areasQuery = trpc.areas.list.useQuery();
  const tasksQuery = trpc.tasks.list.useQuery({ areaId });
  const usersQuery = trpc.users.list.useQuery();

  const area = areasQuery.data?.find(a => a.id === areaId);
  const incompleteTasks = tasksQuery.data?.filter(t => !t.isDone) ?? [];
  const completedTasks = tasksQuery.data?.filter(t => t.isDone) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {area?.name ?? "Area"}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          All tasks in this area
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
          emptyMessage="No tasks in this area yet."
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
