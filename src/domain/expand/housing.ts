import { annualLoanPayment } from "../finance";
import { resolveTiming } from "../timing";
import type { AnnualFlow, HousingBuyEvent, SimulationContext } from "../types";

/**
 * 住宅購入イベントの展開。以下3つのサブスケジュールに分解する。
 *  1. 購入年に一括計上する自己資金（頭金＋諸経費など）
 *  2. ローンごとの年間返済額（元利均等）× 返済期間
 *  3. 共益費 × maintenanceUntil（省略時は試算終了年）まで
 *
 * 検算: 価格8,000万・自己資金650万・ローン8,000万/35年/0.8%・共益費36万/年 の場合、
 * 購入年の合計 = 650 + 262.1 + 36 ≈ 948万円（docs/private/lifeplan.pdf 4-2 と一致）。
 *
 * 買い替えは「この住宅の maintenanceUntil を売却時期にし、別の HousingBuyEvent を
 * 新規に追加する」ことで表現する（住宅イベント自体を複数持てるため）。
 */
export function expandHousingBuy(event: HousingBuyEvent, ctx: SimulationContext): AnnualFlow[] {
  const purchaseYear = resolveTiming(event.timing, ctx);
  const flows: AnnualFlow[] = [];

  const withinRange = (year: number): boolean => year >= ctx.baseYear && year <= ctx.endYear;

  if (withinRange(purchaseYear)) {
    flows.push({
      year: purchaseYear,
      category: event.category,
      direction: "out",
      amount: event.initialCashOutlay,
      sourceEventId: event.id,
      label: `${event.label}（自己資金）`,
    });
  }

  for (const loan of event.loans) {
    const payment = annualLoanPayment(loan);
    const lastYear = purchaseYear + Math.round(loan.termYears) - 1;
    for (let year = purchaseYear; year <= lastYear; year++) {
      if (!withinRange(year)) {
        continue;
      }
      flows.push({
        year,
        category: event.category,
        direction: "out",
        amount: payment,
        sourceEventId: event.id,
        label: `${event.label}（ローン返済）`,
      });
    }
  }

  const maintenanceEndYear = event.maintenanceUntil
    ? resolveTiming(event.maintenanceUntil, ctx)
    : ctx.endYear;
  const lastMaintenanceYear = Math.min(maintenanceEndYear, ctx.endYear);
  for (let year = purchaseYear; year <= lastMaintenanceYear; year++) {
    if (!withinRange(year)) {
      continue;
    }
    flows.push({
      year,
      category: event.category,
      direction: "out",
      amount: event.maintenanceAnnual,
      sourceEventId: event.id,
      label: `${event.label}（共益費）`,
    });
  }

  return flows;
}
