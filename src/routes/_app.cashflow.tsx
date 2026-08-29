import { createFileRoute } from "@tanstack/react-router";
import { useActivePlan } from "@/store/hooks";
import { BalanceChart } from "@/ui/output/BalanceChart";
import { CashflowTable } from "@/ui/output/CashflowTable";

export const Route = createFileRoute("/_app/cashflow")({
  component: CashflowPage,
});

/** キャッシュフロー表と貯蓄残高の推移を1画面にまとめて表示する。 */
function CashflowPage() {
  const plan = useActivePlan();
  if (!plan) {
    return null;
  }
  return (
    <div className="flex flex-col gap-6">
      <BalanceChart plan={plan} />
      <CashflowTable plan={plan} />
    </div>
  );
}
