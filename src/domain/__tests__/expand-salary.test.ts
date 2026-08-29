import { describe, expect, it } from "vite-plus/test";
import { expandSalary } from "../expand/salary";
import type { SalaryEvent } from "../types";
import { makeAssumptions, makeContext } from "./fixtures";

describe("expandSalary", () => {
  it("昇給率0%なら額面が一定のまま続く（PDF互換の既定挙動）", () => {
    const ctx = makeContext({ baseYear: 2025, endYear: 2027 });
    const event: SalaryEvent = {
      id: "s1",
      label: "架空の給与",
      enabled: true,
      category: "salary",
      kind: "salary",
      personId: "self",
      period: { start: { type: "year", year: 2025 }, intervalYears: 1 },
      annualAmount: 500,
      growthRate: 0,
    };
    const flows = expandSalary(event, ctx);
    expect(flows.map((f) => f.amount)).toEqual([500, 500, 500]);
  });

  it("昇給率を指定すると複利で増える", () => {
    const ctx = makeContext({ baseYear: 2025, endYear: 2027 });
    const event: SalaryEvent = {
      id: "s2",
      label: "架空の給与",
      enabled: true,
      category: "salary",
      kind: "salary",
      personId: "self",
      period: { start: { type: "year", year: 2025 }, intervalYears: 1 },
      annualAmount: 500,
      growthRate: 5,
    };
    const flows = expandSalary(event, ctx);
    expect(flows[0].amount).toBeCloseTo(500, 5);
    expect(flows[1].amount).toBeCloseTo(525, 5);
    expect(flows[2].amount).toBeCloseTo(551.25, 5);
  });

  it("手取り換算率を適用すると額面に率を乗じた額になる", () => {
    const ctx = makeContext({
      baseYear: 2025,
      endYear: 2025,
      assumptions: makeAssumptions({ takeHomeRate: 80 }),
    });
    const event: SalaryEvent = {
      id: "s3",
      label: "架空の給与",
      enabled: true,
      category: "salary",
      kind: "salary",
      personId: "self",
      period: { start: { type: "year", year: 2025 } },
      annualAmount: 500,
      growthRate: 0,
    };
    expect(expandSalary(event, ctx)[0].amount).toBeCloseTo(400, 5);
  });

  it("特定年の金額を上書きできる（転職・休職の再現）", () => {
    const ctx = makeContext({ baseYear: 2025, endYear: 2027 });
    const event: SalaryEvent = {
      id: "s4",
      label: "架空の給与",
      enabled: true,
      category: "salary",
      kind: "salary",
      personId: "self",
      period: { start: { type: "year", year: 2025 }, intervalYears: 1 },
      annualAmount: 500,
      growthRate: 0,
      overrides: [{ year: 2026, amount: 0 }],
    };
    const flows = expandSalary(event, ctx);
    expect(flows.map((f) => f.amount)).toEqual([500, 0, 500]);
  });
});
