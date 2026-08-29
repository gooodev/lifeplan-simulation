import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlanInput } from "../../domain/types";
import { CHART_INK, seriesColor, useIsDarkMode } from "../charts/colors";
import { formatMan, formatManNumber } from "../format";
import { useCashflow } from "../useCashflow";

type BalanceChartProps = { plan: PlanInput };

/** 貯蓄残高の推移（PDF 5-1 相当）。単一系列なので凡例は出さず、見出しで系列名を示す。 */
export function BalanceChart({ plan }: BalanceChartProps) {
  const rows = useCashflow(plan);
  const isDark = useIsDarkMode();
  const ink = isDark ? CHART_INK.dark : CHART_INK.light;
  const color = seriesColor(0, isDark);

  const data = rows.map((row) => ({ year: row.year, balance: Math.round(row.balance) }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>貯蓄残高の推移</CardTitle>
      </CardHeader>
      <CardContent className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={ink.grid} vertical={false} />
            <XAxis dataKey="year" stroke={ink.muted} tickLine={false} />
            <YAxis stroke={ink.muted} tickLine={false} tickFormatter={formatManNumber} />
            <ReferenceLine y={0} stroke={ink.axis} />
            <Tooltip
              formatter={(value) => formatMan(Number(value))}
              labelFormatter={(label) => `${label as number}年`}
            />
            <Line
              type="monotone"
              dataKey="balance"
              name="貯蓄残高"
              stroke={color}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
