import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check } from "lucide-react";

const POMODORO_URL = "https://giorgiark.github.io/pomodorotimer/";

export default function FocusMode() {
  const [, params] = useRoute<{ id: string }>("/focus/:id");
  const taskId = params?.id ? parseInt(params.id, 10) : NaN;
  const [, setLocation] = useLocation();

  const taskQuery = trpc.tasks.get.useQuery({ id: taskId }, { enabled: Number.isFinite(taskId) });
  const tagsQuery = trpc.tags.list.useQuery();
  const utils = trpc.useUtils();
  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: () => { utils.tasks.invalidate(); },
  });

  const task = taskQuery.data;
  const tags = tagsQuery.data?.filter(t => task?.tagIds?.includes(t.id)) ?? [];

  const exit = () => setLocation("/today");

  const handleComplete = () => {
    updateTask.mutate({ id: taskId, isDone: true });
    exit();
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-background">
      <div className="w-full flex items-center justify-between px-4 py-4 md:px-6 safe-area-top">
        <Button variant="ghost" onClick={exit} className="gap-1.5 text-sm">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        {task && !task.isDone && (
          <Button variant="outline" onClick={handleComplete} className="gap-1.5 text-sm">
            <Check className="h-4 w-4" />
            Mark Complete
          </Button>
        )}
      </div>

      <div className="w-full max-w-md px-4 flex flex-col items-center flex-1 pb-8">
        <h1 className="text-xl md:text-2xl font-semibold text-foreground text-center truncate w-full">
          {task?.title ?? (taskQuery.isPending ? "Loading…" : "Task not found")}
        </h1>

        {tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap justify-center mt-2 mb-6">
            {tags.map(tag => (
              <span
                key={tag.id}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] text-muted-foreground border border-border/60"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
        {tags.length === 0 && <div className="mb-6" />}

        <div
          className="w-full max-w-sm mx-auto rounded-xl overflow-auto border bg-card"
          style={{ height: "min(520px, 70vh)" }}
        >
          <iframe
            src={POMODORO_URL}
            title="Pomodoro Timer"
            className="w-full h-full"
            style={{ border: "none" }}
          />
        </div>
      </div>
    </div>
  );
}
