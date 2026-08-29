import { createZeroByCategory } from "./finance";
import { createId } from "./id";
import type { AssetCategory, CurrentAsset } from "./types";

/**
 * 旧バージョン（試算開始時点の資産が currentSavings という単一の数値だった頃）の
 * データを資産内訳（assets）へ変換する。値を失わないよう、既存の残高は
 * 「現金・預金」1件として引き継ぐ。localStorage の既存データ・旧JSONエクスポートの
 * 両方から呼ばれる。
 */
export function resolveLegacyAssets(
  assets: CurrentAsset[] | undefined,
  legacyCurrentSavings: number | undefined,
): CurrentAsset[] {
  if (assets && assets.length > 0) {
    return assets;
  }
  if (typeof legacyCurrentSavings === "number") {
    return [
      { id: createId(), label: "現金・預金", category: "cash", amount: legacyCurrentSavings },
    ];
  }
  return assets ?? [];
}

/**
 * 旧バージョン（運用利回りが investmentReturnRate という単一の数値で、
 * 資産全体に一律適用されていた頃）のデータを区分ごとの利回りへ変換する。
 * 旧仕様の挙動（全資産に同じ利回りをかける）を維持するため、全区分に同じ値を設定する。
 * 区分ごとに差をつけたい場合は、移行後に「現在状況」画面で個別に調整する。
 */
export function resolveLegacyReturnRates(
  returnRateByCategory: Record<AssetCategory, number> | undefined,
  legacyInvestmentReturnRate: number | undefined,
): Record<AssetCategory, number> {
  if (returnRateByCategory) {
    return returnRateByCategory;
  }
  if (typeof legacyInvestmentReturnRate === "number") {
    const rate = legacyInvestmentReturnRate;
    return { cash: rate, investment: rate, realEstate: rate, other: rate };
  }
  return createZeroByCategory();
}
