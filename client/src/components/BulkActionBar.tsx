import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Calendar, FolderOpen, ClipboardList, Tag as TagIcon, User, Trash2, X,
} from "lucide-react";

function getTomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface BulkActionBarProps {
  taskIds: number[];
  users?: { id: number; name: string | null }[];
  areas?: { id: number; name: string }[];
  projects?: { id: number; name: string }[];
  onClear: () => void;
}

export default function BulkActionBar({
  taskIds,
  users,
  areas,
  projects,
  onClear,
}: BulkActionBarProps) {
  const utils = trpc.useUtils();
  const tagsQuery = trpc.tags.list.useQuery();
  const usersQuery = trpc.users.list.useQuery(undefined, { enabled: !users });
  const areasQuery = trpc.areas.list.useQuery(undefined, { enabled: !areas });
  const projectsQuery = trpc.projects.list.useQuery(undefined, { enabled: !projects });

  const allUsers = users ?? usersQuery.data ?? [];
  const allAreas = areas ?? areasQuery.data ?? [];
  const allProjects = projects ?? projectsQuery.data ?? [];
  const allTags = tagsQuery.data ?? [];

  const bulkUpdate = trpc.tasks.bulkUpdate.useMutation({
    onSuccess: () => { utils.tasks.invalidate(); },
  });
  const bulkDelete = trpc.tasks.bulkDelete.useMutation({
    onSuccess: () => { utils.tasks.invalidate(); onClear(); },
  });

  const [customDate, setCustomDate] = useState("");
  const [tagDraft, setTagDraft] = useState<Set<number>>(new Set());

  const apply = (data: Record<string, unknown>) => {
    bulkUpdate.mutate({ taskIds, ...data } as any);
  };

  return (
    <div className="sticky top-0 z-20 -mx-1 mb-3 flex flex-wrap items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 backdrop-blur px-3 py-2 shadow-sm">
      <span className="text-sm font-medium text-foreground mr-2">
        {taskIds.length} selected
      </span>

      {/* Project */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" /> Project
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="space-y-1 max-h-64 overflow-y-auto">
            <button
              onClick={() => apply({ projectId: null })}
              className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-accent transition-colors text-muted-foreground"
            >
              No project
            </button>
            {allProjects.map(p => (
              <button
                key={p.id}
                onClick={() => apply({ projectId: p.id })}
                className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-accent transition-colors"
              >
                {p.name}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Area */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1.5">
            <FolderOpen className="h-3.5 w-3.5" /> Area
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="space-y-1 max-h-64 overflow-y-auto">
            <button
              onClick={() => apply({ areaId: null })}
              className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-accent transition-colors text-muted-foreground"
            >
              No area
            </button>
            {allAreas.map(a => (
              <button
                key={a.id}
                onClick={() => apply({ areaId: a.id })}
                className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-accent transition-colors"
              >
                {a.name}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Do date */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1.5">
            <Calendar className="h-3.5 w-3.5" /> Do date
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          <div className="space-y-1">
            <button
              onClick={() => apply({ doDate: null, doDateSomeday: false, doDateToday: false })}
              className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-accent transition-colors"
            >
              No date
            </button>
            <button
              onClick={() => apply({ doDate: null, doDateSomeday: false, doDateToday: true })}
              className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-accent transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => apply({ doDate: getTomorrowStr(), doDateSomeday: false, doDateToday: false })}
              className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-accent transition-colors"
            >
              Tomorrow
            </button>
            <button
              onClick={() => apply({ doDate: null, doDateSomeday: true, doDateToday: false })}
              className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-accent transition-colors"
            >
              Someday
            </button>
            <div className="px-2 py-1">
              <input
                type="date"
                value={customDate}
                onChange={e => {
                  const v = e.target.value;
                  setCustomDate(v);
                  if (v) apply({ doDate: v, doDateSomeday: false, doDateToday: false });
                }}
                className="w-full text-sm border rounded px-2 py-1"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Tags */}
      <Popover
        onOpenChange={(open) => {
          if (open) setTagDraft(new Set());
        }}
      >
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1.5">
            <TagIcon className="h-3.5 w-3.5" /> Tags
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="text-[11px] text-muted-foreground px-2 pb-1">
            Replaces tags on selected tasks
          </div>
          <div className="space-y-0.5 max-h-56 overflow-y-auto">
            {allTags.map(t => (
              <button
                key={t.id}
                onClick={() => {
                  setTagDraft(prev => {
                    const next = new Set(prev);
                    if (next.has(t.id)) next.delete(t.id);
                    else next.add(t.id);
                    return next;
                  });
                }}
                className="w-full flex items-center gap-2 text-left text-sm px-2 py-1.5 rounded hover:bg-accent transition-colors"
              >
                <span
                  className={`h-3.5 w-3.5 rounded border ${tagDraft.has(t.id) ? "bg-primary border-primary" : "border-muted-foreground/40"}`}
                />
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: t.color ?? "#6366f1" }}
                />
                {t.name}
              </button>
            ))}
          </div>
          <div className="flex gap-1 pt-2 border-t mt-2">
            <Button
              size="sm"
              className="h-7 text-xs flex-1"
              onClick={() => apply({ tagIds: Array.from(tagDraft) })}
            >
              Apply
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => apply({ tagIds: [] })}
            >
              Clear tags
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Owner */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1.5">
            <User className="h-3.5 w-3.5" /> Owner
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          <div className="space-y-1">
            <button
              onClick={() => apply({ ownerId: null })}
              className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-accent transition-colors text-muted-foreground"
            >
              Unassigned
            </button>
            {allUsers.map(u => (
              <button
                key={u.id}
                onClick={() => apply({ ownerId: u.id })}
                className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-accent transition-colors"
              >
                {u.name ?? `User ${u.id}`}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Delete */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={() => {
          if (confirm(`Delete ${taskIds.length} task${taskIds.length === 1 ? "" : "s"}? This cannot be undone.`)) {
            bulkDelete.mutate({ taskIds });
          }
        }}
      >
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </Button>

      <div className="flex-1" />

      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs gap-1.5"
        onClick={onClear}
      >
        <X className="h-3.5 w-3.5" /> Clear
      </Button>
    </div>
  );
}
