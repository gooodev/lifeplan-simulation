import { useState } from "react";
import { LuChevronDown, LuChevronRight } from "react-icons/lu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCategoriesByDirection } from "@/store/hooks";
import type { CashflowEventOccurrence, Category, CashflowRow, PlanInput } from "../../domain/types";
import { formatManNumber } from "../format";
import { useCashflow } from "../useCashflow";

type CashflowTableProps = { plan: PlanInput };

/**
 * キャッシュフロー表（PDF 5-2〜5-7 相当）。年を列にした横スクロール表。
 * 貯蓄残高がマイナスの年は強調表示する。
 * その年の主なイベントは列幅を圧迫しないよう、各支出セルのホバーで表示する。
 * 収入・支出のカテゴリ内訳はアコーディオンで開閉できる（合計行は常に表示）。
 */
export function CashflowTable({ plan }: CashflowTableProps) {
  const rows = useCashflow(plan);
  const incomeCategories = useCategoriesByDirection("in");
  const expenseCategories = useCategoriesByDirection("out");
  const [incomeOpen, setIncomeOpen] = useState(true);
  const [expenseOpen, setExpenseOpen] = useState(true);

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="border-collapse text-xs">
        <thead>
          <tr>
            <RowHeader sticky>年</RowHeader>
            {rows.map((row) => (
              <th
                key={row.year}
                className="border-b border-l bg-muted px-2 py-1 text-right font-medium tabular-nums text-foreground"
              >
                {row.year}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {plan.persons.map((person) => (
            <tr key={person.id}>
              <RowHeader sticky>{person.name}</RowHeader>
              {rows.map((row) => (
                <DataCell key={row.year}>{row.ages[person.id]}</DataCell>
              ))}
            </tr>
          ))}

          <SectionRow
            label="収入"
            columnCount={rows.length}
            open={incomeOpen}
            onToggle={() => setIncomeOpen((v) => !v)}
          />
          {incomeOpen &&
            incomeCategories.map((category) => (
              <CategoryRow key={category.id} category={category} rows={rows} direction="in" />
            ))}
          <tr className="font-semibold">
            <RowHeader sticky>収入合計</RowHeader>
            {rows.map((row) => (
              <DataCell key={row.year}>{formatManNumber(row.totalIncome)}</DataCell>
            ))}
          </tr>

          <SectionRow
            label="支出"
            columnCount={rows.length}
            open={expenseOpen}
            onToggle={() => setExpenseOpen((v) => !v)}
          />
          {expenseOpen &&
            expenseCategories.map((category) => (
              <CategoryRow key={category.id} category={category} rows={rows} direction="out" />
            ))}
          <tr className="font-semibold">
            <RowHeader sticky>支出合計</RowHeader>
            {rows.map((row) => (
              <DataCell key={row.year} events={row.events.filter((e) => e.direction === "out")}>
                {formatManNumber(row.totalExpense)}
              </DataCell>
            ))}
          </tr>

          <tr className="font-semibold">
            <RowHeader sticky>収支</RowHeader>
            {rows.map((row) => (
              <DataCell key={row.year} negative={row.netFlow < 0}>
                {formatManNumber(row.netFlow)}
              </DataCell>
            ))}
          </tr>
          <tr className="font-semibold">
            <RowHeader sticky>貯蓄残高</RowHeader>
            {rows.map((row) => (
              <DataCell key={row.year} negative={row.balance < 0}>
                {formatManNumber(row.balance)}
              </DataCell>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function CategoryRow({
  category,
  rows,
  direction,
}: {
  category: Category;
  rows: CashflowRow[];
  direction: "in" | "out";
}) {
  return (
    <tr>
      <RowHeader sticky indent>
        {category.label}
      </RowHeader>
      {rows.map((row) => {
        const value = (direction === "in" ? row.incomeByCategory : row.expenseByCategory)[
          category.id
        ];
        const categoryEvents =
          direction === "out" ? row.events.filter((e) => e.category === category.id) : undefined;
        return (
          <DataCell key={row.year} events={categoryEvents}>
            {value ? formatManNumber(value) : ""}
          </DataCell>
        );
      })}
    </tr>
  );
}

function SectionRow({
  label,
  columnCount,
  open,
  onToggle,
}: {
  label: string;
  columnCount: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <tr>
      <th className="sticky left-0 z-10 border-b bg-muted p-0 text-left">
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center gap-1 px-2 py-1 font-semibold text-foreground hover:bg-accent"
        >
          {open ? <LuChevronDown className="size-3.5" /> : <LuChevronRight className="size-3.5" />}
          {label}
        </button>
      </th>
      <td colSpan={columnCount} className="border-t bg-muted" />
    </tr>
  );
}

function RowHeader({
  children,
  sticky,
  indent,
  className,
}: {
  children: React.ReactNode;
  sticky?: boolean;
  indent?: boolean;
  className?: string;
}) {
  return (
    <th
      className={`whitespace-nowrap border-b px-2 py-1 text-left text-foreground ${
        sticky ? "sticky left-0 z-10 bg-background" : ""
      } ${indent ? "pl-6 font-normal text-muted-foreground" : ""} ${className ?? ""}`}
    >
      {children}
    </th>
  );
}

function DataCell({
  children,
  negative,
  events,
}: {
  children: React.ReactNode;
  negative?: boolean;
  events?: CashflowEventOccurrence[];
}) {
  const cell = (
    <td
      className={`border-l border-t px-2 py-1 text-right tabular-nums ${
        negative ? "bg-destructive/10 font-semibold text-destructive" : "text-foreground"
      } ${events && events.length > 0 ? "cursor-default underline decoration-dotted underline-offset-2" : ""}`}
    >
      {children}
    </td>
  );

  if (!events || events.length === 0) {
    return cell;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{cell}</TooltipTrigger>
      <TooltipContent>
        <p className="max-w-64">{events.map((e) => e.label).join("・")}</p>
      </TooltipContent>
    </Tooltip>
  );
}
