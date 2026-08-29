import { useState } from "react";
import { LuCopy, LuPlus, LuTrash2 } from "react-icons/lu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  addEvent,
  duplicateEvent,
  removeEvent,
  toggleEvent,
  updateEvent,
} from "@/store/collections";
import { useCategoriesByDirection } from "@/store/hooks";
import { createId } from "../domain/id";
import type { Category, FlowEvent, LifeEvent, Period, Person, SalaryEvent } from "../domain/types";
import { PeriodField } from "./compositeFields";
import { formatPeriodSummary } from "./format";

type RowKind = "flow" | "salary";

type IncomeExpenseSheetProps = {
  planId: string;
  direction: "in" | "out";
  /** この表が扱う種別を固定する（給与専用の表、汎用フロー専用の表、というように分ける）。 */
  kind: RowKind;
  events: LifeEvent[];
  persons: Person[];
  baseYear: number;
  title: string;
  addLabel: string;
  emptyLabel: string;
};

/** flow/salary をまとめて編集するための正規化済み行モデル。 */
type RowValue = {
  id: string;
  label: string;
  categoryId: string;
  /** "" = 世帯全体（flowのみ許可。salaryは必ず人物が必要）。 */
  subjectId: string;
  amount: number;
  growthRate: number;
  period: Period;
  enabled: boolean;
};

function toRowValue(event: FlowEvent | SalaryEvent): RowValue {
  if (event.kind === "salary") {
    return {
      id: event.id,
      label: event.label,
      categoryId: event.category,
      subjectId: event.personId,
      amount: event.annualAmount,
      growthRate: event.growthRate,
      period: event.period,
      enabled: event.enabled,
    };
  }
  return {
    id: event.id,
    label: event.label,
    categoryId: event.category,
    subjectId: event.subjectId ?? "",
    amount: event.amount,
    growthRate: event.growthRate ?? 0,
    period: event.period,
    enabled: event.enabled,
  };
}

function fromRowValue(
  row: RowValue,
  kind: RowKind,
  direction: "in" | "out",
  fallbackPersonId: string,
): FlowEvent | SalaryEvent {
  if (kind === "salary") {
    return {
      id: row.id,
      kind: "salary",
      label: row.label,
      enabled: row.enabled,
      category: row.categoryId,
      subjectId: row.subjectId || undefined,
      personId: row.subjectId || fallbackPersonId,
      period: row.period,
      annualAmount: row.amount,
      growthRate: row.growthRate,
    };
  }
  return {
    id: row.id,
    kind: "flow",
    label: row.label,
    enabled: row.enabled,
    category: row.categoryId,
    subjectId: row.subjectId || undefined,
    direction,
    period: row.period,
    amount: row.amount,
    growthRate: row.growthRate,
  };
}

function matchesKind(
  event: LifeEvent,
  kind: RowKind,
  direction: "in" | "out",
): event is FlowEvent | SalaryEvent {
  if (kind === "salary") {
    return event.kind === "salary";
  }
  return event.kind === "flow" && event.direction === direction;
}

export function IncomeExpenseSheet({
  planId,
  direction,
  kind,
  events,
  persons,
  baseYear,
  title,
  addLabel,
  emptyLabel,
}: IncomeExpenseSheetProps) {
  const categories = useCategoriesByDirection(direction);

  const rows = events
    .filter((event): event is FlowEvent | SalaryEvent => matchesKind(event, kind, direction))
    .map((event) => ({ event, row: toRowValue(event) }));

  const fallbackPersonId = persons[0]?.id ?? "";

  const patch = (row: RowValue, changes: Partial<RowValue>) => {
    const nextRow = { ...row, ...changes };
    updateEvent(planId, row.id, () => fromRowValue(nextRow, kind, direction, fallbackPersonId));
  };

  const handleAdd = () => {
    const category = categories[0];
    const baseEvent = {
      id: createId(),
      label: "",
      enabled: true,
      category: category?.id ?? "",
      period: { start: { type: "year" as const, year: baseYear }, intervalYears: 1 },
    };
    const newEvent: LifeEvent =
      kind === "salary"
        ? {
            ...baseEvent,
            kind: "salary",
            personId: fallbackPersonId,
            annualAmount: 0,
            growthRate: 0,
          }
        : { ...baseEvent, kind: "flow", direction, amount: 0 };
    addEvent(planId, newEvent);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Button size="sm" onClick={handleAdd}>
          <LuPlus />
          {addLabel}
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">有効</TableHead>
              <TableHead className="min-w-32">名前</TableHead>
              <TableHead className="w-32">対象者</TableHead>
              <TableHead className="w-36">カテゴリ</TableHead>
              <TableHead className="w-28">金額</TableHead>
              <TableHead className="w-24">増加率</TableHead>
              <TableHead className="w-40">期間</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ event, row }) => (
              <TableRow key={event.id} className={row.enabled ? "" : "opacity-50"}>
                <TableCell>
                  <Checkbox
                    checked={row.enabled}
                    onCheckedChange={() => toggleEvent(planId, event.id)}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={row.label}
                    placeholder="名称未設定"
                    onChange={(e) => patch(row, { label: e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={row.subjectId}
                    onValueChange={(subjectId) => patch(row, { subjectId })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="世帯全体" />
                    </SelectTrigger>
                    <SelectContent>
                      {kind === "flow" && <SelectItem value="">世帯全体</SelectItem>}
                      {persons.map((person) => (
                        <SelectItem key={person.id} value={person.id}>
                          {person.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <CategorySelect
                    categories={categories}
                    value={row.categoryId}
                    onChange={(categoryId) => patch(row, { categoryId })}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={row.amount}
                      onChange={(e) => patch(row, { amount: e.target.valueAsNumber || 0 })}
                    />
                    <span className="whitespace-nowrap text-xs text-muted-foreground">万円</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step={0.1}
                      value={row.growthRate}
                      onChange={(e) => patch(row, { growthRate: e.target.valueAsNumber || 0 })}
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <PeriodPopover
                    period={row.period}
                    persons={persons}
                    onChange={(period) => patch(row, { period })}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => duplicateEvent(planId, event.id)}
                      title="複製"
                    >
                      <LuCopy />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => removeEvent(planId, event.id)}
                      title="削除"
                    >
                      <LuTrash2 className="text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-6 text-center text-sm text-muted-foreground">
                  {emptyLabel}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CategorySelect({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="未分類" />
      </SelectTrigger>
      <SelectContent>
        {categories.map((category) => (
          <SelectItem key={category.id} value={category.id}>
            {category.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function PeriodPopover({
  period,
  persons,
  onChange,
}: {
  period: Period;
  persons: Person[];
  onChange: (period: Period) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-start font-normal">
          <Badge variant="secondary" className="pointer-events-none">
            {formatPeriodSummary(period, persons)}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <PeriodField value={period} onChange={onChange} persons={persons} />
      </PopoverContent>
    </Popover>
  );
}
