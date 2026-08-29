import { createFileRoute } from "@tanstack/react-router";
import { usePlans } from "@/store/hooks";
import { PlanComparisonView } from "@/ui/output/PlanComparisonView";

export const Route = createFileRoute("/_app/compare")({
  component: ComparePage,
});

function ComparePage() {
  const plans = usePlans();
  return <PlanComparisonView plans={plans} />;
}
