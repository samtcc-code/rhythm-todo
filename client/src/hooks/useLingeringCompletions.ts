import { useState } from "react";
import { COMPLETION_GRACE_MS } from "@/lib/completionGrace";

// Keeps a just-completed task's id "lingering" for COMPLETION_GRACE_MS so the
// sparkle burst has time to play before the row moves to the Done section
// (or, for views that filter isDone server-side, leaves the list entirely).
export function useLingeringCompletions() {
  const [lingeringIds, setLingeringIds] = useState<Set<number>>(new Set());

  const holdDuringGrace = (taskId: number) => {
    setLingeringIds(prev => new Set(prev).add(taskId));
    setTimeout(() => {
      setLingeringIds(prev => {
        if (!prev.has(taskId)) return prev;
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }, COMPLETION_GRACE_MS);
  };

  return { lingeringIds, holdDuringGrace };
}
