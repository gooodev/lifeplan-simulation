import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCategoriesByDirection } from "@/store/hooks";
import type { PlanInput } from "../../domain/types";
import { CHART_INK, seriesColor, useIsDarkMode } from "../charts/colors";
import { formatMan, formatManNumber } from "../format";
import { useCashflow } from "../useCashflow";

const OTHER_KEY = "__other";
// dataviz: 隣接ペアでの識別性を保つため、カテゴリ数に関わらず上位4件＋その他に折りたたむ。
const MAX_SERIES = 4;

type CategoryBreakdownChartProps = { plan: PlanInput };

export function CategoryBreakdownChart({ plan }: CategoryBreakdownChartProps) {
  const rows = useCashflow(plan);
  const isDark = useIsDarkMode();
  const ink = isDark ? CHART_INK.dark : CHART_INK.light;
  const expenseCategories = useCategoriesByDirection("out");

  const totals = new Map<string, number>();
  for (const category of expenseCategories) {
    const total = rows.reduce((sum, row) => sum + (row.expenseByCategory[category.id] ?? 0), 0);
    totals.set(category.id, total);
  }
  const topCategories = [...expenseCategories]
    .sort((a, b) => (totals.get(b.id) ?? 0) - (totals.get(a.id) ?? 0))
    .slice(0, MAX_SERIES);
  const topIds = new Set(topCategories.map((c) => c.id));
  const hasOther = expenseCategories.some((c) => !topIds.has(c.id) && (totals.get(c.id) ?? 0) > 0);

  const series = hasOther
    ? [...topCategories.slice(0, MAX_SERIES - 1), { id: OTHER_KEY, label: "その他" }]
    : topCategories;

  const data = rows.map((row) => {
    const entry: Record<string, number> = { year: row.year };
    let other = 0;
    for (const category of expenseCategories) {
      const value = row.expenseByCategory[category.id] ?? 0;
      if (series.some((s) => s.id === category.id)) {
        entry[category.id] = Math.round(value);
      } else {
        other += value;
      }
    }
    if (hasOther) {
      entry[OTHER_KEY] = Math.round(other);
    }
    return entry;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>支出カテゴリ別の推移（上位{series.length}件）</CardTitle>
      </CardHeader>
      <CardContent className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={ink.grid} vertical={false} />
            <XAxis dataKey="year" stroke={ink.muted} tickLine={false} />
            <YAxis stroke={ink.muted} tickLine={false} tickFormatter={formatManNumber} />
            <Tooltip
              formatter={(value) => formatMan(Number(value))}
              labelFormatter={(label) => `${label as number}年`}
            />
            <Legend />
            {series.map((category, index) => (
              <Area
                key={category.id}
                type="monotone"
                dataKey={category.id}
                name={category.label}
                stackId="expense"
                stroke={seriesColor(index, isDark)}
                fill={seriesColor(index, isDark)}
                fillOpacity={0.65}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
