import { describe, expect, it } from "vite-plus/test";
import { expandEducation } from "../expand/education";
import type { EducationEvent } from "../types";
import { makeContext, makePerson } from "./fixtures";

describe("expandEducation", () => {
  it("入学金はステージ初年度のみ、年間費用は在学期間ずっと計上される", () => {
    const child = makePerson({ id: "child", birthDate: "2020-01-01" });
    const ctx = makeContext({ persons: [child], baseYear: 2020, endYear: 2040 });
    const event: EducationEvent = {
      id: "edu1",
      label: "架空の子の教育",
      enabled: true,
      category: "education",
      kind: "education",
      childId: "child",
      stages: [
        {
          id: "st1",
          label: "小学校",
          startAge: 6,
          durationYears: 6,
          entranceFee: 5,
          annualCost: 30,
        },
      ],
    };
    const flows = expandEducation(event, ctx);
    expect(flows).toHaveLength(6);
    expect(flows[0]).toMatchObject({ year: 2026, amount: 35 });
    expect(flows.slice(1).every((f) => f.amount === 30)).toBe(true);
    expect(flows.at(-1)?.year).toBe(2031);
  });

  it("複数ステージを時系列どおりに連結できる（浪人・進学の有無を上書きできることの確認）", () => {
    const child = makePerson({ id: "child", birthDate: "2010-01-01" });
    const ctx = makeContext({ persons: [child], baseYear: 2010, endYear: 2040 });
    const event: EducationEvent = {
      id: "edu2",
      label: "架空の子の教育",
      enabled: true,
      category: "education",
      kind: "education",
      childId: "child",
      stages: [
        {
          id: "st1",
          label: "高校",
          startAge: 15,
          durationYears: 3,
          entranceFee: 10,
          annualCost: 40,
        },
        // 1年の浪人を挟んで大学へ（startAge を+1することで表現できる）
        {
          id: "st2",
          label: "大学",
          startAge: 19,
          durationYears: 4,
          entranceFee: 20,
          annualCost: 60,
        },
      ],
    };
    const flows = expandEducation(event, ctx);
    const universityStart = flows.find((f) => f.year === 2029);
    expect(universityStart?.amount).toBe(80);
  });
});
