import { describe, expect, it } from "vite-plus/test";
import { expandRetirement } from "../expand/retirement";
import type { RetirementEvent } from "../types";
import { makeContext, makePerson } from "./fixtures";

describe("expandRetirement", () => {
  it("退職年齢に達した年に退職金を一括計上する", () => {
    const person = makePerson({ id: "p1", birthDate: "1990-01-01" });
    const ctx = makeContext({ persons: [person], baseYear: 2025, endYear: 2060 });
    const event: RetirementEvent = {
      id: "r1",
      label: "架空の退職金",
      enabled: true,
      category: "otherIncome",
      kind: "retirement",
      personId: "p1",
      retireAge: 60,
      lumpSum: 1000,
    };
    const flows = expandRetirement(event, ctx);
    expect(flows).toEqual([
      {
        year: 2050,
        category: "otherIncome",
        direction: "in",
        amount: 1000,
        sourceEventId: "r1",
        label: "架空の退職金",
      },
    ]);
  });

  it("試算範囲外なら計上しない", () => {
    const person = makePerson({ id: "p1", birthDate: "1990-01-01" });
    const ctx = makeContext({ persons: [person], baseYear: 2025, endYear: 2030 });
    const event: RetirementEvent = {
      id: "r2",
      label: "架空の退職金",
      enabled: true,
      category: "otherIncome",
      kind: "retirement",
      personId: "p1",
      retireAge: 60,
      lumpSum: 1000,
    };
    expect(expandRetirement(event, ctx)).toEqual([]);
  });
});
