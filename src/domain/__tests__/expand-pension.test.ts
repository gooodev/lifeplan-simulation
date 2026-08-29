import { describe, expect, it } from "vite-plus/test";
import { expandPension } from "../expand/pension";
import type { PensionEvent } from "../types";
import { makeContext, makePerson } from "./fixtures";

describe("expandPension", () => {
  it("基礎年金・厚生年金の簡易計算が docs/private/lifeplan.pdf 3-2 の帳票値とほぼ一致する", () => {
    // 検算専用の架空人物（実データではなく、PDFの加入条件だけを模したもの）
    const person = makePerson({ id: "p1", birthDate: "1963-01-01", lifeEndAge: 100 });
    const ctx = makeContext({ persons: [person], baseYear: 2023, endYear: 2023 + 100 });
    const event: PensionEvent = {
      id: "pension1",
      label: "架空の年金",
      enabled: true,
      category: "pension",
      kind: "pension",
      personId: "p1",
      enrollFromAge: 23,
      enrollToAge: 60,
      monthlyIncome: 48,
      receiveFromAge: 65,
      // 63歳の年に受給開始年を迎えるよう調整（receiveFromAge=65 なので2028年から受給）
    };
    const flows = expandPension(event, ctx);
    expect(flows[0].amount).toBeCloseTo(72.15 + 116.81, 1);
  });

  it("受給は receiveFromAge の年から lifeEndAge の年まで", () => {
    const person = makePerson({ id: "p2", birthDate: "1960-01-01", lifeEndAge: 90 });
    const ctx = makeContext({ persons: [person], baseYear: 2000, endYear: 2060 });
    const event: PensionEvent = {
      id: "pension2",
      label: "架空の年金",
      enabled: true,
      category: "pension",
      kind: "pension",
      personId: "p2",
      enrollFromAge: 20,
      enrollToAge: 60,
      monthlyIncome: 30,
      receiveFromAge: 65,
    };
    const flows = expandPension(event, ctx);
    expect(flows[0].year).toBe(2025); // 1960+65
    expect(flows.at(-1)?.year).toBe(2050); // 1960+90
  });
});
