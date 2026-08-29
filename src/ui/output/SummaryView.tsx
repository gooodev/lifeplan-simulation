import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  type PieLabelRenderProps,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategoriesByDirection } from "@/store/hooks";
import { ASSET_CATEGORIES } from "../../domain/types";
import type { PlanInput } from "../../domain/types";
import { CHART_INK, seriesColor, useIsDarkMode } from "../charts/colors";
import { formatMan, formatManNumber } from "../format";
import { ASSET_CATEGORY_LABELS } from "../labels";
import { useCashflow } from "../useCashflow";

type SummaryViewProps = { plan: PlanInput };

const ASSET_CATEGORY_ITEMS = ASSET_CATEGORIES.map((category) => ({
  id: category,
  label: ASSET_CATEGORY_LABELS[category],
}));

const RADIAN = Math.PI / 180;

/**
 * 資産構成グラフのスライス直近ラベル。Pie の label prop（true/デフォルト）は
 * このバージョンではなぜか描画されなかったため、cx/cy/midAngle から
 * 自前で座標を計算する定番の方式に決め打ちしている。
 */
function renderAssetPieLabel(props: PieLabelRenderProps, textColor: string): React.ReactNode {
  const cx = Number(props.cx);
  const cy = Number(props.cy);
  const midAngle = props.midAngle ?? 0;
  const outerRadius = Number(props.outerRadius);
  const percent = props.percent ?? 0;
  const radius = outerRadius + 20;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fill={textColor}
      fontSize={12}
    >
      {`${props.name} ${Math.round(percent * 100)}%`}
    </text>
  );
}

/** 収支のバランス（PDF 3-1 相当）。任意の年の収入・支出内訳と資産内訳を切り替えて確認できる。 */
export function SummaryView({ plan }: SummaryViewProps) {
  const rows = useCashflow(plan);
  const isDark = useIsDarkMode();
  const incomeCategories = useCategoriesByDirection("in");
  const expenseCategories = useCategoriesByDirection("out");
  const [selectedYear, setSelectedYear] = useState(plan.baseYear);

  const selectedRow = rows.find((row) => row.year === selectedYear) ?? rows[0];

  if (!selectedRow) {
    return <p className="text-sm text-muted-foreground">試算年が設定されていません。</p>;
  }

  const incomeColor = isDark ? "#3987e5" : "#2a78d6";
  const expenseColor = isDark ? "#d95926" : "#eb6834";
  const ink = isDark ? CHART_INK.dark : CHART_INK.light;

  const chartData = [
    { name: "収入", 合計: Math.round(selectedRow.totalIncome) },
    { name: "支出", 合計: Math.round(selectedRow.totalExpense) },
  ];

  // 色は資産区分の固定順（ASSET_CATEGORIES）でインデックスを引く。
  // 表示から外れる区分があっても残りの区分の色がずれないようにするため。
  const assetPieData = ASSET_CATEGORIES.map((category, index) => ({
    key: category,
    name: ASSET_CATEGORY_LABELS[category],
    value: Math.round(selectedRow.assetsByCategory[category]),
    color: seriesColor(index, isDark),
  })).filter((entry) => entry.value > 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">表示する年</span>
        <Select
          value={String(selectedRow.year)}
          onValueChange={(value) => setSelectedYear(Number(value))}
        >
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {rows.map((row) => (
              <SelectItem key={row.year} value={String(row.year)}>
                {row.year}年
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <BreakdownCard
          title="収入"
          categories={incomeCategories}
          values={selectedRow.incomeByCategory}
          total={selectedRow.totalIncome}
        />
        <BreakdownCard
          title="支出"
          categories={expenseCategories}
          values={selectedRow.expenseByCategory}
          total={selectedRow.totalExpense}
        />
      </div>

      <Card>
        <CardContent className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 24, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={isDark ? "#2c2c2a" : "#e1e0d9"}
              />
              <XAxis dataKey="name" stroke="#898781" tickLine={false} />
              <YAxis stroke="#898781" tickLine={false} tickFormatter={formatManNumber} />
              <Tooltip formatter={(value) => formatMan(Number(value))} />
              <Bar dataKey="合計" radius={[4, 4, 0, 0]}>
                <LabelList
                  dataKey="合計"
                  position="top"
                  formatter={(value) => formatMan(Number(value))}
                />
                {chartData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={entry.name === "収入" ? incomeColor : expenseColor}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <BreakdownCard
          title={`資産内訳（${selectedRow.year}年時点）`}
          categories={ASSET_CATEGORY_ITEMS}
          values={selectedRow.assetsByCategory}
          total={selectedRow.balance}
        />
        <BreakdownCard
          title={`負債内訳（${selectedRow.year}年時点）`}
          categories={selectedRow.liabilities.map((item, index) => ({
            id: String(index),
            label: item.label,
          }))}
          values={Object.fromEntries(
            selectedRow.liabilities.map((item, index) => [String(index), item.amount]),
          )}
          total={selectedRow.totalLiabilities}
          emptyLabel="負債はありません"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>資産構成（{selectedRow.year}年時点）</CardTitle>
        </CardHeader>
        <CardContent className="h-72 w-full">
          {assetPieData.length === 0 ? (
            <p className="text-sm text-muted-foreground">資産が登録されていません</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={assetPieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="45%"
                  outerRadius="65%"
                  paddingAngle={assetPieData.length > 1 ? 2 : 0}
                  label={(props: PieLabelRenderProps) => renderAssetPieLabel(props, ink.secondary)}
                  labelLine={{ stroke: ink.muted }}
                  isAnimationActive={false}
                >
                  {assetPieData.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} stroke={ink.surface} strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatMan(Number(value))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-foreground">
        純資産（{selectedRow.year}年時点）:{" "}
        <span className="font-semibold">
          {formatMan(selectedRow.balance - selectedRow.totalLiabilities)}
        </span>
      </p>
    </div>
  );
}

function BreakdownCard({
  title,
  categories,
  values,
  total,
  emptyLabel,
}: {
  title: string;
  categories: { id: string; label: string }[];
  values: Partial<Record<string, number>>;
  total: number;
  emptyLabel?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {categories.length === 0 && emptyLabel ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} className="border-b">
                  <td className="py-1 text-muted-foreground">{category.label}</td>
                  <td className="py-1 text-right tabular-nums text-foreground">
                    {formatMan(values[category.id] ?? 0)}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="py-1 font-semibold text-foreground">合計</td>
                <td className="py-1 text-right font-semibold tabular-nums text-foreground">
                  {formatMan(total)}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
