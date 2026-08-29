import { describe, expect, it } from "vite-plus/test";
import { simulate } from "../cashflow";
import { remainingLoanBalance } from "../finance";
import type { HousingBuyEvent } from "../types";
import { makePlan } from "./fixtures";

describe("remainingLoanBalance", () => {
  it("金利0%なら元金を経過年数に比例して均等に償却する", () => {
    const loan = { principal: 1200, termYears: 10, annualRatePercent: 0 };
    expect(remainingLoanBalance(loan, 0)).toBe(1200);
    expect(remainingLoanBalance(loan, 5)).toBeCloseTo(600, 5);
    expect(remainingLoanBalance(loan, 10)).toBe(0);
    expect(remainingLoanBalance(loan, 15)).toBe(0);
  });

  it("金利ありでも返済満了時にちょうど0になり、残債は経過年数とともに単調減少する", () => {
    const loan = { principal: 8000, termYears: 35, annualRatePercent: 0.8 };
    expect(remainingLoanBalance(loan, 0)).toBe(8000);
    expect(remainingLoanBalance(loan, 35)).toBeCloseTo(0, 3);
    expect(remainingLoanBalance(loan, 10)).toBeGreaterThan(remainingLoanBalance(loan, 20));
  });
});

describe("simulate の負債（住宅ローン残債）", () => {
  it("購入前は負債0、購入後は残債が年々減り、完済後は0に戻る", () => {
    const event: HousingBuyEvent = {
      id: "h1",
      label: "架空のマイホーム",
      enabled: true,
      category: "housing",
      kind: "housingBuy",
      timing: { type: "year", year: 2026 },
      price: 1200,
      initialCashOutlay: 0,
      maintenanceAnnual: 0,
      loans: [{ principal: 1200, termYears: 10, annualRatePercent: 0 }],
    };
    const plan = makePlan({ baseYear: 2025, endYear: 2037, events: [event] });

    const rows = simulate(plan);
    const byYear = new Map(rows.map((row) => [row.year, row]));

    expect(byYear.get(2025)?.totalLiabilities).toBe(0);
    expect(byYear.get(2026)?.totalLiabilities).toBe(1200);
    expect(byYear.get(2026)?.liabilities).toEqual([{ label: "架空のマイホーム", amount: 1200 }]);
    expect(byYear.get(2031)?.totalLiabilities).toBeCloseTo(600, 5);
    expect(byYear.get(2035)?.totalLiabilities).toBeCloseTo(120, 5);
    expect(byYear.get(2036)?.totalLiabilities).toBe(0);
    expect(byYear.get(2036)?.liabilities).toEqual([]);
  });

  it("同じ住宅イベントに複数ローンがある場合はラベルを分けて内訳に出す", () => {
    const event: HousingBuyEvent = {
      id: "h1",
      label: "架空のマイホーム",
      enabled: true,
      category: "housing",
      kind: "housingBuy",
      timing: { type: "year", year: 2025 },
      price: 1000,
      initialCashOutlay: 0,
      maintenanceAnnual: 0,
      loans: [
        { principal: 800, termYears: 10, annualRatePercent: 0 },
        { principal: 200, termYears: 10, annualRatePercent: 0 },
      ],
    };
    const plan = makePlan({ baseYear: 2025, endYear: 2025, events: [event] });

    const rows = simulate(plan);
    expect(rows[0].liabilities).toEqual([
      { label: "架空のマイホーム（1）", amount: 800 },
      { label: "架空のマイホーム（2）", amount: 200 },
    ]);
    expect(rows[0].totalLiabilities).toBe(1000);
  });

  it("無効化した住宅イベントの負債は計上されない", () => {
    const event: HousingBuyEvent = {
      id: "h1",
      label: "架空のマイホーム（検討中）",
      enabled: false,
      category: "housing",
      kind: "housingBuy",
      timing: { type: "year", year: 2025 },
      price: 1000,
      initialCashOutlay: 0,
      maintenanceAnnual: 0,
      loans: [{ principal: 1000, termYears: 10, annualRatePercent: 0 }],
    };
    const plan = makePlan({ baseYear: 2025, endYear: 2025, events: [event] });

    const rows = simulate(plan);
    expect(rows[0].totalLiabilities).toBe(0);
  });
});
