import { describe, expect, it } from "vite-plus/test";
import { simulate } from "../cashflow";
import type { FlowEvent, LifeEvent, MarkerEvent, SalaryEvent } from "../types";
import { makeAsset, makePerson, makePlan } from "./fixtures";

describe("simulate", () => {
  it("貯蓄残高の漸化式: 残高[t] = 残高[t-1] + 収支[t]（運用利回り0%の場合）", () => {
    const salary: SalaryEvent = {
      id: "sal",
      label: "架空の給与",
      enabled: true,
      category: "salary",
      kind: "salary",
      personId: "self",
      period: { start: { type: "year", year: 2025 }, intervalYears: 1 },
      annualAmount: 500,
      growthRate: 0,
    };
    const living: FlowEvent = {
      id: "living",
      label: "架空の生活費",
      enabled: true,
      category: "living",
      kind: "flow",
      direction: "out",
      period: { start: { type: "year", year: 2025 }, intervalYears: 1 },
      amount: 300,
    };
    const plan = makePlan({
      baseYear: 2025,
      endYear: 2027,
      assets: [makeAsset({ amount: 1000 })],
      events: [salary, living],
    });

    const rows = simulate(plan);
    expect(rows[0]).toMatchObject({
      year: 2025,
      totalIncome: 500,
      totalExpense: 300,
      netFlow: 200,
      balance: 1200,
    });
    expect(rows[1].balance).toBe(1400);
    expect(rows[2].balance).toBe(1600);
  });

  it("運用利回りを設定すると残高に複利がかかる", () => {
    const plan = makePlan({
      baseYear: 2025,
      endYear: 2027,
      assets: [makeAsset({ amount: 1000 })],
      events: [],
    });
    plan.assumptions.returnRateByCategory.cash = 10;

    const rows = simulate(plan);
    expect(rows[0].balance).toBeCloseTo(1100, 5);
    expect(rows[1].balance).toBeCloseTo(1210, 5);
    expect(rows[2].balance).toBeCloseTo(1331, 5);
  });

  it("無効化したイベント（enabled: false）は集計に含まれない", () => {
    const disabled: FlowEvent = {
      id: "disabled",
      label: "架空の旅行（やめた場合の検討用）",
      enabled: false,
      category: "travel",
      kind: "flow",
      direction: "out",
      period: { start: { type: "year", year: 2025 } },
      amount: 1000,
    };
    const plan = makePlan({ baseYear: 2025, endYear: 2025, events: [disabled] });

    const rows = simulate(plan);
    expect(rows[0].totalExpense).toBe(0);
    expect(rows[0].balance).toBe(0);
  });

  it("marker イベントは金額を持たず、年表のイベント名にのみ現れる", () => {
    const marker: MarkerEvent = {
      id: "m1",
      label: "架空の結婚記念日",
      enabled: true,
      category: "other",
      kind: "marker",
      timing: { type: "year", year: 2026 },
    };
    const plan = makePlan({ baseYear: 2025, endYear: 2027, events: [marker] });

    const rows = simulate(plan);
    expect(rows[1].events.map((e) => e.label)).toEqual(["架空の結婚記念日"]);
    expect(rows[1].totalIncome).toBe(0);
    expect(rows[1].totalExpense).toBe(0);
  });

  it("同じ年・同じカテゴリの複数イベントを合算する", () => {
    const events: LifeEvent[] = [
      {
        id: "t1",
        label: "架空の旅行A",
        enabled: true,
        category: "travel",
        kind: "flow",
        direction: "out",
        period: { start: { type: "year", year: 2025 } },
        amount: 10,
      },
      {
        id: "t2",
        label: "架空の旅行B",
        enabled: true,
        category: "travel",
        kind: "flow",
        direction: "out",
        period: { start: { type: "year", year: 2025 } },
        amount: 15,
      },
    ];
    const plan = makePlan({ baseYear: 2025, endYear: 2025, events });

    const rows = simulate(plan);
    expect(rows[0].expenseByCategory.travel).toBe(25);
  });

  it("人物ごとの年齢がその年について正しく計算される", () => {
    const self = makePerson({ id: "self", birthDate: "1990-01-01" });
    const spouse = makePerson({ id: "spouse", role: "spouse", birthDate: "1992-01-01" });
    const plan = makePlan({ baseYear: 2025, endYear: 2025, persons: [self, spouse], events: [] });

    const rows = simulate(plan);
    expect(rows[0].ages).toEqual({ self: 35, spouse: 33 });
  });
});
