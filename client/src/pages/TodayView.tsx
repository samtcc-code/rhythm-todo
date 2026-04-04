import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import TaskList from "@/components/TaskList";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Sunrise, Sunset, ArrowRight, Plus, X } from "lucide-react";

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getTomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface BrainDumpItem {
  title: string;
  isUrgent: boolean;
  isImportant: boolean;
  forToday: boolean;
}

export default function TodayView() {
  const today = useMemo(() => getTodayStr(), []);
  const tomorrow = useMemo(() => getTomorrowStr(), []);

  const todayTasks = trpc.tasks.list.useQuery({ doDate: today });
  const usersQuery = trpc.users.list.useQuery();
  const utils = trpc.useUtils();

  const bulkMove = trpc.tasks.bulkMove.useMutation({
    onSuccess: () => { utils.tasks.list.invalidate(); },
  });
  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => { utils.tasks.list.invalidate(); },
  });

  // Brain dump state
  const [showBrainDump, setShowBrainDump] = useState(false);
  const [dumpItems, setDumpItems] = useState<BrainDumpItem[]>([]);
  const [dumpInput, setDumpInput] = useState("");

  // Evening sift state
  const [showEveningSift, setShowEveningSift] = useState(false);
  const [siftSelected, setSiftSelected] = useState<Set<number>>(new Set());

  const incompleteTasks = todayTasks.data?.filter(t => !t.isDone) ?? [];
  const completedTasks = todayTasks.data?.filter(t => t.isDone) ?? [];

  // ─── Brain Dump ───────────────────────────────────────────────

  const handleOpenBrainDump = () => {
    setDumpItems([]);
    setDumpInput("");
    setShowBrainDump(true);
  };

  const addDumpItem = () => {
    if (!dumpInput.trim()) return;
    setDumpItems(prev => [...prev, { title: dumpInput.trim(), isUrgent: false, isImportant: false, forToday: true }]);
    setDumpInput("");
  };

  const removeDumpItem = (idx: number) => {
    setDumpItems(prev => prev.filter((_, i) => i !== idx));
  };

  const updateDumpItem = (idx: number, field: keyof BrainDumpItem, value: boolean) => {
    setDumpItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const handleSubmitBrainDump = async () => {
    for (const item of dumpItems) {
      await createTask.mutateAsync({
        title: item.title,
        isUrgent: item.isUrgent,
        isImportant: item.isImportant,
        doDate: item.forToday ? today : null,
        doDateSomeday: !item.forToday,
      });
    }
    setShowBrainDump(false);
    setDumpItems([]);
  };

  const getQuadrantLabel = (isUrgent: boolean, isImportant: boolean) => {
    if (isUrgent && isImportant) return "Do Now";
    if (!isUrgent && isImportant) return "Do Later";
    if (isUrgent && !isImportant) return "Delegate";
    return "Delete";
  };

  const getQuadrantColor = (isUrgent: boolean, isImportant: boolean) => {
    if (isUrgent && isImportant) return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30";
    if (!isUrgent && isImportant) return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30";
    if (isUrgent && !isImportant) return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30";
    return "text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30";
  };

  // ─── Evening Sift ─────────────────────────────────────────────

  const handleEveningSift = () => {
    setSiftSelected(new Set());
    setShowEveningSift(true);
  };

  const handlePushToTomorrow = () => {
    const ids = Array.from(siftSelected);
    if (ids.length > 0) {
      bulkMove.mutate({ taskIds: ids, doDate: tomorrow, doDateSomeday: false });
    }
    setShowEveningSift(false);
  };

  const toggleSiftItem = (id: number) => {
    setSiftSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Today</h1>
          <p className="text-sm text-muted-foreground mt-1">{todayFormatted}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenBrainDump}
            className="gap-1.5"
          >
            <Sunrise className="h-4 w-4" />
            Brain Dump
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleEveningSift}
            className="gap-1.5"
            disabled={incompleteTasks.length === 0}
          >
            <Sunset className="h-4 w-4" />
            Evening Sift
          </Button>
        </div>
      </div>

      {/* Active tasks */}
      <div>
        {incompleteTasks.length > 0 && (
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 px-1">
            To Do ({incompleteTasks.length})
          </p>
        )}
        <TaskList
          tasks={incompleteTasks}
          users={usersQuery.data}
          defaultDoDate={today}
          emptyMessage="Your day is clear. Add tasks or start a brain dump."
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
            showCreateInline={false}
            hideDoDate
          />
        </div>
      )}

      {/* Morning Brain Dump Dialog */}
      <Dialog open={showBrainDump} onOpenChange={setShowBrainDump}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sunrise className="h-5 w-5 text-amber-500" />
              Morning Brain Dump
            </DialogTitle>
            <DialogDescription>
              Capture everything on your mind. Tag each item as urgent/important, then decide what's for today.
            </DialogDescription>
          </DialogHeader>

          {/* Quick add */}
          <div className="flex items-center gap-2">
            <Input
              value={dumpInput}
              onChange={e => setDumpInput(e.target.value)}
              placeholder="What's on your mind?"
              className="text-sm"
              autoFocus
              onKeyDown={e => { if (e.key === "Enter") addDumpItem(); }}
            />
            <Button size="sm" onClick={addDumpItem} disabled={!dumpInput.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Items list */}
          <div className="space-y-2 max-h-72 overflow-y-auto py-1">
            {dumpItems.map((item, idx) => (
              <div key={idx} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.title}</span>
                  <button onClick={() => removeDumpItem(idx)} className="text-muted-foreground hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Switch
                      checked={item.isUrgent}
                      onCheckedChange={v => updateDumpItem(idx, "isUrgent", v)}
                      className="scale-75"
                    />
                    <Label className="text-xs">Urgent</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Switch
                      checked={item.isImportant}
                      onCheckedChange={v => updateDumpItem(idx, "isImportant", v)}
                      className="scale-75"
                    />
                    <Label className="text-xs">Important</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Switch
                      checked={item.forToday}
                      onCheckedChange={v => updateDumpItem(idx, "forToday", v)}
                      className="scale-75"
                    />
                    <Label className="text-xs">Today</Label>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${getQuadrantColor(item.isUrgent, item.isImportant)}`}>
                    {getQuadrantLabel(item.isUrgent, item.isImportant)}
                  </Badge>
                </div>
              </div>
            ))}
            {dumpItems.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                Start typing to capture your thoughts. Press Enter to add each one.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBrainDump(false)}>Cancel</Button>
            <Button
              onClick={handleSubmitBrainDump}
              disabled={dumpItems.length === 0 || createTask.isPending}
              className="gap-1.5"
            >
              <ArrowRight className="h-4 w-4" />
              Create {dumpItems.length} Task{dumpItems.length !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Evening Sift Dialog */}
      <Dialog open={showEveningSift} onOpenChange={setShowEveningSift}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sunset className="h-5 w-5 text-amber-500" />
              Evening Sift
            </DialogTitle>
            <DialogDescription>
              Select incomplete tasks to push to tomorrow for re-prioritization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 max-h-80 overflow-y-auto py-2">
            {incompleteTasks.map(task => (
              <div
                key={task.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent/50 cursor-pointer"
                onClick={() => toggleSiftItem(task.id)}
              >
                <Checkbox
                  checked={siftSelected.has(task.id)}
                  onCheckedChange={() => toggleSiftItem(task.id)}
                />
                <span className="text-sm flex-1">{task.title}</span>
                <Badge variant="outline" className="text-[10px]">
                  {task.quadrant === "doNow" ? "Do Now" : task.quadrant === "doLater" ? "Do Later" : task.quadrant === "delegate" ? "Delegate" : "Delete"}
                </Badge>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEveningSift(false)}>Cancel</Button>
            <Button
              onClick={handlePushToTomorrow}
              disabled={siftSelected.size === 0}
              className="gap-1.5"
            >
              <ArrowRight className="h-4 w-4" />
              Push {siftSelected.size} to Tomorrow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
