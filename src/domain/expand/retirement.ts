import { findPerson, yearWhenAge } from "../timing";
import type { AnnualFlow, RetirementEvent, SimulationContext } from "../types";

/**
 * 退職金の展開。retireAge に達した年に一括収入として計上する。
 * 企業年金（年金形式で受け取る分）は汎用の flow イベント（category: otherIncome、
 * period で受給期間を指定）として別途追加することを想定する。
 */
export function expandRetirement(event: RetirementEvent, ctx: SimulationContext): AnnualFlow[] {
  const person = findPerson(event.personId, ctx.persons);
  const year = yearWhenAge(person, event.retireAge);

  if (year < ctx.baseYear || year > ctx.endYear) {
    return [];
  }

  return [
    {
      year,
      category: event.category,
      direction: "in",
      amount: event.lumpSum,
      sourceEventId: event.id,
      label: event.label,
    },
  ];
}
