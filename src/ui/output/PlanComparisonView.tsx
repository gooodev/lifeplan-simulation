import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { simulate } from "../../domain/cashflow";
import type { PlanInput } from "../../domain/types";
import { CHART_INK, seriesColor, useIsDarkMode } from "../charts/colors";
import { formatMan, formatManNumber } from "../format";

type PlanComparisonViewProps = { plans: PlanInput[] };

/** 複数プランの貯蓄残高を重ねて比較する（PDF 5-1 の「現状 vs 提案プラン」に相当）。 */
export function PlanComparisonView({ plans }: PlanComparisonViewProps) {
  const isDark = useIsDarkMode();
  const ink = isDark ? CHART_INK.dark : CHART_INK.light;
  const [hiddenPlanIds, setHiddenPlanIds] = useState<Set<string>>(new Set());

  const togglePlan = (planId: string) => {
    setHiddenPlanIds((prev) => {
      const next = new Set(prev);
      if (next.has(planId)) {
        next.delete(planId);
      } else {
        next.add(planId);
      }
      return next;
    });
  };

  const visiblePlans = plans.filter((plan) => !hiddenPlanIds.has(plan.id));

  const cashflows = useMemo(
    () => visiblePlans.map((plan) => ({ plan, rows: simulate(plan) })),
    [visiblePlans],
  );

  const chartData = useMemo(() => {
    const allYears = Array.from(
      new Set(cashflows.flatMap(({ rows }) => rows.map((row) => row.year))),
    ).sort((a, b) => a - b);
    return allYears.map((year) => {
      const entry: Record<string, number> = { year };
      for (const { plan, rows } of cashflows) {
        const row = rows.find((r) => r.year === year);
        if (row) {
          entry[plan.id] = Math.round(row.balance);
        }
      }
      return entry;
    });
  }, [cashflows]);

  if (plans.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        比較するには2つ以上のプランが必要です。プランを複製して条件を変えてみてください。
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {plans.map((plan, index) => {
          const checked = !hiddenPlanIds.has(plan.id);
          return (
            <label
              key={plan.id}
              className="flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm select-none"
            >
              <Checkbox checked={checked} onCheckedChange={() => togglePlan(plan.id)} />
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: seriesColor(index, isDark) }}
              />
              <span className={checked ? "text-foreground" : "text-muted-foreground"}>
                {plan.name}
              </span>
            </label>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>貯蓄残高の比較</CardTitle>
        </CardHeader>
        <CardContent className="h-80 w-full">
          {visiblePlans.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              表示するプランがありません。上のチェックを入れてください。
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={ink.grid} vertical={false} />
                <XAxis dataKey="year" stroke={ink.muted} tickLine={false} />
                <YAxis stroke={ink.muted} tickLine={false} tickFormatter={formatManNumber} />
                <ReferenceLine y={0} stroke={ink.axis} />
                <Tooltip
                  formatter={(value) => formatMan(Number(value))}
                  labelFormatter={(label) => `${label as number}年`}
                />
                <Legend />
                {plans.map((plan, index) => {
                  if (hiddenPlanIds.has(plan.id)) {
                    return null;
                  }
                  return (
                    <Line
                      key={plan.id}
                      type="monotone"
                      dataKey={plan.id}
                      name={plan.name}
                      stroke={seriesColor(index, isDark)}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>プラン</TableHead>
              <TableHead>最終年の貯蓄残高</TableHead>
              <TableHead>試算期間中の最小残高</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cashflows.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                  表示するプランがありません
                </TableCell>
              </TableRow>
            )}
            {cashflows.map(({ plan, rows }) => {
              const last = rows.at(-1);
              const min = rows.length > 0 ? Math.min(...rows.map((row) => row.balance)) : 0;
              return (
                <TableRow key={plan.id}>
                  <TableCell>{plan.name}</TableCell>
                  <TableCell className="tabular-nums">
                    {last ? formatMan(last.balance) : "-"}
                  </TableCell>
                  <TableCell
                    className={`tabular-nums ${min < 0 ? "font-semibold text-destructive" : ""}`}
                  >
                    {formatMan(min)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
