import { trpc } from "@/lib/trpc";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, GripVertical, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "../../../drizzle/schema";

interface TaskItemProps {
  task: Task;
  onClick: () => void;
  users?: { id: number; name: string | null }[];
  dragHandleProps?: Record<string, unknown>;
}

function quadrantLabel(q: string) {
  switch (q) {
    case "doNow": return "Do Now";
    case "doLater": return "Do Later";
    case "delegate": return "Delegate";
    case "delete": return "Delete";
    default: return q;
  }
}

function quadrantColor(q: string) {
  switch (q) {
    case "doNow": return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800";
    case "doLater": return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800";
    case "delegate": return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800";
    case "delete": return "bg-gray-500/10 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700";
    default: return "";
  }
}

export default function TaskItem({ task, onClick, users, dragHandleProps }: TaskItemProps) {
  const utils = trpc.useUtils();
  const toggleDone = trpc.tasks.update.useMutation({
    onSuccess: () => { utils.tasks.list.invalidate(); },
  });

  const ownerName = users?.find(u => u.id === task.ownerId)?.name;
  const doDateStr = task.doDateSomeday
    ? "Someday"
    : task.doDate
      ? formatDate(task.doDate)
      : null;

  return (
    <div
      className={cn(
        "group flex items-start gap-2 px-3 py-2.5 rounded-lg transition-colors hover:bg-accent/50 cursor-pointer border border-transparent",
        task.isDone && "opacity-50"
      )}
      onClick={onClick}
    >
      {dragHandleProps && (
        <div
          {...dragHandleProps}
          className="mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-muted-foreground"
          onClick={e => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}

      <div
        className="mt-0.5 shrink-0"
        onClick={e => {
          e.stopPropagation();
          toggleDone.mutate({ id: task.id, isDone: !task.isDone });
        }}
      >
        <Checkbox checked={task.isDone} className="h-[18px] w-[18px] rounded-full" />
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm leading-snug text-foreground",
          task.isDone && "line-through text-muted-foreground"
        )}>
          {task.title}
        </p>

        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 font-medium", quadrantColor(task.quadrant))}>
            {quadrantLabel(task.quadrant)}
          </Badge>

          {doDateStr && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {doDateStr}
            </span>
          )}

          {task.dueDate && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              Due {formatDate(task.dueDate)}
            </span>
          )}

          {ownerName && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <User className="h-3 w-3" />
              {ownerName}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDate(d: string | Date | null): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d + "T00:00:00") : d;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const taskDate = new Date(date);
  taskDate.setHours(0, 0, 0, 0);

  if (taskDate.getTime() === today.getTime()) return "Today";
  if (taskDate.getTime() === tomorrow.getTime()) return "Tomorrow";

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
