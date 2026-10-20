import { describe, expect, it } from "vite-plus/test";
import { byTag, groupEntries } from "../aggregate";
import { simulate } from "../simulate";
import { SimulationInputError } from "../validate";
import { makeInput } from "./fixtures";

describe("simulate: フロー", () => {
  it("残高[t] = 残高[t−1] + 収入 − 支出（利回り0%）", () => {
    const result = simulate(
      makeInput({
        flows: [
          {
            id: "salary",
            direction: "in",
            amount: 500,
            period: { start: { type: "year", year: 2025 }, intervalYears: 1 },
          },
          {
            id: "living",
            direction: "out",
            amount: 300,
            period: { start: { type: "offset", years: 0 }, intervalYears: 1 },
          },
        ],
      }),
    );

    expect(result.years.map((y) => y.totalAssets)).toEqual([1200, 1400, 1600]);
    expect(result.years[0]).toMatchObject({ income: 500, expense: 300, net: 200 });
  });

  it("intervalYears 省略は単発、n は n 年毎、end は含む", () => {
    const result = simulate(
      makeInput({
        basis: { startYear: 2025, endYear: 2035, persons: [{ id: "self", birthYear: 1990 }] },
        flows: [
          {
            id: "once",
            direction: "out",
            amount: 1,
            period: { start: { type: "year", year: 2026 } },
          },
          {
            id: "every3",
            direction: "out",
            amount: 1,
            period: {
              start: { type: "year", year: 2025 },
              end: { type: "age", personId: "self", age: 41 },
              intervalYears: 3,
            },
          },
        ],
      }),
    );

    const yearsOf = (id: string) =>
      result.entries.filter((e) => e.sourceId === id).map((e) => e.year);
    expect(yearsOf("once")).toEqual([2026]);
    expect(yearsOf("every3")).toEqual([2025, 2028, 2031]);
  });

  it("増加率は期間の開始年を起点に複利で掛かる（開始年が試算開始年より前でも同じ）", () => {
    const result = simulate(
      makeInput({
        flows: [
          {
            id: "f",
            direction: "out",
            amount: 100,
            growthRatePercent: 10,
            period: { start: { type: "year", year: 2024 }, intervalYears: 1 },
          },
        ],
      }),
    );

    const amounts = result.entries.map((e) => e.amount);
    expect(amounts[0]).toBeCloseTo(110);
    expect(amounts[1]).toBeCloseTo(121);
  });

  it("overrides で特定の発生年の金額だけを上書きできる", () => {
    const result = simulate(
      makeInput({
        flows: [
          {
            id: "f",
            direction: "in",
            amount: 500,
            overrides: [{ year: 2026, amount: 0 }],
            period: { start: { type: "year", year: 2025 }, intervalYears: 1 },
          },
        ],
      }),
    );

    expect(result.entries.map((e) => e.amount)).toEqual([500, 0, 500]);
  });

  it("発生年でない年の override はエラー", () => {
    const input = makeInput({
      flows: [
        {
          id: "f",
          direction: "in",
          amount: 500,
          overrides: [{ year: 2026, amount: 0 }],
          period: { start: { type: "year", year: 2025 } },
        },
      ],
    });

    expect(() => simulate(input)).toThrow(SimulationInputError);
  });

  it("accountId を指定したフローはその口座に入出金する", () => {
    const result = simulate(
      makeInput({
        stocks: {
          accounts: [
            { id: "cash", initialBalance: 0 },
            { id: "nisa", initialBalance: 0 },
          ],
          settlementAccountId: "cash",
        },
        flows: [
          {
            id: "dividend",
            direction: "in",
            amount: 10,
            accountId: "nisa",
            period: { start: { type: "year", year: 2025 } },
          },
        ],
      }),
    );

    expect(result.years[0].balances).toEqual({ cash: 0, nisa: 10 });
  });
});

