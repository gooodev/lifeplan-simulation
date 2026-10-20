import { annualLoanPayment, loanBalanceAfterMonths } from "./loan";
import type { Basis, Flow, Loan, Period, SimulationInput, Tags, Transfer } from "./schema";
import { resolvePeriodYears, resolveYear } from "./timing";
import { assertSimulationInput, SimulationInputError } from "./validate";

type EntryBase = {
  year: number;
  /** 発生元のフロー・ローン・振替の id。 */
  sourceId: string;
  label?: string;
  /** 発生元の tags をそのまま引き継ぐ（エンジンは解釈しない）。 */
  tags: Tags;
  amount: number;
};

/** 試算期間中に発生した入出金1件分。集計・絞り込みはこの明細をもとに利用側で行う。 */
export type Entry =
  | (EntryBase & { kind: "flow"; direction: "in" | "out"; accountId: string })
  | (EntryBase & { kind: "loanRepayment"; direction: "out"; accountId: string })
  | (EntryBase & { kind: "transfer"; fromAccountId: string; toAccountId: string });

export type YearResult = {
  year: number;
  /** personId → その年の年齢 */
  ages: Record<string, number>;
  /** 収入合計（kind: "flow" の in）。 */
  income: number;
  /** 支出合計（kind: "flow" の out とローン返済）。 */
  expense: number;
  /** income − expense */
  net: number;
  /** accountId → 期末残高 */
  balances: Record<string, number>;
  totalAssets: number;
  /** loanId → 期末残債（その年の返済後）。借入前・完済後は 0。 */
  loanBalances: Record<string, number>;
  totalLiabilities: number;
  /** totalAssets − totalLiabilities */
  netWorth: number;
};

export type SimulationResult = {
  years: YearResult[];
  entries: Entry[];
};

/**
 * 入力を検証し、年次の収支・残高・負債を計算する。
 *
 * 口座ごとの年次漸化式:
 *   残高[t] = 残高[t−1] × (1 + 運用利回り) + その口座への入金 − 出金 ± 振替
 * 利回りは前年末残高にだけ掛かる（その年の入出金は年末に発生したものとみなす）。
 */
export function simulate(rawInput: SimulationInput): SimulationResult {
  const input = assertSimulationInput(rawInput);
  const { basis, stocks } = input;
  const entries = [
    ...(input.flows ?? []).flatMap((flow, index) => expandFlow(flow, index, input)),
    ...(stocks.loans ?? []).flatMap((loan) => expandLoan(loan, input)),
    ...(input.transfers ?? []).flatMap((transfer, index) => expandTransfer(transfer, index, basis)),
  ].sort((a, b) => a.year - b.year);

  const entriesByYear = new Map<number, Entry[]>();
  for (const entry of entries) {
    const list = entriesByYear.get(entry.year) ?? [];
    list.push(entry);
    entriesByYear.set(entry.year, list);
  }

  const returnRates = input.assumptions?.returnRatePercent ?? {};
  const balances: Record<string, number> = {};
  for (const account of stocks.accounts) {
    balances[account.id] = account.initialBalance;
  }
  const loans = (stocks.loans ?? []).map((loan) => ({
    loan,
    startYear: resolveYear(loan.start, basis),
  }));

  const years: YearResult[] = [];
  for (let y = basis.startYear; y <= basis.endYear; y++) {
    for (const accountId of Object.keys(balances)) {
      balances[accountId] *= 1 + (returnRates[accountId] ?? 0) / 100;
    }

    let income = 0;
    let expense = 0;
    for (const entry of entriesByYear.get(y) ?? []) {
      if (entry.kind === "transfer") {
        balances[entry.fromAccountId] -= entry.amount;
        balances[entry.toAccountId] += entry.amount;
      } else if (entry.direction === "in") {
        income += entry.amount;
        balances[entry.accountId] += entry.amount;
      } else {
        expense += entry.amount;
        balances[entry.accountId] -= entry.amount;
      }
    }

    const loanBalances: Record<string, number> = {};
    for (const { loan, startYear } of loans) {
      loanBalances[loan.id] =
        y < startYear ? 0 : loanBalanceAfterMonths(loan, (y - startYear + 1) * 12);
    }

    const totalAssets = sum(Object.values(balances));
    const totalLiabilities = sum(Object.values(loanBalances));
    years.push({
      year: y,
      ages: Object.fromEntries(basis.persons.map((p) => [p.id, y - p.birthYear])),
      income,
      expense,
      net: income - expense,
      balances: { ...balances },
      totalAssets,
      loanBalances,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
    });
  }

  return { years, entries };
}

function expandFlow(flow: Flow, index: number, input: SimulationInput): Entry[] {
  return resolveSchedule(flow, ["flows", index], input.basis).map(({ year, amount }) => ({
    year,
    kind: "flow",
    sourceId: flow.id,
    label: flow.label,
    tags: flow.tags ?? {},
    amount,
    direction: flow.direction,
    accountId: flow.accountId ?? input.stocks.settlementAccountId,
  }));
}

/** ローンの返済開始年から返済年数の間、毎年同額の返済を支出として計上する。 */
function expandLoan(loan: Loan, input: SimulationInput): Entry[] {
  const { basis } = input;
  const startYear = resolveYear(loan.start, basis);
  const payment = annualLoanPayment(loan);
  const entries: Entry[] = [];
  for (let year = startYear; year < startYear + loan.termYears; year++) {
    if (year >= basis.startYear && year <= basis.endYear) {
      entries.push({
        year,
        kind: "loanRepayment",
        sourceId: loan.id,
        label: loan.label,
        tags: loan.tags ?? {},
        amount: payment,
        direction: "out",
        accountId: loan.accountId ?? input.stocks.settlementAccountId,
      });
    }
  }
  return entries;
}

function expandTransfer(transfer: Transfer, index: number, basis: Basis): Entry[] {
  return resolveSchedule(transfer, ["transfers", index], basis).map(({ year, amount }) => ({
    year,
    kind: "transfer",
    sourceId: transfer.id,
    label: transfer.label,
    tags: transfer.tags ?? {},
    amount,
    fromAccountId: transfer.fromAccountId,
    toAccountId: transfer.toAccountId,
  }));
}

type Schedule = {
  period: Period;
  amount: number;
  growthRatePercent?: number;
  overrides?: { year: number; amount: number }[];
};

/**
 * スケジュールを発生年ごとの金額に展開する。
 * 増加率の起点は期間の開始年（試算開始年より前に始まる期間でも、開始年から複利で数える）。
 */
function resolveSchedule(
  schedule: Schedule,
  path: (string | number)[],
  basis: Basis,
): { year: number; amount: number }[] {
  const years = resolvePeriodYears(schedule.period, basis);
  const periodStartYear = resolveYear(schedule.period.start, basis);
  const growth = 1 + (schedule.growthRatePercent ?? 0) / 100;

  const overrides = new Map<number, number>();
  const occurrenceYears = new Set(years);
  (schedule.overrides ?? []).forEach((override, i) => {
    const inRange = override.year >= basis.startYear && override.year <= basis.endYear;
    if (inRange && !occurrenceYears.has(override.year)) {
      throw new SimulationInputError([
        {
          path: [...path, "overrides", i, "year"],
          message: `${override.year} 年は発生年ではないため上書きできません`,
        },
      ]);
    }
    overrides.set(override.year, override.amount);
  });

  return years.map((year) => ({
    year,
    amount: overrides.get(year) ?? schedule.amount * growth ** (year - periodStartYear),
  }));
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
