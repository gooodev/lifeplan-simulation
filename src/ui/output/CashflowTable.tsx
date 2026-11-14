import { useState } from "react";
import { LuChevronDown, LuChevronRight } from "react-icons/lu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCategoriesByDirection } from "@/store/hooks";
import { ASSET_CATEGORIES } from "../../domain/types";
import type {
  AssetCategory,
  CashflowEventOccurrence,
  Category,
  CashflowRow,
  PlanInput,
} from "../../domain/types";
import { formatManNumber } from "../format";
import { ASSET_CATEGORY_LABELS } from "../labels";
import { useCashflow } from "../useCashflow";

type CashflowTableProps = { plan: PlanInput };

/**
 * キャッシュフロー表（PDF 5-2〜5-7 相当）。年を列にした横スクロール表。
 * 貯蓄残高がマイナスの年は強調表示する。
 * その年の主なイベントは列幅を圧迫しないよう、各支出セルのホバーで表示する。
 * 収入・支出のカテゴリ内訳はアコーディオンで開閉できる（合計行は常に表示）。
 * 運用収益（区分ごとの利回りによる増加分）と、貯蓄残高の資産区分ごとの内訳・
 * 配分ルールによる自動振替も同様に開閉できる。
 */
export function CashflowTable({ plan }: CashflowTableProps) {
  const rows = useCashflow(plan);
  const incomeCategories = useCategoriesByDirection("in");
  const expenseCategories = useCategoriesByDirection("out");
  const [incomeOpen, setIncomeOpen] = useState(true);
  const [expenseOpen, setExpenseOpen] = useState(true);
  const [returnOpen, setReturnOpen] = useState(true);
  const [assetsOpen, setAssetsOpen] = useState(true);

  // 一度も値を持たない区分の行は出さない（例: 不動産を持たないプランで空行が並ぶのを避ける）。
  const returnCategories = ASSET_CATEGORIES.filter((category) =>
    rows.some((row) => row.returnByCategory[category] !== 0),
  );
  const assetCategories = ASSET_CATEGORIES.filter((category) =>
    rows.some((row) => row.assetsByCategory[category] !== 0),
  );
  const hasAutoTransfer = rows.some((row) => row.autoTransfer !== 0);

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

          <SectionRow
            label="運用収益"
            columnCount={rows.length}
            open={returnOpen}
            onToggle={() => setReturnOpen((v) => !v)}
          />
          {returnOpen &&
            returnCategories.map((category) => (
              <AssetCategoryRow
                key={category}
                category={category}
                rows={rows}
                getValue={(row) => row.returnByCategory[category]}
              />
            ))}
          <tr className="font-semibold">
            <RowHeader sticky>運用収益合計</RowHeader>
            {rows.map((row) => (
              <DataCell key={row.year} negative={row.totalReturn < 0}>
                {formatManNumber(row.totalReturn)}
              </DataCell>
            ))}
          </tr>

          <SectionRow
            label="資産内訳"
            columnCount={rows.length}
            open={assetsOpen}
            onToggle={() => setAssetsOpen((v) => !v)}
          />
          {assetsOpen &&
            assetCategories.map((category) => (
              <AssetCategoryRow
                key={category}
                category={category}
                rows={rows}
                getValue={(row) => row.assetsByCategory[category]}
                highlightNegative
              />
            ))}
          {assetsOpen && hasAutoTransfer && (
            <tr>
              <RowHeader sticky indent>
                自動振替（現金→投資）
              </RowHeader>
              {rows.map((row) => (
                <DataCell key={row.year}>
                  {row.autoTransfer ? formatManNumber(row.autoTransfer) : ""}
                </DataCell>
              ))}
            </tr>
          )}
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

function AssetCategoryRow({
  category,
  rows,
  getValue,
  highlightNegative,
}: {
  category: AssetCategory;
  rows: CashflowRow[];
  getValue: (row: CashflowRow) => number;
  highlightNegative?: boolean;
}) {
  return (
    <tr>
      <RowHeader sticky indent>
        {ASSET_CATEGORY_LABELS[category]}
      </RowHeader>
      {rows.map((row) => {
        const value = getValue(row);
        return (
          <DataCell key={row.year} negative={highlightNegative && value < 0}>
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
