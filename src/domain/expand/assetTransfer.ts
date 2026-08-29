import { resolvePeriodYears } from "../timing";
import type { AssetTransferEvent, SimulationContext } from "../types";

export type AssetTransferOccurrence = { year: number; amount: number };

/**
 * 資産振替イベント（例: 毎月の積立NISA拠出）の発生年と金額を展開する。
 * 収支（収入・支出）には一切計上しないため AnnualFlow は使わず、発生年・金額だけを返す。
 * 区分間の付け替え自体は simulate() 側で資産残高に直接適用する。
 */
export function expandAssetTransfer(
  event: AssetTransferEvent,
  ctx: SimulationContext,
): AssetTransferOccurrence[] {
  const years = resolvePeriodYears(event.period, ctx);
  if (years.length === 0) {
    return [];
  }

  const growthRate = event.growthRate ?? 0;
  const baseYear = years[0];

  return years.map((year) => ({
    year,
    amount: event.amount * (1 + growthRate / 100) ** (year - baseYear),
  }));
}
