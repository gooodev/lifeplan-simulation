import { createFileRoute } from "@tanstack/react-router";
import { useActivePlan } from "@/store/hooks";
import { CategoryBreakdownChart } from "@/ui/output/CategoryBreakdownChart";

export const Route = createFileRoute("/_app/breakdown")({
  component: BreakdownPage,
});

function BreakdownPage() {
  const plan = useActivePlan();
  if (!plan) {
    return null;
  }
  return <CategoryBreakdownChart plan={plan} />;
}
