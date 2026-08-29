import { describe, expect, it } from "vite-plus/test";
import { simulate } from "../cashflow";
import type { AssetTransferEvent } from "../types";
import { makeAsset, makeAssumptions, makePlan } from "./fixtures";

describe("資産区分ごとの運用利回りと資産振替", () => {
  it("区分ごとに異なる運用利回りが複利で適用される", () => {
    const plan = makePlan({
      baseYear: 2025,
      endYear: 2026,
      assets: [
        makeAsset({ category: "cash", amount: 1000 }),
        makeAsset({ category: "investment", amount: 1000 }),
      ],
      assumptions: makeAssumptions({
        returnRateByCategory: { cash: 0, investment: 10, realEstate: 0, other: 0 },
      }),
      events: [],
    });

    const rows = simulate(plan);
    expect(rows[0].assetsByCategory.cash).toBeCloseTo(1000, 5);
    expect(rows[0].assetsByCategory.investment).toBeCloseTo(1100, 5);
    expect(rows[0].balance).toBeCloseTo(2100, 5);
    expect(rows[1].assetsByCategory.investment).toBeCloseTo(1210, 5);
  });

  it("収支の余剰分は現金区分に積み上がる", () => {
    const plan = makePlan({
      baseYear: 2025,
      endYear: 2025,
      assets: [],
      events: [
        {
          id: "income",
          label: "架空の臨時収入",
          enabled: true,
          category: "otherIncome",
          kind: "flow",
          direction: "in",
          period: { start: { type: "year", year: 2025 } },
          amount: 300,
        },
      ],
    });

    const rows = simulate(plan);
    expect(rows[0].assetsByCategory.cash).toBe(300);
    expect(rows[0].assetsByCategory.investment).toBe(0);
  });

  it("資産振替イベントは収支に計上せず、区分間で残高だけを動かす", () => {
    const transfer: AssetTransferEvent = {
      id: "nisa",
      label: "積立NISA",
      enabled: true,
      category: "other",
      kind: "assetTransfer",
      fromCategory: "cash",
      toCategory: "investment",
      period: { start: { type: "year", year: 2025 }, intervalYears: 1 },
      amount: 36,
    };
    const plan = makePlan({
      baseYear: 2025,
      endYear: 2026,
      assets: [makeAsset({ category: "cash", amount: 100 })],
      events: [transfer],
    });

    const rows = simulate(plan);
    expect(rows[0].totalIncome).toBe(0);
    expect(rows[0].totalExpense).toBe(0);
    expect(rows[0].assetsByCategory.cash).toBeCloseTo(64, 5);
    expect(rows[0].assetsByCategory.investment).toBeCloseTo(36, 5);
    expect(rows[0].balance).toBeCloseTo(100, 5);
    expect(rows[0].events.map((e) => e.label)).toEqual(["積立NISA"]);

    expect(rows[1].assetsByCategory.cash).toBeCloseTo(28, 5);
    expect(rows[1].assetsByCategory.investment).toBeCloseTo(72, 5);
  });

  it("無効化した資産振替イベントは適用されない", () => {
    const transfer: AssetTransferEvent = {
      id: "nisa-off",
      label: "積立NISA（停止中）",
      enabled: false,
      category: "other",
      kind: "assetTransfer",
      fromCategory: "cash",
      toCategory: "investment",
      period: { start: { type: "year", year: 2025 }, intervalYears: 1 },
      amount: 36,
    };
    const plan = makePlan({
      baseYear: 2025,
      endYear: 2025,
      assets: [makeAsset({ category: "cash", amount: 100 })],
      events: [transfer],
    });

    const rows = simulate(plan);
    expect(rows[0].assetsByCategory.cash).toBe(100);
    expect(rows[0].assetsByCategory.investment).toBe(0);
  });
});
