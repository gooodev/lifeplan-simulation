import { ASSET_CATEGORIES } from "./types";
import type { AllocationRule, AssetCategory, CurrentAsset, Loan } from "./types";

/** 資産の内訳から、貯蓄残高計算の初期値となる合計額を求める。 */
export function sumAssets(assets: CurrentAsset[]): number {
  return assets.reduce((sum, asset) => sum + asset.amount, 0);
}

/** 資産区分ごとの合計額（区分の値が 0 件でも 0 として含める）を求める。 */
export function sumAssetsByCategory(assets: CurrentAsset[]): Record<AssetCategory, number> {
  const totals = createZeroByCategory();
  for (const asset of assets) {
    totals[asset.category] += asset.amount;
  }
  return totals;
}

/** 全区分を 0 で埋めた Record を作る。運用利回りの既定値・初期残高の雛形として使う。 */
export function createZeroByCategory(): Record<AssetCategory, number> {
  const record = {} as Record<AssetCategory, number>;
  for (const category of ASSET_CATEGORIES) {
    record[category] = 0;
  }
  return record;
}

/**
 * 配分ルールに従い、現金から投資へ付け替える額を求める（負なら投資から現金への取り崩し）。
 * 取り崩しは投資残高の範囲までなので、投資が尽きた後の不足は現金のマイナスとして残る。
 */
export function allocationTransfer(cash: number, investment: number, rule: AllocationRule): number {
  if (rule.mode === "none") {
    return 0;
  }
  const targetCash =
    rule.mode === "minCash"
      ? rule.minCash
      : Math.max(cash + investment, 0) * (Math.min(Math.max(rule.cashRatioPercent, 0), 100) / 100);
  return Math.max(cash - targetCash, -Math.max(investment, 0));
}

/**
 * 元利均等返済の年間返済額を計算する。
 *
 * 検算: 借入8,000万円・35年・年利0.8% → 年間262.1万円
 * （docs/private/lifeplan.pdf 4-2 の帳票値「262万円」と一致）
 */
export function annualLoanPayment(loan: Loan): number {
  const monthlyRate = loan.annualRatePercent / 100 / 12;
  const months = Math.round(loan.termYears * 12);

  if (months <= 0) {
    return 0;
  }

  if (monthlyRate === 0) {
    return (loan.principal / months) * 12;
  }

  const factor = (1 + monthlyRate) ** months;
  const monthlyPayment = (loan.principal * (monthlyRate * factor)) / (factor - 1);
  return monthlyPayment * 12;
}

/**
 * ローンの残債（元金残高）を、借入からの経過年数から求める。負債状況の表示に使う。
 * 元利均等返済の毎月の返済額（annualLoanPayment/12）で毎月償却していく前提で計算する。
 * 経過年数が返済期間を超えていれば 0（完済済み）を返す。
 */
export function remainingLoanBalance(loan: Loan, elapsedYears: number): number {
  const monthlyRate = loan.annualRatePercent / 100 / 12;
  const totalMonths = Math.round(loan.termYears * 12);
  if (totalMonths <= 0) {
    return 0;
  }

  const elapsedMonths = Math.min(Math.max(Math.round(elapsedYears * 12), 0), totalMonths);
  if (elapsedMonths <= 0) {
    return loan.principal;
  }
  if (elapsedMonths >= totalMonths) {
    return 0;
  }

  if (monthlyRate === 0) {
    const monthlyPayment = loan.principal / totalMonths;
    return loan.principal - monthlyPayment * elapsedMonths;
  }

  const monthlyPayment = annualLoanPayment(loan) / 12;
  const factor = (1 + monthlyRate) ** elapsedMonths;
  return loan.principal * factor - (monthlyPayment * (factor - 1)) / monthlyRate;
}
