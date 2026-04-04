import { trpc } from "@/lib/trpc";
import TaskList from "@/components/TaskList";
import { Inbox } from "lucide-react";

export default function SomedayView() {
  const tasksQuery = trpc.tasks.list.useQuery({ doDate: "someday" });
  const usersQuery = trpc.users.list.useQuery();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Someday</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tasks without a specific date — review these during your morning brain dump.
        </p>
      </div>

      <TaskList
        tasks={tasksQuery.data ?? []}
        users={usersQuery.data}
        defaultDoDateSomeday={true}
        emptyMessage="No someday tasks. Things you're not sure when to do will appear here."
        hideDoDate
      />
    </div>
  );
}
