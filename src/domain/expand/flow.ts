import { resolvePeriodYears } from "../timing";
import type { AnnualFlow, FlowEvent, SimulationContext } from "../types";

/**
 * 汎用フローイベントの展開。旅行・耐久消費財・固定資産税・塾代・臨時収支など、
 * 「単発／繰返し」×「収入／支出」の組み合わせで表せるものはすべてこれ一本で扱う。
 *
 * growthRate は発生年（暦年）ベースの複利で適用する。最初の発生年を基準年とし、
 * n年後の発生では (1+growthRate/100)^n を乗じる。
 */
export function expandFlow(event: FlowEvent, ctx: SimulationContext): AnnualFlow[] {
  const years = resolvePeriodYears(event.period, ctx);
  if (years.length === 0) {
    return [];
  }

  const growthRate = event.growthRate ?? 0;
  const baseYear = years[0];

  return years.map((year) => ({
    year,
    category: event.category,
    direction: event.direction,
    amount: event.amount * (1 + growthRate / 100) ** (year - baseYear),
    sourceEventId: event.id,
    label: event.label,
  }));
}
