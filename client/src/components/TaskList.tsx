import { useState, useCallback, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import TaskItem from "./TaskItem";
import TaskDetailPanel from "./TaskDetailPanel";
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
    i
