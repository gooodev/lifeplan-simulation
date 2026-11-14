import { describe, expect, it } from "vite-plus/test";
import { simulate } from "../cashflow";
import { allocationTransfer } from "../finance";
import type { FlowEvent } from "../types";
import { makeAsset, makeAssumptions, makePlan } from "./fixtures";

function annualFlow(direction: "in" | "out", amount: number): FlowEvent {
  return {
    id: `flow-${direction}`,
    label: direction === "in" ? "架空の収入" : "架空の支出",
    enabled: true,
    category: direction === "in" ? "otherIncome" : "living",
    kind: "flow",
    direction,
    period: { start: { type: "year", year: 2025 }, intervalYears: 1 },
    amount,
  };
}

describe("allocationTransfer", () => {
  it("none なら付け替えない", () => {
    expect(allocationTransfer(500, 100, { mode: "none" })).toBe(0);
  });

  it("minCash: 超過分を投資へ回す", () => {
    expect(allocationTransfer(500, 100, { mode: "minCash", minCash: 300 })).toBe(200);
  });

  it("minCash: 不足分を投資から取り崩す", () => {
    expect(allocationTransfer(100, 500, { mode: "minCash", minCash: 300 })).toBe(-200);
  });

  it("minCash: 取り崩しは投資残高までで、それ以上の不足は現金に残る", () => {
    expect(allocationTransfer(-100, 150, { mode: "minCash", minCash: 300 })).toBe(-150);
  });

  it("ratio: 合計を指定の割合に配分し直す", () => {
    expect(allocationTransfer(800, 200, { mode: "ratio", cashRatioPercent: 30 })).toBeCloseTo(500);
  });

  it("ratio: 合計がマイナスなら投資を全額現金へ戻す", () => {
    expect(allocationTransfer(-300, 100, { mode: "ratio", cashRatioPercent: 30 })).toBe(-100);
  });
});

describe("配分ルールを使った試算", () => {
  it("minCash: 現金は最低額に保たれ、超過分が投資で運用される", () => {
    const plan = makePlan({
      baseYear: 2025,
      endYear: 2026,
      assets: [makeAsset({ category: "cash", amount: 500 })],
      events: [annualFlow("in", 100)],
      assumptions: makeAssumptions({
        returnRateByCategory: { cash: 0, investment: 10, realEstate: 0, other: 0 },
        allocation: { mode: "minCash", minCash: 300 },
      }),
    });

    const rows = simulate(plan);
    expect(rows[0].assetsByCategory.cash).toBeCloseTo(300);
    expect(rows[0].assetsByCategory.investment).toBeCloseTo(300);
    expect(rows[0].autoTransfer).toBeCloseTo(300);
    expect(rows[0].totalReturn).toBeCloseTo(0);

    // 2年目: 投資 300 に 10% の運用収益 30、収支 100 の余剰は投資へ。
    expect(rows[1].returnByCategory.investment).toBeCloseTo(30);
    expect(rows[1].totalReturn).toBeCloseTo(30);
    expect(rows[1].assetsByCategory.cash).toBeCloseTo(300);
    expect(rows[1].assetsByCategory.investment).toBeCloseTo(430);
    expect(rows[1].balance).toBeCloseTo(rows[0].balance + rows[1].netFlow + rows[1].totalReturn);
  });

  it("minCash: 赤字の年は投資から取り崩し、尽きたら現金がマイナスになる", () => {
    const plan = makePlan({
      baseYear: 2025,
      endYear: 2026,
      assets: [
        makeAsset({ category: "cash", amount: 300 }),
        makeAsset({ id: "asset-2", category: "investment", amount: 150 }),
      ],
      events: [annualFlow("out", 100)],
      assumptions: makeAssumptions({ allocation: { mode: "minCash", minCash: 300 } }),
    });

    const rows = simulate(plan);
    expect(rows[0].autoTransfer).toBeCloseTo(-100);
    expect(rows[0].assetsByCategory.cash).toBeCloseTo(300);
    expect(rows[0].assetsByCategory.investment).toBeCloseTo(50);

    expect(rows[1].autoTransfer).toBeCloseTo(-50);
    expect(rows[1].assetsByCategory.cash).toBeCloseTo(250);
    expect(rows[1].assetsByCategory.investment).toBeCloseTo(0);
  });

  it("ratio: 不動産・その他は配分の対象外", () => {
    const plan = makePlan({
      baseYear: 2025,
      endYear: 2025,
      assets: [
        makeAsset({ category: "cash", amount: 1000 }),
        makeAsset({ id: "asset-2", category: "realEstate", amount: 3000 }),
      ],
      assumptions: makeAssumptions({ allocation: { mode: "ratio", cashRatioPercent: 40 } }),
    });

    const rows = simulate(plan);
    expect(rows[0].assetsByCategory.cash).toBeCloseTo(400);
    expect(rows[0].assetsByCategory.investment).toBeCloseTo(600);
    expect(rows[0].assetsByCategory.realEstate).toBeCloseTo(3000);
  });

  it("none: 自動振替は発生せず、運用収益は区分ごとに記録される", () => {
    const plan = makePlan({
      baseYear: 2025,
      endYear: 2025,
      assets: [makeAsset({ category: "cash", amount: 1000 })],
      assumptions: makeAssumptions({
        returnRateByCategory: { cash: 1, investment: 0, realEstate: 0, other: 0 },
      }),
    });

    const rows = simulate(plan);
    expect(rows[0].autoTransfer).toBe(0);
    expect(rows[0].returnByCategory.cash).toBeCloseTo(10);
    expect(rows[0].balance).toBeCloseTo(1010);
  });
});
