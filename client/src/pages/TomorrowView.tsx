import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import TaskList from "@/components/TaskList";
import { Button } from "@/components/ui/button";
import { Sunrise, Filter, X } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

function getTomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function TomorrowView() {
  const tomorrow = useMemo(() => getTomorrowStr(), []);

  const tomorrowTasks = trpc.tasks.list.useQuery({ doDate: tomorrow });
  const usersQuery = trpc.users.list.useQuery();
  const areasQuery = trpc.areas.list.useQuery();
  const projectsQuery = trpc.projects.list.useQuery();

  const [filterAreaId, setFilterAreaId] = useState<number | null>(null);
  const [filterProjectId, setFilterProjectId] = useState<number | null>(null);

  const areasData = useMemo(() => areasQuery.data?.map(a => ({ id: a.id, name: a.name })) ?? [], [areasQuery.data]);
  const projectsData = useMemo(() => projectsQuery.data?.map(p => ({ id: p.id, name: p.name })) ?? [], [projectsQuery.data]);

  const allIncomplete = tomorrowTasks.data?.filter(t => !t.isDone) ?? [];
  const allCompleted = tomorrowTasks.data?.filter(t => t.isDone) ?? [];

  const incompleteTasks = allIncomplete.filter(t => {
    if (filterAreaId !== null && t.areaId !== filterAreaId) return false;
    if (filterProjectId !== null && t.projectId !== filterProjectId) return false;
    return true;
  });
  const completedTasks = allCompleted.filter(t => {
    if (filterAreaId !== null && t.areaId !== filterAreaId) return false;
    if (filterProjectId !== null && t.projectId !== filterProjectId) return false;
    return true;
  });

  const tomorrowFormatted = new Date(tomorrow + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Sunrise className="h-5 w-5 text-amber-500" />
            Tomorrow
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{tomorrowFormatted}</p>
        </div>
        <div className="text-sm text-muted-foreground pt-1">
          {allIncomplete.length > 0
            ? `${allIncomplete.length} task${allIncomplete.length !== 1 ? "s" : ""} queued`
            : "Nothing queued yet"}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          Filter:
        </div>
        <Select
          value={filterAreaId !== null ? String(filterAreaId) : "all"}
          onValueChange={v => setFilterAreaId(v === "all" ? null : Number(v))}
        >
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue placeholder="All Areas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Areas</SelectItem>
            {areasData.map(a => (
              <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filterProjectId !== null ? String(filterProjectId) : "all"}
          onValueChange={v => setFilterProjectId(v === "all" ? null : Number(v))}
        >
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projectsData.map(p => (
              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(filterAreaId !== null || filterProjectId !== null) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground"
            onClick={() => { setFilterAreaId(null); setFilterProjectId(null); }}
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Incomplete tasks */}
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
          defaultDoDate={tomorrow}
          emptyMessage="Nothing scheduled for tomorrow. Tasks pushed via Evening Sift will appear here."
          hideDoDate
        />
      </div>

      {/* Completed tasks */}
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
            hideDoDate
          />
        </div>
      )}
    </div>
  );
}
