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
import { Sunrise, Sunset, ArrowRight, Plus, X, Check, ChevronRight, Moon, Sun, Filter } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from "@/hooks/useMobile";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";

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

// ─── Shared helpers ─────────────────────────────────────────────

function getQuadrantLabel(isUrgent: boolean, isImportant: boolean) {
  if (isUrgent && isImportant) return "Do Now";
  if (!isUrgent && isImportant) return "Do Later";
  if (isUrgent && !isImportant) return "Delegate";
  return "Delete";
}

function getQuadrantColor(isUrgent: boolean, isImportant: boolean) {
  if (isUrgent && isImportant) return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30";
  if (!isUrgent && isImportant) return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30";
  if (isUrgent && !isImportant) return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30";
  return "text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30";
}

// ─── Mobile Experience ──────────────────────────────────────────
// Full-screen, no sidebar, no DashboardLayout. Just Brain Dump + Sift.
// Everything is oversized for fat-finger use.

type MobileScreen = "home" | "braindump" | "sift";

function MobileTodayView() {
  const today = useMemo(() => getTodayStr(), []);
  const tomorrow = useMemo(() => getTomorrowStr(), []);
  const { user, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const todayTasks = trpc.tasks.list.useQuery({ doDate: today }, { enabled: !!user });
  const utils = trpc.useUtils();

  const bulkMove = trpc.tasks.bulkMove.useMutation({
    onSuccess: () => { utils.tasks.invalidate(); },
  });
  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => { utils.tasks.invalidate(); },
  });
  const toggleTask = trpc.tasks.update.useMutation({
    onSuccess: () => { utils.tasks.invalidate(); },
  });

  const [screen, setScreen] = useState<MobileScreen>("home");
  const [dumpItems, setDumpItems] = useState<BrainDumpItem[]>([]);
  const [dumpInput, setDumpInput] = useState("");
  const [siftSelected, setSiftSelected] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const incompleteTasks = todayTasks.data?.filter(t => !t.isDone) ?? [];
  const completedTasks = todayTasks.data?.filter(t => t.isDone) ?? [];

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // If not logged in, show login prompt
  if (!loading && !user) {
    const loginUrl = `${import.meta.env.VITE_OAUTH_PORTAL_URL || ""}?appId=${import.meta.env.VITE_APP_ID || ""}&state=${encodeURIComponent(JSON.stringify({ origin: window.location.origin, returnPath: "/" }))}`;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-8">
        <h1 className="text-4xl font-bold mb-4">Rhythm</h1>
        <p className="text-xl text-muted-foreground mb-8 text-center">Your morning and evening task rhythm.</p>
        <a
          href={loginUrl}
          className="h-16 px-10 rounded-2xl bg-primary text-primary-foreground text-xl font-semibold flex items-center justify-center"
        >
          Sign In
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-xl text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // ── Brain Dump handlers ──
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
    setIsSubmitting(true);
    for (const item of dumpItems) {
      await createTask.mutateAsync({
        title: item.title,
        isUrgent: item.isUrgent,
        isImportant: item.isImportant,
        doDate: item.forToday ? today : null,
        doDateSomeday: !item.forToday,
      });
    }
    setIsSubmitting(false);
    setDumpItems([]);
    setScreen("home");
  };

  // ── Evening Sift handlers ──
  const toggleSiftItem = (id: number) => {
    setSiftSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePushToTomorrow = () => {
    const ids = Array.from(siftSelected);
    if (ids.length > 0) {
      bulkMove.mutate({ taskIds: ids, doDate: tomorrow, doDateSomeday: false });
    }
    setSiftSelected(new Set());
    setScreen("home");
  };

  // ── Brain Dump Screen ──
  if (screen === "braindump") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header — big, clear */}
        <div className="flex items-center justify-between px-6 py-5 border-b safe-area-top">
          <button
            onClick={() => setScreen("home")}
            className="text-xl text-muted-foreground active:text-foreground py-3 px-2 -ml-2"
          >
            ← Back
          </button>
          <div className="flex items-center gap-3">
            <Sunrise className="h-7 w-7 text-amber-500" />
            <span className="text-2xl font-bold">Brain Dump</span>
          </div>
          <div className="w-20" />
        </div>

        {/* Input — massive, easy to hit */}
        <div className="px-6 py-6 border-b bg-background">
          <div className="flex items-center gap-4">
            <input
              value={dumpInput}
              onChange={e => setDumpInput(e.target.value)}
              placeholder="What's on your mind?"
              className="flex-1 text-2xl h-20 rounded-2xl px-6 border-2 border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              autoFocus
              onKeyDown={e => { if (e.key === "Enter") addDumpItem(); }}
            />
            <button
              onClick={addDumpItem}
              disabled={!dumpInput.trim()}
              className="h-20 w-20 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 active:scale-95 transition-transform disabled:opacity-30"
            >
              <Plus className="h-10 w-10" />
            </button>
          </div>
        </div>

        {/* Items list — big cards */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {dumpItems.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              <Sunrise className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-2xl font-medium">Type a thought and tap +</p>
              <p className="text-lg mt-3 opacity-70">Capture everything first, organize after.</p>
            </div>
          )}
          {dumpItems.map((item, idx) => (
            <div key={idx} className="rounded-2xl border-2 p-6 space-y-5 bg-card">
              <div className="flex items-start justify-between gap-4">
                <span className="text-xl font-semibold leading-snug flex-1">{item.title}</span>
                <button
                  onClick={() => removeDumpItem(idx)}
                  className="text-muted-foreground active:text-destructive p-3 -m-3 shrink-0"
                >
                  <X className="h-7 w-7" />
                </button>
              </div>
              {/* Toggle row — big fat pill buttons */}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => updateDumpItem(idx, "isUrgent", !item.isUrgent)}
                  className={`h-14 px-6 rounded-2xl text-lg font-semibold transition-all border-2 active:scale-95 ${
                    item.isUrgent
                      ? "bg-red-100 dark:bg-red-950/50 border-red-400 dark:border-red-600 text-red-700 dark:text-red-300"
                      : "bg-background border-border text-muted-foreground"
                  }`}
                >
                  🔴 Urgent
                </button>
                <button
                  onClick={() => updateDumpItem(idx, "isImportant", !item.isImportant)}
                  className={`h-14 px-6 rounded-2xl text-lg font-semibold transition-all border-2 active:scale-95 ${
                    item.isImportant
                      ? "bg-blue-100 dark:bg-blue-950/50 border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-300"
                      : "bg-background border-border text-muted-foreground"
                  }`}
                >
                  🔵 Important
                </button>
                <button
                  onClick={() => updateDumpItem(idx, "forToday", !item.forToday)}
                  className={`h-14 px-6 rounded-2xl text-lg font-semibold transition-all border-2 active:scale-95 ${
                    item.forToday
                      ? "bg-green-100 dark:bg-green-950/50 border-green-400 dark:border-green-600 text-green-700 dark:text-green-300"
                      : "bg-background border-border text-muted-foreground"
                  }`}
                >
                  {item.forToday ? "📅 Today" : "💭 Someday"}
                </button>
              </div>
              <div>
                <span className={`inline-block text-base font-semibold px-4 py-2 rounded-xl ${getQuadrantColor(item.isUrgent, item.isImportant)}`}>
                  → {getQuadrantLabel(item.isUrgent, item.isImportant)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Submit bar — sticky at bottom, massive */}
        {dumpItems.length > 0 && (
          <div className="sticky bottom-0 px-6 py-5 border-t bg-background/95 backdrop-blur safe-area-bottom">
            <button
              onClick={handleSubmitBrainDump}
              disabled={isSubmitting}
              className="w-full h-20 rounded-2xl bg-primary text-primary-foreground text-2xl font-bold flex items-center justify-center gap-4 active:scale-[0.97] transition-transform disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Creating...</span>
              ) : (
                <>
                  <Check className="h-8 w-8" />
                  Create {dumpItems.length} Task{dumpItems.length !== 1 ? "s" : ""}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Evening Sift Screen ──
  if (screen === "sift") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b safe-area-top">
          <button
            onClick={() => setScreen("home")}
            className="text-xl text-muted-foreground active:text-foreground py-3 px-2 -ml-2"
          >
            ← Back
          </button>
          <div className="flex items-center gap-3">
            <Sunset className="h-7 w-7 text-orange-500" />
            <span className="text-2xl font-bold">Evening Sift</span>
          </div>
          <div className="w-20" />
        </div>

        {/* Instructions */}
        <div className="px-6 py-5 border-b bg-muted/30">
          <p className="text-lg text-muted-foreground">
            Tap tasks you didn't finish to push them to tomorrow.
          </p>
        </div>

        {/* Task cards — big, tappable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          {incompleteTasks.map(task => {
            const selected = siftSelected.has(task.id);
            return (
              <button
                key={task.id}
                onClick={() => toggleSiftItem(task.id)}
                className={`w-full text-left rounded-2xl border-2 p-6 flex items-center gap-5 transition-all active:scale-[0.97] ${
                  selected
                    ? "border-orange-400 dark:border-orange-600 bg-orange-50 dark:bg-orange-950/30"
                    : "border-border bg-card"
                }`}
              >
                <div className={`h-10 w-10 rounded-full border-3 flex items-center justify-center shrink-0 transition-colors ${
                  selected
                    ? "border-orange-500 bg-orange-500 text-white"
                    : "border-muted-foreground/30"
                }`}>
                  {selected && <Check className="h-6 w-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xl font-medium block leading-snug">{task.title}</span>
                  <span className="text-base text-muted-foreground mt-1 block">
                    {getQuadrantLabel(task.isUrgent, task.isImportant)}
                  </span>
                </div>
                {selected && (
                  <ArrowRight className="h-7 w-7 text-orange-500 shrink-0" />
                )}
              </button>
            );
          })}
          {incompleteTasks.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              <Check className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-2xl font-medium">All tasks are done!</p>
              <p className="text-lg mt-3 opacity-70">Nothing to push to tomorrow.</p>
            </div>
          )}
        </div>

        {/* Submit bar */}
        <div className="sticky bottom-0 px-6 py-5 border-t bg-background/95 backdrop-blur safe-area-bottom">
          <button
            onClick={handlePushToTomorrow}
            disabled={siftSelected.size === 0}
            className="w-full h-20 rounded-2xl bg-orange-500 text-white text-2xl font-bold flex items-center justify-center gap-4 active:scale-[0.97] transition-transform disabled:opacity-30"
          >
            <Sunset className="h-8 w-8" />
            Push {siftSelected.size} to Tomorrow
          </button>
        </div>
      </div>
    );
  }

  // ── Mobile Home Screen ──
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar — minimal with dark mode toggle */}
      <div className="flex items-center justify-between px-6 py-5 safe-area-top">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Rhythm</h1>
        <button
          onClick={toggleTheme}
          className="h-12 w-12 rounded-xl flex items-center justify-center text-muted-foreground active:bg-accent transition-colors"
        >
          {theme === "dark" ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
        </button>
      </div>

      {/* Date */}
      <div className="px-6 pb-4">
        <p className="text-xl text-muted-foreground">{todayFormatted}</p>
      </div>

      {/* Action buttons — massive, full-width, impossible to miss */}
      <div className="px-6 pb-6 space-y-4">
        <button
          onClick={() => { setDumpItems([]); setDumpInput(""); setScreen("braindump"); }}
          className="w-full h-24 rounded-3xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-800 flex items-center justify-center gap-4 active:scale-[0.97] transition-transform"
        >
          <Sunrise className="h-10 w-10 text-amber-500" />
          <span className="text-2xl font-bold text-amber-700 dark:text-amber-300">Morning Brain Dump</span>
        </button>
        <button
          onClick={() => { setSiftSelected(new Set()); setScreen("sift"); }}
          disabled={incompleteTasks.length === 0}
          className="w-full h-24 rounded-3xl bg-orange-50 dark:bg-orange-950/30 border-2 border-orange-200 dark:border-orange-800 flex items-center justify-center gap-4 active:scale-[0.97] transition-transform disabled:opacity-30"
        >
          <Sunset className="h-10 w-10 text-orange-500" />
          <span className="text-2xl font-bold text-orange-700 dark:text-orange-300">Evening Sift</span>
        </button>
      </div>

      {/* Divider */}
      <div className="px-6">
        <div className="border-t" />
      </div>

      {/* Simple task list — tap to check off, no detail panel, no drag */}
      <div className="flex-1 px-6 py-5 safe-area-bottom">
        {incompleteTasks.length === 0 && completedTasks.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-2xl font-medium">Your day is clear.</p>
            <p className="text-lg mt-3 opacity-70">Start a Brain Dump to capture tasks.</p>
          </div>
        )}

        {incompleteTasks.length > 0 && (
          <div className="mb-6">
            <p className="text-base uppercase tracking-wider text-muted-foreground mb-4 font-semibold">
              To Do ({incompleteTasks.length})
            </p>
            <div className="space-y-3">
              {incompleteTasks.map(task => (
                <button
                  key={task.id}
                  onClick={() => toggleTask.mutate({ id: task.id, isDone: true })}
                  className="w-full text-left rounded-2xl border-2 bg-card p-6 flex items-center gap-5 active:scale-[0.97] transition-transform"
                >
                  <div className="h-10 w-10 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xl font-medium block leading-snug">{task.title}</span>
                  </div>
                  <span className={`text-sm font-semibold px-3 py-1.5 rounded-lg shrink-0 ${getQuadrantColor(task.isUrgent, task.isImportant)}`}>
                    {getQuadrantLabel(task.isUrgent, task.isImportant)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {completedTasks.length > 0 && (
          <div>
            <p className="text-base uppercase tracking-wider text-muted-foreground mb-4 font-semibold">
              Done ({completedTasks.length})
            </p>
            <div className="space-y-3">
              {completedTasks.map(task => (
                <button
                  key={task.id}
                  onClick={() => toggleTask.mutate({ id: task.id, isDone: false })}
                  className="w-full text-left rounded-2xl border bg-card/50 p-6 flex items-center gap-5 active:scale-[0.97] transition-transform opacity-50"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center shrink-0">
                    <Check className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-xl line-through text-muted-foreground flex-1 leading-snug">{task.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Desktop Experience ─────────────────────────────────────────

function DesktopTodayView() {
  const today = useMemo(() => getTodayStr(), []);
  const tomorrow = useMemo(() => getTomorrowStr(), []);

  const todayTasks = trpc.tasks.list.useQuery({ doDate: today });
  const usersQuery = trpc.users.list.useQuery();
  const areasQuery = trpc.areas.list.useQuery();
  const projectsQuery = trpc.projects.list.useQuery();
  const utils = trpc.useUtils();

  const [filterAreaId, setFilterAreaId] = useState<number | null>(null);
  const [filterProjectId, setFilterProjectId] = useState<number | null>(null);

  const bulkMove = trpc.tasks.bulkMove.useMutation({
    onSuccess: () => { utils.tasks.list.invalidate(); },
  });
  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => { utils.tasks.list.invalidate(); },
  });

  const [showBrainDump, setShowBrainDump] = useState(false);
  const [dumpItems, setDumpItems] = useState<BrainDumpItem[]>([]);
  const [dumpInput, setDumpInput] = useState("");

  const [showEveningSift, setShowEveningSift] = useState(false);
  const [siftSelected, setSiftSelected] = useState<Set<number>>(new Set());

  const allIncomplete = todayTasks.data?.filter(t => !t.isDone) ?? [];
  const allCompleted = todayTasks.data?.filter(t => t.isDone) ?? [];

  // Apply area/project filters
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

  const areasData = useMemo(() => areasQuery.data?.map(a => ({ id: a.id, name: a.name })) ?? [], [areasQuery.data]);
  const projectsData = useMemo(() => projectsQuery.data?.map(p => ({ id: p.id, name: p.name })) ?? [], [projectsQuery.data]);

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
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Today</h1>
          <p className="text-sm text-muted-foreground mt-1">{todayFormatted}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleOpenBrainDump} className="gap-1.5 h-9 px-3 text-sm">
            <Sunrise className="h-4 w-4" />
            Brain Dump
          </Button>
          <Button variant="outline" onClick={handleEveningSift} className="gap-1.5 h-9 px-3 text-sm" disabled={allIncomplete.length === 0}>
            <Sunset className="h-4 w-4" />
            Evening Sift
          </Button>
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
          areas={areasData}
          projects={projectsData}
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
            areas={areasData}
            projects={projectsData}
            showCreateInline={false}
            hideDoDate
          />
        </div>
      )}

      {/* Morning Brain Dump Dialog */}
      <Dialog open={showBrainDump} onOpenChange={setShowBrainDump}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sunrise className="h-5 w-5 text-amber-500" />
              Morning Brain Dump
            </DialogTitle>
            <DialogDescription className="text-sm">
              Capture everything on your mind. Tag each item, then decide what's for today.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <Input
              value={dumpInput}
              onChange={e => setDumpInput(e.target.value)}
              placeholder="What's on your mind?"
              className="text-sm h-9"
              autoFocus
              onKeyDown={e => { if (e.key === "Enter") addDumpItem(); }}
            />
            <Button onClick={addDumpItem} disabled={!dumpInput.trim()} className="h-9 w-9 shrink-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

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
                    <Switch checked={item.isUrgent} onCheckedChange={v => updateDumpItem(idx, "isUrgent", v)} />
                    <Label className="text-xs">Urgent</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Switch checked={item.isImportant} onCheckedChange={v => updateDumpItem(idx, "isImportant", v)} />
                    <Label className="text-xs">Important</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Switch checked={item.forToday} onCheckedChange={v => updateDumpItem(idx, "forToday", v)} />
                    <Label className="text-xs">Today</Label>
                  </div>
                  <Badge variant="outline" className={`text-[10px] px-1.5 ${getQuadrantColor(item.isUrgent, item.isImportant)}`}>
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

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowBrainDump(false)} className="h-9 text-sm">Cancel</Button>
            <Button onClick={handleSubmitBrainDump} disabled={dumpItems.length === 0 || createTask.isPending} className="gap-1.5 h-9 text-sm">
              <ArrowRight className="h-4 w-4" />
              Create {dumpItems.length} Task{dumpItems.length !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Evening Sift Dialog */}
      <Dialog open={showEveningSift} onOpenChange={setShowEveningSift}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sunset className="h-5 w-5 text-amber-500" />
              Evening Sift
            </DialogTitle>
            <DialogDescription className="text-sm">
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
                <Checkbox checked={siftSelected.has(task.id)} onCheckedChange={() => toggleSiftItem(task.id)} className="h-4 w-4" />
                <span className="text-sm flex-1">{task.title}</span>
                <Badge variant="outline" className="text-[10px] px-1.5">
                  {getQuadrantLabel(task.isUrgent, task.isImportant)}
                </Badge>
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowEveningSift(false)} className="h-9 text-sm">Cancel</Button>
            <Button onClick={handlePushToTomorrow} disabled={siftSelected.size === 0} className="gap-1.5 h-9 text-sm">
              <ArrowRight className="h-4 w-4" />
              Push {siftSelected.size} to Tomorrow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Export ─────────────────────────────────────────────────

export default function TodayView() {
  const isMobile = useIsMobile();
  return isMobile ? <MobileTodayView /> : <DesktopTodayView />;
}
