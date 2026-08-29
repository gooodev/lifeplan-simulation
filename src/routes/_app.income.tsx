import { createFileRoute } from "@tanstack/react-router";
import { useActivePlan } from "@/store/hooks";
import { IncomeExpenseSheet } from "@/ui/IncomeExpenseSheet";

export const Route = createFileRoute("/_app/income")({
  component: IncomePage,
});

function IncomePage() {
  const plan = useActivePlan();
  if (!plan) {
    return null;
  }

  return (
    <div className="flex flex-col gap-8">
      <IncomeExpenseSheet
        planId={plan.id}
        direction="in"
        kind="salary"
        events={plan.events}
        persons={plan.persons}
        baseYear={plan.baseYear}
        title="給与"
        addLabel="給与を追加"
        emptyLabel="給与収入がありません"
      />
      <IncomeExpenseSheet
        planId={plan.id}
        direction="in"
        kind="flow"
        events={plan.events}
        persons={plan.persons}
        baseYear={plan.baseYear}
        title="定年後・その他収入"
        addLabel="収入を追加"
        emptyLabel="定年後・その他収入がありません"
      />
    </div>
  );
}
