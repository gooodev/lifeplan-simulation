import { describe, expect, it } from "vite-plus/test";
import { expandHousingBuy } from "../expand/housing";
import type { HousingBuyEvent } from "../types";
import { makeContext } from "./fixtures";

describe("expandHousingBuy", () => {
  it("購入年に自己資金・初年度ローン返済・共益費がまとめて計上される（PDF 4-2 相当の検算）", () => {
    const ctx = makeContext({ baseYear: 2024, endYear: 2024 });
    const event: HousingBuyEvent = {
      id: "h1",
      label: "架空のマンション購入",
      enabled: true,
      category: "housing",
      kind: "housingBuy",
      timing: { type: "year", year: 2024 },
      price: 8000,
      initialCashOutlay: 650,
      maintenanceAnnual: 36,
      loans: [{ principal: 8000, termYears: 35, annualRatePercent: 0.8 }],
    };
    const flows = expandHousingBuy(event, ctx);
    const total = flows.reduce((sum, f) => sum + f.amount, 0);
    expect(total).toBeCloseTo(948.1, 0);
  });

  it("ローン完済後は共益費だけが残る", () => {
    const ctx = makeContext({ baseYear: 2024, endYear: 2060 });
    const event: HousingBuyEvent = {
      id: "h2",
      label: "架空の一戸建て購入",
      enabled: true,
      category: "housing",
      kind: "housingBuy",
      timing: { type: "year", year: 2024 },
      price: 3000,
      initialCashOutlay: 300,
      maintenanceAnnual: 10,
      loans: [{ principal: 3000, termYears: 10, annualRatePercent: 1 }],
    };
    const flows = expandHousingBuy(event, ctx);
    const in2040 = flows.filter((f) => f.year === 2040);
    expect(in2040).toHaveLength(1);
    expect(in2040[0].amount).toBe(10);
  });

  it("maintenanceUntil を指定すると共益費がそこで打ち切られる（買い替え・売却の表現）", () => {
    const ctx = makeContext({ baseYear: 2024, endYear: 2030 });
    const event: HousingBuyEvent = {
      id: "h3",
      label: "架空のマンション（売却予定）",
      enabled: true,
      category: "housing",
      kind: "housingBuy",
      timing: { type: "year", year: 2024 },
      price: 3000,
      initialCashOutlay: 300,
      maintenanceAnnual: 10,
      maintenanceUntil: { type: "year", year: 2026 },
      loans: [],
    };
    const flows = expandHousingBuy(event, ctx);
    expect(flows.filter((f) => f.category === "housing" && f.year > 2026)).toHaveLength(0);
    expect(flows.filter((f) => f.year === 2026)).toHaveLength(1);
  });
});
