import { createFileRoute } from "@tanstack/react-router";
import { useActivePlan } from "@/store/hooks";
import { MarkerEventsTable } from "@/ui/MarkerEventsTable";

export const Route = createFileRoute("/_app/life-events")({
  component: LifeEventsPage,
});

function LifeEventsPage() {
  const plan = useActivePlan();
  if (!plan) {
    return null;
  }
  return (
    <MarkerEventsTable
      planId={plan.id}
      events={plan.events}
      persons={plan.persons}
      baseYear={plan.baseYear}
    />
  );
}