describe("simulate: 振替と運用利回り", () => {
  it("振替は収支に計上せず、口座の残高だけを動かす", () => {
    const result = simulate(
      makeInput({
        stocks: {
          accounts: [
            { id: "cash", initialBalance: 1000 },
            { id: "nisa", initialBalance: 0 },
          ],
          settlementAccountId: "cash",
        },
        transfers: [
          {
            id: "t",
            fromAccountId: "cash",
            toAccountId: "nisa",
            amount: 120,
            period: { start: { type: "year", year: 2025 }, intervalYears: 1 },
          },
        ],
      }),
    );

    expect(result.years[0]).toMatchObject({ income: 0, expense: 0, totalAssets: 1000 });
    expect(result.years[2].balances).toEqual({ cash: 640, nisa: 360 });
  });

  it("利回りは前年末残高にだけ掛かり、その年の入出金には掛からない", () => {
    const result = simulate(
      makeInput({
        assumptions: { returnRatePercent: { cash: 10 } },
        flows: [
          {
            id: "f",
            direction: "in",
            amount: 100,
            period: { start: { type: "year", year: 2025 } },
          },
        ],
      }),
    );

    expect(result.years[0].totalAssets).toBeCloseTo(1000 * 1.1 + 100);
    expect(result.years[1].totalAssets).toBeCloseTo(1200 * 1.1);
  });
});

describe("simulate: ローン", () => {
  const loan = {
    id: "mortgage",
    principal: 8000,
    termYears: 35,
    annualRatePercent: 0.8,
    start: { type: "year" as const, year: 2026 },
  };

  it("返済を支出に計上し、期末残債（その年の返済後）を負債に計上する", () => {
    const result = simulate(
      makeInput({
        stocks: {
          accounts: [{ id: "cash", initialBalance: 10000 }],
          settlementAccountId: "cash",
          loans: [loan],
        },
      }),
    );

    expect(result.years[0].loanBalances).toEqual({ mortgage: 0 });
    expect(result.years[0].expense).toBe(0);
    expect(result.years[1].expense).toBeCloseTo(262.14, 1);
    expect(result.years[1].loanBalances.mortgage).toBeGreaterThan(7700);
    expect(result.years[1].loanBalances.mortgage).toBeLessThan(8000);
    expect(result.years[1].netWorth).toBeCloseTo(
      result.years[1].totalAssets - result.years[1].loanBalances.mortgage,
    );
  });

  it("試算開始年より前に始まったローンは、残りの返済期間だけ計上する", () => {
    const result = simulate(
      makeInput({
        basis: { startYear: 2025, endYear: 2030, persons: [] },
        stocks: {
          accounts: [{ id: "cash", initialBalance: 0 }],
          settlementAccountId: "cash",
          loans: [
            {
              id: "car",
              principal: 300,
              termYears: 5,
              annualRatePercent: 0,
              start: { type: "year", year: 2022 },
            },
          ],
        },
      }),
    );

    expect(result.entries.map((e) => e.year)).toEqual([2025, 2026]);
    expect(result.years[0].loanBalances.car).toBeCloseTo(60);
    expect(result.years[1].loanBalances.car).toBe(0);
  });
});

describe("タグ", () => {
  it("タグは明細に引き継がれ、タグごとに集計できる", () => {
    const result = simulate(
      makeInput({
        stocks: {
          accounts: [{ id: "cash", initialBalance: 0 }],
          settlementAccountId: "cash",
          loans: [
            {
              id: "mortgage",
              principal: 120,
              termYears: 1,
              annualRatePercent: 0,
              start: { type: "year", year: 2025 },
              tags: { type: "housing" },
            },
          ],
        },
        flows: [
          {
            id: "maintenance",
            direction: "out",
            amount: 30,
            tags: { type: "housing" },
            period: { start: { type: "year", year: 2025 } },
          },
          {
            id: "travel",
            direction: "out",
            amount: 50,
            tags: { type: "travel" },
            period: { start: { type: "year", year: 2025 } },
          },
          {
            id: "misc",
            direction: "out",
            amount: 5,
            period: { start: { type: "year", year: 2025 } },
          },
        ],
      }),
    );

    const grouped = groupEntries(result.entries, byTag("type", "untagged"));
    expect(Object.fromEntries(grouped.get(2025) ?? [])).toEqual({
      housing: 150,
      travel: 50,
      untagged: 5,
    });
  });
});
