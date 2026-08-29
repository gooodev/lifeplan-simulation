import { describe, expect, it } from "vite-plus/test";
import { annualLoanPayment } from "../finance";

describe("annualLoanPayment", () => {
  it("元利均等返済の年間返済額を計算できる（8,000万・35年・0.8%）", () => {
    const payment = annualLoanPayment({ principal: 8000, termYears: 35, annualRatePercent: 0.8 });
    expect(payment).toBeCloseTo(262.14, 1);
  });

  it("金利0%なら単純に元本を返済期間で割った額になる", () => {
    const payment = annualLoanPayment({ principal: 1200, termYears: 10, annualRatePercent: 0 });
    expect(payment).toBeCloseTo(120, 5);
  });

  it("返済期間が0以下なら0を返す", () => {
    expect(annualLoanPayment({ principal: 1000, termYears: 0, annualRatePercent: 1 })).toBe(0);
  });
});
