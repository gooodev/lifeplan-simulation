import type { Period, Person, Timing } from "../domain/types";

/** 万円単位の数値を「1,234万円」のような表示用文字列にする。 */
export function formatMan(amount: number): string {
  const rounded = Math.round(amount * 10) / 10;
  return `${rounded.toLocaleString("ja-JP")}万円`;
}

/** グラフの軸ラベルなど、単位を省いた数値表示。 */
export function formatManNumber(amount: number): string {
  return Math.round(amount).toLocaleString("ja-JP");
}

function formatTiming(timing: Timing, persons: Person[]): string {
  switch (timing.type) {
    case "year":
      return `${timing.year}年`;
    case "offset":
      return `${timing.years}年後`;
    case "age": {
      const person = persons.find((p) => p.id === timing.personId);
      return `${person?.name ?? "?"}が${timing.age}歳`;
    }
  }
}

/** スプレッドシートの「期間」列に表示する短い要約文字列。 */
export function formatPeriodSummary(period: Period, persons: Person[]): string {
  const start = formatTiming(period.start, persons);
  const interval = period.intervalYears && period.intervalYears > 0 ? period.intervalYears : 0;
  const frequency = interval === 0 ? "単発" : interval === 1 ? "毎年" : `${interval}年毎`;
  const end =
    period.end && period.end.type !== "never" ? `〜${formatTiming(period.end, persons)}` : "";
  return interval === 0 ? `${start}（${frequency}）` : `${start}${end}（${frequency}）`;
}
