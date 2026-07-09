import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Reorder, useDragControls } from "framer-motion";
import { trpc } from "@/lib/trpc";
import TaskItem from "./TaskItem";
import TaskDetailPanel from "./TaskDetailPanel";
import BulkActionBar from "./BulkActionBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import type { Task } from "../../../drizzle/schema";
import { useUndoToast } from "@/hooks/useUndoToast";

interface TaskListProps {
  tasks: Task[];
  users?: { id: number; name: string | null }[];
  areas?: { id: number; name: string }[];
  projects?: { id: number; name: string }[];
  showCreateInline?: boolean;
  defaultDoDate?: string | null;
  defaultDoDateSomeday?: boolean;
  defaultAreaId?: number;
  defaultProjectId?: number;
  defaultTagIds?: number[];
  emptyMessage?: string;
  hideDoDate?: boolean;
  onWillToggleComplete?: (task: Task, nowDone: boolean) => void;
}

// One row inside the Reorder.Group. Owns its own drag controls so the grip
// handle in TaskItem is the only surface that starts a drag (not the whole row).
function SortableRow({
  task,
  isDetailOpen,
  panelRef,
  selectMode,
  isSelected,
  onDetailOpen,
  onDetailClose,
  onToggleComplete,
  onDelete,
  onToggleSelect,
  onDetailToggleComplete,
  users,
  areas,
  projects,
  hideDoDate,
}: {
  task: Task;
  isDetailOpen: boolean;
  panelRef: React.RefObject<HTMLDivElement | null>;
  selectMode: boolean;
  isSelected: boolean;
  onDetailOpen: () => void;
  onDetailClose: () => void;
  onToggleComplete: (task: Task) => void;
  onDelete: (task: Task) => void;
  onToggleSelect: () => void;
  onDetailToggleComplete: (done: boolean) => void;
  users?: { id: number; name: string | null }[];
  areas?: { id: number; name: string }[];
  projects?: { id: number; name: string }[];
  hideDoDate: boolean;
}) {
  const controls = useDragControls();

  const dragHandleProps = {
    onPointerDown: (e: React.PointerEvent) => {
      if (selectMode || isDetailOpen) return;
      controls.start(e);
    },
    // Prevent the grip from being a click target that opens the detail panel
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
  };

  return (
    <Reorder.Item
      value={task}
      dragListener={false}
      dragControls={controls}
      className="rounded-xl md:rounded-lg"
      whileDrag={{
        scale: 1.02,
        boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
        cursor: "grabbing",
      }}
      transition={{ type: "spring", stiffness: 500, damping: 40 }}
    >
      {isDetailOpen ? (
        <div ref={panelRef}>
          <TaskDetailPanel
            taskId={task.id}
            onClose={onDetailClose}
            onToggleComplete={onDetailToggleComplete}
          />
        </div>
      ) : (
        <TaskItem
          task={task}
          onClick={onDetailOpen}
          onToggleComplete={onToggleComplete}
          onDelete={onDelete}
          users={users}
          areas={areas}
          projects={projects}
          dragHandleProps={dragHandleProps}
          hideDoDate={hideDoDate}
          selectMode={selectMode}
          isSelected={isSelected}
          onToggleSelect={onToggleSelect}
        />
      )}
    </Reorder.Item>
  );
}

