import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import TaskItem from "./TaskItem";
import TaskDetailPanel from "./TaskDetailPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import type { Task } from "../../../drizzle/schema";

interface TaskListProps {
  tasks: Task[];
  users?: { id: number; name: string | null }[];
  showCreateInline?: boolean;
  defaultDoDate?: string | null;
  defaultDoDateSomeday?: boolean;
  emptyMessage?: string;
  hideDoDate?: boolean;
}

export default function TaskList({
  tasks,
  users,
  showCreateInline = true,
  defaultDoDate,
  defaultDoDateSomeday,
  emptyMessage = "No tasks yet",
  hideDoDate = false,
}: TaskListProps) {
  const utils = trpc.useUtils();
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const handleDragRef = useRef(false);

  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      setNewTitle("");
      setShowCreate(false);
    },
  });

  const reorderTasks = trpc.tasks.reorder.useMutation({
    onSuccess: () => { utils.tasks.list.invalidate(); },
  });

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    createTask.mutate({
      title: newTitle.trim(),
      doDate: defaultDoDate ?? null,
      doDateSomeday: defaultDoDateSomeday ?? false,
    });
  };

  const handleDragStart = useCallback((e: React.DragEvent, idx: number) => {
    if (!handleDragRef.current) {
      e.preventDefault();
      return;
    }
    setDraggedIdx(idx);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
    setDragOverIdx(idx);
  }, []);

  const handleDrop = useCallback((idx: number) => {
    if (draggedIdx === null || draggedIdx === idx) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      handleDragRef.current = false;
      return;
    }
    const newOrder = [...tasks];
    const [moved] = newOrder.splice(draggedIdx, 1);
    newOrder.splice(idx, 0, moved);
    reorderTasks.mutate({ orderedIds: newOrder.map(t => t.id) });
    setDraggedIdx(null);
    setDragOverIdx(null);
    handleDragRef.current = false;
  }, [draggedIdx, tasks, reorderTasks]);

  const handleDragEnd = useCallback(() => {
    setDraggedIdx(null);
    setDragOverIdx(null);
    handleDragRef.current = false;
  }, []);

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

      {/* Mobile: add spacing between items for easier targeting */}
      <div className="space-y-1 md:space-y-0.5">
        {tasks.map((task, idx) => (
          <div
            key={task.id}
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
              users={users}
              dragHandleProps={makeDragHandleProps()}
              hideDoDate={hideDoDate}
            />
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

      <TaskDetailPanel
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
      />
    </div>
  );
}
