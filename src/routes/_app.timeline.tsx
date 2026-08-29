import { createFileRoute } from "@tanstack/react-router";
import { useActivePlan } from "@/store/hooks";
import { TimelineView } from "@/ui/output/TimelineView";

export const Route = createFileRoute("/_app/timeline")({
  component: TimelinePage,
});

function TimelinePage() {
  const plan = useActivePlan();
  if (!plan) {
    return null;
  }
  return <TimelineView plan={plan} />;
}
