import { describe, expect, it } from "vite-plus/test";
import { expandFlow } from "../expand/flow";
import type { FlowEvent } from "../types";
import { makeContext } from "./fixtures";

describe("expandFlow", () => {
  const ctx = makeContext({ baseYear: 2025, endYear: 2035 });

  it("単発の支出イベントを1件だけ展開する", () => {
    const event: FlowEvent = {
      id: "e1",
      label: "架空の臨時支出",
      enabled: true,
      category: "other",
      kind: "flow",
      direction: "out",
      period: { start: { type: "year", year: 2027 } },
      amount: 50,
    };
    expect(expandFlow(event, ctx)).toEqual([
      {
        year: 2027,
        category: "other",
        direction: "out",
        amount: 50,
        sourceEventId: "e1",
        label: "架空の臨時支出",
      },
    ]);
  });

  it("繰返しイベントを毎年展開する", () => {
    const event: FlowEvent = {
      id: "e2",
      label: "架空の旅行",
      enabled: true,
      category: "travel",
      kind: "flow",
      direction: "out",
      period: {
        start: { type: "year", year: 2025 },
        end: { type: "year", year: 2027 },
        intervalYears: 1,
      },
      amount: 10,
    };
    const flows = expandFlow(event, ctx);
    expect(flows.map((f) => f.year)).toEqual([2025, 2026, 2027]);
    expect(flows.every((f) => f.amount === 10)).toBe(true);
  });

  it("growthRate を指定すると発生年からの経過年数で複利成長する", () => {
    const event: FlowEvent = {
      id: "e3",
      label: "架空の積立収入",
      enabled: true,
      category: "otherIncome",
      kind: "flow",
      direction: "in",
      period: {
        start: { type: "year", year: 2025 },
        end: { type: "year", year: 2027 },
        intervalYears: 1,
      },
      amount: 100,
      growthRate: 10,
    };
    const flows = expandFlow(event, ctx);
    expect(flows[0].amount).toBeCloseTo(100, 5);
    expect(flows[1].amount).toBeCloseTo(110, 5);
    expect(flows[2].amount).toBeCloseTo(121, 5);
  });
});
