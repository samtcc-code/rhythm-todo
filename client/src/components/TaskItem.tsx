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
  /** Hide the do-date display (e.g. when already in the Today view) */
  hideDoDate?: boolean;
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

/**
 * Safely format a date value that may come from the DB as a Date object
 * or as a string. Uses UTC methods to avoid timezone-offset date shifts.
 */
function formatDate(d: string | Date | null): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;

  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const day = date.getUTCDate();

  const now = new Date();
  const todayY = now.getFullYear();
  const todayM = now.getMonth();
  const todayD = now.getDate();

  if (y === todayY && m === todayM && day === todayD) return "Today";

  const tom = new Date(now);
  tom.setDate(tom.getDate() + 1);
  if (y === tom.getFullYear() && m === tom.getMonth() && day === tom.getDate()) return "Tomorrow";

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[m]} ${day}`;
}

function formatDueDate(d: string | Date | null): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const day = date.getUTCDate();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[m]} ${day}`;
}

export default function TaskItem({ task, onClick, users, dragHandleProps, hideDoDate = false }: TaskItemProps) {
  const utils = trpc.useUtils();
  const toggleDone = trpc.tasks.update.useMutation({
    onSuccess: () => { utils.tasks.list.invalidate(); },
  });

  const ownerName = users?.find(u => u.id === task.ownerId)?.name;

  const doDateStr = hideDoDate
    ? null
    : task.doDateSomeday
      ? "Someday"
      : task.doDate
        ? formatDate(task.doDate)
        : null;

  return (
    <div
      className={cn(
        "group flex items-start gap-2 md:gap-2 px-3 py-3 md:py-2.5 rounded-lg transition-colors hover:bg-accent/50 cursor-pointer border border-transparent",
        task.isDone && "opacity-50"
      )}
      onClick={onClick}
    >
      {/* Drag handle — larger touch area on mobile */}
      {dragHandleProps && (
        <div
          {...dragHandleProps}
          className="mt-1 md:mt-0.5 opacity-30 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-muted-foreground touch-none select-none p-1 -m-1 md:p-0 md:m-0"
          onClick={e => e.stopPropagation()}
        >
          <GripVertical className="h-5 w-5 md:h-4 md:w-4" />
        </div>
      )}

      {/* Checkbox — larger touch area on mobile */}
      <div
        className="mt-1 md:mt-0.5 shrink-0 p-1 -m-1 md:p-0 md:m-0"
        onClick={e => {
          e.stopPropagation();
          toggleDone.mutate({ id: task.id, isDone: !task.isDone });
        }}
      >
        <Checkbox checked={task.isDone} className="h-6 w-6 md:h-[18px] md:w-[18px] rounded-full" />
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-base md:text-sm leading-snug text-foreground",
          task.isDone && "line-through text-muted-foreground"
        )}>
          {task.title}
        </p>

        <div className="flex items-center gap-2 mt-1.5 md:mt-1 flex-wrap">
          <Badge variant="outline" className={cn("text-xs md:text-[10px] px-2 md:px-1.5 py-0.5 md:py-0 h-6 md:h-5 font-medium", quadrantColor(task.quadrant))}>
            {quadrantLabel(task.quadrant)}
          </Badge>

          {doDateStr && (
            <span className="flex items-center gap-1 text-xs md:text-[11px] text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 md:h-3 md:w-3" />
              {doDateStr}
            </span>
          )}

          {task.dueDate && (
            <span className="flex items-center gap-1 text-xs md:text-[11px] text-muted-foreground">
              <Clock className="h-3.5 w-3.5 md:h-3 md:w-3" />
              Due {formatDueDate(task.dueDate)}
            </span>
          )}

          {ownerName && (
            <span className="flex items-center gap-1 text-xs md:text-[11px] text-muted-foreground">
              <User className="h-3.5 w-3.5 md:h-3 md:w-3" />
              {ownerName}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
