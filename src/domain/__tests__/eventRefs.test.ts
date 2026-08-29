import { describe, expect, it } from "vite-plus/test";
import { simulate } from "../cashflow";
import { eventReferencesPerson, remapEventPersonIds } from "../eventRefs";
import type { FlowEvent, HousingBuyEvent, MarkerEvent, SalaryEvent } from "../types";
import { makePerson, makePlan } from "./fixtures";

describe("eventReferencesPerson", () => {
  it("period.start が年齢基準タイミングで参照する人物も検出する（主な対象者ではなくても）", () => {
    const event: FlowEvent = {
      id: "f1",
      label: "架空の支出",
      enabled: true,
      category: "other",
      kind: "flow",
      direction: "out",
      // subjectId は未設定（世帯全体扱い）でも、period.start が特定の人物の年齢を参照している
      period: { start: { type: "age", personId: "child-1", age: 6 } },
      amount: 10,
    };
    expect(eventReferencesPerson(event, "child-1")).toBe(true);
    expect(eventReferencesPerson(event, "other-person")).toBe(false);
  });

  it("housingBuy の maintenanceUntil が参照する人物も検出する", () => {
    const event: HousingBuyEvent = {
      id: "h1",
      label: "架空の住宅",
      enabled: true,
      category: "housing",
      kind: "housingBuy",
      timing: { type: "year", year: 2025 },
      price: 5000,
      initialCashOutlay: 500,
      maintenanceAnnual: 10,
      maintenanceUntil: { type: "age", personId: "self", age: 80 },
      loans: [],
    };
    expect(eventReferencesPerson(event, "self")).toBe(true);
  });
});

describe("remapEventPersonIds", () => {
  it("flow イベントの period.start/end に含まれる年齢基準の personId を付け替える", () => {
    const event: FlowEvent = {
      id: "f1",
      label: "架空の教育費的支出",
      enabled: true,
      category: "other",
      kind: "flow",
      direction: "out",
      period: {
        start: { type: "age", personId: "old-child", age: 6 },
        end: { type: "age", personId: "old-child", age: 18 },
      },
      amount: 10,
    };
    const map = new Map([["old-child", "new-child"]]);
    const remapped = remapEventPersonIds(event, map, "f1-new") as FlowEvent;

    expect(remapped.period.start).toEqual({ type: "age", personId: "new-child", age: 6 });
    expect(remapped.period.end).toEqual({ type: "age", personId: "new-child", age: 18 });
  });

  it("salary イベントの personId と period.start の両方を付け替える", () => {
    const event: SalaryEvent = {
      id: "s1",
      label: "架空の給与",
      enabled: true,
      category: "salary",
      kind: "salary",
      personId: "old-self",
      period: { start: { type: "age", personId: "old-self", age: 60 }, intervalYears: 1 },
      annualAmount: 500,
      growthRate: 0,
    };
    const map = new Map([["old-self", "new-self"]]);
    const remapped = remapEventPersonIds(event, map, "s1-new") as SalaryEvent;

    expect(remapped.personId).toBe("new-self");
    expect(remapped.period.start).toEqual({ type: "age", personId: "new-self", age: 60 });
  });

  it("marker イベントの timing に含まれる年齢基準の personId を付け替える", () => {
    const event: MarkerEvent = {
      id: "m1",
      label: "架空の節目",
      enabled: true,
      category: "other",
      kind: "marker",
      timing: { type: "age", personId: "old-self", age: 60 },
    };
    const map = new Map([["old-self", "new-self"]]);
    const remapped = remapEventPersonIds(event, map, "m1-new") as MarkerEvent;

    expect(remapped.timing).toEqual({ type: "age", personId: "new-self", age: 60 });
  });

  it("回帰テスト: プラン複製相当の付け替え後も simulate() が「人物が見つかりません」で落ちない", () => {
    const original = makePerson({ id: "orig-self", role: "self", birthDate: "1990-01-01" });
    const event: FlowEvent = {
      id: "e1",
      label: "架空のイベント（60歳から発生）",
      enabled: true,
      category: "other",
      kind: "flow",
      direction: "out",
      period: { start: { type: "age", personId: "orig-self", age: 60 }, intervalYears: 1 },
      amount: 10,
    };

    const personIdMap = new Map([[original.id, "dup-self"]]);
    const duplicatedPerson = { ...original, id: "dup-self" };
    const duplicatedEvent = remapEventPersonIds(event, personIdMap, "e1-dup");

    const plan = makePlan({
      baseYear: 2025,
      endYear: 2026,
      persons: [duplicatedPerson],
      events: [duplicatedEvent],
    });

    expect(() => simulate(plan)).not.toThrow();
  });
});
