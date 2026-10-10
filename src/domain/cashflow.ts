import { expandAssetTransfer } from "./expand/assetTransfer";
import { expandEducation } from "./expand/education";
import { expandFlow } from "./expand/flow";
import { expandHousingBuy } from "./expand/housing";
import { expandInsurance } from "./expand/insurance";
import { expandPension } from "./expand/pension";
import { expandRetirement } from "./expand/retirement";
import { expandSalary } from "./expand/salary";
import {
  allocationTransfer,
  createZeroByCategory,
  remainingLoanBalance,
  sumAssetsByCategory,
} from "./finance";
import { resolveAllocation } from "./legacyMigration";
import { ageInYear, resolveTiming } from "./timing";
import type {
  AnnualFlow,
  AssetCategory,
  CashflowEventOccurrence,
  CashflowRow,
  FlowCategory,
  HousingBuyEvent,
  LiabilityItem,
  LifeEvent,
  PlanInput,
  SimulationContext,
} from "./types";

/**
 * イベント種別 → 展開関数のディスパッチテーブル。
 * 新しい種別を追加する場合は、expand/ にモジュールを1つ足してここに1行登録するだけでよい。
 * marker・assetTransfer はここでは扱わず simulate() 側で直接処理する
 * （金額を持たない、または収支に計上しないため）。
 */
function expandEvent(event: LifeEvent, ctx: SimulationContext): AnnualFlow[] {
  switch (event.kind) {
    case "flow":
      return expandFlow(event, ctx);
    case "salary":
      return expandSalary(event, ctx);
    case "housingBuy":
      return expandHousingBuy(event, ctx);
    case "education":
      return expandEducation(event, ctx);
    case "pension":
      return expandPension(event, ctx);
    case "retirement":
      return expandRetirement(event, ctx);
    case "insurance":
      return expandInsurance(event, ctx);
    case "marker":
    case "assetTransfer":
      return [];
  }
}

function sumCategoryValues(record: Partial<Record<FlowCategory, number>>): number {
  let total = 0;
  for (const value of Object.values(record)) {
    total += value ?? 0;
  }
  return total;
}

type AssetTransferOccurrence = {
  fromCategory: AssetCategory;
  toCategory: AssetCategory;
  amount: number;
};

/**
 * プラン全体を年次キャッシュフロー表に変換する。
 * 貯蓄残高の漸化式（区分ごと）: 残高[t] = 残高[t-1] × (1 + 区分の運用利回り) + その区分への収支・振替
 * 各年の処理順: 運用収益の計上 → 収支を cash へ → 資産振替イベント → 配分ルールによる現金・投資の自動付け替え。
 * 収支の余剰分（純キャッシュフロー）は cash 区分に積み上がり、資産振替イベントや配分ルールで他区分へ移せる。
 * （検算: docs/private/lifeplan.pdf 5-2 初年度 3,698 + 664 = 4,362 と一致、運用利回り0%の場合）
 */
