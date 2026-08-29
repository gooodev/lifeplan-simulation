import { createFileRoute } from "@tanstack/react-router";
import { useActivePlan } from "@/store/hooks";
import {
  EducationAccordion,
  HousingTable,
  InsuranceTable,
  PensionTable,
  RetirementTable,
} from "@/ui/ComplexEventTables";
import { IncomeExpenseSheet } from "@/ui/IncomeExpenseSheet";

export const Route = createFileRoute("/_app/expense")({
  component: ExpensePage,
});

function ExpensePage() {
  const plan = useActivePlan();
  if (!plan) {
    return null;
  }

  return (
    <div className="flex flex-col gap-8">
      <HousingTable
        planId={plan.id}
        events={plan.events}
        persons={plan.persons}
        baseYear={plan.baseYear}
      />
      <EducationAccordion planId={plan.id} events={plan.events} persons={plan.persons} />
      <div className="flex flex-col gap-6">
        <PensionTable planId={plan.id} events={plan.events} persons={plan.persons} />
        <RetirementTable planId={plan.id} events={plan.events} persons={plan.persons} />
      </div>
      <InsuranceTable planId={plan.id} events={plan.events} persons={plan.persons} />
      <IncomeExpenseSheet
        planId={plan.id}
        direction="out"
        kind="flow"
        events={plan.events}
        persons={plan.persons}
        baseYear={plan.baseYear}
        title="その他支出"
        addLabel="支出を追加"
        emptyLabel="その他支出がありません"
      />
    </div>
  );
}
