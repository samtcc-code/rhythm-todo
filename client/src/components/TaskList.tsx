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
}

export default function TaskList({
  tasks,
  users,
  showCreateInline = true,
  defaultDoDate,
  defaultDoDateSomeday,
  emptyMessage = "No tasks yet",
}: TaskListProps) {
  const utils = trpc.useUtils();
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

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

  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDrop = (idx: number) => {
    if (draggedIdx === null || draggedIdx === idx) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }
    const newOrder = [...tasks];
    const [moved] = newOrder.splice(draggedIdx, 1);
    newOrder.splice(idx, 0, moved);
    reorderTasks.mutate({ orderedIds: newOrder.map(t => t.id) });
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  return (
    <div>
      {tasks.length === 0 && !showCreate && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">{emptyMessage}</p>
        </div>
      )}

      <div className="space-y-0.5">
        {tasks.map((task, idx) => (
          <div
            key={task.id}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={e => handleDragOver(e, idx)}
            onDrop={() => handleDrop(idx)}
            onDragEnd={() => { setDraggedIdx(null); setDragOverIdx(null); }}
            className={`transition-all ${
              dragOverIdx === idx && draggedIdx !== idx
                ? "border-t-2 border-primary"
                : ""
            } ${draggedIdx === idx ? "opacity-40" : ""}`}
          >
            <TaskItem
              task={task}
              onClick={() => setSelectedTaskId(task.id)}
              users={users}
              dragHandleProps={{}}
            />
          </div>
        ))}
      </div>

      {showCreateInline && (
        <div className="mt-2">
          {showCreate ? (
            <div className="flex items-center gap-2 px-3 py-2">
              <Input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="New task..."
                className="text-sm h-9"
                autoFocus
                onKeyDown={e => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") { setShowCreate(false); setNewTitle(""); }
                }}
              />
              <Button size="sm" onClick={handleCreate} disabled={!newTitle.trim()}>
                Add
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowCreate(false); setNewTitle(""); }}>
                Cancel
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full rounded-lg hover:bg-accent/50"
            >
              <Plus className="h-4 w-4" />
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
