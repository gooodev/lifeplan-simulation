import { createFileRoute } from "@tanstack/react-router";
import { useActivePlan } from "@/store/hooks";
import { SummaryView } from "@/ui/output/SummaryView";

export const Route = createFileRoute("/_app/summary")({
  component: SummaryPage,
});

function SummaryPage() {
  const plan = useActivePlan();
  if (!plan) {
    return null;
  }
  return <SummaryView plan={plan} />;
}
