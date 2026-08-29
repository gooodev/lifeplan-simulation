import { PENSION_CONSTANTS } from "../constants";
import { findPerson, yearWhenAge } from "../timing";
import type { AnnualFlow, PensionEvent, SimulationContext } from "../types";

/**
 * 公的年金（簡易計算）の展開。
 *   基礎年金 = 満額 × 加入年数 / 40
 *   厚生年金 = 平均標準報酬月額 × 5.481/1000 × 加入月数
 * 受給は receiveFromAge から、その人の lifeEndAge（試算に含める上限年齢）まで。
 *
 * 検算: 加入23〜60歳(37年)・月収48万 → 基礎72.2万・厚生116.8万
 *      加入22〜60歳(38年)・月収46万 → 基礎74.1万・厚生115.0万
 * （docs/private/lifeplan.pdf 3-2 の帳票値（72/117万・74/115万）とほぼ一致。誤差は端数処理による）
 */
export function expandPension(event: PensionEvent, ctx: SimulationContext): AnnualFlow[] {
  const person = findPerson(event.personId, ctx.persons);
  const enrollYears = event.enrollToAge - event.enrollFromAge;

  const basicFullAmount =
    event.basicPensionFullAmountOverride ?? PENSION_CONSTANTS.BASIC_PENSION_FULL_AMOUNT;
  const welfareRate = event.welfareRateOverride ?? PENSION_CONSTANTS.WELFARE_PENSION_RATE;

  const basicAnnual = basicFullAmount * (enrollYears / PENSION_CONSTANTS.BASIC_PENSION_FULL_YEARS);
  const welfareAnnual = event.monthlyIncome * welfareRate * (enrollYears * 12);
  const annualPension = basicAnnual + welfareAnnual;

  const receiveFromYear = yearWhenAge(person, event.receiveFromAge);
  const receiveToYear = Math.min(ctx.endYear, yearWhenAge(person, person.lifeEndAge));

  const flows: AnnualFlow[] = [];
  const startYear = Math.max(receiveFromYear, ctx.baseYear);
  for (let year = startYear; year <= receiveToYear; year++) {
    flows.push({
      year,
      category: event.category,
      direction: "in",
      amount: annualPension,
      sourceEventId: event.id,
      label: event.label,
    });
  }
  return flows;
}
