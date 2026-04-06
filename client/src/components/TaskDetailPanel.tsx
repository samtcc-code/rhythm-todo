import { useState, useEffect, useCallback, useRef } from "react";
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
import { X, Plus, Trash2 } from "lucide-react";
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

  // Track whether we've loaded from server to avoid saving on initial load
  const loadedRef = useRef(false);
  // Counter to trigger auto-save when toggle/select values change
  const [saveCounter, setSaveCounter] = useState(0);

  useEffect(() => {
    if (task) {
      loadedRef.current = false; // pause auto-save during load
      setTitle(task.title);
      setNotes(task.notes ?? "");
      setIsUrgent(task.isUrgent);
      setIsImportant(task.isImportant);
      if (task.doDateSomeday) {
        setDoDateType("someday");
        setDoDate("");
      } else if (task.doDate) {
        setDoDateType("date");
        const d = task.doDate as unknown;
        if (d instanceof Date) {
          const yyyy = d.getUTCFullYear();
          const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
          const dd = String(d.getUTCDate()).padStart(2, "0");
          setDoDate(`${yyyy}-${mm}-${dd}`);
        } else {
          setDoDate(String(d).split("T")[0]);
        }
      } else {
        setDoDateType("none");
        setDoDate("");
      }
      if (task.dueDate) {
        const dd = task.dueDate as unknown;
        if (dd instanceof Date) {
          const yyyy = dd.getUTCFullYear();
          const mm = String(dd.getUTCMonth() + 1).padStart(2, "0");
          const day = String(dd.getUTCDate()).padStart(2, "0");
          setDueDate(`${yyyy}-${mm}-${day}`);
        } else {
          setDueDate(String(dd).split("T")[0]);
        }
      } else {
        setDueDate("");
      }
      setOwnerId(task.ownerId ? String(task.ownerId) : "none");
      setAreaId(task.areaId ? String(task.areaId) : "none");
      setProjectId(task.projectId ? String(task.projectId) : "none");
      setSelectedTagIds(task.tagIds ?? []);
      // Mark loaded after a tick so the saveCounter effect doesn't fire
      requestAnimationFrame(() => { loadedRef.current = true; });
    }
  }, [task]);

  // The actual save function — always reads latest state
  const doSave = useCallback(() => {
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

  // Auto-save when toggle/select values change (triggered by saveCounter)
  useEffect(() => {
    if (!loadedRef.current || saveCounter === 0) return;
    doSave();
  }, [saveCounter]); // eslint-disable-line react-hooks/exhaustive-deps

  const triggerSave = () => setSaveCounter(c => c + 1);
  const handleBlur = () => doSave();

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
    <Sheet open={open} onOpenChange={v => { if (!v) { doSave(); onClose(); } }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto px-8 py-6 pr-10">
        <SheetHeader className="pb-2 pt-0 px-0">
          <SheetTitle className="sr-only">Edit Task</SheetTitle>
        </SheetHeader>

        <div className="space-y-8 md:space-y-6 pb-8 px-0">
          {/* Title */}
          <div>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={handleBlur}
              className="text-xl md:text-lg font-medium border-0 px-0 shadow-none focus-visible:ring-0 bg-transparent h-12 md:h-auto"
              placeholder="Task title"
            />
          </div>

          {/* Eisenhower Matrix */}
          <div className="space-y-4 md:space-y-3">
            <Label className="text-sm md:text-xs uppercase tracking-wider text-muted-foreground">Eisenhower Matrix</Label>
            <div className="flex items-center gap-8 md:gap-6">
              <div className="flex items-center gap-3 md:gap-2">
                <Switch
                  checked={isUrgent}
                  onCheckedChange={v => { setIsUrgent(v); triggerSave(); }}
                />
                <span className="text-base md:text-sm">Urgent</span>
              </div>
              <div className="flex items-center gap-3 md:gap-2">
                <Switch
                  checked={isImportant}
                  onCheckedChange={v => { setIsImportant(v); triggerSave(); }}
                />
                <span className="text-base md:text-sm">Important</span>
              </div>
            </div>
            <p className={cn("text-base md:text-sm font-medium", quadrantColorClass)}>
              → {quadrant}
            </p>
          </div>

          {/* Do Date */}
          <div className="space-y-3 md:space-y-2">
            <Label className="text-sm md:text-xs uppercase tracking-wider text-muted-foreground">Do Date</Label>
            <div className="flex items-center gap-3 md:gap-2">
              <Select value={doDateType} onValueChange={(v: "date" | "someday" | "none") => { setDoDateType(v); triggerSave(); }}>
                <SelectTrigger className="w-44 md:w-36 h-12 md:h-9 text-base md:text-sm rounded-xl md:rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-base md:text-sm py-3 md:py-1.5">No date</SelectItem>
                  <SelectItem value="date" className="text-base md:text-sm py-3 md:py-1.5">Specific date</SelectItem>
                  <SelectItem value="someday" className="text-base md:text-sm py-3 md:py-1.5">Someday</SelectItem>
                </SelectContent>
              </Select>
              {doDateType === "date" && (
                <Input
                  type="date"
                  value={doDate}
                  onChange={e => setDoDate(e.target.value)}
                  onBlur={handleBlur}
                  className="w-48 md:w-44 h-12 md:h-9 text-base md:text-sm rounded-xl md:rounded-md"
                />
              )}
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-3 md:space-y-2">
            <Label className="text-sm md:text-xs uppercase tracking-wider text-muted-foreground">Due Date (optional)</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              onBlur={handleBlur}
              className="w-48 md:w-44 h-12 md:h-9 text-base md:text-sm rounded-xl md:rounded-md"
            />
          </div>

          {/* Owner */}
          <div className="space-y-3 md:space-y-2">
            <Label className="text-sm md:text-xs uppercase tracking-wider text-muted-foreground">Owner</Label>
            <Select value={ownerId} onValueChange={v => { setOwnerId(v); triggerSave(); }}>
              <SelectTrigger className="w-56 md:w-48 h-12 md:h-9 text-base md:text-sm rounded-xl md:rounded-md">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-base md:text-sm py-3 md:py-1.5">Unassigned</SelectItem>
                {usersQuery.data?.map(u => (
                  <SelectItem key={u.id} value={String(u.id)} className="text-base md:text-sm py-3 md:py-1.5">{u.name ?? u.email ?? `User ${u.id}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Area */}
          <div className="space-y-3 md:space-y-2">
            <Label className="text-sm md:text-xs uppercase tracking-wider text-muted-foreground">Area</Label>
            <Select value={areaId} onValueChange={v => { setAreaId(v); triggerSave(); }}>
              <SelectTrigger className="w-56 md:w-48 h-12 md:h-9 text-base md:text-sm rounded-xl md:rounded-md">
                <SelectValue placeholder="No area" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-base md:text-sm py-3 md:py-1.5">No area</SelectItem>
                {areasQuery.data?.map(a => (
                  <SelectItem key={a.id} value={String(a.id)} className="text-base md:text-sm py-3 md:py-1.5">{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Project */}
          <div className="space-y-3 md:space-y-2">
            <Label className="text-sm md:text-xs uppercase tracking-wider text-muted-foreground">Project</Label>
            <Select value={projectId} onValueChange={v => { setProjectId(v); triggerSave(); }}>
              <SelectTrigger className="w-56 md:w-48 h-12 md:h-9 text-base md:text-sm rounded-xl md:rounded-md">
                <SelectValue placeholder="No project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-base md:text-sm py-3 md:py-1.5">No project</SelectItem>
                {projectsQuery.data?.map(p => (
                  <SelectItem key={p.id} value={String(p.id)} className="text-base md:text-sm py-3 md:py-1.5">{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-3 md:space-y-2">
            <Label className="text-sm md:text-xs uppercase tracking-wider text-muted-foreground">Tags</Label>
            <div className="flex flex-wrap gap-2.5 md:gap-1.5">
              {tagsQuery.data?.map(tag => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <Badge
                    key={tag.id}
                    variant={isSelected ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer text-base md:text-xs px-3 md:px-2 py-2 md:py-0.5 h-auto transition-colors rounded-xl md:rounded-md",
                      isSelected && "bg-primary text-primary-foreground"
                    )}
                    onClick={() => {
                      const next = isSelected
                        ? selectedTagIds.filter(id => id !== tag.id)
                        : [...selectedTagIds, tag.id];
                      setSelectedTagIds(next);
                      triggerSave();
                    }}
                  >
                    <div
                      className="h-3 w-3 md:h-2 md:w-2 rounded-full mr-1.5 md:mr-1"
                      style={{ backgroundColor: tag.color ?? "#6366f1" }}
                    />
                    {tag.name}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-3 md:space-y-2">
            <Label className="text-sm md:text-xs uppercase tracking-wider text-muted-foreground">Notes</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={handleBlur}
              placeholder="Add notes..."
              className="min-h-[120px] md:min-h-[100px] resize-y text-base md:text-sm rounded-xl md:rounded-md"
            />
          </div>

          {/* Subtasks */}
          <div className="space-y-3 md:space-y-2">
            <Label className="text-sm md:text-xs uppercase tracking-wider text-muted-foreground">Subtasks</Label>
            <div className="space-y-2 md:space-y-1">
              {task?.subtasks?.map(sub => (
                <div key={sub.id} className="flex items-center gap-3 md:gap-2 group py-2 md:py-0.5">
                  <div
                    className="shrink-0 flex items-center justify-center w-10 h-10 md:w-auto md:h-auto"
                    onClick={() => updateSubtask.mutate({ id: sub.id, isDone: !sub.isDone })}
                  >
                    <Checkbox
                      checked={sub.isDone}
                      onCheckedChange={v => updateSubtask.mutate({ id: sub.id, isDone: !!v })}
                      className="h-6 w-6 md:h-4 md:w-4 rounded"
                    />
                  </div>
                  <span className={cn("text-base md:text-sm flex-1", sub.isDone && "line-through text-muted-foreground")}>
                    {sub.title}
                  </span>
                  <button
                    onClick={() => deleteSubtask.mutate({ id: sub.id })}
                    className="text-muted-foreground hover:text-destructive transition-all h-10 w-10 md:h-5 md:w-5 flex items-center justify-center md:opacity-0 md:group-hover:opacity-100"
                  >
                    <X className="h-5 w-5 md:h-3 md:w-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 md:gap-2">
              <Input
                value={newSubtaskTitle}
                onChange={e => setNewSubtaskTitle(e.target.value)}
                placeholder="Add subtask..."
                className="text-base md:text-sm h-12 md:h-8 rounded-xl md:rounded-md"
                onKeyDown={e => {
                  if (e.key === "Enter" && newSubtaskTitle.trim() && taskId) {
                    createSubtask.mutate({ taskId, title: newSubtaskTitle.trim() });
                    setNewSubtaskTitle("");
                  }
                }}
              />
              <Button
                variant="ghost"
                className="h-12 w-12 md:h-8 md:w-8 md:px-2 rounded-xl md:rounded-md shrink-0"
                onClick={() => {
                  if (newSubtaskTitle.trim() && taskId) {
                    createSubtask.mutate({ taskId, title: newSubtaskTitle.trim() });
                    setNewSubtaskTitle("");
                  }
                }}
              >
                <Plus className="h-6 w-6 md:h-4 md:w-4" />
              </Button>
            </div>
          </div>

          {/* Delete */}
          <div className="pt-6 md:pt-4 border-t">
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-12 md:h-9 text-base md:text-sm rounded-xl md:rounded-md"
              onClick={() => { if (taskId) deleteTask.mutate({ id: taskId }); }}
            >
              <Trash2 className="h-5 w-5 md:h-4 md:w-4 mr-2" />
              Delete Task
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
