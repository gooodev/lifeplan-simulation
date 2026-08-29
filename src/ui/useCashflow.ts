import { useMemo } from "react";
import { simulate } from "../domain/cashflow";
import type { CashflowRow, PlanInput } from "../domain/types";

/** プランからキャッシュフロー表を導出する。plan の参照が変わったときだけ再計算する。 */
export function useCashflow(plan: PlanInput | null | undefined): CashflowRow[] {
  return useMemo(() => (plan ? simulate(plan) : []), [plan]);
}
