import { useEffect, useState } from "react";

/**
 * dataviz スキルの検証済みデフォルトパレット。
 * scripts/validate_palette.js で4色サブセット・light/darkとも
 * 隣接ペアのCVD分離・可読性チェックを通過済み（要出典: dataviz skill references/palette.md）。
 */
export const CATEGORICAL_LIGHT = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#4a3aa7", // violet
  "#e34948", // red
];

export const CATEGORICAL_DARK = [
  "#3987e5",
  "#d95926",
  "#199e70",
  "#c98500",
  "#d55181",
  "#008300",
  "#9085e9",
  "#e66767",
];

export const CHART_INK = {
  light: {
    primary: "#0b0b0b",
    secondary: "#52514e",
    muted: "#898781",
    grid: "#e1e0d9",
    axis: "#c3c2b7",
    surface: "#fcfcfb",
  },
  dark: {
    primary: "#ffffff",
    secondary: "#c3c2b7",
    muted: "#898781",
    grid: "#2c2c2a",
    axis: "#383835",
    surface: "#1a1a19",
  },
} as const;

/** ビューアのカラースキームを購読する。ダーク/ライトでチャートの色を切り替えるために使う。 */
export function useIsDarkMode(): boolean {
  const [isDark, setIsDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (event: MediaQueryListEvent) => setIsDark(event.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return isDark;
}

/** カテゴリ順（固定順）に対応する色を返す。系列の増減で既存系列の色が変わらないよう、常に固定インデックスで引く。 */
export function seriesColor(index: number, isDark: boolean): string {
  const palette = isDark ? CATEGORICAL_DARK : CATEGORICAL_LIGHT;
  return palette[index % palette.length];
}
