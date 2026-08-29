import { findPerson, yearWhenAge } from "../timing";
import type { AnnualFlow, InsuranceEvent, SimulationContext } from "../types";

/**
 * 保険の展開。保険料は試算開始年から「払込満了年齢に達する前年」まで（既に契約済みの
 * 保険を想定し、契約開始日は追跡しない）。満期金があれば、その年齢に達した年に
 * 一括収入として計上する。
 */
export function expandInsurance(event: InsuranceEvent, ctx: SimulationContext): AnnualFlow[] {
  const person = findPerson(event.insuredId, ctx.persons);
  const flows: AnnualFlow[] = [];

  const premiumEndYear = Math.min(ctx.endYear, yearWhenAge(person, event.premiumUntilAge) - 1);
  for (let year = ctx.baseYear; year <= premiumEndYear; year++) {
    flows.push({
      year,
      category: event.category,
      direction: "out",
      amount: event.annualPremium,
      sourceEventId: event.id,
      label: event.label,
    });
  }

  if (event.maturity) {
    const maturityYear = yearWhenAge(person, event.maturity.age);
    if (maturityYear >= ctx.baseYear && maturityYear <= ctx.endYear) {
      flows.push({
        year: maturityYear,
        category: "otherIncome",
        direction: "in",
        amount: event.maturity.amount,
        sourceEventId: event.id,
        label: `${event.label}（満期金）`,
      });
    }
  }

  return flows;
}
