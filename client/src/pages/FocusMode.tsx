import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import TaskDetailPanel from "@/components/TaskDetailPanel";
import { ArrowLeft } from "lucide-react";

const POMODORO_URL = "https://giorgiark.github.io/pomodorotimer/";

export default function FocusMode() {
  const [, params] = useRoute<{ id: string }>("/focus/:id");
  const taskId = params?.id ? parseInt(params.id, 10) : NaN;
  const [, setLocation] = useLocation();

  const exit = () => setLocation("/today");

  return (
    <div className="min-h-screen flex flex-col items-center bg-background">
      <div className="w-full flex items-center px-4 py-4 md:px-6 safe-area-top">
        <Button variant="ghost" onClick={exit} className="gap-1.5 text-sm">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="w-full max-w-md px-4 pb-8 flex-1 flex flex-col gap-6 items-center">
        <div className="w-full">
          <TaskDetailPanel
            taskId={taskId}
            onClose={exit}
            onToggleComplete={done => { if (done) exit(); }}
          />
        </div>

        <div className="w-full opacity-80">
          <div
            className="w-full rounded-xl overflow-auto border bg-card"
            style={{ height: "min(360px, 45vh)" }}
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
    </div>
  );
}
