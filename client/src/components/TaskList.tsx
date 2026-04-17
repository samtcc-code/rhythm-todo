import { useState, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import TaskItem from "./TaskItem";
import TaskDetailPanel from "./TaskDetailPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import type { Task } from "../../../drizzle/schema";
import { useUndoToast } from "@/hooks/useUndoToast";
import { useState, useCallback, useRef, useEffect } from "react";

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
}: TaskListProps) {
  const utils = trpc.useUtils();
  const { showUndo } = useUndoToast();
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const handleDragRef = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);


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
    updateTask.mutate({ id: task.id, isDone: nowDone });
    if (nowDone) {
      showUndo({
        message: `"${task.title}" completed`,
        onUndo: () => updateTask.mutate({ id: task.id, isDone: false }),
      });
    }
  }, [updateTask, showUndo]);

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

  const handleDragStart = useCallback((e: React.DragEvent, idx: number) => {
    if (!handleDragRef.current) { e.preventDefault(); return; }
    setDraggedIdx(idx);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    setDragOverIdx(idx);
  }, []);

  const handleDrop = useCallback((idx: number) => {
    if (draggedIdx === null || draggedIdx === idx) {
      setDraggedIdx(null); setDragOverIdx(null); handleDragRef.current = false; return;
    }
    const newOrder = [...tasks];
    const [moved] = newOrder.splice(draggedIdx, 1);
    newOrder.splice(idx, 0, moved);
    reorderTasks.mutate({ orderedIds: newOrder.map(t => t.id) });
    setDraggedIdx(null); setDragOverIdx(null); handleDragRef.current = false;
  }, [draggedIdx, tasks, reorderTasks]);

  const handleDragEnd = useCallback(() => {
    setDraggedIdx(null); setDragOverIdx(null); handleDragRef.current = false;
  }, []);

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

  const makeDragHandleProps = useCallback(() => ({
    onMouseDown: () => { handleDragRef.current = true; },
    onMouseUp: () => { handleDragRef.current = false; },
    onTouchStart: () => { handleDragRef.current = true; },
    onTouchEnd: () => { handleDragRef.current = false; },
  }), []);

  return (
    <div>
      {tasks.length === 0 && !showCreate && (
        <div className="text-center py-16 md:py-12 text-muted-foreground">
          <p className="text-base md:text-sm">{emptyMessage}</p>
        </div>
      )}

      <div className="space-y-1 md:space-y-0.5">
        {tasks.map((task, idx) => (
          <div key={task.id}>
            {selectedTaskId === task.id ? (
              <TaskDetailPanel
                taskId={task.id}
                onClose={() => setSelectedTaskId(null)}
                onToggleComplete={(done) => {
                  updateTask.mutate({ id: task.id, isDone: done });
                  if (done) {
                    showUndo({
                      message: `"${task.title}" completed`,
                      onUndo: () => updateTask.mutate({ id: task.id, isDone: false }),
                    });
                  }
                }}
              />
            </div> 
            ) : (
              <div
                draggable
                onDragStart={e => handleDragStart(e, idx)}
                onDragOver={e => handleDragOver(e, idx)}
                onDrop={() => handleDrop(idx)}
                onDragEnd={handleDragEnd}
                className={`transition-all rounded-xl md:rounded-lg ${
                  dragOverIdx === idx && draggedIdx !== null && draggedIdx !== idx
                    ? "ring-2 ring-primary/50 ring-offset-2 md:ring-offset-1"
                    : ""
                } ${draggedIdx === idx ? "opacity-30 scale-[0.98]" : ""}`}
              >
                <TaskItem
                  task={task}
                  onClick={() => setSelectedTaskId(task.id)}
                  onToggleComplete={handleToggleComplete}
                  onDelete={handleDelete}
                  users={users}
                  areas={areas}
                  projects={projects}
                  dragHandleProps={makeDragHandleProps()}
                  hideDoDate={hideDoDate}
                />
              </div>
            )}
          </div>
        ))}
      </div>

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
