import type { Entry } from "./simulate";

/**
 * 明細を「年 × グループ」で合計する。グループのキーは keyOf で決め、undefined を返した明細は除く。
 * 例: 支出を type タグ別に集計する
 *   groupEntries(result.entries, byTag("type"), (e) => e.kind !== "transfer" && e.direction === "out")
 */
export function groupEntries(
  entries: Entry[],
  keyOf: (entry: Entry) => string | undefined,
  filter: (entry: Entry) => boolean = () => true,
): Map<number, Map<string, number>> {
  const result = new Map<number, Map<string, number>>();
  for (const entry of entries) {
    if (!filter(entry)) {
      continue;
    }
    const key = keyOf(entry);
    if (key === undefined) {
      continue;
    }
    const byKey = result.get(entry.year) ?? new Map<string, number>();
    byKey.set(key, (byKey.get(key) ?? 0) + entry.amount);
    result.set(entry.year, byKey);
  }
  return result;
}

/** 指定したタグの値をグループのキーにする。タグのない明細は fallback（省略時は除外）。 */
export function byTag(tagKey: string, fallback?: string): (entry: Entry) => string | undefined {
  return (entry) => entry.tags[tagKey] ?? fallback;
}
