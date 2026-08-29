import { describe, expect, it } from "vite-plus/test";
import { expandInsurance } from "../expand/insurance";
import type { InsuranceEvent } from "../types";
import { makeContext, makePerson } from "./fixtures";

describe("expandInsurance", () => {
  it("保険料は払込満了年齢の前年まで毎年発生する", () => {
    const person = makePerson({ id: "p1", birthDate: "1990-01-01" });
    const ctx = makeContext({ persons: [person], baseYear: 2025, endYear: 2060 });
    const event: InsuranceEvent = {
      id: "ins1",
      label: "架空の終身保険",
      enabled: true,
      category: "insurance",
      kind: "insurance",
      insuredId: "p1",
      annualPremium: 5,
      premiumUntilAge: 60,
    };
    const flows = expandInsurance(event, ctx);
    expect(flows.every((f) => f.direction === "out" && f.amount === 5)).toBe(true);
    expect(flows.at(-1)?.year).toBe(2049); // 60歳になる2050年の前年
  });

  it("満期金を設定すると満期年齢の年に収入として計上される", () => {
    const person = makePerson({ id: "p1", birthDate: "1990-01-01" });
    const ctx = makeContext({ persons: [person], baseYear: 2025, endYear: 2090 });
    const event: InsuranceEvent = {
      id: "ins2",
      label: "架空の養老保険",
      enabled: true,
      category: "insurance",
      kind: "insurance",
      insuredId: "p1",
      annualPremium: 3,
      premiumUntilAge: 60,
      maturity: { age: 65, amount: 200 },
    };
    const flows = expandInsurance(event, ctx);
    const maturityFlow = flows.find((f) => f.direction === "in");
    expect(maturityFlow).toMatchObject({ year: 2055, amount: 200, category: "otherIncome" });
  });
});