export function simulate(input: PlanInput): CashflowRow[] {
  const ctx: SimulationContext = {
    persons: input.persons,
    baseYear: input.baseYear,
    endYear: input.endYear,
    assumptions: input.assumptions,
  };

  const flowsByYear = new Map<number, AnnualFlow[]>();
  const transfersByYear = new Map<number, AssetTransferOccurrence[]>();
  const eventsByYear = new Map<number, CashflowEventOccurrence[]>();

  const addOccurrence = (year: number, occurrence: CashflowEventOccurrence): void => {
    const list = eventsByYear.get(year) ?? [];
    list.push(occurrence);
    eventsByYear.set(year, list);
  };

  for (const event of input.events) {
    if (!event.enabled) {
      continue;
    }

    if (event.kind === "marker") {
      const year = resolveTiming(event.timing, ctx);
      if (year >= ctx.baseYear && year <= ctx.endYear) {
        addOccurrence(year, { label: event.label, amount: 0, isMarker: true });
      }
      continue;
    }

    if (event.kind === "assetTransfer") {
      for (const occurrence of expandAssetTransfer(event, ctx)) {
        const list = transfersByYear.get(occurrence.year) ?? [];
        list.push({
          fromCategory: event.fromCategory,
          toCategory: event.toCategory,
          amount: occurrence.amount,
        });
        transfersByYear.set(occurrence.year, list);
        addOccurrence(occurrence.year, { label: event.label, amount: occurrence.amount });
      }
      continue;
    }

    for (const flow of expandEvent(event, ctx)) {
      const list = flowsByYear.get(flow.year) ?? [];
      list.push(flow);
      flowsByYear.set(flow.year, list);
      addOccurrence(flow.year, {
        label: flow.label,
        amount: flow.amount,
        category: flow.category,
        direction: flow.direction,
      });
    }
  }

  // 負債（住宅ローン残債）は年ごとの積み上げ計算が不要な純粋関数のため、
  // 収支の集計とは別にここでまとめて解決しておく。
  const housingBuyEvents = input.events
    .filter((event): event is HousingBuyEvent => event.kind === "housingBuy" && event.enabled)
    .map((event) => ({ event, purchaseYear: resolveTiming(event.timing, ctx) }));

  const rows: CashflowRow[] = [];
  const balanceByCategory = sumAssetsByCategory(input.assets);

  for (let year = input.baseYear; year <= input.endYear; year++) {
    const incomeByCategory: Partial<Record<FlowCategory, number>> = {};
    const expenseByCategory: Partial<Record<FlowCategory, number>> = {};

    for (const flow of flowsByYear.get(year) ?? []) {
      const bucket = flow.direction === "in" ? incomeByCategory : expenseByCategory;
      bucket[flow.category] = (bucket[flow.category] ?? 0) + flow.amount;
    }

    const totalIncome = sumCategoryValues(incomeByCategory);
    const totalExpense = sumCategoryValues(expenseByCategory);
    const netFlow = totalIncome - totalExpense;

    const returnByCategory = createZeroByCategory();
    for (const category of Object.keys(balanceByCategory) as AssetCategory[]) {
      const returnRatio = (input.assumptions.returnRateByCategory[category] ?? 0) / 100;
      returnByCategory[category] = balanceByCategory[category] * returnRatio;
      balanceByCategory[category] += returnByCategory[category];
    }
    const totalReturn = sumCategoryValues(returnByCategory);

    balanceByCategory.cash += netFlow;

    for (const transfer of transfersByYear.get(year) ?? []) {
      balanceByCategory[transfer.fromCategory] -= transfer.amount;
      balanceByCategory[transfer.toCategory] += transfer.amount;
    }

    const autoTransfer = allocationTransfer(
      balanceByCategory.cash,
      balanceByCategory.investment,
      // 移行前のデータ（allocation 未設定）でも落ちないよう、ここでも既定値を補う。
      resolveAllocation(input.assumptions.allocation),
    );
    balanceByCategory.cash -= autoTransfer;
    balanceByCategory.investment += autoTransfer;

    const assetsByCategory = { ...balanceByCategory };
    const balance = sumCategoryValues(assetsByCategory);

    const liabilities: LiabilityItem[] = [];
    for (const { event, purchaseYear } of housingBuyEvents) {
      if (year < purchaseYear) {
        continue;
      }
      event.loans.forEach((loan, index) => {
        const remaining = remainingLoanBalance(loan, year - purchaseYear);
        if (remaining > 0) {
          const baseLabel = event.label || "住宅ローン";
          const label = event.loans.length > 1 ? `${baseLabel}（${index + 1}）` : baseLabel;
          liabilities.push({ label, amount: remaining });
        }
      });
    }
    const totalLiabilities = liabilities.reduce((sum, item) => sum + item.amount, 0);

    const ages: Record<string, number> = {};
    for (const person of input.persons) {
      ages[person.id] = ageInYear(person, year);
    }

    rows.push({
      year,
      ages,
      incomeByCategory,
      expenseByCategory,
      totalIncome,
      totalExpense,
      netFlow,
      balance,
      assetsByCategory,
      returnByCategory,
      totalReturn,
      autoTransfer,
      liabilities,
      totalLiabilities,
      events: eventsByYear.get(year) ?? [],
    });
  }

  return rows;
}
