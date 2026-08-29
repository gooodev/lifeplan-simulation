import { resolvePeriodYears } from "../timing";
import type { AnnualFlow, SalaryEvent, SimulationContext } from "../types";

/**
 * 給与収入の展開。昇給率による複利成長と、特定年の金額上書き（転職・休職など）に対応する。
 * 手取り換算率（assumptions.takeHomeRate）は額面から手取りへの換算として最後に一律で乗じる。
 * PDF は額面をそのまま収入計上しているため、既定 100% なら従来どおりの挙動になる。
 */
export function expandSalary(event: SalaryEvent, ctx: SimulationContext): AnnualFlow[] {
  const years = resolvePeriodYears(event.period, ctx);
  if (years.length === 0) {
    return [];
  }

  const startYear = years[0];
  const overrideByYear = new Map((event.overrides ?? []).map((o) => [o.year, o.amount]));
  const takeHomeRatio = ctx.assumptions.takeHomeRate / 100;

  return years.map((year) => {
    const grossAmount =
      overrideByYear.get(year) ??
      event.annualAmount * (1 + event.growthRate / 100) ** (year - startYear);
    return {
      year,
      category: event.category,
      direction: "in",
      amount: grossAmount * takeHomeRatio,
      sourceEventId: event.id,
      label: event.label,
    };
  });
}
