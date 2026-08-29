import { describe, expect, it } from "vite-plus/test";
import { ageInYear, resolvePeriodYears, resolveTiming, yearWhenAge } from "../timing";
import { makeContext, makePerson } from "./fixtures";

describe("ageInYear / yearWhenAge", () => {
  it("生年からその年の年齢を計算できる", () => {
    const person = makePerson({ birthDate: "1990-06-01" });
    expect(ageInYear(person, 2025)).toBe(35);
  });

  it("生まれる前の年は負の年齢になる（PDFの-2歳のような表記に対応）", () => {
    const person = makePerson({ birthDate: "2027-01-01" });
    expect(ageInYear(person, 2025)).toBe(-2);
  });

  it("yearWhenAge は ageInYear の逆演算になる", () => {
    const person = makePerson({ birthDate: "1990-01-01" });
    expect(yearWhenAge(person, 35)).toBe(2025);
  });
});

describe("resolveTiming", () => {
  const ctx = makeContext({ baseYear: 2025 });

  it("year 指定はそのまま西暦を返す", () => {
    expect(resolveTiming({ type: "year", year: 2030 }, ctx)).toBe(2030);
  });

  it("offset 指定は baseYear からの相対年になる", () => {
    expect(resolveTiming({ type: "offset", years: 3 }, ctx)).toBe(2028);
  });

  it("age 指定は対象人物がその年齢になる年になる", () => {
    const person = makePerson({ id: "self", birthDate: "1990-01-01" });
    const ctxWithPerson = makeContext({ persons: [person] });
    expect(resolveTiming({ type: "age", personId: "self", age: 40 }, ctxWithPerson)).toBe(2030);
  });

  it("存在しない人物IDを指定するとエラーになる", () => {
    expect(() => resolveTiming({ type: "age", personId: "unknown", age: 40 }, ctx)).toThrow();
  });
});

describe("resolvePeriodYears", () => {
  const ctx = makeContext({ baseYear: 2025, endYear: 2035 });

  it("interval未指定なら単発イベントとして1年分だけ返す", () => {
    const years = resolvePeriodYears({ start: { type: "year", year: 2027 } }, ctx);
    expect(years).toEqual([2027]);
  });

  it("interval=1なら毎年発生する", () => {
    const years = resolvePeriodYears(
      { start: { type: "year", year: 2025 }, end: { type: "year", year: 2028 }, intervalYears: 1 },
      ctx,
    );
    expect(years).toEqual([2025, 2026, 2027, 2028]);
  });

  it("interval=nならn年毎に発生する", () => {
    const years = resolvePeriodYears(
      { start: { type: "year", year: 2025 }, end: { type: "year", year: 2035 }, intervalYears: 3 },
      ctx,
    );
    expect(years).toEqual([2025, 2028, 2031, 2034]);
  });

  it("end省略時は試算終了年まで続く", () => {
    const years = resolvePeriodYears(
      { start: { type: "year", year: 2033 }, intervalYears: 1 },
      ctx,
    );
    expect(years).toEqual([2033, 2034, 2035]);
  });

  it("試算範囲外の年は除外される", () => {
    const years = resolvePeriodYears(
      { start: { type: "year", year: 2020 }, end: { type: "year", year: 2040 }, intervalYears: 5 },
      ctx,
    );
    // 2020, 2025, 2030, 2035, 2040 のうち [2025, 2035] に収まるものだけ
    expect(years).toEqual([2025, 2030, 2035]);
  });
});
