import type { Period, Person, SimulationContext, Timing } from "./types";

/**
 * 年齢は「year - 生年」の年単位で扱う（月日は見ない）。
 * PDF 帳票自身がこの粒度（誕生年からの経過年数）で年齢表を作っているため、
 * それに合わせる。子が生まれる前の年は負の年齢になり得る（PDF にも -2歳 等の表記がある）。
 */
export function birthYear(person: Person): number {
  const year = Number.parseInt(person.birthDate.slice(0, 4), 10);
  if (Number.isNaN(year)) {
    throw new Error(`不正な生年月日です: ${person.birthDate}`);
  }
  return year;
}

export function ageInYear(person: Person, year: number): number {
  return year - birthYear(person);
}

/** 指定した人物が ageAtYear 歳になる西暦年。 */
export function yearWhenAge(person: Person, age: number): number {
  return birthYear(person) + age;
}

export type TimingContext = Pick<SimulationContext, "persons" | "baseYear">;

export function findPerson(personId: string, persons: Person[]): Person {
  const person = persons.find((p) => p.id === personId);
  if (!person) {
    throw new Error(`人物が見つかりません: ${personId}`);
  }
  return person;
}

export function resolveTiming(timing: Timing, ctx: TimingContext): number {
  switch (timing.type) {
    case "year":
      return timing.year;
    case "offset":
      return ctx.baseYear + timing.years;
    case "age":
      return yearWhenAge(findPerson(timing.personId, ctx.persons), timing.age);
  }
}

/** 試算終了年を含むコンテキスト。end 省略時や never 指定時の終端として使う。 */
export type PeriodContext = SimulationContext;

/**
 * Period を試算範囲内の発生年の配列に展開する。
 * intervalYears が未指定または 0 以下なら単発（start の年のみ）。
 */
export function resolvePeriodYears(period: Period, ctx: PeriodContext): number[] {
  const startYear = resolveTiming(period.start, ctx);
  const endYear =
    period.end === undefined || period.end.type === "never"
      ? ctx.endYear
      : resolveTiming(period.end, ctx);

  const interval =
    period.intervalYears && period.intervalYears > 0 ? Math.floor(period.intervalYears) : 0;

  const years: number[] = [];
  if (interval === 0) {
    if (startYear >= ctx.baseYear && startYear <= ctx.endYear) {
      years.push(startYear);
    }
    return years;
  }

  const clampedEnd = Math.min(endYear, ctx.endYear);
  for (let year = startYear; year <= clampedEnd; year += interval) {
    if (year >= ctx.baseYear) {
      years.push(year);
    }
  }
  return years;
}
