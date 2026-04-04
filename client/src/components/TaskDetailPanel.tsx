import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { X, Plus, Trash2, Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskDetailPanelProps {
  taskId: number | null;
  open: boolean;
  onClose: () => void;
}

export default function TaskDetailPanel({ taskId, open, onClose }: TaskDetailPanelProps) {
  const utils = trpc.useUtils();
  const taskQuery = trpc.tasks.get.useQuery({ id: taskId! }, { enabled: !!taskId });
  const usersQuery = trpc.users.list.useQuery();
  const areasQuery = trpc.areas.list.useQuery();
  const projectsQuery = trpc.projects.list.useQuery();
  const tagsQuery = trpc.tags.list.useQuery();

  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: () => { utils.tasks.invalidate(); },
  });
  const deleteTask = trpc.tasks.delete.useMutation({
    onSuccess: () => { utils.tasks.invalidate(); onClose(); },
  });
  const createSubtask = trpc.subtasks.create.useMutation({
    onSuccess: () => { utils.tasks.get.invalidate({ id: taskId! }); },
  });
  const updateSubtask = trpc.subtasks.update.useMutation({
    onSuccess: () => { utils.tasks.get.invalidate({ id: taskId! }); },
  });
  const deleteSubtask = trpc.subtasks.delete.useMutation({
    onSuccess: () => { utils.tasks.get.invalidate({ id: taskId! }); },
  });

  const task = taskQuery.data;

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [isImportant, setIsImportant] = useState(false);
  const [doDateType, setDoDateType] = useState<"date" | "someday" | "none">("none");
  const [doDate, setDoDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [ownerId, setOwnerId] = useState<string>("none");
  const [areaId, setAreaId] = useState<string>("none");
  const [projectId, setProjectId] = useState<string>("none");
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setNotes(task.notes ?? "");
      setIsUrgent(task.isUrgent);
      setIsImportant(task.isImportant);
      if (task.doDateSomeday) {
        setDoDateType("someday");
        setDoDate("");
      } else if (task.doDate) {
        setDoDateType("date");
        const d = task.doDate;
        setDoDate(typeof d === "string" ? d : (d as Date).toISOString().split("T")[0]);
      } else {
        setDoDateType("none");
        setDoDate("");
      }
      setDueDate(task.dueDate ? (typeof task.dueDate === "string" ? task.dueDate : (task.dueDate as Date).toISOString().split("T")[0]) : "");
      setOwnerId(task.ownerId ? String(task.ownerId) : "none");
      setAreaId(task.areaId ? String(task.areaId) : "none");
      setProjectId(task.projectId ? String(task.projectId) : "none");
      setSelectedTagIds(task.tagIds ?? []);
    }
  }, [task]);

  const save = useCallback(() => {
    if (!taskId || !title.trim()) return;
    updateTask.mutate({
      id: taskId,
      title: title.trim(),
      notes: notes || null,
      isUrgent,
      isImportant,
      doDate: doDateType === "date" && doDate ? doDate : null,
      doDateSomeday: doDateType === "someday",
      dueDate: dueDate || null,
      ownerId: ownerId !== "none" ? parseInt(ownerId) : null,
      areaId: areaId !== "none" ? parseInt(areaId) : null,
      projectId: projectId !== "none" ? parseInt(projectId) : null,
      tagIds: selectedTagIds,
    });
  }, [taskId, title, notes, isUrgent, isImportant, doDateType, doDate, dueDate, ownerId, areaId, projectId, selectedTagIds, updateTask]);

  // Auto-save on blur or changes to toggles
  const handleBlur = () => save();

  if (!taskId) return null;

  const quadrant = isUrgent && isImportant ? "Do Now" : !isUrgent && isImportant ? "Do Later" : isUrgent && !isImportant ? "Delegate" : "Delete";
  const quadrantColorClass = isUrgent && isImportant
    ? "text-red-600 dark:text-red-400"
    : !isUrgent && isImportant
      ? "text-blue-600 dark:text-blue-400"
      : isUrgent && !isImportant
        ? "text-amber-600 dark:text-amber-400"
        : "text-gray-500 dark:text-gray-400";

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) { save(); onClose(); } }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="sr-only">Edit Task</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 pb-8">
          {/* Title */}
          <div>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={handleBlur}
              className="text-lg font-medium border-0 px-0 shadow-none focus-visible:ring-0 bg-transparent"
              placeholder="Task title"
            />
          </div>

          {/* Eisenhower Matrix */}
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Eisenhower Matrix</Label>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={isUrgent}
                  onCheckedChange={v => { setIsUrgent(v); setTimeout(save, 50); }}
                />
                <span className="text-sm">Urgent</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={isImportant}
                  onCheckedChange={v => { setIsImportant(v); setTimeout(save, 50); }}
                />
                <span className="text-sm">Important</span>
              </div>
            </div>
            <p className={cn("text-sm font-medium", quadrantColorClass)}>
              → {quadrant}
            </p>
          </div>

          {/* Do Date */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Do Date</Label>
            <div className="flex items-center gap-2">
              <Select value={doDateType} onValueChange={(v: "date" | "someday" | "none") => { setDoDateType(v); setTimeout(save, 50); }}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No date</SelectItem>
                  <SelectItem value="date">Specific date</SelectItem>
                  <SelectItem value="someday">Someday</SelectItem>
                </SelectContent>
              </Select>
              {doDateType === "date" && (
                <Input
                  type="date"
                  value={doDate}
                  onChange={e => setDoDate(e.target.value)}
                  onBlur={handleBlur}
                  className="w-44"
                />
              )}
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Due Date (optional)</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              onBlur={handleBlur}
              className="w-44"
            />
          </div>

          {/* Owner */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Owner</Label>
            <Select value={ownerId} onValueChange={v => { setOwnerId(v); setTimeout(save, 50); }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {usersQuery.data?.map(u => (
                  <SelectItem key={u.id} value={String(u.id)}>{u.name ?? u.email ?? `User ${u.id}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Area */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Area</Label>
            <Select value={areaId} onValueChange={v => { setAreaId(v); setTimeout(save, 50); }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="No area" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No area</SelectItem>
                {areasQuery.data?.map(a => (
                  <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Project */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Project</Label>
            <Select value={projectId} onValueChange={v => { setProjectId(v); setTimeout(save, 50); }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="No project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project</SelectItem>
                {projectsQuery.data?.map(p => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tags</Label>
            <div className="flex flex-wrap gap-1.5">
              {tagsQuery.data?.map(tag => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <Badge
                    key={tag.id}
                    variant={isSelected ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer text-xs transition-colors",
                      isSelected && "bg-primary text-primary-foreground"
                    )}
                    onClick={() => {
                      const next = isSelected
                        ? selectedTagIds.filter(id => id !== tag.id)
                        : [...selectedTagIds, tag.id];
                      setSelectedTagIds(next);
                      setTimeout(save, 50);
                    }}
                  >
                    <div
                      className="h-2 w-2 rounded-full mr-1"
                      style={{ backgroundColor: tag.color ?? "#6366f1" }}
                    />
                    {tag.name}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Notes</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={handleBlur}
              placeholder="Add notes..."
              className="min-h-[100px] resize-y"
            />
          </div>

          {/* Subtasks */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Subtasks</Label>
            <div className="space-y-1">
              {task?.subtasks?.map(sub => (
                <div key={sub.id} className="flex items-center gap-2 group">
                  <Checkbox
                    checked={sub.isDone}
                    onCheckedChange={v => updateSubtask.mutate({ id: sub.id, isDone: !!v })}
                    className="h-4 w-4 rounded"
                  />
                  <span className={cn("text-sm flex-1", sub.isDone && "line-through text-muted-foreground")}>
                    {sub.title}
                  </span>
                  <button
                    onClick={() => deleteSubtask.mutate({ id: sub.id })}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all h-5 w-5 flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={newSubtaskTitle}
                onChange={e => setNewSubtaskTitle(e.target.value)}
                placeholder="Add subtask..."
                className="text-sm h-8"
                onKeyDown={e => {
                  if (e.key === "Enter" && newSubtaskTitle.trim() && taskId) {
                    createSubtask.mutate({ taskId, title: newSubtaskTitle.trim() });
                    setNewSubtaskTitle("");
                  }
                }}
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2"
                onClick={() => {
                  if (newSubtaskTitle.trim() && taskId) {
                    createSubtask.mutate({ taskId, title: newSubtaskTitle.trim() });
                    setNewSubtaskTitle("");
                  }
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Delete */}
          <div className="pt-4 border-t">
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => { if (taskId) deleteTask.mutate({ id: taskId }); }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Task
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
