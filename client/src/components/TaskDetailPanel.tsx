import { useState, useEffect, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar, Clock, User, Tag, Trash2, X, Plus, AlertCircle, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskDetailPanelProps {
  taskId: number;
  onClose: () => void;
  onToggleComplete?: (isDone: boolean) => void;
}

function formatDateForInput(d: unknown): string {
  if (!d) return "";
  if (d instanceof Date) {
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  return String(d).split("T")[0];
}

function formatDateDisplay(d: unknown): string {
  if (!d) return "";
  const s = d instanceof Date ? formatDateForInput(d) : String(d).split("T")[0];
  const [yyyy, mm, dd] = s.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const now = new Date();
  if (yyyy === now.getFullYear() && mm - 1 === now.getMonth() && dd === now.getDate()) return "Today";
  const tom = new Date(now); tom.setDate(tom.getDate() + 1);
  if (yyyy === tom.getFullYear() && mm - 1 === tom.getMonth() && dd === tom.getDate()) return "Tomorrow";
  return `${months[mm - 1]} ${dd}`;
}

// Big circular checkbox for the main task
function TaskCheckbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={cn(
        "h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all",
        checked
          ? "bg-primary border-primary"
          : "border-blue-300 bg-white hover:border-primary"
      )}
      style={!checked ? { boxShadow: "0 0 0 1px #d3f6ff" } : {}}
    >
      {checked && (
        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
          <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

// Smaller square-ish checkbox for subtasks, with yellow accent
function SubtaskCheckbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={cn(
        "h-4 w-4 rounded border-2 shrink-0 flex items-center justify-center transition-all",
        checked
          ? "bg-amber-400 border-amber-400"
          : "border-amber-300 bg-white hover:border-amber-400"
      )}
    >
      {checked && (
        <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
          <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

export default function TaskDetailPanel({ taskId, onClose, onToggleComplete }: TaskDetailPanelProps) {
  const utils = trpc.useUtils();
  const taskQuery = trpc.tasks.get.useQuery({ id: taskId });
  const usersQuery = trpc.users.list.useQuery();
  const tagsQuery = trpc.tags.list.useQuery();

  const updateTask = trpc.tasks.update.useMutation({ onSuccess: () => utils.tasks.invalidate() });
  const deleteTask = trpc.tasks.delete.useMutation({ onSuccess: () => { utils.tasks.invalidate(); onClose(); } });
  const createSubtask = trpc.subtasks.create.useMutation({ onSuccess: () => utils.tasks.get.invalidate({ id: taskId }) });
  const updateSubtask = trpc.subtasks.update.useMutation({ onSuccess: () => utils.tasks.get.invalidate({ id: taskId }) });
  const deleteSubtask = trpc.subtasks.delete.useMutation({ onSuccess: () => utils.tasks.get.invalidate({ id: taskId }) });

  const task = taskQuery.data;

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [isDone, setIsDone] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [isImportant, setIsImportant] = useState(false);
  const [doDateType, setDoDateType] = useState<"date" | "someday" | "none">("none");
  const [doDate, setDoDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [ownerId, setOwnerId] = useState<string>("none");
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  const loadedRef = useRef(false);
  const [saveCounter, setSaveCounter] = useState(0);

  useEffect(() => {
    if (task) {
      loadedRef.current = false;
      setTitle(task.title);
      setNotes(task.notes ?? "");
      setIsDone(task.isDone);
      setIsUrgent(task.isUrgent);
      setIsImportant(task.isImportant);
      if (task.doDateSomeday) { setDoDateType("someday"); setDoDate(""); }
      else if (task.doDate) { setDoDateType("date"); setDoDate(formatDateForInput(task.doDate)); }
      else { setDoDateType("none"); setDoDate(""); }
      setDueDate(task.dueDate ? formatDateForInput(task.dueDate) : "");
      setOwnerId(task.ownerId ? String(task.ownerId) : "none");
      setSelectedTagIds(task.tagIds ?? []);
      requestAnimationFrame(() => { loadedRef.current = true; });
    }
  }, [task]);

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
      tagIds: selectedTagIds,
    });
  }, [taskId, title, notes, isUrgent, isImportant, doDateType, doDate, dueDate, ownerId, selectedTagIds, updateTask]);

  useEffect(() => {
    if (!loadedRef.current || saveCounter === 0) return;
    doSave();
  }, [saveCounter]); // eslint-disable-line react-hooks/exhaustive-deps

  const triggerSave = () => setSaveCounter(c => c + 1);

  const toggleDone = () => {
    const next = !isDone;
    setIsDone(next);
    updateTask.mutate({ id: taskId, isDone: next });
    onToggleComplete?.(next);
  };

  if (!task) return null;

  const ownerName = usersQuery.data?.find(u => String(u.id) === ownerId)?.name;
  const selectedTags = tagsQuery.data?.filter(t => selectedTagIds.includes(t.id)) ?? [];
  const doDateDisplay = doDateType === "someday" ? "Someday" : doDateType === "date" && doDate ? formatDateDisplay(doDate) : null;
  const dueDateDisplay = dueDate ? formatDateDisplay(dueDate) : null;

  const quadrant = isUrgent && isImportant ? "doNow" : !isUrgent && isImportant ? "doLater" : isUrgent && !isImportant ? "delegate" : "delete";
  const quadrantColors: Record<string, string> = {
    doNow: "text-red-500", doLater: "text-blue-500", delegate: "text-amber-500", delete: "text-gray-400"
  };

  return (
    <TooltipProvider delayDuration={400}>
      <div className="rounded-xl bg-white/90 backdrop-blur shadow-md border border-white/60 mx-0 my-1 overflow-hidden">

        {/* Header row */}
        <div className="flex items-start gap-3 px-4 pt-4 pb-2">
          <div className="shrink-0 mt-0.5">
            <TaskCheckbox checked={isDone} onChange={toggleDone} />
          </div>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={doSave}
            className={cn(
              "flex-1 text-base font-medium bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground",
              isDone && "line-through text-muted-foreground"
            )}
            placeholder="Task title"
          />
          <button onClick={onClose} className="shrink-0 h-7 w-7 flex items-center justify-center rounded-md hover:bg-black/5 text-muted-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Notes */}
        <div className="px-4 pb-3">
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onBlur={doSave}
            placeholder="Add notes..."
            className="min-h-[72px] text-sm resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 px-0 text-foreground placeholder:text-muted-foreground/60"
          />
        </div>

        {/* Subtasks */}
        {task.subtasks && task.subtasks.length > 0 && (
          <div className="px-4 pb-3 space-y-1.5">
            {task.subtasks.map(sub => (
              <div key={sub.id} className="flex items-center gap-2 group">
                <SubtaskCheckbox
                  checked={sub.isDone}
                  onChange={() => updateSubtask.mutate({ id: sub.id, isDone: !sub.isDone })}
                />
                <span className={cn("text-sm flex-1", sub.isDone && "line-through text-muted-foreground")}>{sub.title}</span>
                <button
                  onClick={() => deleteSubtask.mutate({ id: sub.id })}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add subtask */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2">
            <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              value={newSubtaskTitle}
              onChange={e => setNewSubtaskTitle(e.target.value)}
              placeholder="Add subtask..."
              className="text-sm bg-transparent border-0 outline-none flex-1 text-foreground placeholder:text-muted-foreground/60"
              onKeyDown={e => {
                if (e.key === "Enter" && newSubtaskTitle.trim()) {
                  createSubtask.mutate({ taskId, title: newSubtaskTitle.trim() });
                  setNewSubtaskTitle("");
                }
              }}
            />
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-black/5 bg-black/[0.02]">

          {/* Left: do date, tags */}
          <div className="flex items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{doDateDisplay ?? "Do date"}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="start">
                <div className="space-y-1">
                  <button onClick={() => { setDoDateType("none"); setDoDate(""); triggerSave(); }} className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-accent transition-colors">No date</button>
                  <button onClick={() => { setDoDateType("someday"); setDoDate(""); triggerSave(); }} className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-accent transition-colors">Someday</button>
                  <div className="px-2 py-1">
                    <input type="date" value={doDate} onChange={e => { setDoDateType("date"); setDoDate(e.target.value); triggerSave(); }} className="w-full text-sm border rounded px-2 py-1" />
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Tag className="h-3.5 w-3.5" />
                  {selectedTags.length > 0 ? (
                    <div className="flex items-center gap-1">
                      {selectedTags.map(t => (
                        <span key={t.id} className="inline-flex items-center px-1.5 py-0.5 rounded-full text-white text-[10px]" style={{ backgroundColor: t.color ?? "#6366f1" }}>
                          {t.name}
                        </span>
                      ))}
                    </div>
                  ) : <span>Tags</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="start">
                <div className="space-y-1">
                  {tagsQuery.data?.map(tag => {
                    const selected = selectedTagIds.includes(tag.id);
                    return (
                      <button key={tag.id} onClick={() => {
                        const next = selected ? selectedTagIds.filter(id => id !== tag.id) : [...selectedTagIds, tag.id];
                        setSelectedTagIds(next);
                        triggerSave();
                      }} className={cn("w-full text-left text-sm px-2 py-1.5 rounded hover:bg-accent transition-colors flex items-center gap-2", selected && "font-medium")}>
                        <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color ?? "#6366f1" }} />
                        {tag.name}
                        {selected && <span className="ml-auto text-primary text-xs">✓</span>}
                      </button>
                    );
                  })}
                  {!tagsQuery.data?.length && <p className="text-xs text-muted-foreground px-2 py-1">No tags yet</p>}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Right: urgency, importance, owner, due date, delete */}
          <div className="flex items-center gap-1">

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => { setIsUrgent(v => !v); triggerSave(); }}
                  className={cn("flex items-center px-1.5 py-1 rounded transition-colors", isUrgent ? "text-amber-500 bg-amber-50" : "text-muted-foreground hover:text-foreground hover:bg-black/5")}
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top"><p>Mark urgent</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => { setIsImportant(v => !v); triggerSave(); }}
                  className={cn("flex items-center px-1.5 py-1 rounded transition-colors", isImportant ? `${quadrantColors[quadrant]} bg-blue-50` : "text-muted-foreground hover:text-foreground hover:bg-black/5")}
                >
                  <Star className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top"><p>Mark important</p></TooltipContent>
            </Tooltip>

            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <button className={cn("flex items-center gap-1 px-1.5 py-1 rounded transition-colors text-xs", ownerId !== "none" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-black/5")}>
                      <User className="h-3.5 w-3.5" />
                      {ownerId !== "none" && <span>{ownerName}</span>}
                    </button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="top"><p>Assign owner</p></TooltipContent>
              </Tooltip>
              <PopoverContent className="w-40 p-2" align="end">
                <div className="space-y-1">
                  <button onClick={() => { setOwnerId("none"); triggerSave(); }} className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-accent transition-colors">No one</button>
                  {usersQuery.data?.map(u => (
                    <button key={u.id} onClick={() => { setOwnerId(String(u.id)); triggerSave(); }} className={cn("w-full text-left text-sm px-2 py-1.5 rounded hover:bg-accent transition-colors", String(u.id) === ownerId && "font-medium text-primary")}>
                      {u.name ?? u.email ?? `User ${u.id}`}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <button className={cn("flex items-center gap-1 px-1.5 py-1 rounded transition-colors text-xs", dueDate ? "text-red-500 bg-red-50" : "text-muted-foreground hover:text-foreground hover:bg-black/5")}>
                      <Clock className="h-3.5 w-3.5" />
                      {dueDateDisplay && <span>{dueDateDisplay}</span>}
                    </button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="top"><p>Set due date</p></TooltipContent>
              </Tooltip>
              <PopoverContent className="w-44 p-2" align="end">
                <div className="space-y-1">
                  <button onClick={() => { setDueDate(""); triggerSave(); }} className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-accent transition-colors">No due date</button>
                  <div className="px-2 py-1">
                    <input type="date" value={dueDate} onChange={e => { setDueDate(e.target.value); triggerSave(); }} className="w-full text-sm border rounded px-2 py-1" />
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => { if (confirm("Delete this task?")) deleteTask.mutate({ id: taskId }); }}
                  className="text-muted-foreground hover:text-destructive transition-colors px-1.5 py-1 rounded hover:bg-black/5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top"><p>Delete task</p></TooltipContent>
            </Tooltip>

          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
