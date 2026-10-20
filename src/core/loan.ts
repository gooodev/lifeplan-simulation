import type { Loan } from "./schema";

type LoanTerms = Pick<Loan, "principal" | "termYears" | "annualRatePercent">;

/**
 * 元利均等返済の年間返済額（月返済額 × 12）。
 * 月利 r = 年利 / 12、月返済 = 借入額 × r(1+r)^n / ((1+r)^n − 1)、n = 返済年数 × 12。
 *
 * 検算: 借入8,000万円・35年・年利0.8% → 年間262.1万円（docs/SPEC.md 参照）。
 */
export function annualLoanPayment(loan: LoanTerms): number {
  const months = loan.termYears * 12;
  const monthlyRate = loan.annualRatePercent / 100 / 12;
  if (monthlyRate === 0) {
    return (loan.principal / months) * 12;
  }
  const factor = (1 + monthlyRate) ** months;
  return ((loan.principal * monthlyRate * factor) / (factor - 1)) * 12;
}

/** 返済開始から elapsedMonths か月返済した時点の残債。返済期間を過ぎたら 0。 */
export function loanBalanceAfterMonths(loan: LoanTerms, elapsedMonths: number): number {
  const totalMonths = loan.termYears * 12;
  if (elapsedMonths <= 0) {
    return loan.principal;
  }
  if (elapsedMonths >= totalMonths) {
    return 0;
  }
  const monthlyRate = loan.annualRatePercent / 100 / 12;
  const monthlyPayment = annualLoanPayment(loan) / 12;
  if (monthlyRate === 0) {
    return loan.principal - monthlyPayment * elapsedMonths;
  }
  const factor = (1 + monthlyRate) ** elapsedMonths;
  return loan.principal * factor - (monthlyPayment * (factor - 1)) / monthlyRate;
}
