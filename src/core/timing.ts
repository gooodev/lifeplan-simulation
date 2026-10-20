import type { Basis, Period, Timing } from "./schema";

/**
 * Timing を西暦年に解決する。年齢は「西暦 − 生年」の年単位で扱う。
 * 人物の存在は validate.ts で確認済みである前提。
 */
export function resolveYear(timing: Timing, basis: Basis): number {
  switch (timing.type) {
    case "year":
      return timing.year;
    case "offset":
      return basis.startYear + timing.years;
    case "age": {
      const person = basis.persons.find((p) => p.id === timing.personId);
      if (!person) {
        throw new Error(`人物が見つかりません: ${timing.personId}`);
      }
      return person.birthYear + timing.age;
    }
  }
}

/**
 * Period を、試算期間内に発生する年の配列（昇順）に展開する。
 * 期間の開始年が試算開始年より前でも、試算期間内の発生年だけを返す
 * （n年毎の周期は期間の開始年を起点に数える）。
 */
export function resolvePeriodYears(period: Period, basis: Basis): number[] {
  const startYear = resolveYear(period.start, basis);
  const interval = period.intervalYears ?? 0;
  const inRange = (y: number): boolean => y >= basis.startYear && y <= basis.endYear;

  if (interval === 0) {
    return inRange(startYear) ? [startYear] : [];
  }

  const lastYear = Math.min(
    period.end ? resolveYear(period.end, basis) : basis.endYear,
    basis.endYear,
  );
  const years: number[] = [];
  for (let y = startYear; y <= lastYear; y += interval) {
    if (inRange(y)) {
      years.push(y);
    }
  }
  return years;
}