export default function TaskList({
  tasks,
  users,
  areas,
  projects,
  showCreateInline = true,
  defaultDoDate,
  defaultDoDateSomeday,
  defaultAreaId,
  defaultProjectId,
  defaultTagIds,
  emptyMessage = "No tasks yet",
  hideDoDate = false,
  onWillToggleComplete,
}: TaskListProps) {
  const utils = trpc.useUtils();
  const { showUndo } = useUndoToast();
  const [location] = useLocation();
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  // Local optimistic order — updates instantly on drag, syncs to server via
  // reorderTasks.mutate. Server invalidation will overwrite this with the
  // canonical order on refetch.
  const [items, setItems] = useState<Task[]>(tasks);
  useEffect(() => { setItems(tasks); }, [tasks]);

  const selectMode = selectedIds.size > 0;

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSelectedTaskId(null);
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [location]);

  useEffect(() => {
    setSelectedIds(prev => {
      if (prev.size === 0) return prev;
      const present = new Set(tasks.map(t => t.id));
      const kept = Array.from(prev).filter(id => present.has(id));
      return kept.length === prev.size ? prev : new Set(kept);
    });
  }, [tasks]);

  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => { utils.tasks.invalidate(); setNewTitle(""); setShowCreate(false); },
  });
  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: () => { utils.tasks.invalidate(); },
  });
  const deleteTask = trpc.tasks.delete.useMutation({
    onSuccess: () => { utils.tasks.invalidate(); },
  });
  const reorderTasks = trpc.tasks.reorder.useMutation({
    onSuccess: () => { utils.tasks.invalidate(); },
  });

  const handleToggleComplete = useCallback((task: Task) => {
    const nowDone = !task.isDone;
    onWillToggleComplete?.(task, nowDone);
    updateTask.mutate({ id: task.id, isDone: nowDone });
    if (nowDone) {
      showUndo({
        message: `"${task.title}" completed`,
        onUndo: () => updateTask.mutate({ id: task.id, isDone: false }),
      });
    }
  }, [updateTask, showUndo, onWillToggleComplete]);

  const handleDelete = useCallback((task: Task) => {
    const snapshot = { ...task };
    deleteTask.mutate({ id: task.id });
    showUndo({
      message: `"${task.title}" deleted`,
      onUndo: () => {
        createTask.mutate({
          title: snapshot.title,
          isUrgent: snapshot.isUrgent,
          isImportant: snapshot.isImportant,
          doDate: snapshot.doDate ?? null,
          doDateSomeday: snapshot.doDateSomeday ?? false,
          areaId: snapshot.areaId ?? null,
          projectId: snapshot.projectId ?? null,
        });
      },
    });
  }, [deleteTask, createTask, showUndo]);

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    createTask.mutate({
      title: newTitle.trim(),
      doDate: defaultDoDate ?? null,
      doDateSomeday: defaultDoDateSomeday ?? false,
      areaId: defaultAreaId ?? null,
      projectId: defaultProjectId ?? null,
      tagIds: defaultTagIds,
    });
  };

  const handleReorder = (newItems: Task[]) => {
    setItems(newItems);
    reorderTasks.mutate({ orderedIds: newItems.map(t => t.id) });
  };

  const handleDetailToggleComplete = useCallback((taskId: number, title: string, done: boolean) => {
    updateTask.mutate({ id: taskId, isDone: done });
    if (done) {
      showUndo({
        message: `"${title}" completed`,
        onUndo: () => updateTask.mutate({ id: taskId, isDone: false }),
      });
    }
  }, [updateTask, showUndo]);

  useEffect(() => {
    if (selectedTaskId === null) return;
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Element;
      if (panelRef.current?.contains(target)) return;
      if (target.closest("[data-radix-popper-content-wrapper]")) return;
      setSelectedTaskId(null);
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [selectedTaskId]);

  return (
    <div>
      {selectMode && (
        <BulkActionBar
          taskIds={Array.from(selectedIds)}
          users={users}
          areas={areas}
          projects={projects}
          onClear={clearSelection}
        />
      )}

      {tasks.length === 0 && !showCreate && (
        <div className="text-center py-16 md:py-12 text-muted-foreground">
          <p className="text-base md:text-sm">{emptyMessage}</p>
        </div>
      )}

      <Reorder.Group
        axis="y"
        values={items}
        onReorder={handleReorder}
        className="space-y-1 list-none p-0 m-0"
      >
        {items.map(task => (
          <SortableRow
            key={task.id}
            task={task}
            isDetailOpen={selectedTaskId === task.id && !selectMode}
            panelRef={panelRef}
            selectMode={selectMode}
            isSelected={selectedIds.has(task.id)}
            onDetailOpen={() => setSelectedTaskId(task.id)}
            onDetailClose={() => setSelectedTaskId(null)}
            onToggleComplete={handleToggleComplete}
            onDelete={handleDelete}
            onToggleSelect={() => toggleSelect(task.id)}
            onDetailToggleComplete={done => handleDetailToggleComplete(task.id, task.title, done)}
            users={users}
            areas={areas}
            projects={projects}
            hideDoDate={hideDoDate}
          />
        ))}
      </Reorder.Group>

      {showCreateInline && (
        <div className="mt-3 md:mt-2">
          {showCreate ? (
            <div className="flex items-center gap-3 md:gap-2 px-4 md:px-3 py-4 md:py-2">
              <Input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="New task..."
                className="text-lg md:text-sm h-14 md:h-9 rounded-xl md:rounded-md"
                autoFocus
                onKeyDown={e => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") { setShowCreate(false); setNewTitle(""); }
                }}
              />
              <Button className="h-14 md:h-9 px-6 md:px-3 text-lg md:text-sm rounded-xl md:rounded-md" onClick={handleCreate} disabled={!newTitle.trim()}>
                Add
              </Button>
              <Button variant="ghost" className="h-14 md:h-9 px-5 md:px-3 text-lg md:text-sm rounded-xl md:rounded-md" onClick={() => { setShowCreate(false); setNewTitle(""); }}>
                Cancel
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-3 md:gap-2 px-4 md:px-3 py-5 md:py-2 text-lg md:text-sm text-muted-foreground hover:text-foreground transition-colors w-full rounded-xl md:rounded-lg hover:bg-accent/50 active:bg-accent/70"
            >
              <Plus className="h-6 w-6 md:h-4 md:w-4" />
              <span>New Task</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
