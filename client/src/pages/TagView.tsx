import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import TaskList from "@/components/TaskList";
import { useParams } from "wouter";
import { Tag } from "lucide-react";

export default function TagView() {
  const params = useParams<{ id: string }>();
  const tagId = parseInt(params.id ?? "0");

  const tagsQuery = trpc.tags.list.useQuery();
  const areasQuery = trpc.areas.list.useQuery();
  const projectsQuery = trpc.projects.list.useQuery();
  const tasksQuery = trpc.tasks.list.useQuery({ tagId });
  const usersQuery = trpc.users.list.useQuery();

  const tag = tagsQuery.data?.find(t => t.id === tagId);
  const incompleteTasks = tasksQuery.data?.filter(t => !t.isDone) ?? [];
  const completedTasks = tasksQuery.data?.filter(t => t.isDone) ?? [];

  const areasData = useMemo(() => areasQuery.data?.map(a => ({ id: a.id, name: a.name })) ?? [], [areasQuery.data]);
  const projectsData = useMemo(() => projectsQuery.data?.map(p => ({ id: p.id, name: p.name })) ?? [], [projectsQuery.data]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          {tag && (
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: tag.color ?? "#6366f1" }}
            />
          )}
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {tag?.name ?? "Tag"}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          All tasks with this tag
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
          defaultTagIds={[tagId]}
          emptyMessage="No tasks with this tag yet."
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
